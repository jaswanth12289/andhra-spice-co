'use client';

import { useEffect, useState, use } from 'react';
import { useCartStore } from '@/store/useCartStore';
import toast from 'react-hot-toast';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [product, setProduct] = useState<any>(null);
  const [selectedWeight, setSelectedWeight] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const cartItems = useCartStore(state => state.items);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setProduct(data);
        if (data.options && data.options.length > 0) {
          setSelectedWeight(data.options[0].weight);
        }
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen pt-32 text-center text-xl text-gray-500 font-bold animate-pulse">Retrieving vault...</div>;
  if (!product) return <div className="min-h-screen pt-32 text-center text-xl text-white font-bold">Reserves not found</div>;

  const activeOption = product.options?.find((o: any) => o.weight === selectedWeight) || product.options?.[0] || { weight: 'Unknown', price: 0, stock: 0 };
  
  const currentCartItem = cartItems.find(i => i.productId === id && i.weight === activeOption.weight);
  const currentQuantityInCart = currentCartItem?.quantity || 0;
  const availableToAdd = activeOption.stock - currentQuantityInCart;

  const handleAddToCart = () => {
    if (quantity > availableToAdd) {
      toast.error(`Only ${availableToAdd} more available limit for this variant.`);
      return;
    }
    addItem({
      productId: product._id,
      name: product.name,
      price: activeOption.price,
      quantity: quantity,
      stock: activeOption.stock,
      weight: activeOption.weight,
      imageUrl: product.imageUrl
    });
    toast.success('Secured in cart.');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-spice-500 selection:text-white">
      <Link href="/products" className="absolute top-6 sm:top-28 left-4 java sm:left-12 z-50 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-[10px] sm:text-xs font-bold drop-shadow-md bg-black/60 px-4 py-2 mt-20 sm:mt-0 rounded-full backdrop-blur-md border border-white/10">
        <ArrowLeft className="w-4 h-4"/> <span>Back</span>
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side: Cinematic Image */}
        <div className="h-[50vh] lg:h-screen w-full relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#050505]/20 lg:to-[#050505] z-10" />
          <img src={product.imageUrl} className="w-full h-full object-cover opacity-70" alt={product.name} />
          {activeOption.stock === 0 && (
            <div className="absolute top-40 left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-12 z-20">
              <span className="bg-red-600/50 backdrop-blur border border-red-500 text-white px-6 py-2 rounded-full uppercase tracking-[0.3em] text-xs font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)]">Variant Depleted</span>
            </div>
          )}
        </div>

        {/* Right Side: Data */}
        <div className="p-6 sm:p-16 lg:p-24 flex flex-col justify-center relative z-20 -mt-10 lg:mt-0 bg-[#050505] lg:bg-transparent rounded-t-3xl pt-10">
          <div className="max-w-xl">
            <span className="text-spice-500 uppercase tracking-[0.3em] font-bold text-[10px] sm:text-xs mb-4 flex items-center">{product.category}</span>
            <h1 className="text-4xl sm:text-6xl font-bold font-[family-name:var(--font-outfit)] leading-none mb-6">{product.name}</h1>
            
            <div className="text-3xl sm:text-4xl font-light text-white mb-8 tracking-tight">₹{activeOption.price}</div>
            
            <div className="h-px w-full bg-white/10 mb-8"></div>
            
            <p className="text-lg text-gray-400 font-light leading-relaxed mb-10">
              {product.description}
            </p>

            {/* Weight Selectors */}
            {product.options && product.options.length > 0 && (
              <div className="mb-10">
                <p className="text-[10px] sm:text-xs text-spice-400 tracking-widest uppercase font-bold mb-3">Select Specification</p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {product.options.map((opt: any) => (
                    <button
                      key={opt.weight}
                      onClick={() => { setSelectedWeight(opt.weight); setQuantity(1); }}
                      className={`px-5 py-2 sm:px-6 sm:py-3 rounded-full font-bold text-xs sm:text-sm tracking-widest uppercase transition-all duration-300 border ${
                        selectedWeight === opt.weight 
                          ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                          : 'bg-transparent text-gray-400 border-white/20 hover:border-white/50 hover:text-white'
                      }`}
                    >
                      {opt.weight}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeOption.stock > 0 ? (
              <div className="space-y-6 sm:space-y-8 mt-2">
                <p className="text-[10px] sm:text-xs text-spice-400 tracking-widest uppercase font-bold">In Vault: <span className="text-white">{activeOption.stock}</span></p>
                
                <div className="flex flex-row items-center gap-3 sm:gap-6">
                  {/* Glass Quantity Adjuster */}
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-full h-14 sm:h-16 w-auto px-1 sm:px-2 shadow-inner">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-colors">-</button>
                    <span className="w-8 sm:w-12 text-center text-lg sm:text-xl font-light">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(availableToAdd, quantity + 1))} className="w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-colors">+</button>
                  </div>
                  
                  {/* Premium Add to cart */}
                  <button 
                    onClick={handleAddToCart}
                    disabled={availableToAdd === 0}
                    className="h-14 sm:h-16 flex-1 bg-white hover:bg-gray-200 disabled:bg-white/10 disabled:text-white/30 text-black rounded-full font-bold flex justify-center items-center gap-2 sm:gap-3 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="uppercase tracking-widest text-[10px] sm:text-sm">{availableToAdd === 0 ? 'Limit Reached' : 'Add to Collection'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-red-900/10 border border-red-500/20 text-red-500 p-6 rounded-2xl font-bold text-center tracking-widest uppercase text-sm">
                Awaiting Harvest
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
