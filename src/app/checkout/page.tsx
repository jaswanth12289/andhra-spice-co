'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Script from 'next/script';
import Link from 'next/link';
import { Clock, RefreshCw, XCircle } from 'lucide-react';

export default function CheckoutPage() {
  const { items, getTotal, clearCart, getFinalTotal, getDeliveryCharge } = useCartStore();
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  
  const [phone, setPhone] = useState('');
  const [useRegisteredPhone, setUseRegisteredPhone] = useState(true);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '' });
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please login to checkout');
      router.push('/login');
    } else if (user && user.phoneNumber && useRegisteredPhone && !phone) {
      setPhone(user.phoneNumber);
    }
  }, [user, authLoading, router, useRegisteredPhone]);

  // Check for existing pending ONLINE orders
  const fetchPendingOrder = () => {
    if (!user) return;
    fetch('/api/orders')
      .then(res => res.json())
      .then((orders: any[]) => {
        if (!Array.isArray(orders)) return;
        const pending = orders.find((o: any) =>
          o.paymentMethod === 'ONLINE' &&
          (o.paymentStatus === 'Awaiting' || o.paymentStatus === 'Pending') &&
          o.orderStatus === 'Payment Pending' &&
          (Date.now() - new Date(o.createdAt).getTime()) < 30 * 60 * 1000
        );
        if (pending) {
          setPendingOrder(pending);
          // If we were in loading state, reset it — user came back from payment
          setLoading(false);
          setSubmitted(false);
        } else {
          setPendingOrder(null);
        }

        // Check if any order just got paid (redirect from Cashfree landed on checkout)
        const justPaid = orders.find((o: any) =>
          o.paymentMethod === 'ONLINE' &&
          o.paymentStatus === 'Success' &&
          o.orderStatus === 'Placed' &&
          (Date.now() - new Date(o.updatedAt || o.createdAt).getTime()) < 5 * 60 * 1000
        );
        if (justPaid) {
          clearCart();
          router.push(`/order/${justPaid.customOrderId}`);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPendingOrder();
  }, [user]);

  // Auto-recover when user returns from Cashfree (tab refocus, app switch, etc.)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (loading || submitted)) {
        // User returned to the page — reset loading and check order status
        setLoading(false);
        setSubmitted(false);
        fetchPendingOrder();
      }
    };

    const handleFocus = () => {
      if (loading || submitted) {
        setLoading(false);
        setSubmitted(false);
        fetchPendingOrder();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loading, submitted]);

  // Timeout safety: if "Processing..." for >5 seconds, auto-reset
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setSubmitted(false);
      fetchPendingOrder();
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (authLoading || !user) return (
    <div className="flex justify-center items-center h-screen font-bold text-xl animate-pulse">Authenticating...</div>
  );

  if (items.length === 0 && !loading && !pendingOrder) return (
    <div className="flex flex-col justify-center items-center h-[70vh] font-bold text-xl space-y-4">
      <p>Your checkout is completely empty.</p>
      <a href="/products" className="bg-spice-600 text-white px-8 py-3 rounded-xl hover:bg-spice-700 transition">Shop Spices</a>
    </div>
  );

  const handleResumePayment = async () => {
    if (resuming || !pendingOrder) return;
    setResuming(true);
    try {
      const res = await fetch(`/api/orders/${pendingOrder.customOrderId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (typeof window !== 'undefined' && (window as any).Cashfree) {
        const cashfree = (window as any).Cashfree({ mode: data.cashfree_environment || 'production' });
        cashfree.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: "_self" });
      } else {
        toast.error("Payment gateway is loading. Please wait and try again.");
        setResuming(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to resume payment');
      setResuming(false);
    }
  };

  const handleCancelPending = async () => {
    if (!pendingOrder) return;
    try {
      const res = await fetch(`/api/orders/${pendingOrder.id}/cancel`, { method: 'POST' });
      if (res.ok) {
        setPendingOrder(null);
        toast.success('Previous order cancelled');
      }
    } catch {
      toast.error('Failed to cancel order');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || loading) return;
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    setSubmitted(true);

    try {
      const orderData = {
        phoneNumber: phone,
        shippingAddress: address,
        products: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, name: i.name, weight: i.weight })),
        totalAmount: getFinalTotal(),
        deliveryCharge: getDeliveryCharge(),
        paymentMethod
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      if (paymentMethod === 'COD') {
        clearCart();
      }

      // If online payment, redirect to Cashfree
      if (paymentMethod === 'ONLINE' && data.payment_session_id) {
        if (typeof window !== 'undefined' && (window as any).Cashfree) {
          const cashfree = (window as any).Cashfree({
            mode: data.cashfree_environment || 'sandbox',
          });
          cashfree.checkout({
            paymentSessionId: data.payment_session_id,
            redirectTarget: "_self" 
          });
        } else {
          toast.error("Payment gateway is loading. Please wait and try again.");
          setLoading(false);
          setSubmitted(false);
        }
        return;
      }

      // COD or fallback
      router.push(`/order/${data.customOrderId}`);
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
      setSubmitted(false);
    }
  };

  return (
    <>
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="lazyOnload" />
      <div className="max-w-4xl mx-auto px-4 pt-32 pb-12">

        {/* Pending Payment Banner */}
        {pendingOrder && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-700 rounded-2xl p-6 mb-8 relative z-10">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-yellow-800 dark:text-yellow-300 mb-1">You have a pending payment</h3>
                <p className="text-sm text-yellow-700/70 dark:text-yellow-400/60 mb-1">
                  Order <span className="font-mono font-bold">{pendingOrder.customOrderId}</span> • ₹{pendingOrder.totalAmount}
                </p>
                <p className="text-xs text-yellow-600/50 dark:text-yellow-400/40 mb-4">
                  Complete payment to confirm your order, or cancel to start fresh.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleResumePayment}
                    disabled={resuming}
                    className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2.5 px-6 rounded-xl transition disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${resuming ? 'animate-spin' : ''}`} />
                    <span>{resuming ? 'Opening payment...' : 'Resume Payment'}</span>
                  </button>
                  <button 
                    onClick={handleCancelPending}
                    className="flex items-center space-x-2 border-2 border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 font-bold py-2.5 px-6 rounded-xl transition hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancel & Start Fresh</span>
                  </button>
                  <Link href={`/order/${pendingOrder.customOrderId}`} className="text-sm text-yellow-600 underline self-center ml-2">
                    View Order →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <h1 className="text-4xl font-bold font-outfit mb-8 relative z-10 text-gray-900 dark:text-white">Checkout</h1>
        <form onSubmit={handleCheckout} className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
          <div className="space-y-6">
            <div className="bg-white dark:bg-spice-900 p-6 rounded-2xl shadow-sm border border-spice-200 text-gray-900 dark:text-white">
              <h2 className="text-2xl font-bold font-outfit mb-4 border-b pb-2 text-gray-900 dark:text-white">Delivery Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Phone Number (10 digits)</label>
                  {user?.phoneNumber && (
                    <label className="flex items-center space-x-2 text-sm mb-3 mt-1 cursor-pointer text-spice-400 font-medium">
                      <input 
                        type="checkbox" 
                        checked={useRegisteredPhone} 
                        onChange={(e) => {
                          setUseRegisteredPhone(e.target.checked);
                          if (e.target.checked) {
                            setPhone(user.phoneNumber as string);
                          } else {
                            setPhone('');
                          }
                        }} 
                        className="w-4 h-4 text-spice-600 focus:ring-spice-600 rounded bg-white/10 border-spice-500" 
                      />
                      <span>Use my registered mobile ({user.phoneNumber})</span>
                    </label>
                  )}
                  <input 
                    type="text" required maxLength={10} minLength={10}
                    value={phone} onChange={e => {
                      setPhone(e.target.value);
                      if (useRegisteredPhone && user?.phoneNumber && e.target.value !== user.phoneNumber) {
                        setUseRegisteredPhone(false);
                      }
                    }}
                    className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 bg-white text-gray-900 dark:bg-black dark:text-white dark:border-spice-700" 
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Street Address</label>
                  <input 
                    type="text" required
                    value={address.street} onChange={e => setAddress({...address, street: e.target.value})}
                    className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 bg-white text-gray-900 dark:bg-black dark:text-white dark:border-spice-700" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">City</label>
                    <input 
                      type="text" required
                      value={address.city} onChange={e => setAddress({...address, city: e.target.value})}
                      className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">State</label>
                    <input 
                      type="text" required
                      value={address.state} onChange={e => setAddress({...address, state: e.target.value})}
                      className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Zip Code</label>
                  <input 
                    type="text" required
                    value={address.zipCode} onChange={e => setAddress({...address, zipCode: e.target.value})}
                    className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-spice-900 p-6 rounded-2xl shadow-sm border border-spice-200 text-gray-900 dark:text-white">
              <h2 className="text-2xl font-bold font-outfit mb-4 border-b pb-2 text-gray-900 dark:text-white">Payment Option</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border rounded-xl cursor-pointer hover:bg-spice-50 dark:hover:bg-spice-800 transition">
                  <input type="radio" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="w-5 h-5 text-spice-600 focus:ring-spice-600" />
                  <span className="font-bold text-gray-900 dark:text-white">Cash on Delivery (COD)</span>
                </label>
                <label className="flex items-center space-x-3 p-4 border rounded-xl cursor-pointer hover:bg-spice-50 dark:hover:bg-spice-800 transition">
                  <input type="radio" value="ONLINE" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} className="w-5 h-5 text-spice-600 focus:ring-spice-600" />
                  <span className="font-bold text-gray-900 dark:text-white">Pay Online (Cashfree)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-spice-50 dark:bg-spice-900 border border-spice-200 rounded-3xl p-8 h-fit shadow-sm sticky top-24 text-gray-900 dark:text-white">
            <h2 className="text-2xl font-bold mb-6 border-b border-spice-200 pb-4 font-outfit text-gray-900 dark:text-white">Summary</h2>
            {items.map(item => (
              <div key={`${item.productId}-${item.weight}`} className="flex justify-between mb-4">
                <span className="opacity-80">{item.name} ({item.weight}) x {item.quantity}</span>
                <span className="font-bold">₹{item.price * item.quantity}</span>
              </div>
            ))}
            {getDeliveryCharge() > 0 && (
              <div className="flex justify-between mb-4 text-spice-600 font-medium">
                <span className="opacity-80">Delivery Charge</span>
                <span>₹{getDeliveryCharge()}</span>
              </div>
            )}
            <div className="flex justify-between mb-8 mt-6 text-3xl font-bold border-t border-spice-200 pt-6">
              <span>Total</span>
              <span className="text-spice-600 dark:text-spice-400">₹{getFinalTotal()}</span>
            </div>
            <button 
              type="submit" 
              disabled={loading || submitted} 
              className="w-full bg-spice-600 hover:bg-spice-700 disabled:bg-spice-400 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Pay ₹{getFinalTotal()}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
