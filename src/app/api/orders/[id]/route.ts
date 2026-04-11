import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';
import Order from '@/models/Order';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { sendShippingUpdate } from '@/lib/email';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const { id } = await params;
    const data = await req.json();

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (data.orderStatus === 'Cancelled' && order.orderStatus !== 'Cancelled') {
      // Execute the deep cancellation logic (Refunds + Stock reduction)
      const { processCancellationAndRefund } = await import('@/lib/refundUtils');
      const { success, message } = await processCancellationAndRefund(order);
      
      if (!success) {
        return NextResponse.json({ error: message }, { status: 400 });
      }

      const user = await User.findById(order.userId);
      if (user) {
        const { sendCancellationEmail } = await import('@/lib/email');
        await sendCancellationEmail(user.email, order, user);
      }
      return NextResponse.json(order);
    }

    // Normal update for shipping/tracking etc
    const updatedOrder = await Order.findByIdAndUpdate(id, data, { new: true });
    
    if (!updatedOrder) return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });

    if (data.orderStatus === 'Shipped' || data.trackingId) {
      const user = await User.findById(updatedOrder.userId);
      if (user) {
        await sendShippingUpdate(user.email, updatedOrder, user);
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
