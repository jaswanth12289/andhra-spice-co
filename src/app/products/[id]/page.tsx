'use client';

import { useEffect, useState, use } from 'react';
import { useCartStore } from '@/store/useCartStore';
import toast from 'react-hot-toast';
import { ShoppingCart, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [product, setProduct] = useState<any>(null);
  const [selectedWeight, setSelectedWeight] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [imgErrors, setImgErrors] = useState<{[key: number]: boolean}>({});

  const cartItems = useCartStore(state => state.items);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    setCurrentSlide(0); // Reset on mount/change
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

  const rawImages = product.images?.length > 0 
    ? product.images 
    : (product.imageUrl ? [product.imageUrl] : []);
    
  // Sanitize out empty strings or malformed invalid domains proactively
  const productImages = rawImages.filter((img: string) => img && typeof img === 'string' && img.trim().startsWith('http'));
  if (productImages.length === 0) productImages.push("https://placehold.co/800x800?text=No+Img");

  const handleAddToCart = () => {
    if (quantity > availableToAdd) {
      toast.error(`Only ${availableToAdd} more available limit for this variant.`);
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: activeOption.price,
      quantity: quantity,
      stock: activeOption.stock,
      weight: activeOption.weight,
      imageUrl: productImages[0]
    });
    toast.success('Secured in cart.');
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50 && currentSlide < productImages.length - 1) setCurrentSlide(p => p + 1);
    if (distance < -50 && currentSlide > 0) setCurrentSlide(p => p - 1);
    setTouchStart(0);
    setTouchEnd(0);
  };
  
  // TEMPORARY LOGGING FOR DEBUGGING
  console.log("DEBUG_IMAGES: productImages array:", productImages);
  console.log("DEBUG_IMAGES: active slide src:", productImages[currentSlide]);
  console.log("DEBUG_IMAGES: imgErrors object:", imgErrors);
  console.log("DEBUG_IMAGES: Next.js Image current rendering src:", imgErrors[currentSlide] ? 'https://placehold.co/800x800.png?text=No+Img' : (productImages[currentSlide] || 'https://placehold.co/800x800.png?text=No+Img'));
  
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-spice-500 selection:text-white">
      <Link href="/products" className="absolute top-6 sm:top-28 left-4 java sm:left-12 z-50 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-[10px] sm:text-xs font-bold drop-shadow-md bg-black/60 px-4 py-2 mt-20 sm:mt-0 rounded-full backdrop-blur-md border border-white/10">
        <ArrowLeft className="w-4 h-4"/> <span>Back</span>
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side: Cinematic Image Slider */}
        <div className="w-full relative overflow-hidden group bg-[#0a0a0a]"
             style={{ minHeight: '340px', height: '50vh' }}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}>
          {/* Light gradient only at bottom to separate image from content */}
          <div className="absolute bottom-0 left-0 right-0 h-24 lg:h-0 z-10 pointer-events-none"
               style={{ background: 'linear-gradient(to top, rgba(5,5,5,0.5), transparent)' }} />
          {/* Desktop side gradient */}
          <div className="hidden lg:block absolute inset-0 lg:bg-gradient-to-r lg:from-transparent lg:via-[#050505]/20 lg:to-[#050505] z-10 pointer-events-none" />
          
          <AnimatePresence initial={false}>
            <motion.div 
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center py-6 px-4"
              style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))' }}
            >
              <Image 
                src={imgErrors[currentSlide] ? 'https://placehold.co/800x800.png?text=No+Img' : (productImages[currentSlide] || 'https://placehold.co/800x800.png?text=No+Img')} 
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={currentSlide === 0}
                className="object-contain p-4"
                alt={`${product.name} - Image ${currentSlide + 1}`} 
                onError={() => setImgErrors(prev => ({ ...prev, [currentSlide]: true }))}
              />
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          {productImages.length > 1 && (
            <>
              <button 
                onClick={() => setCurrentSlide(p => Math.max(0, p - 1))}
                className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block ${currentSlide === 0 ? 'hidden' : ''}`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setCurrentSlide(p => Math.min(productImages.length - 1, p + 1))}
                className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block ${currentSlide === productImages.length - 1 ? 'hidden' : ''}`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="absolute bottom-12 lg:bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                {productImages.map((_: any, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                  />
                ))}
              </div>
            </>
          )}

          {activeOption.stock === 0 && (
            <div className="absolute top-40 left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-12 z-20">
              <span className="bg-red-600/50 backdrop-blur border border-red-500 text-white px-6 py-2 rounded-full uppercase tracking-[0.3em] text-xs font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)]">Variant Depleted</span>
            </div>
          )}
        </div>

        {/* Right Side: Data */}
        <div className="p-6 sm:p-16 lg:p-24 flex flex-col justify-center relative z-20 mt-4 lg:mt-0 bg-[#050505] lg:bg-transparent">
          <div className="max-w-xl">
            <span className="text-spice-500 uppercase tracking-[0.3em] font-bold text-[10px] sm:text-xs mb-4 flex items-center">{product.category}</span>
            <h1 className="text-4xl sm:text-6xl font-bold font-[family-name:var(--font-outfit)] leading-none mb-6">{product.name}</h1>
            
            <div className="text-3xl sm:text-4xl font-light text-white mb-6 tracking-tight">₹{activeOption.price}</div>
            
            {/* Purchase Card */}
            <div className="bg-[#0a0a0a] border border-white/5 p-5 sm:p-8 rounded-3xl mb-10 shadow-2xl">
              {/* Weight Selectors */}
              {product.options && product.options.length > 0 && (
                <div className="mb-8">
                  <p className="text-[10px] sm:text-xs text-spice-400 tracking-widest uppercase font-bold mb-4">Select Size</p>
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
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-4">
                    {/* Glass Quantity Adjuster */}
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-full h-14 sm:h-16 w-full sm:w-auto px-1 sm:px-2 shadow-inner justify-between sm:justify-start">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-colors">-</button>
                      <span className="w-12 text-center text-xl font-light">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(availableToAdd, quantity + 1))} className="w-12 h-12 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-colors">+</button>
                    </div>
                    
                    {/* Add to cart */}
                    <button 
                      onClick={handleAddToCart}
                      disabled={availableToAdd === 0}
                      className="h-14 sm:h-16 w-full sm:flex-1 bg-white hover:bg-gray-200 disabled:bg-white/10 disabled:text-white/30 text-black rounded-full font-bold flex justify-center items-center gap-2 sm:gap-3 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="uppercase tracking-widest text-[10px] sm:text-sm">{availableToAdd === 0 ? 'Limit Reached' : 'Add to Cart'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 tracking-widest uppercase font-bold text-center sm:text-left">Stock: <span className="text-gray-300">{activeOption.stock}</span> units available</p>
                </div>
              ) : (
                <div className="bg-red-900/10 border border-red-500/20 text-red-500 p-6 rounded-2xl font-bold text-center tracking-widest uppercase text-sm">
                  Out of Stock
                </div>
              )}
            </div>

            <div className="h-px w-full bg-white/10 mb-8"></div>
            
            <div className="mb-10">
              <h3 className="text-sm text-spice-400 uppercase tracking-widest font-bold mb-4">Product Details</h3>
              <p className="text-base sm:text-lg text-gray-400 font-light leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
