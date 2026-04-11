'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IndianRupee, ShoppingBag, Package } from 'lucide-react';

export default function AdminOverview() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/orders').then(res => res.json()),
      fetch('/api/products').then(res => res.json())
    ]).then(([ordersData, productsData]) => {
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load dashboard data');
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-32 font-bold animate-pulse text-white uppercase tracking-widest text-sm">Retrieving Analytics...</div>;

  const totalRevenue = orders.reduce((acc, order) => order.orderStatus !== 'Cancelled' ? acc + order.totalAmount : acc, 0);
  const totalOrders = orders.filter(order => order.orderStatus !== 'Cancelled').length;
  const lowStockProducts = products.filter(p => p.stock < 5);

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold font-[family-name:var(--font-outfit)] text-white mb-10 tracking-tight">System Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/20 blur-3xl group-hover:bg-green-500/40 transition-all rounded-full pointer-events-none"></div>
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl w-fit mb-6"><IndianRupee className="w-8 h-8"/></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Total Yield</p>
            <p className="text-4xl font-bold text-white">₹{totalRevenue}</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/20 blur-3xl group-hover:bg-blue-500/40 transition-all rounded-full pointer-events-none"></div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl w-fit mb-6"><ShoppingBag className="w-8 h-8"/></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Total Dispatches</p>
            <p className="text-4xl font-bold text-white">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-spice-500/20 blur-3xl group-hover:bg-spice-500/40 transition-all rounded-full pointer-events-none"></div>
          <div className="p-3 bg-spice-500/10 border border-spice-500/20 text-spice-400 rounded-xl w-fit mb-6"><Package className="w-8 h-8"/></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Active Inventory</p>
            <p className="text-4xl font-bold text-white">{products.length}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <h2 className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-white">Critical Alerts</h2>
        <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-500 rounded-full text-xs font-bold">{lowStockProducts.length} Needs Attention</span>
      </div>
      
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
        {lowStockProducts.length === 0 ? (
           <div className="p-16 text-center text-green-400 font-bold text-sm tracking-widest uppercase">All inventory is optimally stocked.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#111] text-gray-400 uppercase tracking-widest text-xs">
              <tr>
                <th className="p-6 font-semibold py-4 border-b border-white/10">Entity Name</th>
                <th className="p-6 font-semibold py-4 border-b border-white/10">Class</th>
                <th className="p-6 font-semibold py-4 border-b border-white/10">Reserve Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lowStockProducts.map(p => (
                <tr key={p._id} className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-bold text-white text-lg">{p.name}</td>
                  <td className="p-6 opacity-70 text-sm tracking-widest uppercase text-white">{p.category}</td>
                  <td className="p-6">
                    <span className="text-red-500 font-bold text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">{p.stock}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
