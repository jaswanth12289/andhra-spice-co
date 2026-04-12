import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

// Nuclear cleanup: delete ALL orders (test data only)
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    
    let deleted = 0;
    for (const orderDoc of snapshot.docs) {
      await deleteDoc(doc(db, 'orders', orderDoc.id));
      deleted++;
    }

    // Reset order counter
    const counterRef = doc(db, 'counters', 'orderId');
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(counterRef, { seq: 0 });

    return NextResponse.json({
      message: `Deleted all ${deleted} test orders. Counter reset to 0.`,
      deletedCount: deleted
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
