import Product from '@/models/Product';
import Order from '@/models/Order';

/**
 * Validates and processes a Cashfree refund if applicable, and restores product stock.
 */
export async function processCancellationAndRefund(order: any): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Process Online Refunds through Cashfree
    if (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'Success') {
      const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
      const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

      const payload = {
        refund_amount: order.totalAmount,
        refund_id: `ref_${order.customOrderId}_${Date.now()}`,
        refund_note: "Order cancelled by user or admin"
      };

      const response = await fetch(`${cashfreeBaseUrl}/orders/${order.customOrderId}/refunds`, {
        method: 'POST',
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID || '',
          'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Cashfree Refund Failed:", data);
        return { success: false, message: data.message || 'Refund processing failed' };
      }

      order.paymentStatus = 'Refunded';
    } else if (order.paymentMethod === 'COD' && order.paymentStatus === 'Pending') {
      // COD isn't paid, just mark Cancelled.
      order.paymentStatus = 'Failed'; // or leave it Pending based on your schema logic
    }

    // 2. Restore Stock to Inventory
    for (const p of order.products) {
      if (p.weight) {
        const optionRestore = await Product.updateOne(
          { _id: p.productId, "options.weight": p.weight },
          { $inc: { "options.$.stock": p.quantity } }
        );
        // Fallback
        if (optionRestore.matchedCount === 0) {
          await Product.findByIdAndUpdate(p.productId, { $inc: { stock: p.quantity } });
        }
      } else {
        await Product.findByIdAndUpdate(p.productId, { $inc: { stock: p.quantity } });
      }
    }

    // 3. Mark Order as Cancelled
    order.orderStatus = 'Cancelled';
    await order.save();

    return { success: true, message: 'Order properly cancelled and refunded' };

  } catch (error: any) {
    console.error("Cancellation Error:", error);
    return { success: false, message: error.message };
  }
}
