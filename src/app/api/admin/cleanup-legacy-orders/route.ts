import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

// One-time cleanup: delete old broken ONLINE orders
// POST /api/admin/cleanup-legacy-orders — admin only
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Cutoff: orders created before today (only delete old test data)
    const cutoff = new Date('2026-04-12T00:00:00Z').getTime();

    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    
    let deleted = 0;
    const deletedOrders: string[] = [];

    for (const orderDoc of snapshot.docs) {
      const data = orderDoc.data();
      const createdAt = new Date(data.createdAt).getTime();

      // Only touch old orders before cutoff
      if (createdAt >= cutoff) continue;

      // Never delete successful paid orders
      if (data.paymentStatus === 'Success' && data.orderStatus !== 'Cancelled') continue;

      // Never delete valid COD orders
      if (data.paymentMethod === 'COD' && data.orderStatus !== 'Cancelled') continue;

      // Delete: old ONLINE orders that are broken (failed, cancelled, pending, or missing fields)
      if (
        data.paymentMethod === 'ONLINE' && (
          data.paymentStatus === 'Failed' ||
          data.paymentStatus === 'Awaiting' ||
          data.paymentStatus === 'Pending' ||
          data.orderStatus === 'Cancelled' ||
          data.orderStatus === 'Payment Pending'
        )
      ) {
        await deleteDoc(doc(db, 'orders', orderDoc.id));
        deletedOrders.push(data.customOrderId || orderDoc.id);
        deleted++;
      }
    }

    return NextResponse.json({
      message: `Cleanup complete. Deleted ${deleted} legacy orders.`,
      deletedCount: deleted,
      deletedOrders
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
