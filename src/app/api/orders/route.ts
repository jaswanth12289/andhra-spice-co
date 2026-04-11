import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { generateOrderId } from '@/lib/orderUtils';
import { sendOrderConfirmation } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const data = await req.json();
    
    const { products, phoneNumber, shippingAddress, paymentMethod, totalAmount } = data;
    
    // Validate stock
    for (let p of products) {
      const dbProduct = await Product.findById(p.productId);
      if (!dbProduct) return NextResponse.json({ error: `Product not found: ${p.name}` }, { status: 400 });
      
      const option = dbProduct.options?.find((o: any) => o.weight === p.weight);
      
      // Fallback for old orders or single-variant schemas (if any exist)
      if (!option && (dbProduct as any).stock !== undefined) {
         if ((dbProduct as any).stock < p.quantity) return NextResponse.json({ error: `Insufficient stock for ${p.name}. Only ${(dbProduct as any).stock} left.` }, { status: 400 });
      } else if (option) {
         if (option.stock < p.quantity) {
           return NextResponse.json({ error: `Insufficient stock for ${p.name} (${p.weight}). Only ${option.stock} left.` }, { status: 400 });
         }
      }
    }

    // Decrement stock
    for (let p of products) {
      // First try to decrement option stock
      const result = await Product.updateOne(
        { _id: p.productId, "options.weight": p.weight },
        { $inc: { "options.$.stock": -1 * p.quantity } }
      );
      
      // If variant wasn't found (maybe an old test product), decrement fallback root stock
      if (result.matchedCount === 0) {
        await Product.findByIdAndUpdate(p.productId, { $inc: { stock: -1 * p.quantity } });
      }
    }

    const customOrderId = await generateOrderId();

    const orderData = {
      customOrderId,
      userId: payload.userId,
      phoneNumber,
      products,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Success',
      orderStatus: 'Placed'
    };

    const newOrder = await Order.create(orderData);

    const user = await User.findById(payload.userId);
    if (user) {
      await sendOrderConfirmation(user.email, newOrder, user);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    
    await dbConnect();

    const query = payload.role === 'admin' ? {} : { userId: payload.userId };
    const orders = await Order.find(query).sort({ createdAt: -1 });

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
