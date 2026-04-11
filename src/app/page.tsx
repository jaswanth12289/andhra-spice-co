'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Leaf, Flame, ShieldCheck, Asterisk } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-20">
      
      {/* Cinematic Hero */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-spice-600/20 rounded-full blur-[120px] -z-10 pointer-events-none"
        />
        
        <div className="text-center relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex flex-row items-center justify-center space-x-2 sm:space-x-3 mb-6 w-full"
          >
            <span className="hidden sm:block h-px w-6 sm:w-12 bg-spice-500/50"></span>
            <span className="uppercase tracking-widest sm:tracking-[0.3em] text-spice-400 text-[10px] sm:text-xs font-bold text-center break-words max-w-full">100% Native Indian Spices</span>
            <span className="hidden sm:block h-px w-6 sm:w-12 bg-spice-500/50"></span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 font-[family-name:var(--font-outfit)] leading-[1.1] sm:leading-[0.9]"
          >
            Taste The <br className="sm:hidden" /> <span className="text-spice-500 bg-none text-transparent bg-clip-text bg-gradient-to-br from-spice-400 to-spice-700 pb-2 drop-shadow-lg">Heritage.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-lg sm:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed mt-6 sm:mt-8 px-2 sm:px-0"
          >
            We bypass middlemen to bring pure, unadulterated essence directly from the rich soils of India to your kitchen.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link href="/products" className="group relative inline-flex items-center justify-center px-8 py-4 bg-white text-black font-bold text-lg rounded-full overflow-hidden transition-transform active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-spice-400 to-spice-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative group-hover:text-white transition-colors duration-300 flex items-center gap-2">
                Explore Collection <Asterisk className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Bento Box Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="md:col-span-2 relative rounded-3xl overflow-hidden group bg-black border border-white/5 shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
            <img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&q=80" alt="Spices" className="w-full h-full object-cover opacity-50 group-hover:scale-105 group-hover:opacity-70 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 p-8 z-20">
              <div className="bg-spice-600/20 backdrop-blur-md border border-spice-500/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-spice-400">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-bold font-[family-name:var(--font-outfit)] text-white mb-2">Sun-Dried Perfection</h3>
              <p className="text-gray-300 max-w-md">Our chilies are traditionally sun-dried to lock in identical moisture levels and extreme pungency.</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent border border-white/5 p-8 flex flex-col justify-between group hover:border-spice-500/30 transition-colors duration-500"
          >
            <div className="bg-white/5 border border-white/10 w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:bg-white group-hover:text-black transition-colors shadow-lg">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-white mb-2">Zero Adulteration</h3>
              <p className="text-gray-400 leading-relaxed">Lab tested and guaranteed free from artificial colors or sawdust fillers.</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent border border-white/5 p-8 flex flex-col justify-between group hover:border-spice-500/30 transition-colors duration-500"
          >
            <div className="bg-white/5 border border-white/10 w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:bg-spice-500 group-hover:border-spice-400 transition-colors shadow-lg">
              <Leaf className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-white mb-2">Ethical Sourcing</h3>
              <p className="text-gray-400 leading-relaxed">We work directly with local farmers paying beyond fair-trade premiums.</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="md:col-span-2 relative rounded-3xl overflow-hidden group bg-gradient-to-r from-spice-900/60 to-black border border-white/5 flex items-center p-8 sm:p-12 shadow-2xl"
          >
            <div className="relative z-10 max-w-lg">
              <h3 className="text-4xl font-bold font-[family-name:var(--font-outfit)] text-white mb-4 leading-tight">Ready to transform your meals?</h3>
              <p className="text-gray-300 mb-8 text-lg font-light">Join thousands of home-cooks and culinary experts trusting Andhra Spice Co. for their daily cooking.</p>
              <Link href="/products" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-black transition flex inline-flex items-center gap-2">
                Explore Spices <ArrowRight />
              </Link>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  );
}
