import Link from 'next/link';
import { Asterisk, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-20 bg-[#050505] text-white">
      <div className="flex-1 flex flex-col items-center justify-center relative px-4 text-center">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-spice-600/20 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="bg-white/5 border border-white/10 p-4 rounded-full mb-8">
          <Compass className="w-12 h-12 text-spice-500" />
        </div>

        <h1 className="text-8xl sm:text-9xl font-bold font-outfit text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-4">
          404
        </h1>
        
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
          Lost in the Spice Route
        </h2>
        
        <p className="text-gray-400 max-w-md mx-auto mb-10 text-lg font-light leading-relaxed">
          The page you are looking for has vanished into thin air or never existed in our vault.
        </p>

        <Link href="/" className="group relative inline-flex items-center justify-center px-8 py-4 bg-white text-black font-bold text-lg rounded-full overflow-hidden transition-transform active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]">
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-spice-400 to-spice-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          <span className="relative group-hover:text-white transition-colors duration-300 flex items-center gap-2">
            Return to Vault <Asterisk className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          </span>
        </Link>
      </div>
    </div>
  );
}
