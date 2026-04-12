'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Truck, CheckCircle, Package, MapPin, XCircle, RefreshCw, Clock, CreditCard } from 'lucide-react';

import { useCartStore } from '@/store/useCartStore';

export default function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) throw new Error();
        let data = await res.json();
        
        // If ONLINE payment is still Pending/Awaiting, re-verify with Cashfree
        if (data.paymentMethod === 'ONLINE' && (data.paymentStatus === 'Pending' || data.paymentStatus === 'Awaiting')) {
          const recheckRes = await fetch(`/api/orders/${id}/recheck`);
          if (recheckRes.ok) {
            const updatedRes = await fetch(`/api/orders/${id}`);
            if (updatedRes.ok) {
              data = await updatedRes.json();
            }
          }
        }

        setOrder(data);
        if (data.paymentStatus === 'Success' || data.paymentMethod === 'COD') {
          useCartStore.getState().clearCart();
        }
      } catch {
        toast.error('Order not found');
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [id]);

  if (loading) return <div className="text-center py-20 font-bold text-xl animate-pulse">Loading order details...</div>;
  if (!order) return <div className="text-center py-20 text-xl font-bold">Order not found</div>;

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Order cancelled successfully');
      setOrder(data.order);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRetryPayment = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/orders/${order.customOrderId || id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (typeof window !== 'undefined' && (window as any).Cashfree) {
        const cashfree = (window as any).Cashfree({
          mode: data.cashfree_environment || 'production',
        });
        cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: "_self"
        });
      } else {
        toast.error("Payment gateway did not load. Please refresh and try again.");
        setRetrying(false);
      }
    } catch (error: any) {
      toast.error(error.message);
      setRetrying(false);
    }
  };

  const getTrackingLink = () => {
    if (!order.trackingId) return null;
    if (order.courierType === 'DTDC') return `https://www.dtdc.in/tracking?awb=${order.trackingId}`;
    if (order.courierType === 'India Post') return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    return null;
  };

  const getStatusBadge = () => {
    const ps = order.paymentStatus;
    if (ps === 'Success') return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Paid</span>;
    if (ps === 'Failed') return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" /> Failed</span>;
    if (ps === 'Awaiting' || ps === 'Pending') return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" /> Awaiting</span>;
    if (ps === 'Refunded') return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><RefreshCw className="w-3 h-3 mr-1" /> Refunded</span>;
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">{ps}</span>;
  };

  const canRetryPayment = order.paymentMethod === 'ONLINE' && 
    (order.paymentStatus === 'Failed' || order.paymentStatus === 'Awaiting' || order.paymentStatus === 'Pending') &&
    order.orderStatus !== 'Cancelled';

  return (
    <div className="max-w-4xl mx-auto px-4 pt-28 pb-12">
      <div className="bg-white dark:bg-spice-900 border border-spice-200 p-8 sm:p-12 rounded-3xl shadow-lg">
        <div className="text-center mb-10 border-b pb-8">
          {order.orderStatus === 'Cancelled' ? (
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          ) : order.orderStatus === 'Payment Pending' || order.paymentStatus === 'Awaiting' ? (
            <CreditCard className="w-20 h-20 text-yellow-500 mx-auto mb-4 animate-pulse" />
          ) : order.paymentStatus === 'Success' ? (
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          ) : (
            <Package className="w-20 h-20 text-spice-500 mx-auto mb-4" />
          )}
          <h1 className="text-4xl font-bold font-outfit text-spice-900 dark:text-spice-100">
            {order.orderStatus === 'Cancelled' 
              ? (order.paymentStatus === 'Failed' ? 'Payment Failed' : 'Order Cancelled') 
              : order.orderStatus === 'Payment Pending' || order.paymentStatus === 'Awaiting'
                ? 'Awaiting Payment...'
                : 'Order Placed Successfully!'}
          </h1>
          <p className="mt-4 text-xl">Order ID: <span className="font-bold font-mono bg-spice-100 dark:bg-black px-4 py-2 rounded-lg">{order.customOrderId}</span></p>
          <div className="mt-3 flex items-center justify-center space-x-3">
            <span className="text-spice-600 dark:text-spice-400">₹{order.totalAmount}</span>
            <span className="text-spice-300">•</span>
            <span className="text-spice-600 dark:text-spice-400">{order.paymentMethod}</span>
            <span className="text-spice-300">•</span>
            {getStatusBadge()}
          </div>
        </div>

        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold font-outfit mb-4">
            Status: <span className={
              order.orderStatus === 'Cancelled' ? 'text-red-500' : 
              order.orderStatus === 'Payment Pending' ? 'text-yellow-500' : 
              order.orderStatus === 'Delivered' ? 'text-green-600' : 'text-spice-600'
            }>{order.orderStatus}</span>
          </h2>
          {order.orderStatus === 'Shipped' || order.orderStatus === 'Out for Delivery' ? (
            <div className="bg-spice-50 dark:bg-spice-800 p-6 rounded-xl border border-spice-200 max-w-lg mx-auto">
              <Truck className="w-10 h-10 mx-auto text-spice-600 mb-2" />
              <p className="font-bold text-lg mb-1">{order.courierType}</p>
              <p className="font-mono bg-white dark:bg-black p-2 rounded inline-block border mb-4">{order.trackingId}</p>
              <p className="text-sm font-bold text-green-600 mb-4">Estimated Delivery: 3-5 days</p>
              {getTrackingLink() && (
                <a href={getTrackingLink()!} target="_blank" className="block w-full bg-spice-600 hover:bg-spice-700 text-white font-bold py-3 rounded-xl transition">Track Package</a>
              )}
            </div>
          ) : order.orderStatus === 'Cancelled' ? (
            <div className="text-red-500 flex justify-center items-center space-x-2">
              <span>{order.paymentStatus === 'Failed' ? 'Your online payment failed or was abandoned.' : 'This order has been cancelled.'}</span>
            </div>
          ) : order.orderStatus === 'Payment Pending' ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 p-6 rounded-xl max-w-lg mx-auto">
              <CreditCard className="w-10 h-10 mx-auto text-yellow-500 mb-2" />
              <p className="text-yellow-700 dark:text-yellow-400 font-semibold">Your payment is being processed or was not completed.</p>
              <p className="text-sm text-yellow-600/70 dark:text-yellow-400/50 mt-1">The order will be confirmed once payment is received.</p>
            </div>
          ) : (
             <div className="text-spice-500 flex justify-center items-center space-x-2">
               <Package /><span>We are processing your order.</span>
             </div>
          )}
        </div>

        {/* Retry Payment Button */}
        {canRetryPayment && (
          <div className="mb-10 text-center">
            <div className="bg-gradient-to-r from-spice-50 to-orange-50 dark:from-spice-900/30 dark:to-orange-900/20 border border-spice-200 dark:border-spice-800 p-6 rounded-2xl max-w-lg mx-auto">
              <p className="text-sm text-spice-600 dark:text-spice-400 mb-4">Payment didn&apos;t go through? Try again:</p>
              <button
                onClick={handleRetryPayment}
                disabled={retrying}
                className="w-full bg-gradient-to-r from-spice-600 to-orange-500 hover:from-spice-700 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-xl transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg"
              >
                <RefreshCw className={`w-5 h-5 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Initiating Payment...' : 'Retry Payment'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2" /> Shipping Address</h3>
            <div className="bg-spice-50 dark:bg-black p-4 rounded-xl border border-spice-200">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p className="font-bold mt-2">Phone: {order.phoneNumber}</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center"><Package className="w-5 h-5 mr-2" /> Items</h3>
            <div className="bg-spice-50 dark:bg-black p-4 rounded-xl border border-spice-200 max-h-48 overflow-y-auto">
              {order.products.map((p: any) => (
                <div key={p.productId} className="flex justify-between border-b border-spice-200 py-2 last:border-0 text-sm">
                  <span>{p.quantity} x {p.name}</span>
                  <span className="font-bold">₹{p.price * p.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Attempts History */}
        {order.paymentAttempts && order.paymentAttempts.length > 0 && (
          <div className="mb-10">
            <h3 className="font-bold text-lg mb-4 flex items-center"><Clock className="w-5 h-5 mr-2" /> Payment History</h3>
            <div className="bg-spice-50 dark:bg-black p-4 rounded-xl border border-spice-200 space-y-2 max-h-40 overflow-y-auto">
              {order.paymentAttempts.map((a: any, i: number) => (
                <div key={i} className="flex justify-between text-xs text-spice-600 dark:text-spice-400 border-b border-spice-100 dark:border-spice-800 last:border-0 py-1">
                  <span className="font-mono">{a.event}</span>
                  <span>{new Date(a.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center space-x-4">
          <Link href="/products" className="inline-block bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-8 rounded-full transition hover:opacity-80">
            Continue Shopping
          </Link>
          {(order.orderStatus === 'Placed' || order.orderStatus === 'Packed') && (
            <button onClick={handleCancel} className="inline-block border-2 border-red-500 text-red-500 font-bold py-3 px-8 rounded-full transition hover:bg-red-500 hover:text-white">
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
