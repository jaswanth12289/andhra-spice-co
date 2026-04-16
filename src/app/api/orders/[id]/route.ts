import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { sendShippingUpdate } from '@/lib/email';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;

    const { id } = await params;
    
    // Try direct document lookup first, then search by customOrderId
    let orderData: any = null;
    let orderId = id;

    const directRef = doc(db, 'orders', id);
    const directSnap = await getDoc(directRef);

    if (directSnap.exists()) {
      orderData = { id: directSnap.id, ...directSnap.data() };
    } else {
      // Search by customOrderId
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customOrderId', '==', id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        orderId = d.id;
        orderData = { id: d.id, ...d.data() };
      }
    }

    if (!orderData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (payload.role !== 'admin' && orderData.userId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Self-heal: Fix mismatch where payment succeeded but orderStatus stuck
    if (orderData.paymentMethod === 'ONLINE' && orderData.paymentStatus === 'Success' && orderData.orderStatus === 'Payment Pending') {
      const fixRef = doc(db, 'orders', orderId);
      await updateDoc(fixRef, { orderStatus: 'Placed', updatedAt: new Date().toISOString() });
      orderData.orderStatus = 'Placed';
    }

    return NextResponse.json(orderData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const data = await req.json();

    const orderRef = doc(db, 'orders', id);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const orderData = orderSnap.data();

    if (data.orderStatus === 'Cancelled' && orderData.orderStatus !== 'Cancelled') {
      const { processCancellationAndRefund } = await import('@/lib/refundUtils');
      const { success, message } = await processCancellationAndRefund(id, orderData);
      
      if (!success) {
        return NextResponse.json({ error: message }, { status: 400 });
      }

      const userRef = doc(db, 'users', orderData.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const { sendCancellationEmail } = await import('@/lib/email');
        await sendCancellationEmail(userSnap.data().email, { ...orderData, customOrderId: orderData.customOrderId }, userSnap.data());
      }

      const updatedSnap = await getDoc(orderRef);
      return NextResponse.json({ id: updatedSnap.id, ...updatedSnap.data() });
    }

    // State transition guard — prevent invalid status changes
    if (data.orderStatus) {
      const invalidTransitions: Record<string, string[]> = {
        'Cancelled': ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Payment Pending'],
        'Delivered': ['Placed', 'Packed', 'Shipped', 'Payment Pending'],
        'Failed': ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'],
      };

      const currentStatus = orderData.orderStatus;
      const blocked = invalidTransitions[currentStatus];
      if (blocked && blocked.includes(data.orderStatus)) {
        return NextResponse.json({ error: `Cannot change from "${currentStatus}" to "${data.orderStatus}"` }, { status: 400 });
      }

      // Block progressing unpaid ONLINE orders past "Payment Pending"
      if (orderData.paymentMethod === 'ONLINE' && orderData.paymentStatus !== 'Success' && orderData.paymentStatus !== 'Refunded') {
        const paidOnlyStatuses = ['Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
        if (paidOnlyStatuses.includes(data.orderStatus)) {
          return NextResponse.json({ error: `Cannot set "${data.orderStatus}" — ONLINE payment not confirmed yet` }, { status: 400 });
        }
      }
    }

    // Normal update for shipping/tracking etc — only allow whitelisted fields
    const allowedFields = ['orderStatus', 'courierType', 'trackingId', 'adminNotes'];
    const safeUpdate: any = { updatedAt: new Date().toISOString() };
    for (const key of allowedFields) {
      if (data[key] !== undefined) safeUpdate[key] = data[key];
    }
    await updateDoc(orderRef, safeUpdate);
    
    const updatedSnap = await getDoc(orderRef);
    const updatedOrder = { id: updatedSnap.id, ...updatedSnap.data() };

    if (data.orderStatus === 'Shipped' || data.trackingId) {
      const userRef = doc(db, 'users', orderData.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await sendShippingUpdate(userSnap.data().email, updatedOrder, userSnap.data());
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const { deleteDoc } = await import('firebase/firestore');

    const orderRef = doc(db, 'orders', id);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteDoc(orderRef);
    return NextResponse.json({ success: true, message: 'Order deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
