import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { sendCancellationEmail } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;

    const { id } = await params;
    
    // Find order by direct ID or customOrderId
    let orderData: any = null;
    let orderId = id;

    const directRef = doc(db, 'orders', id);
    const directSnap = await getDoc(directRef);

    if (directSnap.exists()) {
      orderData = directSnap.data();
    } else {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customOrderId', '==', id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        orderId = d.id;
        orderData = d.data();
      }
    }

    if (!orderData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (payload.role !== 'admin' && orderData.userId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (orderData.orderStatus !== 'Placed' && orderData.orderStatus !== 'Packed' && orderData.orderStatus !== 'Payment Pending') {
      return NextResponse.json({ error: 'Order cannot be cancelled at this stage' }, { status: 400 });
    }

    const { processCancellationAndRefund } = await import('@/lib/refundUtils');
    const { success, message } = await processCancellationAndRefund(orderId, orderData);
    
    if (!success) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const userRef = doc(db, 'users', orderData.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await sendCancellationEmail(userSnap.data().email, orderData, userSnap.data());
    }

    // Re-fetch the updated order
    const updatedSnap = await getDoc(doc(db, 'orders', orderId));
    const updatedOrder = { id: updatedSnap.id, ...updatedSnap.data() };

    return NextResponse.json({ message: 'Order cancelled successfully', order: updatedOrder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
