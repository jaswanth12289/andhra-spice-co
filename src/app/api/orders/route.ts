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

    // Anti-duplication: check if user already has a recent pending ONLINE order with same items
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
          (Date.now() - new Date(existing.createdAt).getTime()) < 10 * 60 * 1000 // within 10 min
        ) {
          // Check if same products
          const sameProducts = JSON.stringify(existing.products.map((p: any) => `${p.productId}_${p.weight}_${p.quantity}`).sort()) ===
            JSON.stringify(products.map((p: any) => `${p.productId}_${p.weight}_${p.quantity}`).sort());
          
          if (sameProducts) {
            // Reuse existing order — generate new Cashfree session
            const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
            const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
            const domainUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
            
            const retryCount = (existing.paymentAttempts?.length || 0) + 1;
            const cfOrderId = `${existing.customOrderId}_R${retryCount}`;
            
            const userRef = doc(db, 'users', payload.userId);
            const userSnap = await getDoc(userRef);
            const userEmail = userSnap.exists() ? userSnap.data().email : 'customer@example.com';

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
              const attempt = { event: 'DEDUP_RETRY', cfOrderId, timestamp: new Date().toISOString(), source: 'checkout' };
              
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
            if (opt.weight === p.weight) return { ...opt, stock: opt.stock - p.quantity };
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
          customer_id: payload.userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50),
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
          console.error("Cashfree order error:", JSON.stringify(cashfreeData));
          const cfMessage = cashfreeData?.message || cashfreeData?.error?.message || 'Payment gateway initialization failed';
          return NextResponse.json({ error: cfMessage, details: cashfreeData }, { status: 500 });
        }

        return NextResponse.json({
          ...newOrder,
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
    
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    let orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by user if not admin
    if (payload.role !== 'admin') {
      orders = orders.filter((o: any) => o.userId === payload.userId);
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
              // Deduct stock now
              for (const p of order.products) {
                const productRef = doc(db, 'products', p.productId);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                  const pd = productSnap.data();
                  const updatedOptions = pd.options.map((opt: any) => {
                    if (opt.weight === p.weight) return { ...opt, stock: opt.stock - p.quantity };
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
              // EXPIRED, TERMINATED — no stock was deducted, just cancel
              await updateDoc(orderRef, { paymentStatus: 'Failed', orderStatus: 'Cancelled', updatedAt: new Date().toISOString() });
              orders[i] = { ...order, paymentStatus: 'Failed', orderStatus: 'Cancelled' };
              resolved = true;
            }
          }
        } catch (e) {
          console.error("Cashfree recheck error for", order.customOrderId, e);
        }

        // FALLBACK: order older than 30 min and still unresolved = force-cancel
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
