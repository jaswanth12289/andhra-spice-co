import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, runTransaction } from 'firebase/firestore';
import { sendOrderConfirmation } from '@/lib/email';
import crypto from 'crypto';

// Cashfree webhook — backup payment confirmation
// Even if the redirect fails, this ensures payment status is updated
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';
    
    // Verify webhook signature
    const secretKey = process.env.CASHFREE_SECRET_KEY || '';
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + body)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error("Webhook signature mismatch");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    const eventType = data.type;

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || eventType === 'ORDER_PAID') {
      const cfOrderId = data.data?.order?.order_id;
      if (!cfOrderId) return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });

      // Extract original order ID (handle retry suffixes like ASC20260001_R1)
      const originalOrderId = cfOrderId.split('_R')[0];

      // Find order
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customOrderId', '==', originalOrderId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.error("Webhook: order not found for", originalOrderId);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const orderDoc = snapshot.docs[0];
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();
      const orderRef = doc(db, 'orders', orderId);

      // Only process if not already Success
      if (orderData.paymentStatus === 'Success') {
        return NextResponse.json({ message: 'Already processed' });
      }

      // Deduct stock if not already done (idempotency via stockDeducted flag)
      const webhookLog = {
        event: eventType,
        cfOrderId,
        timestamp: new Date().toISOString(),
        source: 'webhook'
      };

      // Perform stock deduction and status update atomically
      let emailNeeded = false;
      let freshOrderData: any = null;

      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order vanished during processing");
        
        const freshOrder = orderSnap.data();
        freshOrderData = freshOrder;
        
        if (freshOrder.paymentStatus === 'Success') {
          return; // Already processed by another worker concurrent to us
        }
        
        const productDocs = [];
        if (!freshOrder.stockDeducted) {
          for (const p of freshOrder.products) {
            const productRef = doc(db, 'products', p.productId);
            const productSnap = await transaction.get(productRef);
            if (productSnap.exists()) {
              productDocs.push({ ref: productRef, pd: productSnap.data(), reqP: p });
            }
          }
        }
        
        // Writes
        if (!freshOrder.stockDeducted) {
          for (const item of productDocs) {
            const updatedOptions = item.pd.options.map((opt: any) => {
              if (opt.weight === item.reqP.weight) return { ...opt, stock: Math.max(0, (opt.stock || 0) - item.reqP.quantity) };
              return opt;
            });
            transaction.update(item.ref, { options: updatedOptions });
          }
        }
        
        transaction.update(orderRef, {
          paymentStatus: 'Success',
          orderStatus: 'Placed',
          stockDeducted: true,
          cashfreeOrderId: cfOrderId,
          paymentAttempts: [...(freshOrder.paymentAttempts || []), webhookLog],
          updatedAt: new Date().toISOString()
        });
        
        emailNeeded = !freshOrder.emailSent;
      });

      // Send confirmation email only if not already sent
      if (emailNeeded && freshOrderData) {
        const userRef = doc(db, 'users', freshOrderData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          try {
            await sendOrderConfirmation(
              userSnap.data().email,
              { ...orderData, customOrderId: originalOrderId },
              userSnap.data()
            );
            await updateDoc(orderRef, { emailSent: true });
          } catch (emailErr) {
            console.error('Email send failed (webhook):', emailErr);
          }
        }
      }

      return NextResponse.json({ message: 'Payment confirmed via webhook' });
    }

    // Handle payment failure webhooks
    if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
      const cfOrderId = data.data?.order?.order_id;
      if (cfOrderId) {
        const originalOrderId = cfOrderId.split('_R')[0];
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('customOrderId', '==', originalOrderId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const orderDoc = snapshot.docs[0];
          const orderData = orderDoc.data();
          const orderRef = doc(db, 'orders', orderDoc.id);

          if (orderData.paymentStatus !== 'Success') {
            const failLog = {
              event: eventType,
              cfOrderId,
              timestamp: new Date().toISOString(),
              source: 'webhook'
            };

            await updateDoc(orderRef, {
              paymentAttempts: [...(orderData.paymentAttempts || []), failLog],
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
      return NextResponse.json({ message: 'Failure logged' });
    }

    return NextResponse.json({ message: 'Event type not handled' });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
