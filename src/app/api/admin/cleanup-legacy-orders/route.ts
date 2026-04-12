import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

// Cleanup: delete all broken/test ONLINE orders
// POST /api/admin/cleanup-legacy-orders — admin only
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    
    let deleted = 0;
    const deletedOrders: string[] = [];

    for (const orderDoc of snapshot.docs) {
      const data = orderDoc.data();

      // KEEP: Successfully paid and active orders
      if (data.paymentStatus === 'Success' && data.orderStatus !== 'Cancelled') continue;

      // KEEP: Valid COD orders that are not cancelled
      if (data.paymentMethod === 'COD' && data.orderStatus !== 'Cancelled') continue;

      // DELETE everything else: failed, pending, cancelled, broken ONLINE orders
      await deleteDoc(doc(db, 'orders', orderDoc.id));
      deletedOrders.push(data.customOrderId || orderDoc.id);
      deleted++;
    }

    return NextResponse.json({
      message: `Cleanup complete. Deleted ${deleted} orders.`,
      deletedCount: deleted,
      deletedOrders
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
