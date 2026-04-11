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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold font-outfit mb-10 border-b border-spice-200 pb-4">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map(item => (
            <div key={`${item.productId}-${item.weight}`} className="flex items-center border border-spice-200 rounded-2xl p-4 shadow-sm bg-white dark:bg-spice-900 transition hover:shadow-md">
              <img src={item.imageUrl} alt={item.name} className="w-28 h-28 object-cover rounded-xl" />
              <div className="ml-6 flex-1">
                <h3 className="text-2xl font-bold font-outfit">{item.name} <span className="text-sm text-gray-500 font-normal">({item.weight})</span></h3>
                <p className="text-spice-600 dark:text-spice-400 font-bold mt-1 text-lg">₹{item.price}</p>
                <div className="flex items-center mt-4">
                  <div className="flex border border-spice-200 rounded-lg bg-spice-50 dark:bg-spice-800">
                    <button onClick={() => updateQuantity(item.productId, item.weight, Math.max(1, item.quantity - 1))} className="px-4 py-1 hover:bg-spice-200 dark:hover:bg-spice-700 transition rounded-l-lg font-bold">-</button>
                    <span className="px-4 py-1 font-bold border-x border-spice-200">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.weight, Math.min(item.stock, item.quantity + 1))} className="px-4 py-1 hover:bg-spice-200 dark:hover:bg-spice-700 transition rounded-r-lg font-bold">+</button>
                  </div>
                </div>
              </div>
              <button title="Remove" onClick={() => removeItem(item.productId, item.weight)} className="text-red-500 hover:text-white hover:bg-red-500 p-3 rounded-full transition ml-4">
                <Trash2 className="w-6 h-6" />
              </button>
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
            <span className="opacity-80">Shipping</span>
            <span className="text-green-600 dark:text-green-400 font-bold">Free Shipping</span>
          </div>
          <div className="flex justify-between mb-8 text-3xl font-bold border-t border-spice-200 pt-6">
            <span>Total</span>
            <span className="text-spice-600 dark:text-spice-400">₹{getTotal()}</span>
          </div>
          <Link href="/checkout" className="block w-full bg-spice-600 hover:bg-spice-700 text-white text-center py-4 rounded-xl font-bold text-xl shadow-lg transition">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
