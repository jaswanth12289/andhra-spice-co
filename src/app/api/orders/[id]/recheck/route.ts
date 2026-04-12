import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { sendOrderConfirmation } from '@/lib/email';

// This endpoint re-checks Cashfree payment status for ONLINE orders that are still Pending.
// Called when the user lands on the order page after abandoning or completing payment.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Find the order
    const ordersRef = collection(db, 'orders');
    let orderData: any = null;
    let orderId = id;
    let orderRef;

    const directRef = doc(db, 'orders', id);
    const directSnap = await getDoc(directRef);

    if (directSnap.exists()) {
      orderData = directSnap.data();
      orderRef = directRef;
    } else {
      const q = query(ordersRef, where('customOrderId', '==', id));
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

    // Only re-check if it's ONLINE and still Pending
    if (orderData.paymentMethod !== 'ONLINE' || orderData.paymentStatus !== 'Pending') {
      return NextResponse.json({ status: 'no_change', orderStatus: orderData.orderStatus, paymentStatus: orderData.paymentStatus });
    }

    const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
    const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

    const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders/${orderData.customOrderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': process.env.CASHFREE_APP_ID || '',
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
        'x-api-version': '2023-08-01',
        'Accept': 'application/json'
      }
    });

    if (!cashfreeResponse.ok) {
      return NextResponse.json({ status: 'error', message: 'Could not verify with Cashfree' }, { status: 500 });
    }

    const cashfreeData = await cashfreeResponse.json();

    if (cashfreeData.order_status === 'PAID') {
      await updateDoc(orderRef, {
        paymentStatus: 'Success',
        updatedAt: new Date().toISOString()
      });

      const userRef = doc(db, 'users', orderData.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await sendOrderConfirmation(userSnap.data().email, { ...orderData, customOrderId: orderData.customOrderId }, userSnap.data());
      }

      return NextResponse.json({ status: 'paid', orderStatus: 'Placed', paymentStatus: 'Success' });
    } else {
      // ACTIVE, EXPIRED, or anything else = payment abandoned/failed
      await updateDoc(orderRef, {
        paymentStatus: 'Failed',
        orderStatus: 'Cancelled',
        updatedAt: new Date().toISOString()
      });

      // Restore stock
      for (let p of orderData.products) {
        const productRef = doc(db, 'products', p.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          const updatedOptions = productData.options.map((opt: any) => {
            if (opt.weight === p.weight) {
              return { ...opt, stock: (opt.stock || 0) + p.quantity };
            }
            return opt;
          });
          await updateDoc(productRef, { options: updatedOptions });
        }
      }

      return NextResponse.json({ status: 'failed', orderStatus: 'Cancelled', paymentStatus: 'Failed' });
    }
  } catch (error: any) {
    console.error("Payment recheck error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
