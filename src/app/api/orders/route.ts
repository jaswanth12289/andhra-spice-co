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
      deliveryCharge: payload.deliveryCharge || 0,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'Pending',
      orderStatus: 'Placed'
    };

    const newOrder = await Order.create(orderData);

    const user = await User.findById(payload.userId);
    if (user && paymentMethod === 'COD') {
      await sendOrderConfirmation(user.email, newOrder, user);
    }

    if (paymentMethod === 'ONLINE') {
      const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
      const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
      const domainUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

      const cashfreePayload = {
        order_id: customOrderId,
        order_amount: totalAmount,
        order_currency: 'INR',
        customer_details: {
          customer_id: payload.userId,
          customer_phone: phoneNumber,
          customer_email: user?.email || 'customer@example.com'
        },
        order_meta: {
          return_url: `${domainUrl}/api/payment/verify?order_id=${customOrderId}`
        }
      };

      try {
        const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders`, {
          method: 'POST',
          headers: {
            'x-client-id': process.env.CASHFREE_APP_ID || '',
            'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(cashfreePayload)
        });

        const cashfreeData = await cashfreeResponse.json();

        if (!cashfreeResponse.ok) {
          console.error("Cashfree order error:", cashfreeData);
          return NextResponse.json({ error: 'Payment gateway initialization failed', details: cashfreeData }, { status: 500 });
        }

        return NextResponse.json({
          ...newOrder.toObject(),
          payment_session_id: cashfreeData.payment_session_id,
          cashfree_environment: isSandbox ? 'sandbox' : 'production'
        }, { status: 201 });

      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
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
