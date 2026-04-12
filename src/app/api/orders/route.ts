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
    const { products, phoneNumber, shippingAddress, paymentMethod, totalAmount } = data;
    
    // Validate stock
    for (let p of products) {
      const productRef = doc(db, 'products', p.productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) return NextResponse.json({ error: `Product not found: ${p.name}` }, { status: 400 });
      
      const productData = productSnap.data();
      const option = productData.options?.find((o: any) => o.weight === p.weight);
      
      if (option && option.stock < p.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${p.name} (${p.weight}). Only ${option.stock} left.` }, { status: 400 });
      }
    }

    // Decrement stock
    for (let p of products) {
      const productRef = doc(db, 'products', p.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const productData = productSnap.data();
        const updatedOptions = productData.options.map((opt: any) => {
          if (opt.weight === p.weight) {
            return { ...opt, stock: opt.stock - p.quantity };
          }
          return opt;
        });
        await updateDoc(productRef, { options: updatedOptions });
      }
    }

    const customOrderId = await generateOrderId();

    const orderData = {
      customOrderId,
      userId: payload.userId,
      phoneNumber,
      products,
      totalAmount,
      deliveryCharge: data.deliveryCharge || 0,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'Pending',
      orderStatus: 'Placed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const ordersRef = collection(db, 'orders');
    const orderDocRef = await addDoc(ordersRef, orderData);
    const newOrder = { id: orderDocRef.id, ...orderData };

    // Send email for COD
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

    // Auto-resolve stale ONLINE+Pending orders by checking with Cashfree
    const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
    const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
    const thirtyMinMs = 30 * 60 * 1000;

    for (let i = 0; i < orders.length; i++) {
      const order: any = orders[i];
      if (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'Pending') {
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
            
            if (cfData.order_status === 'PAID') {
              await updateDoc(orderRef, { paymentStatus: 'Success', updatedAt: new Date().toISOString() });
              orders[i] = { ...order, paymentStatus: 'Success' };
              resolved = true;
            } else if (cfData.order_status !== 'ACTIVE') {
              // EXPIRED, TERMINATED, etc = cancel
              await updateDoc(orderRef, { paymentStatus: 'Failed', orderStatus: 'Cancelled', updatedAt: new Date().toISOString() });
              orders[i] = { ...order, paymentStatus: 'Failed', orderStatus: 'Cancelled' };
              resolved = true;
              
              // Restore stock
              for (const p of order.products) {
                const productRef = doc(db, 'products', p.productId);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                  const pd = productSnap.data();
                  const updatedOptions = pd.options.map((opt: any) => {
                    if (opt.weight === p.weight) return { ...opt, stock: (opt.stock || 0) + p.quantity };
                    return opt;
                  });
                  await updateDoc(productRef, { options: updatedOptions });
                }
              }
            }
            // If ACTIVE & under 30 min, leave as Pending
          }
        } catch (e) {
          console.error("Cashfree recheck error for", order.customOrderId, e);
        }

        // FALLBACK: If Cashfree couldn't resolve it and order is older than 30 min, force-cancel
        if (!resolved && orderAgeMs > thirtyMinMs) {
          await updateDoc(orderRef, { paymentStatus: 'Failed', orderStatus: 'Cancelled', updatedAt: new Date().toISOString() });
          orders[i] = { ...order, paymentStatus: 'Failed', orderStatus: 'Cancelled' };
          
          for (const p of order.products) {
            const productRef = doc(db, 'products', p.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const pd = productSnap.data();
              const updatedOptions = pd.options.map((opt: any) => {
                if (opt.weight === p.weight) return { ...opt, stock: (opt.stock || 0) + p.quantity };
                return opt;
              });
              await updateDoc(productRef, { options: updatedOptions });
            }
          }
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
