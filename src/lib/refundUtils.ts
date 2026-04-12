import { db } from '@/lib/firestore';
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';

/**
 * Validates and processes a Cashfree refund if applicable, and restores product stock.
 */
export async function processCancellationAndRefund(orderId: string, orderData: any): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Process Online Refunds through Cashfree
    if (orderData.paymentMethod === 'ONLINE' && orderData.paymentStatus === 'Success' && !orderData.refundProcessed) {
      const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === 'sandbox';
      const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

      const payload = {
        refund_amount: orderData.totalAmount,
        refund_id: `ref_${orderData.customOrderId}_${Date.now()}`,
        refund_note: "Order cancelled by user or admin"
      };

      const response = await fetch(`${cashfreeBaseUrl}/orders/${orderData.customOrderId}/refunds`, {
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

      orderData.paymentStatus = 'Refunded';
    } else if (orderData.paymentMethod === 'COD' && orderData.paymentStatus === 'Pending') {
      orderData.paymentStatus = 'Failed';
    } else if (orderData.paymentMethod === 'ONLINE' && (orderData.paymentStatus === 'Awaiting' || orderData.paymentStatus === 'Pending')) {
      // ONLINE order that was never paid — just cancel, no refund needed
      orderData.paymentStatus = 'Failed';
    }

    // 2. Restore Stock to Inventory — ONLY if stock was actually deducted
    if (orderData.stockDeducted) {
      for (const p of orderData.products) {
        const productRef = doc(db, 'products', p.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          const options = productData.options || [];
          const updatedOptions = options.map((opt: any) => {
            if (opt.weight === p.weight) {
              return { ...opt, stock: (opt.stock || 0) + p.quantity };
            }
            return opt;
          });
          await updateDoc(productRef, { options: updatedOptions });
        }
      }
    }

    // 3. Mark Order as Cancelled
    const orderRef = doc(db, 'orders', orderId);
    const cancelUpdate: any = {
      orderStatus: 'Cancelled',
      paymentStatus: orderData.paymentStatus,
      stockDeducted: false,
      updatedAt: new Date().toISOString()
    };
    // Track refund if payment was successful
    if (orderData.paymentStatus === 'Refunded') {
      cancelUpdate.refundProcessed = true;
      cancelUpdate.refundedAmount = orderData.totalAmount;
      cancelUpdate.refundStatus = 'Full';
    }
    await updateDoc(orderRef, cancelUpdate);

    return { success: true, message: 'Order properly cancelled and refunded' };

  } catch (error: any) {
    console.error("Cancellation Error:", error);
    return { success: false, message: error.message };
  }
}
