import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Order from '@/models/Order';

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
      
      if (orderData.order_status === 'PAID') {
        await dbConnect();
        await Order.findOneAndUpdate(
          { customOrderId: order_id },
          { paymentStatus: 'Success' }
        );
      }
    } else {
      console.error("Cashfree verify error:", await cashfreeResponse.text());
    }

    // Redirect to the order confirmation page
    return NextResponse.redirect(new URL(`/order/${order_id}`, req.url));

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
