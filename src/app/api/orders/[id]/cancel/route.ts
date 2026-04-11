import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { sendCancellationEmail } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;

    await dbConnect();
    const { id } = await params;
    
    let order;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    } else {
      order = await Order.findOne({ customOrderId: id });
    }

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (payload.role !== 'admin' && String(order.userId) !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (order.orderStatus !== 'Placed' && order.orderStatus !== 'Packed') {
      return NextResponse.json({ error: 'Order cannot be cancelled at this stage' }, { status: 400 });
    }

    // Restore stock
    for (let p of order.products) {
      const result = await Product.updateOne(
        { _id: p.productId, "options.weight": p.weight },
        { $inc: { "options.$.stock": p.quantity } }
      );
      
      // Fallback for old single-variant products without options array
      if (result.matchedCount === 0) {
         await Product.findByIdAndUpdate(p.productId, { $inc: { stock: p.quantity } });
      }
    }

    order.orderStatus = 'Cancelled';
    await order.save();

    const user = await User.findById(order.userId);
    if (user) {
      await sendCancellationEmail(user.email, order, user);
    }

    return NextResponse.json({ message: 'Order cancelled successfully', order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
