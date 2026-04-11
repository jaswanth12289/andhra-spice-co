import Counter from '@/models/Counter';

export async function generateOrderId() {
  const counter = await Counter.findOneAndUpdate(
    { id: 'orderId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const prefix = 'ASC' + new Date().getFullYear();
  const sequence = String(counter.seq).padStart(4, '0');
  
  return `${prefix}${sequence}`;
}
