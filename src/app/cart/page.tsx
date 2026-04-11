'use client';

import { useCartStore } from '@/store/useCartStore';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotal } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center flex flex-col items-center">
        <div className="bg-spice-100 dark:bg-spice-900 p-8 rounded-full mb-8">
          <Trash2 className="w-16 h-16 text-spice-300" />
        </div>
        <h2 className="text-4xl font-bold text-spice-900 dark:text-spice-100 mb-6 font-outfit">Your Cart is Empty</h2>
        <Link href="/products" className="inline-block bg-spice-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-spice-700 transition shadow-lg">
          Browse Spices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
      <h1 className="text-4xl font-bold font-outfit mb-10 border-b border-spice-200 pb-4">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {items.map(item => (
            <div key={`${item.productId}-${item.weight}`} className="flex flex-col sm:flex-row border border-spice-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm bg-white dark:bg-spice-900/50 transition hover:shadow-md gap-4 sm:gap-6">
              
              {/* Image & Main Info Row for Mobile */}
              <div className="flex gap-4 flex-1">
                <img src={item.imageUrl} alt={item.name} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shadow-sm" />
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold font-outfit leading-tight mb-1">{item.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest">{item.weight}</p>
                    </div>
                    {/* Trash Icon (Mobile Top Right) */}
                    <button title="Remove" onClick={() => removeItem(item.productId, item.weight)} className="sm:hidden text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-full transition ml-2">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-spice-600 dark:text-spice-400 font-bold mt-2 sm:mt-3 text-lg sm:text-xl">₹{item.price}</p>
                </div>
              </div>

              {/* Quantity & Desktop Trash */}
              <div className="flex justify-between items-center sm:flex-row sm:items-center border-t border-spice-100 dark:border-white/5 sm:border-t-0 pt-4 sm:pt-0">
                <div className="flex items-center border border-spice-200 dark:border-white/10 rounded-full bg-spice-50 dark:bg-black/20 h-10 sm:h-12 overflow-hidden shadow-inner">
                  <button onClick={() => updateQuantity(item.productId, item.weight, Math.max(1, item.quantity - 1))} className="w-10 sm:w-12 h-full flex items-center justify-center hover:bg-spice-200 dark:hover:bg-white/10 transition font-bold">-</button>
                  <span className="w-10 sm:w-12 h-full flex items-center justify-center font-bold font-mono text-sm sm:text-base border-x border-spice-200 dark:border-white/10">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.weight, Math.min(item.stock, item.quantity + 1))} className="w-10 sm:w-12 h-full flex items-center justify-center hover:bg-spice-200 dark:hover:bg-white/10 transition font-bold">+</button>
                </div>
                
                {/* Trash Icon (Desktop Right Side) */}
                <button title="Remove" onClick={() => removeItem(item.productId, item.weight)} className="hidden sm:flex text-red-500 hover:text-white hover:bg-red-500 p-3 rounded-full transition ml-6">
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>

            </div>
          ))}
        </div>
        <div className="bg-spice-50 dark:bg-spice-900 border border-spice-200 rounded-3xl p-8 h-fit shadow-sm sticky top-24">
          <h2 className="text-2xl font-bold mb-6 border-b border-spice-200 pb-4 font-outfit">Order Summary</h2>
          <div className="flex justify-between mb-4 text-lg">
            <span className="opacity-80">Subtotal</span>
            <span className="font-bold">₹{getTotal()}</span>
          </div>
          <div className="flex justify-between mb-8 text-lg">
            <span className="opacity-80">Delivery Handling</span>
            {useCartStore.getState().getDeliveryCharge() === 0 ? (
              <span className="text-green-600 dark:text-green-400 font-bold">Free</span>
            ) : (
              <span className="font-bold text-spice-600 dark:text-spice-400 font-mono">₹{useCartStore.getState().getDeliveryCharge()}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-6 -mt-4 text-right">Free delivery for orders over ₹499</p>

          <div className="flex justify-between mb-8 text-3xl font-bold border-t border-spice-200 pt-6">
            <span>Total</span>
            <span className="text-spice-600 dark:text-spice-400">₹{useCartStore.getState().getFinalTotal()}</span>
          </div>
          <Link href="/checkout" className="block w-full bg-spice-600 hover:bg-spice-700 text-white text-center py-4 rounded-xl font-bold text-xl shadow-lg transition">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
