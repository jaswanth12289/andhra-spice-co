'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, PlusCircle, MinusCircle } from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const defaultOption = { weight: '100g', price: '', stock: '' };
  const defaultForm = { id: '', name: '', description: '', category: 'Whole Spices', images: [''], options: [defaultOption] };
  
  const [form, setForm] = useState(defaultForm);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (idx: number, field: string, value: string) => {
    const newOptions = [...form.options];
    newOptions[idx] = { ...newOptions[idx], [field]: value };
    setForm({ ...form, options: newOptions });
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, { weight: '', price: '', stock: '' }] });
  };

  const removeOption = (idx: number) => {
    if (form.options.length === 1) return toast.error('Product must have at least one option');
    const newOptions = form.options.filter((_, i) => i !== idx);
    setForm({ ...form, options: newOptions });
  };

  const handleImageChange = (idx: number, value: string) => {
    const newImages = [...(form.images || [])];
    newImages[idx] = value;
    setForm({ ...form, images: newImages });
  };

  const addImage = () => {
    if ((form.images || []).length >= 5) return toast.error('Maximum 5 images allowed per product');
    setForm({ ...form, images: [...(form.images || []), ''] });
  };

  const removeImage = (idx: number) => {
    if ((form.images || []).length === 1) return toast.error('Product must have at least one image');
    const newImages = (form.images || []).filter((_, i) => i !== idx);
    setForm({ ...form, images: newImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.options.some(opt => !opt.weight || !opt.price || opt.stock === '')) {
      return toast.error('Please fill all option fields');
    }

    const cleanImages = (form.images || []).map(img => img.trim()).filter(img => img !== "");
    if (cleanImages.length === 0) {
      return toast.error('Please provide at least one valid image URL');
    }

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/products/${form.id}` : '/api/products';
      
      const { id, ...restForm } = form;
      
      
      const payload = {
        ...restForm,
        images: cleanImages,
        options: form.options.map(opt => ({
          weight: opt.weight,
          price: Number(opt.price),
          stock: Number(opt.stock)
        }))
      };

      const res = await fetch(url, {
        method, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(isEditing ? 'Product Updated' : 'Product Added');
      setForm(defaultForm);
      setIsEditing(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Product deleted');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="bg-white dark:bg-spice-900 p-8 rounded-2xl shadow-sm border border-spice-200 dark:border-spice-800">
        <h2 className="text-2xl font-bold font-outfit mb-6 flex items-center"><PlusCircle className="mr-2" /> {isEditing ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">Product Name</label>
            <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">Description</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700 h-24" />
          </div>
          
          <div className="md:col-span-2 border border-spice-200 dark:border-spice-800 rounded-xl p-6 bg-spice-50 dark:bg-black/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold font-outfit text-lg">Weight Variations</h3>
              <button type="button" onClick={addOption} className="text-spice-600 flex items-center text-sm font-bold hover:text-spice-700"><PlusCircle className="w-4 h-4 mr-1"/> Add Variant</button>
            </div>
            
            <div className="space-y-4">
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end p-4 border border-spice-200 dark:border-spice-800 rounded-lg bg-white dark:bg-black">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Weight Label</label>
                    <input type="text" required value={opt.weight} onChange={e => handleOptionChange(idx, 'weight', e.target.value)} placeholder="e.g. 100g" className="w-full p-2 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-spice-900 dark:text-white dark:border-spice-700" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Price (₹)</label>
                    <input type="number" required min="1" value={opt.price} onChange={e => handleOptionChange(idx, 'price', e.target.value)} className="w-full p-2 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-spice-900 dark:text-white dark:border-spice-700" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Stock Quantity</label>
                    <input type="number" required min="0" value={opt.stock} onChange={e => handleOptionChange(idx, 'stock', e.target.value)} className="w-full p-2 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-spice-900 dark:text-white dark:border-spice-700" />
                  </div>
                  <button type="button" onClick={() => removeOption(idx)} className="p-3 text-red-500 hover:bg-red-100 rounded-lg transition" title="Remove Variant">
                    <Trash2 className="w-5 h-5"/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Category</label>
            <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-black dark:text-white dark:border-spice-700">
              <option value="Whole Spices">Whole Spices</option>
              <option value="Powdered Spices">Powdered Spices</option>
              <option value="Blended Masalas">Blended Masalas</option>
            </select>
          </div>
          <div className="md:col-span-2 border border-spice-200 dark:border-spice-800 rounded-xl p-6 bg-spice-50 dark:bg-black/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold font-outfit text-lg">Product Images (Max 5)</h3>
              <span className="text-xs font-bold text-spice-500 uppercase tracking-widest">{form.images?.length || 1} / 5</span>
            </div>
            <div className="space-y-4">
              {(form.images || []).map((img, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-black p-3 border border-spice-200 dark:border-spice-800 rounded-lg">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Image URL #{idx + 1}</label>
                    <input type="url" required={(form.images || []).length === 1} value={img} onChange={e => handleImageChange(idx, e.target.value)} placeholder="https://example.com/image.jpg" className="w-full p-3 border border-spice-300 rounded outline-none focus:ring-2 focus:ring-spice-600 dark:bg-spice-900 dark:text-white dark:border-spice-700" />
                  </div>
                  <div className="flex items-end self-end sm:self-auto h-full pb-1 sm:pb-0">
                    <button type="button" onClick={() => removeImage(idx)} className="p-3 mt-4 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition" title="Remove Image">
                      <Trash2 className="w-6 h-6"/>
                    </button>
                  </div>
                </div>
              ))}
              
              {(form.images || []).length < 5 && (
                <button type="button" onClick={addImage} className="w-full py-4 border-2 border-dashed border-spice-300 dark:border-spice-700 text-spice-600 dark:text-spice-400 font-bold hover:bg-spice-100 dark:hover:bg-spice-900/30 rounded-xl transition flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 mr-2"/> Add Another Image URL Link
                </button>
              )}
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end space-x-4 mt-2">
            {isEditing && (
              <button type="button" onClick={() => { setIsEditing(false); setForm(defaultForm); }} className="px-6 py-3 border border-spice-300 rounded-lg font-bold hover:bg-spice-50 dark:hover:bg-spice-800 transition">Cancel</button>
            )}
            <button type="submit" className="px-8 py-3 bg-spice-600 text-white rounded-lg font-bold hover:bg-spice-700 transition">
              {isEditing ? 'Save Changes' : 'Publish Product'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-spice-900 border border-spice-200 dark:border-spice-800 rounded-2xl shadow-sm overflow-hidden">
        <h2 className="text-xl font-bold font-outfit p-6 border-b border-spice-200 dark:border-spice-800">Inventory Management</h2>
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-10 text-center animate-pulse font-bold">Loading Inventory...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-spice-50 dark:bg-black text-spice-600 dark:text-spice-300">
                <tr>
                  <th className="p-4 border-b border-spice-200 dark:border-spice-800">Product</th>
                  <th className="p-4 border-b border-spice-200 dark:border-spice-800">Category</th>
                  <th className="p-4 border-b border-spice-200 dark:border-spice-800">Available Variants</th>
                  <th className="p-4 border-b border-spice-200 dark:border-spice-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-spice-200 dark:divide-spice-800">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-spice-50 dark:hover:bg-black/50 transition">
                    <td className="p-4 font-bold flex items-center space-x-3">
                      <img src={(p.images && p.images.length > 0) ? p.images[0] : (p.imageUrl || '/placeholder.png')} onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=No+Img')} alt="" className="w-10 h-10 rounded object-cover" />
                      <span>{p.name}</span>
                    </td>
                    <td className="p-4 opacity-80">{p.category}</td>
                    <td className="p-4">
                      {p.options && p.options.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.options.map((o: any, i: number) => (
                            <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${o.stock < 5 ? 'border-red-500/50 text-red-500 bg-red-900/10' : 'border-spice-500/30 text-spice-400 bg-spice-900/20'}`}>
                              {o.weight} (₹{o.price})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-red-500 text-xs font-bold">Invalid Format</span>
                      )}
                    </td>
                    <td className="p-4 space-x-2">
                      <button onClick={() => { 
                        setIsEditing(true); 
                        setForm({ 
                          ...p, 
                          images: p.images?.length > 0 ? p.images : (p.imageUrl ? [p.imageUrl] : ['']),
                          options: p.options && p.options.length > 0 ? p.options : [defaultOption] // fallback for old data
                        }); 
                      }} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
