import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { generateOrderId } from '@/lib/orderUtils';
import { sendOrderConfirmation } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const { products, phoneNumber, shippingAddress, paymentMethod } = data;
    
    // Server-side price validation & stock check
    let serverTotal = 0;
    for (let p of products) {
      const productRef = doc(db, 'products', p.productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) return NextResponse.json({ error: `Product not found: ${p.name}` }, { status: 400 });
      
      const productData = productSnap.data();
      const option = productData.options?.find((o: any) => o.weight === p.weight);
      
      if (!option) return NextResponse.json({ error: `Invalid variant for ${p.name} (${p.weight})` }, { status: 400 });
      if (option.stock < p.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${p.name} (${p.weight}). Only ${option.stock} left.` }, { status: 400 });
      }
      serverTotal += option.price * p.quantity;
    }

    // Calculate delivery charge server-side
    const deliveryCharge = serverTotal > 499 ? 0 : 60;
    const totalAmount = serverTotal + deliveryCharge;

    // Anti-duplication: reuse existing pending ONLINE order with same items
    if (paymentMethod === 'ONLINE') {
      const ordersRef = collection(db, 'orders');
      const existingQ = query(ordersRef, where('userId', '==', payload.userId));
      const existingSnap = await getDocs(existingQ);
      
      for (const existDoc of existingSnap.docs) {
        const existing = existDoc.data();
        if (
          existing.paymentMethod === 'ONLINE' &&
          (existing.paymentStatus === 'Awaiting' || existing.paymentStatus === 'Pending') &&
          existing.orderStatus === 'Payment Pending' &&
          (Date.now() - new Date(existing.createdAt).getTime()) < 30 * 60 * 1000
        ) {
          const sameProducts = JSON.stringify(existing.products.map((p: any) => `${p.productId}_${p.weight}_${p.quantity}`).sort()) ===
            JSON.stringify(products.map((p: any) => `${p.productId}_${p.weight}_${p.quantity}`).sort());
          
          if (sameProducts) {
            // Reuse this order — create a new Cashfree payment session with unique suffix
            const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
            const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
            const domainUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
            
            const retrySuffix = `R${Date.now()}`;
            const cfOrderId = `${existing.customOrderId}_${retrySuffix}`;
            
            const userRef = doc(db, 'users', payload.userId);
            const userSnap = await getDoc(userRef);
            const userEmail = userSnap.exists() ? userSnap.data().email : 'customer@example.com';

            try {
              const cfRes = await fetch(`${cashfreeBaseUrl}/orders`, {
                method: 'POST',
                headers: {
                  'x-client-id': process.env.CASHFREE_APP_ID || '',
                  'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
                  'x-api-version': '2023-08-01',
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({
                  order_id: cfOrderId,
                  order_amount: existing.totalAmount,
                  order_currency: 'INR',
                  customer_details: {
                    customer_id: payload.userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50),
                    customer_phone: existing.phoneNumber,
                    customer_email: userEmail
                  },
                  order_meta: {
                    return_url: `${domainUrl}/api/payment/verify?order_id=${cfOrderId}&original_order=${existing.customOrderId}`
                  }
                })
              });

              if (cfRes.ok) {
                const cfData = await cfRes.json();
                const attempt = { event: 'DEDUP_REUSE', cfOrderId, timestamp: new Date().toISOString(), source: 'checkout' };
                
                await updateDoc(doc(db, 'orders', existDoc.id), {
                  cashfreeOrderId: cfOrderId,
                  paymentAttempts: [...(existing.paymentAttempts || []), attempt],
                  updatedAt: new Date().toISOString()
                });

                return NextResponse.json({
                  id: existDoc.id,
                  ...existing,
                  payment_session_id: cfData.payment_session_id,
                  cashfree_environment: isSandbox ? 'sandbox' : 'production'
                }, { status: 201 });
              }
              // If Cashfree rejects, fall through to create a completely new order below
              console.error('Dedup Cashfree retry failed:', await cfRes.text());
            } catch (e) {
              console.error('Dedup Cashfree error:', e);
            }
            
            // Cancel the stale order so a fresh one can be created
            await updateDoc(doc(db, 'orders', existDoc.id), {
              orderStatus: 'Cancelled',
              paymentStatus: 'Failed',
              paymentAttempts: [...(existing.paymentAttempts || []), { event: 'DEDUP_CANCELLED', timestamp: new Date().toISOString(), source: 'checkout' }],
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }

    // Only deduct stock for COD (ONLINE deducts after payment confirmation)
    if (paymentMethod === 'COD') {
      for (let p of products) {
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

    const customOrderId = await generateOrderId();

    const orderData = {
      customOrderId,
      userId: payload.userId,
      phoneNumber,
      products,
      totalAmount,
      deliveryCharge,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Awaiting',
      orderStatus: paymentMethod === 'COD' ? 'Placed' : 'Payment Pending',
      stockDeducted: paymentMethod === 'COD',
      paymentAttempts: [{ event: 'ORDER_CREATED', timestamp: new Date().toISOString(), source: 'checkout' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const ordersCollRef = collection(db, 'orders');
    const orderDocRef = await addDoc(ordersCollRef, orderData);
    const newOrder = { id: orderDocRef.id, ...orderData };

    // Send email only for COD
    const userRef = doc(db, 'users', payload.userId);
    const userSnap = await getDoc(userRef);
    const user = userSnap.exists() ? userSnap.data() : null;

    if (user && paymentMethod === 'COD') {
      try {
        await sendOrderConfirmation(user.email, newOrder, user);
        await updateDoc(doc(db, 'orders', orderDocRef.id), { emailSent: true });
      } catch (emailErr) {
        console.error('COD email send failed:', emailErr);
      }
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
          customer_id: payload.userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50),
          customer_phone: phoneNumber,
          customer_email: user?.email || 'customer@example.com'
        },
        order_meta: {
          return_url: `${domainUrl}/api/payment/verify?order_id=${customOrderId}`
        }
      };

      try {
        let cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders`, {
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

        let cashfreeData = await cashfreeResponse.json();

        // Handle "order with same id already present" — create with unique suffix
        if (!cashfreeResponse.ok && cashfreeData?.message?.includes('already')) {
          console.warn('Cashfree duplicate, retrying with suffix for', customOrderId);
          const suffixedId = `${customOrderId}_R${Date.now()}`;
          cashfreePayload.order_id = suffixedId;
          (cashfreePayload.order_meta as any).return_url = `${domainUrl}/api/payment/verify?order_id=${suffixedId}&original_order=${customOrderId}`;

          cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders`, {
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
          cashfreeData = await cashfreeResponse.json();

          if (cashfreeResponse.ok) {
            await updateDoc(doc(db, 'orders', orderDocRef.id), { cashfreeOrderId: suffixedId });
          }
        }

        if (!cashfreeResponse.ok) {
          console.error("Cashfree order error:", JSON.stringify(cashfreeData));
          await updateDoc(doc(db, 'orders', orderDocRef.id), {
            paymentStatus: 'Failed',
            orderStatus: 'Cancelled',
            paymentAttempts: [...(orderData.paymentAttempts || []), { event: 'CASHFREE_INIT_FAILED', error: cashfreeData?.message, timestamp: new Date().toISOString() }],
            updatedAt: new Date().toISOString()
          });
          // User-friendly error message instead of raw Cashfree error
          return NextResponse.json({ error: 'Unable to initialize payment. Please try again in a moment.' }, { status: 500 });
        }

        return NextResponse.json({
          ...newOrder,
          payment_session_id: cashfreeData.payment_session_id,
          cashfree_environment: isSandbox ? 'sandbox' : 'production'
        }, { status: 201 });

      } catch (err: any) {
        await updateDoc(doc(db, 'orders', orderDocRef.id), {
          paymentStatus: 'Failed',
          orderStatus: 'Cancelled',
          paymentAttempts: [...(orderData.paymentAttempts || []), { event: 'CASHFREE_INIT_ERROR', error: err.message, timestamp: new Date().toISOString() }],
          updatedAt: new Date().toISOString()
        });
        return NextResponse.json({ error: 'Payment service is temporarily unavailable. Please try again.' }, { status: 500 });
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
    
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    let orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by user if not admin
    if (payload.role !== 'admin') {
      orders = orders.filter((o: any) => o.userId === payload.userId);
    }

    // SELF-HEAL: Fix ONLINE orders where paymentStatus=Success but orderStatus still stuck on "Payment Pending"
    for (let i = 0; i < orders.length; i++) {
      const order: any = orders[i];
      if (
        order.paymentMethod === 'ONLINE' &&
        order.paymentStatus === 'Success' &&
        order.orderStatus === 'Payment Pending'
      ) {
        const orderRef = doc(db, 'orders', order.id);
        await updateDoc(orderRef, { orderStatus: 'Placed', updatedAt: new Date().toISOString() });
        orders[i] = { ...order, orderStatus: 'Placed' };
      }
    }

    // LEGACY FIX: Fix old ONLINE orders that show "Placed" but were never paid
    for (let i = 0; i < orders.length; i++) {
      const order: any = orders[i];
      if (
        order.paymentMethod === 'ONLINE' &&
        order.orderStatus === 'Placed' &&
        order.paymentStatus !== 'Success' &&
        order.paymentStatus !== 'Refunded'
      ) {
        const orderRef = doc(db, 'orders', order.id);
        await updateDoc(orderRef, { orderStatus: 'Payment Pending', paymentStatus: order.paymentStatus || 'Awaiting', updatedAt: new Date().toISOString() });
        orders[i] = { ...order, orderStatus: 'Payment Pending', paymentStatus: order.paymentStatus || 'Awaiting' };
      }
    }

    // Auto-resolve stale ONLINE orders by checking with Cashfree
    const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
    const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
    const thirtyMinMs = 30 * 60 * 1000;

    for (let i = 0; i < orders.length; i++) {
      const order: any = orders[i];
      if (order.paymentMethod === 'ONLINE' && (order.paymentStatus === 'Pending' || order.paymentStatus === 'Awaiting')) {
        const orderRef = doc(db, 'orders', order.id);
        const orderAgeMs = Date.now() - new Date(order.createdAt).getTime();
        let resolved = false;

        try {
          const cfRes = await fetch(`${cashfreeBaseUrl}/orders/${order.customOrderId}`, {
            method: 'GET',
            headers: {
              'x-client-id': process.env.CASHFREE_APP_ID || '',
              'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
              'x-api-version': '2023-08-01',
              'Accept': 'application/json'
            }
          });
          
          if (cfRes.ok) {
            const cfData = await cfRes.json();
            
            if (cfData.order_status === 'PAID' && !order.stockDeducted) {
              for (const p of order.products) {
                const productRef = doc(db, 'products', p.productId);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                  const pd = productSnap.data();
                  const updatedOptions = pd.options.map((opt: any) => {
                    if (opt.weight === p.weight) return { ...opt, stock: Math.max(0, (opt.stock || 0) - p.quantity) };
                    return opt;
                  });
                  await updateDoc(productRef, { options: updatedOptions });
                }
              }
              await updateDoc(orderRef, { paymentStatus: 'Success', orderStatus: 'Placed', stockDeducted: true, updatedAt: new Date().toISOString() });
              orders[i] = { ...order, paymentStatus: 'Success', orderStatus: 'Placed', stockDeducted: true };
              resolved = true;
            } else if (cfData.order_status === 'PAID' && order.stockDeducted) {
              await updateDoc(orderRef, { paymentStatus: 'Success', orderStatus: 'Placed', updatedAt: new Date().toISOString() });
              orders[i] = { ...order, paymentStatus: 'Success', orderStatus: 'Placed' };
              resolved = true;
            } else if (cfData.order_status !== 'ACTIVE') {
              await updateDoc(orderRef, { paymentStatus: 'Failed', orderStatus: 'Cancelled', updatedAt: new Date().toISOString() });
              orders[i] = { ...order, paymentStatus: 'Failed', orderStatus: 'Cancelled' };
              resolved = true;
            }
          }
        } catch (e) {
          console.error("Cashfree recheck error for", order.customOrderId, e);
        }

        // FALLBACK: 30 min timeout → force-cancel
        if (!resolved && orderAgeMs > thirtyMinMs) {
          await updateDoc(orderRef, { paymentStatus: 'Failed', orderStatus: 'Cancelled', updatedAt: new Date().toISOString() });
          orders[i] = { ...order, paymentStatus: 'Failed', orderStatus: 'Cancelled' };
        }
      }
    }

    // Sort by createdAt descending
    orders.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
