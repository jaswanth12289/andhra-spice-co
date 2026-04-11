'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, Mail, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center animate-pulse">Loading Profile...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      useCartStore.getState().clearCart();
      router.push('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-outfit)] text-white mb-10 tracking-tight">
          My Profile
        </h1>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Decorative glowing orb */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-spice-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="space-y-6 sm:space-y-8 relative z-10 w-full">
            {/* Name */}
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="p-3 bg-white/10 rounded-2xl shrink-0">
                <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-spice-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Full Name</p>
                <p className="text-xl sm:text-2xl font-semibold text-white truncate">{user.name || 'N/A'}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start space-x-3 sm:space-x-4 pb-6 border-b border-white/10 w-full">
              <div className="p-3 bg-white/10 rounded-2xl shrink-0">
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-spice-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Email Address</p>
                <p className="text-base sm:text-xl text-gray-300 break-all">{user.email}</p>
              </div>
            </div>

            {/* Orders Link */}
            <div className="flex flex-col space-y-4 pb-6 border-b border-white/10">
              <div>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Order History</p>
                <p className="text-gray-400 text-xs sm:text-sm mb-4">Track your past acquisitions and live shipping status.</p>
                <Link href="/orders" className="block w-full sm:w-auto text-center px-6 sm:px-8 py-3 sm:py-3 bg-white text-black rounded-xl text-xs sm:text-sm font-bold uppercase tracking-widest hover:bg-gray-200 transition shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  View My Orders
                </Link>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start space-x-4 pb-8 border-b border-white/10">
              <div className="p-3 bg-white/10 rounded-2xl">
                <ShieldAlert className="w-6 h-6 text-spice-400" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Account Role</p>
                <p className="text-xl text-gray-300 capitalize">{user.role}</p>
                {user.role === 'admin' && (
                  <Link href="/admin" className="inline-block mt-3 px-4 py-2 bg-spice-500/20 text-spice-400 border border-spice-500/50 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-spice-500 hover:text-white transition shadow-[0_0_15px_rgba(220,47,2,0.2)]">
                    Access Admin Dashboard
                  </Link>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all group font-bold tracking-widest uppercase"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
