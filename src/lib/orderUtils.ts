import { db } from '@/lib/firestore';
import { doc, runTransaction } from 'firebase/firestore';

export async function generateOrderId() {
  const counterRef = doc(db, 'counters', 'orderId');
  
  const newSeq = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let seq = 1;
    if (counterDoc.exists()) {
      seq = (counterDoc.data().seq || 0) + 1;
    }
    transaction.set(counterRef, { id: 'orderId', seq });
    return seq;
  });

  const prefix = 'ASC' + new Date().getFullYear();
  const sequence = String(newSeq).padStart(4, '0');
  
  return `${prefix}${sequence}`;
}
