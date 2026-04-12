import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { doc, getDoc, getDocs, updateDoc, collection, query, where } from 'firebase/firestore';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Find order
    let orderData: any = null;
    let orderId = id;
    let orderRef;

    const directRef = doc(db, 'orders', id);
    const directSnap = await getDoc(directRef);

    if (directSnap.exists()) {
      orderData = directSnap.data();
      orderRef = directRef;
      orderId = directSnap.id;
    } else {
      const q = query(collection(db, 'orders'), where('customOrderId', '==', id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        orderId = d.id;
        orderData = d.data();
        orderRef = doc(db, 'orders', orderId);
      }
    }

    if (!orderData || !orderRef) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow retry for ONLINE orders with failed/awaiting/pending payment
    if (orderData.paymentMethod !== 'ONLINE') {
      return NextResponse.json({ error: 'Retry is only available for online payments' }, { status: 400 });
    }

    if (orderData.paymentStatus === 'Success') {
      return NextResponse.json({ error: 'This order is already paid' }, { status: 400 });
    }

    // Ensure user owns this order
    if (orderData.userId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Re-validate stock before retrying
    for (const p of orderData.products) {
      const productRef = doc(db, 'products', p.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const pd = productSnap.data();
        const opt = pd.options?.find((o: any) => o.weight === p.weight);
        if (!opt || opt.stock < p.quantity) {
          return NextResponse.json({ error: `${p.name} (${p.weight}) is now out of stock. Cannot retry payment.` }, { status: 400 });
        }
      }
    }

    // Create new Cashfree order (reuse our customOrderId with a retry suffix)
    const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
    const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
    const domainUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const retryCount = (orderData.paymentAttempts?.length || 0) + 1;
    const cfOrderId = `${orderData.customOrderId}_R${retryCount}`;

    // Get user email
    const userRef = doc(db, 'users', orderData.userId);
    const userSnap = await getDoc(userRef);
    const userEmail = userSnap.exists() ? userSnap.data().email : 'customer@example.com';

    const cashfreePayload = {
      order_id: cfOrderId,
      order_amount: orderData.totalAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: payload.userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50),
        customer_phone: orderData.phoneNumber,
        customer_email: userEmail
      },
      order_meta: {
        return_url: `${domainUrl}/api/payment/verify?order_id=${cfOrderId}&original_order=${orderData.customOrderId}`
      }
    };

    const cfRes = await fetch(`${cashfreeBaseUrl}/orders`, {
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

    const cfData = await cfRes.json();

    if (!cfRes.ok) {
      console.error("Cashfree retry error:", JSON.stringify(cfData));
      return NextResponse.json({ error: cfData?.message || 'Failed to create retry payment session' }, { status: 500 });
    }

    // Log retry attempt
    const attempt = {
      cfOrderId,
      timestamp: new Date().toISOString(),
      status: 'initiated'
    };

    await updateDoc(orderRef, {
      paymentStatus: 'Awaiting',
      orderStatus: 'Payment Pending',
      cashfreeOrderId: cfOrderId,
      paymentAttempts: [...(orderData.paymentAttempts || []), attempt],
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      payment_session_id: cfData.payment_session_id,
      cashfree_environment: isSandbox ? 'sandbox' : 'production',
      cfOrderId
    });

  } catch (error: any) {
    console.error("Retry payment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
