import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// One-time migration: fix legacy cancelled orders missing refund tracking
// POST /api/admin/migrate-refunds — admin only
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    
    let fixed = 0;
    const fixedOrders: string[] = [];

    for (const orderDoc of snapshot.docs) {
      const data = orderDoc.data();
      
      if (
        data.paymentStatus === 'Success' &&
        data.orderStatus === 'Cancelled' &&
        (data.refundedAmount === undefined || data.refundedAmount === null)
      ) {
        await updateDoc(doc(db, 'orders', orderDoc.id), {
          refundedAmount: data.totalAmount,
          refundStatus: 'Full',
          refundProcessed: true,
          updatedAt: new Date().toISOString()
        });
        fixedOrders.push(data.customOrderId || orderDoc.id);
        fixed++;
      }
    }

    return NextResponse.json({
      message: `Migration complete. Fixed ${fixed} orders.`,
      fixedOrders
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
