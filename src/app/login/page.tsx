'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) throw new Error('Too many attempts. Please try again later.');
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      toast.success('Welcome back!');
      router.push('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen pt-20 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-spice-900/20 via-[#0a0a0a] to-[#0a0a0a] z-0"></div>
      
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md p-10 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        <h1 className="text-4xl font-bold font-[family-name:var(--font-outfit)] text-center mb-8 text-white">Sign In</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block font-bold mb-2 text-gray-300 text-sm tracking-wide uppercase">Email</label>
            <input 
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full p-4 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white/30 focus:bg-white/5 text-white transition-all shadow-inner" 
            />
          </div>
          <div>
            <label className="block font-bold mb-2 text-gray-300 text-sm tracking-wide uppercase">Password</label>
            <input 
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full p-4 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white/30 focus:bg-white/5 text-white transition-all shadow-inner" 
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl text-lg transition-all duration-300 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-8 text-center text-gray-400">
          New to Andhra Spice Co? <Link href="/register" className="font-bold text-white hover:underline transition-all">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
