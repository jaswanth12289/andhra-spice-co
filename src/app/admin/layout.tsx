'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, PackageSearch, ClipboardList, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || user?.role !== 'admin') {
    return <div className="p-20 text-center font-bold text-white uppercase tracking-widest text-sm animate-pulse">Authenticating Uplink...</div>;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <div className="w-72 bg-[#0a0a0a] border-r border-white/5 hidden md:flex flex-col shadow-2xl z-20 relative">
        <div className="p-8 pb-4">
          <Link href="/" className="inline-block px-3 py-1 bg-white/10 text-gray-300 hover:text-white rounded-full text-xs font-bold uppercase tracking-widest transition mb-8 border border-white/5">
            &larr; Storefront
          </Link>
          <h2 className="font-bold text-xl font-[family-name:var(--font-outfit)] text-white tracking-[0.2em] uppercase">
            Command Center
          </h2>
        </div>
        <nav className="flex-1 p-6 pt-2 space-y-4">
          <Link href="/admin" className={`flex items-center space-x-4 p-4 rounded-2xl transition-all ${pathname === '/admin' ? 'bg-spice-500/20 text-spice-400 border border-spice-500/30 shadow-[0_0_20px_rgba(220,47,2,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <LayoutDashboard className="w-5 h-5"/> <span className="font-bold tracking-wider text-sm">Overview</span>
          </Link>
          <Link href="/admin/products" className={`flex items-center space-x-4 p-4 rounded-2xl transition-all ${pathname.startsWith('/admin/products') ? 'bg-spice-500/20 text-spice-400 border border-spice-500/30 shadow-[0_0_20px_rgba(220,47,2,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <PackageSearch className="w-5 h-5"/> <span className="font-bold tracking-wider text-sm">Inventory Vault</span>
          </Link>
          <Link href="/admin/orders" className={`flex items-center space-x-4 p-4 rounded-2xl transition-all ${pathname.startsWith('/admin/orders') ? 'bg-spice-500/20 text-spice-400 border border-spice-500/30 shadow-[0_0_20px_rgba(220,47,2,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <ClipboardList className="w-5 h-5"/> <span className="font-bold tracking-wider text-sm">Dispatch Log</span>
          </Link>
        </nav>
        <div className="p-6 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center space-x-4 p-4 rounded-2xl transition-all text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 w-full text-left font-bold tracking-wider text-sm">
            <LogOut className="w-5 h-5"/> <span>Terminate Session</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-12 relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-spice-900/10 via-transparent to-transparent z-0 pointer-events-none"></div>
        <div className="relative z-10 max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
