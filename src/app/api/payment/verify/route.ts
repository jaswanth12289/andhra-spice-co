import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
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
      const cashfreeData = await cashfreeResponse.json();
      
      // Find order by customOrderId
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customOrderId', '==', order_id));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return NextResponse.redirect(new URL('/', req.url));

      const orderDoc = snapshot.docs[0];
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();
      const orderRef = doc(db, 'orders', orderId);

      // Only process if the order is still Pending
      if (orderData.paymentStatus === 'Awaiting' || orderData.paymentStatus === 'Pending') {
        if (cashfreeData.order_status === 'PAID') {
          // Payment Success — deduct stock now
          for (let p of orderData.products) {
            const productRef = doc(db, 'products', p.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const productData = productSnap.data();
              const updatedOptions = productData.options.map((opt: any) => {
                if (opt.weight === p.weight) return { ...opt, stock: opt.stock - p.quantity };
                return opt;
              });
              await updateDoc(productRef, { options: updatedOptions });
            }
          }

          await updateDoc(orderRef, { 
            paymentStatus: 'Success',
            orderStatus: 'Placed',
            stockDeducted: true,
            updatedAt: new Date().toISOString()
          });

          const userRef = doc(db, 'users', orderData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            await sendOrderConfirmation(userSnap.data().email, { ...orderData, customOrderId: order_id }, userSnap.data());
          }
        } else {
          // Payment Failed or Abandoned — no stock to restore (never deducted)
          await updateDoc(orderRef, { 
            paymentStatus: 'Failed',
            orderStatus: 'Cancelled',
            updatedAt: new Date().toISOString()
          });
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
