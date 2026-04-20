import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { sendOrderConfirmation } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get('order_id');
    const original_order = searchParams.get('original_order');

    if (!order_id) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // For retries, the Cashfree order_id is like ASC20260001_R1
    // The actual DB order uses the original customOrderId
    const dbOrderId = original_order || order_id.split('_R')[0];

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
      
      // Find order by customOrderId in our DB
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customOrderId', '==', dbOrderId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return NextResponse.redirect(new URL('/', req.url));

      const orderDoc = snapshot.docs[0];
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();
      const orderRef = doc(db, 'orders', orderId);

      // Only process if the order is not already paid (idempotency guard)
      if (orderData.paymentStatus !== 'Success') {
        if (cashfreeData.order_status === 'PAID') {
          // Payment Success — deduct stock now if not already done
          if (!orderData.stockDeducted) {
            for (let p of orderData.products) {
              const productRef = doc(db, 'products', p.productId);
              const productSnap = await getDoc(productRef);
              if (productSnap.exists()) {
                const productData = productSnap.data();
                const updatedOptions = productData.options.map((opt: any) => {
                  if (opt.weight === p.weight) return { ...opt, stock: Math.max(0, (opt.stock || 0) - p.quantity) };
                  return opt;
                });
                await updateDoc(productRef, { options: updatedOptions });
              }
            }
          }

          const verifyLog = {
            event: 'PAYMENT_VERIFIED',
            cfOrderId: order_id,
            timestamp: new Date().toISOString(),
            source: 'redirect'
          };

          await updateDoc(orderRef, { 
            paymentStatus: 'Success',
            orderStatus: 'Placed',
            stockDeducted: true,
            cashfreeOrderId: order_id,
            paymentAttempts: [...(orderData.paymentAttempts || []), verifyLog],
            updatedAt: new Date().toISOString()
          });

          // Send email only if not already sent (prevents webhook+redirect duplicate)
          if (!orderData.emailSent) {
            const userRef = doc(db, 'users', orderData.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              try {
                await sendOrderConfirmation(userSnap.data().email, { ...orderData, customOrderId: dbOrderId }, userSnap.data());
                await updateDoc(orderRef, { emailSent: true });
              } catch (emailErr) {
                console.error('Email send failed (verify):', emailErr);
              }
            }
          }
        } else if (cashfreeData.order_status !== 'ACTIVE') {
          // Only mark as failed if Cashfree definitively says not PAID and not ACTIVE
          // ACTIVE means payment window is still open — don't cancel prematurely
          const failLog = {
            event: 'PAYMENT_FAILED',
            cfOrderId: order_id,
            cfStatus: cashfreeData.order_status,
            timestamp: new Date().toISOString(),
            source: 'redirect'
          };

          await updateDoc(orderRef, { 
            paymentStatus: 'Failed',
            orderStatus: 'Cancelled',
            paymentAttempts: [...(orderData.paymentAttempts || []), failLog],
            updatedAt: new Date().toISOString()
          });

          // Explicit failure redirect
          return NextResponse.redirect(new URL(`/checkout/failed?orderId=${dbOrderId}`, req.url));
        }
        // If ACTIVE, leave as Awaiting/Payment Pending — user may still complete payment
      }
    } else {
      console.error("Cashfree verify error:", await cashfreeResponse.text());
    }

    // Always redirect to the original order page for Success or Active
    return NextResponse.redirect(new URL(`/order/${dbOrderId}`, req.url));

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.redirect(new URL('/checkout/failed', req.url));
  }
}
