'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, RefreshCw, ShieldAlert } from 'lucide-react';
import { Suspense } from 'react';

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="flex flex-col min-h-screen pt-32 pb-20 bg-[#050505] text-white selection:bg-spice-500 selection:text-white">
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto px-4 w-full">
        
        {/* Error Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-600/20 blur-2xl rounded-full" />
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-full relative">
            <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold font-outfit text-white mb-4 text-center">
          Payment Incomplete
        </h1>
        
        <p className="text-gray-400 text-center mb-8 leading-relaxed">
          We could not verify your payment. Your transaction might have been dropped by your bank or the window was closed early. <strong className="text-white">No funds have been captured.</strong>
        </p>

        {orderId && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 w-full">
            <p className="text-sm font-mono text-center text-gray-500 break-all">Reference: {orderId}</p>
          </div>
        )}

        <div className="flex flex-col gap-4 w-full sm:w-auto min-w-[200px]">
          <button 
            onClick={() => router.push(orderId ? `/order/${orderId}` : '/checkout')}
            className="flex items-center justify-center gap-2 bg-spice-600 hover:bg-spice-700 text-white font-bold py-4 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Try Payment Again</span>
          </button>
          
          <button 
            onClick={() => router.push('/products')}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-4 px-8 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Return to Shop</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-12 h-12 border-4 border-spice-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <FailedContent />
    </Suspense>
  );
}
