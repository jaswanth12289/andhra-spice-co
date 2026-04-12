'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/useCartStore';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { addItem } = useCartStore();

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(handler);
  }, [search, category]);

  const fetchProducts = async () => {
    setLoading(true);
    let url = '/api/products?';
    if (search) url += `search=${search}&`;
    if (category) url += `category=${category}`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const activeClasses = "bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)]";
  const inactiveClasses = "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-screen">
      
      <div className="flex flex-col items-center text-center mb-16 mt-8">
         <motion.h1 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
           className="text-5xl md:text-7xl font-bold font-[family-name:var(--font-outfit)] tracking-tight mb-4"
         >
           Our Collection
         </motion.h1>
         <motion.p 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
           className="text-gray-400 max-w-2xl text-lg"
         >
           Sourced directly from the harvest, delivering pristine ground and whole spices.
         </motion.p>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
        className="flex flex-col md:flex-row justify-between items-center mb-16 space-y-6 md:space-y-0"
      >
        <div className="relative w-full md:w-1/3 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Search spices..." 
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-full focus:ring-1 focus:ring-white/30 focus:bg-white/10 outline-none text-white transition-all shadow-inner placeholder-gray-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 px-2 scrollbar-none" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          <button onClick={() => setCategory('')} className={`px-6 py-3 rounded-full whitespace-nowrap transition-all duration-300 ${!category ? activeClasses : inactiveClasses}`}>All</button>
          <button onClick={() => setCategory('Whole Spices')} className={`px-6 py-3 rounded-full whitespace-nowrap transition-all duration-300 ${category === 'Whole Spices' ? activeClasses : inactiveClasses}`}>Whole</button>
          <button onClick={() => setCategory('Powdered Spices')} className={`px-6 py-3 rounded-full whitespace-nowrap transition-all duration-300 ${category === 'Powdered Spices' ? activeClasses : inactiveClasses}`}>Powdered</button>
          <button onClick={() => setCategory('Blended Masalas')} className={`px-6 py-3 rounded-full whitespace-nowrap transition-all duration-300 ${category === 'Blended Masalas' ? activeClasses : inactiveClasses}`}>Blended</button>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1,2,3,4,5,6].map(n => (
            <div key={n} className="bg-white/5 border border-white/5 rounded-3xl h-[400px] animate-pulse overflow-hidden p-6 flex flex-col justify-end">
              <div className="w-1/3 h-4 bg-white/10 rounded-full mb-3"></div>
              <div className="w-2/3 h-8 bg-white/10 rounded-full mb-6"></div>
              <div className="w-1/4 h-6 bg-white/10 rounded-full"></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-32 bg-white/5 rounded-3xl border border-white/5"
        >
          <h2 className="text-3xl font-bold font-[family-name:var(--font-outfit)] text-white mb-2">No reserves found</h2>
          <p className="text-gray-500">Attempt adjusting your filters to locate required inventory.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <AnimatePresence>
            {products.map((product, idx) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                key={product.id} 
                className="group relative bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10 hover:border-spice-500/30 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(220,47,2,0.15)] flex flex-col"
              >
                <Link href={`/products/${product.id}`} className="flex-1 flex flex-col h-full block">
                  <div className="h-[300px] relative overflow-hidden">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60 group-hover:opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
                    {(!product.options || product.options.every((o: any) => o.stock === 0)) && (
                      <div className="absolute top-6 right-6">
                        <span className="text-white text-[10px] font-bold px-4 py-1.5 bg-red-600/40 backdrop-blur-md border border-red-500/50 rounded-full uppercase tracking-[0.2em]">Depleted</span>
                      </div>
                    )}
                  </div>
                  <div className="p-8 pt-0 flex-1 flex flex-col justify-end -mt-20 relative z-10">
                    <span className="text-[10px] font-bold text-spice-500 uppercase tracking-[0.3em] mb-3 block">{product.category} {product.options?.length > 1 ? `• ${product.options.length} Sizes` : ''}</span>
                    <h3 className="text-3xl font-bold font-[family-name:var(--font-outfit)] text-white group-hover:text-white transition-colors duration-300 leading-tight mb-6">{product.name}</h3>
                    <div className="flex justify-between items-center border-t border-white/10 pt-6">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] block mb-1">Pricing</span>
                        <span className="text-2xl font-bold text-white">₹{product.options && product.options.length > 0 ? Math.min(...product.options.map((o: any) => o.price)) : 0} {product.options?.length > 1 && <span className="text-sm font-normal text-gray-500 relative -top-1 ml-1">+</span>}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
