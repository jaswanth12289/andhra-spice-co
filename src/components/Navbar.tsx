'use client';

import Link from 'next/link';
import { ShoppingCart, User as UserIcon, LogOut, Store } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const cartItems = useCartStore(state => state.items);
  const { user, loading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide the standard "Origin" interface navbar when in the Admin Dashboard
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);



  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center mt-4 px-4 pointer-events-none">
      <nav className={`pointer-events-auto transition-all duration-300 ${scrolled ? 'w-full max-w-5xl rounded-full bg-black/40 border-white/10 backdrop-blur-2xl py-3 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'w-full max-w-7xl rounded-2xl bg-transparent border-transparent py-4 px-2'} border flex justify-between items-center`}>
        <div className="flex items-center">
          <Link href="/" className="font-bold text-2xl tracking-tighter text-white font-[family-name:var(--font-outfit)] flex flex-col uppercase leading-none">
            <span className="text-spice-500 tracking-[0.2em] text-xs font-semibold mb-1">Authentic</span>
            Andhra Spice
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium hover:text-white transition text-gray-300 uppercase tracking-widest relative after:content-[''] after:absolute after:w-0 after:h-px after:bg-white after:left-0 after:-bottom-1 after:transition-all hover:after:w-full">Origin</Link>
          <Link href="/products" className="text-sm font-medium hover:text-white transition text-gray-300 uppercase tracking-widest relative after:content-[''] after:absolute after:w-0 after:h-px after:bg-white after:left-0 after:-bottom-1 after:transition-all hover:after:w-full">Collection</Link>
          {user?.role === 'admin' && (
            <Link href="/admin" className="text-sm font-bold text-spice-400 hover:text-spice-300 uppercase tracking-widest transition relative after:content-[''] after:absolute after:w-0 after:h-px after:bg-spice-400 after:left-0 after:-bottom-1 after:transition-all hover:after:w-full">Admin Dashboard</Link>
          )}
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Mobile Collection Nav */}
          <Link href="/products" className="md:hidden relative group p-2 hover:bg-white/10 rounded-full transition cursor-pointer">
            <Store className="w-5 h-5 text-gray-300 group-hover:text-white" />
          </Link>

          <Link href="/cart" className="relative group p-2 hover:bg-white/10 rounded-full transition cursor-pointer">
            <ShoppingCart className="w-5 h-5 text-gray-300 group-hover:text-white" />
            {mounted && cartCount > 0 && (
              <span className="absolute 0 right-0 bg-spice-500 shadow-[0_0_10px_rgba(220,47,2,0.8)] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center translate-x-1 -translate-y-1">
                {cartCount}
              </span>
            )}
          </Link>
          
          <div className="w-px h-6 bg-white/20 mx-2 hidden sm:block"></div>

          {mounted && !loading && (
            user ? (
              <Link href="/profile" className="flex items-center space-x-2 p-1.5 pr-4 bg-white/10 rounded-full border border-white/5 hover:border-white/20 transition cursor-pointer group">
                <div className="bg-black text-white p-1.5 rounded-full border border-white/10">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition hidden sm:block">{user.name ? user.name.split(' ')[0] : 'User'}</span>
              </Link>
            ) : (
              <Link href="/login" className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-full font-bold text-sm transition shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer">
                Sign In
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
