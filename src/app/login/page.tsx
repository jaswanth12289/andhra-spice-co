'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const syncAuthWithServer = async (firebaseToken: string, name?: string | null) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken, name })
    });
    const data = await res.json();
    
    if (!res.ok) {
      if (res.status === 429) throw new Error('Too many attempts. Please try again later.');
      throw new Error(data.error || 'Login failed securely');
    }
    
    setUser(data.user);
    toast.success('Welcome back!');
    router.push('/');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Authenticate with Firebase securely
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // 2. Extract ID Token securely
      const token = await userCredential.user.getIdToken();
      // 3. Bridge to Local DB
      await syncAuthWithServer(token, userCredential.user.displayName);
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message || 'Login failed');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const token = await userCredential.user.getIdToken();
      await syncAuthWithServer(token, userCredential.user.displayName);
    } catch (error: any) {
      console.error("Firebase Google Auth Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message || 'Google Sign-In failed');
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen pt-20 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-spice-900/20 via-[#0a0a0a] to-[#0a0a0a] z-0"></div>
      
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md p-10 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        <h1 className="text-4xl font-bold font-[family-name:var(--font-outfit)] text-center mb-8 text-white">Sign In</h1>
        
        <button 
          type="button" 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="w-full bg-white hover:bg-gray-100 text-black font-bold py-3 rounded-xl transition duration-300 flex items-center justify-center space-x-3 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center mb-6">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="px-3 text-gray-500 text-sm font-bold uppercase">Or Log In With Email</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-6">
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
