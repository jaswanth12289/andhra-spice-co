'use client';

import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

function AuthSync() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, [setUser, setLoading]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthSync />
      <Toaster position="top-center" toastOptions={{ style: { background: '#220901', color: '#fff8f0' } }} />
      {children}
    </>
  );
}
