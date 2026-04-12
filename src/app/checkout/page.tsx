'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Script from 'next/script';

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

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please login to checkout');
      router.push('/login');
    } else if (user && user.phoneNumber && useRegisteredPhone && !phone) {
      setPhone(user.phoneNumber);
    }
  }, [user, authLoading, router, useRegisteredPhone]);

  if (authLoading || !user) return (
    <div className="flex justify-center items-center h-screen font-bold text-xl animate-pulse">Authenticating...</div>
  );

  if (items.length === 0 && !loading) return (
    <div className="flex flex-col justify-center items-center h-[70vh] font-bold text-xl space-y-4">
      <p>Your checkout is completely empty.</p>
      <a href="/products" className="bg-spice-600 text-white px-8 py-3 rounded-xl hover:bg-spice-700 transition">Shop Spices</a>
    </div>
  );

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || loading) return; // Prevent duplicate submissions
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
          toast.error("Payment Gateway did not load. Please try again.");
          setLoading(false);
        }
        return; // Important to return here so we don't route manually
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
        <h1 className="text-4xl font-bold font-outfit mb-8 relative z-10">Checkout</h1>
        <form onSubmit={handleCheckout} className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
          <div className="space-y-6">
            <div className="bg-white dark:bg-spice-900 p-6 rounded-2xl shadow-sm border border-spice-200">
              <h2 className="text-2xl font-bold font-outfit mb-4 border-b pb-2">Delivery Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Phone Number (10 digits)</label>
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
                    className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" 
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Street Address</label>
                  <input 
                    type="text" required
                    value={address.street} onChange={e => setAddress({...address, street: e.target.value})}
                    className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">City</label>
                    <input 
                      type="text" required
                      value={address.city} onChange={e => setAddress({...address, city: e.target.value})}
                      className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">State</label>
                    <input 
                      type="text" required
                      value={address.state} onChange={e => setAddress({...address, state: e.target.value})}
                      className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Zip Code</label>
                  <input 
                    type="text" required
                    value={address.zipCode} onChange={e => setAddress({...address, zipCode: e.target.value})}
                    className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-spice-900 p-6 rounded-2xl shadow-sm border border-spice-200">
              <h2 className="text-2xl font-bold font-outfit mb-4 border-b pb-2">Payment Option</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border rounded-xl cursor-pointer hover:bg-spice-50 dark:hover:bg-spice-800 transition">
                  <input type="radio" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="w-5 h-5 text-spice-600 focus:ring-spice-600" />
                  <span className="font-bold">Cash on Delivery (COD)</span>
                </label>
                <label className="flex items-center space-x-3 p-4 border rounded-xl cursor-pointer hover:bg-spice-50 dark:hover:bg-spice-800 transition">
                  <input type="radio" value="ONLINE" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} className="w-5 h-5 text-spice-600 focus:ring-spice-600" />
                  <span className="font-bold">Pay Online (Cashfree)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-spice-50 dark:bg-spice-900 border border-spice-200 rounded-3xl p-8 h-fit shadow-sm sticky top-24">
            <h2 className="text-2xl font-bold mb-6 border-b border-spice-200 pb-4 font-outfit">Summary</h2>
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
            <button type="submit" disabled={loading} className="w-full bg-spice-600 hover:bg-spice-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg transition">
              {loading ? 'Processing...' : `Pay ₹${getFinalTotal()}`}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
