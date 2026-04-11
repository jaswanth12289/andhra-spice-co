import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Order from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product';
import { sendOrderConfirmation } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get('order_id');

    if (!order_id) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
    const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

    const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders/${order_id}`, {
      method: 'GET',
      headers: {
        'x-client-id': process.env.CASHFREE_APP_ID || '',
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
        'x-api-version': '2023-08-01',
        'Accept': 'application/json'
      }
    });

    if (cashfreeResponse.ok) {
      const orderData = await cashfreeResponse.json();
      await dbConnect();
      
      const order = await Order.findOne({ customOrderId: order_id });
      if (!order) return NextResponse.redirect(new URL('/', req.url));

      // Only process if the order is still Pending
      if (order.paymentStatus === 'Pending') {
        if (orderData.order_status === 'PAID') {
          // Payment Success!
          order.paymentStatus = 'Success';
          await order.save();

          const user = await User.findById(order.userId);
          if (user) {
            await sendOrderConfirmation(user.email, order, user);
          }
        } else {
          // Payment Failed or Abandoned (ACTIVE, FAILED, etc)
          order.paymentStatus = 'Failed';
          order.orderStatus = 'Cancelled'; // Mark strictly as cancelled so UI updates!
          await order.save();

          // Restore Product Stock since the payment didn't go through
          for (let p of order.products) {
            const result = await Product.updateOne(
              { _id: p.productId, "options.weight": p.weight },
              { $inc: { "options.$.stock": p.quantity } }
            );
            if (result.matchedCount === 0) {
              await Product.findByIdAndUpdate(p.productId, { $inc: { stock: p.quantity } });
            }
          }
        }
      }
    } else {
      console.error("Cashfree verify error:", await cashfreeResponse.text());
    }

    // Redirect to the order confirmation/status page
    return NextResponse.redirect(new URL(`/order/${order_id}`, req.url));

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
