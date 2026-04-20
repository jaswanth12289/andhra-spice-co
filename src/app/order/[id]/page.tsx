'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Truck, CheckCircle, Package, MapPin, XCircle, RefreshCw, Clock, CreditCard, ShoppingBag, Box } from 'lucide-react';

import { useCartStore } from '@/store/useCartStore';

const TIMELINE_STEPS = [
  { key: 'Payment Pending', label: 'Payment', icon: CreditCard },
  { key: 'Placed', label: 'Confirmed', icon: CheckCircle },
  { key: 'Packed', label: 'Packed', icon: Box },
  { key: 'Shipped', label: 'Shipped', icon: Truck },
  { key: 'Delivered', label: 'Delivered', icon: Package },
];

const STATUS_ORDER: Record<string, number> = {
  'Payment Pending': 0,
  'Placed': 1,
  'Packed': 2,
  'Shipped': 3,
  'Out for Delivery': 3,
  'Delivered': 4,
};

function OrderTimeline({ status, paymentMethod }: { status: string; paymentMethod: string }) {
  const currentStep = STATUS_ORDER[status] ?? -1;
  const steps = paymentMethod === 'COD' ? TIMELINE_STEPS.filter(s => s.key !== 'Payment Pending') : TIMELINE_STEPS;

  return (
    <div className="w-full overflow-x-auto hide-scrollbar pb-4 -mx-2 px-2 sm:mx-0 sm:px-0">
      <div className="flex items-center justify-between min-w-[500px] sm:min-w-0 w-full max-w-xl mx-auto my-4 sm:my-8">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          const stepIndex = paymentMethod === 'COD' ? i + 1 : i;
          const isActive = currentStep >= stepIndex;
          const isCurrent = currentStep === stepIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center relative w-16 sm:w-20">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 ${
                  isActive ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 
                  'bg-spice-100 dark:bg-spice-800 text-spice-400'
                } ${isCurrent ? 'ring-4 ring-green-500/30 scale-110' : ''}`}>
                  <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-[9px] sm:text-[10px] mt-2 font-bold uppercase tracking-wider text-center ${
                  isActive ? 'text-green-600 dark:text-green-400' : 'text-spice-400'
                }`}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 -mx-2 sm:mx-0 rounded transition-all duration-500 w-full ${
                  currentStep > stepIndex ? 'bg-green-500' : 'bg-spice-200 dark:bg-spice-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    'Success': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: '🟢 Paid' },
    'Failed': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: '🔴 Failed' },
    'Awaiting': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: '🟡 Awaiting Payment' },
    'Pending': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: '🟡 Pending' },
    'Refunded': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: '🟣 Refunded' },
  };
  const c = config[status] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', label: status };
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
}

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
        
        if (data.paymentMethod === 'ONLINE' && (data.paymentStatus === 'Pending' || data.paymentStatus === 'Awaiting')) {
          const recheckRes = await fetch(`/api/orders/${id}/recheck`);
          if (recheckRes.ok) {
            const updatedRes = await fetch(`/api/orders/${id}`);
            if (updatedRes.ok) data = await updatedRes.json();
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-spice-200 border-t-spice-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-bold text-lg animate-pulse">Loading order details...</p>
      </div>
    </div>
  );
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
        const cashfree = (window as any).Cashfree({ mode: data.cashfree_environment || 'production' });
        cashfree.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: "_self" });
      } else {
        toast.error("Payment gateway did not load. Please refresh.");
        setRetrying(false);
      }
    } catch (error: any) {
      toast.error(error.message);
      setRetrying(false);
    }
  };

  const getTrackingLink = () => {
    if (!order.trackingId) return null;
    if (order.courierType === 'DTDC') return `https://www.dtdc.in/tracking/default.aspx?type=0&strCnno=${order.trackingId}`;
    if (order.courierType === 'India Post') return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?articleNumber=${order.trackingId}`;
    return null;
  };

  const canRetryPayment = order.paymentMethod === 'ONLINE' && 
    (order.paymentStatus === 'Failed' || order.paymentStatus === 'Awaiting' || order.paymentStatus === 'Pending') &&
    order.orderStatus !== 'Cancelled';

  const isCancelled = order.orderStatus === 'Cancelled';
  const isPaid = order.paymentStatus === 'Success';
  const isPaymentPending = order.orderStatus === 'Payment Pending' || order.paymentStatus === 'Awaiting';

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
      <div className="bg-white dark:bg-spice-900 border border-spice-200 dark:border-spice-800 p-4 sm:p-8 md:p-12 rounded-3xl shadow-lg">
        
        {/* Header */}
        <div className="text-center mb-6">
          {isCancelled ? (
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          ) : isPaymentPending ? (
            <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <CreditCard className="w-12 h-12 text-yellow-500" />
            </div>
          ) : isPaid ? (
            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-spice-50 dark:bg-spice-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-12 h-12 text-spice-500" />
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold font-outfit text-spice-900 dark:text-spice-100">
            {isCancelled ? (order.paymentStatus === 'Failed' ? 'Payment Failed' : 'Order Cancelled')
              : isPaymentPending ? 'Awaiting Payment'
              : 'Order Confirmed!'}
          </h1>

          <div className="mt-4 inline-block bg-spice-50 dark:bg-black border border-spice-200 dark:border-spice-800 px-6 py-3 rounded-2xl">
            <p className="text-xs text-spice-500 uppercase tracking-widest font-bold mb-1">Order ID</p>
            <p className="text-xl font-mono font-bold">{order.customOrderId}</p>
          </div>

          <div className="mt-4 flex items-center justify-center space-x-3 flex-wrap gap-2">
            <span className="text-lg font-bold">₹{order.totalAmount}</span>
            <span className="text-spice-300">•</span>
            <span className="text-sm text-spice-600 dark:text-spice-400 uppercase tracking-wider font-bold">{order.paymentMethod}</span>
            <StatusBadge status={order.paymentStatus} />
          </div>
        </div>

        {/* Timeline */}
        {!isCancelled && (
          <div className="border-t border-b border-spice-100 dark:border-spice-800 py-4 mb-8">
            <OrderTimeline status={order.orderStatus} paymentMethod={order.paymentMethod} />
          </div>
        )}

        {/* Status Details */}
        <div className="mb-8">
          {(order.orderStatus === 'Shipped' || order.orderStatus === 'Out for Delivery') && order.trackingId && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 p-6 rounded-2xl max-w-lg mx-auto text-center">
              <Truck className="w-10 h-10 mx-auto text-blue-500 mb-3" />
              <p className="text-sm text-blue-600/70 dark:text-blue-400/60 mb-1">Shipped via</p>
              <p className="font-bold text-lg mb-2">{order.courierType}</p>
              <p className="font-mono bg-white dark:bg-black p-2 rounded-lg inline-block border mb-3 text-sm">{order.trackingId}</p>
              <p className="text-sm font-semibold text-green-600 mb-4">📦 Estimated Delivery: 3-5 business days</p>
              {getTrackingLink() && (
                <a href={getTrackingLink()!} target="_blank" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">
                  Track Package →
                </a>
              )}
            </div>
          )}

          {order.orderStatus === 'Placed' && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 p-6 rounded-2xl max-w-lg mx-auto text-center">
              <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-3" />
              <p className="font-semibold text-green-700 dark:text-green-400 mb-1">Order Confirmed!</p>
              <p className="text-sm text-green-600/70 dark:text-green-400/50">Your order is being prepared. You&apos;ll receive a notification when it ships.</p>
              <p className="text-sm font-semibold text-green-600 mt-3">📦 Estimated Delivery: 4-7 business days</p>
            </div>
          )}

          {isPaymentPending && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 p-6 rounded-2xl max-w-lg mx-auto text-center">
              <Clock className="w-10 h-10 mx-auto text-yellow-500 mb-3 animate-pulse" />
              <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Payment Not Received</p>
              <p className="text-sm text-yellow-600/70 dark:text-yellow-400/50">Complete payment to confirm your order. It will be auto-cancelled after 30 minutes.</p>
            </div>
          )}

          {isCancelled && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 p-6 rounded-2xl max-w-lg mx-auto text-center">
              <XCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
              <p className="font-semibold text-red-700 dark:text-red-400 mb-1">
                {order.paymentStatus === 'Failed' ? 'Payment was not completed' : 'This order has been cancelled'}
              </p>
              <p className="text-sm text-red-600/70 dark:text-red-400/50">No charges were applied. You can place a new order anytime.</p>
            </div>
          )}

          {order.orderStatus === 'Delivered' && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 p-6 rounded-2xl max-w-lg mx-auto text-center">
              <Package className="w-10 h-10 mx-auto text-green-600 mb-3" />
              <p className="font-semibold text-green-700 dark:text-green-400 text-lg">Delivered! 🎉</p>
              <p className="text-sm text-green-600/70 dark:text-green-400/50 mt-1">Thank you for shopping with Andhra Spice Co.</p>
            </div>
          )}
        </div>

        {/* Retry Payment */}
        {canRetryPayment && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-spice-50 to-orange-50 dark:from-spice-900/30 dark:to-orange-900/20 border border-spice-200 dark:border-spice-800 p-6 rounded-2xl max-w-lg mx-auto text-center">
              <p className="text-sm text-spice-600 dark:text-spice-400 mb-4">Payment didn&apos;t go through? Try again:</p>
              <button onClick={handleRetryPayment} disabled={retrying}
                className="w-full bg-gradient-to-r from-spice-600 to-orange-500 hover:from-spice-700 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-xl transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg">
                <RefreshCw className={`w-5 h-5 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Initiating Payment...' : 'Retry Payment'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-spice-500 mb-3 flex items-center"><MapPin className="w-4 h-4 mr-2" /> Shipping Address</h3>
            <div className="bg-spice-50 dark:bg-black p-4 rounded-xl border border-spice-200 dark:border-spice-800">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p className="font-bold mt-2 text-sm">📞 {order.phoneNumber}</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-spice-500 mb-3 flex items-center"><ShoppingBag className="w-4 h-4 mr-2" /> Items ({order.products.length})</h3>
            <div className="bg-spice-50 dark:bg-black p-4 rounded-xl border border-spice-200 dark:border-spice-800 max-h-48 overflow-y-auto space-y-2">
              {order.products.map((p: any, i: number) => (
                <div key={i} className="flex justify-between text-sm border-b border-spice-100 dark:border-spice-800 last:border-0 pb-2 last:pb-0">
                  <span>{p.quantity}× {p.name} <span className="text-xs text-spice-400">({p.weight})</span></span>
                  <span className="font-bold">₹{p.price * p.quantity}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-spice-200 dark:border-spice-700">
                <span className="text-spice-500">Delivery</span>
                <span className="font-bold">{order.deliveryCharge > 0 ? `₹${order.deliveryCharge}` : 'FREE'}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/products" className="inline-flex items-center bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-8 rounded-full transition hover:opacity-80">
              <ShoppingBag className="w-4 h-4 mr-2" /> Continue Shopping
            </Link>
            <Link href="/orders" className="inline-flex items-center border-2 border-spice-300 dark:border-spice-700 text-spice-700 dark:text-spice-300 font-bold py-3 px-8 rounded-full transition hover:bg-spice-50 dark:hover:bg-spice-900">
              <Package className="w-4 h-4 mr-2" /> My Orders
            </Link>
            {(order.orderStatus === 'Placed' || order.orderStatus === 'Packed' || order.orderStatus === 'Payment Pending') && (
              <button onClick={handleCancel} className="inline-flex items-center border-2 border-red-500 text-red-500 font-bold py-3 px-8 rounded-full transition hover:bg-red-500 hover:text-white">
                <XCircle className="w-4 h-4 mr-2" /> Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
