'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phoneNumber: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.phoneNumber)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      toast.success('Account created! Please login.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen pt-24 pb-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a] via-spice-900/10 to-[#0a0a0a] z-0"></div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-md p-10 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        <h1 className="text-4xl font-bold font-[family-name:var(--font-outfit)] text-center mb-8 text-white">Join the Vault</h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block font-bold mb-2 text-gray-300 text-xs tracking-widest uppercase">Full Name</label>
            <input 
              type="text" required
              value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full p-4 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white/30 focus:bg-white/5 text-white transition-all shadow-inner" 
            />
          </div>
          <div>
            <label className="block font-bold mb-2 text-gray-300 text-xs tracking-widest uppercase">Email</label>
            <input 
              type="email" required
              value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full p-4 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white/30 focus:bg-white/5 text-white transition-all shadow-inner" 
            />
          </div>
          <div>
            <label className="block font-bold mb-2 text-gray-300 text-xs tracking-widest uppercase">Phone Number</label>
            <input 
              type="text" required maxLength={10} minLength={10}
              value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})}
              className="w-full p-4 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white/30 focus:bg-white/5 text-white transition-all shadow-inner placeholder-gray-700" 
              placeholder="10 digit valid mobile"
            />
          </div>
          <div>
            <label className="block font-bold mb-2 text-gray-300 text-xs tracking-widest uppercase">Password</label>
            <input 
              type="password" required
              value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full p-4 bg-black/40 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-white/30 focus:bg-white/5 text-white transition-all shadow-inner" 
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl text-lg transition-all duration-300 mt-6 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>
        <p className="mt-8 text-center text-gray-400">
          Already verified? <Link href="/login" className="font-bold text-white hover:underline transition-all">Enter Vault</Link>
        </p>
      </div>
    </div>
  );
}
