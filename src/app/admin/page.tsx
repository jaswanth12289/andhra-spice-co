'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IndianRupee, ShoppingBag, Package, Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function AdminOverview() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

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

  // Metrics
  const successfulOrders = orders.filter(o => o.paymentStatus === 'Success' || (o.paymentMethod === 'COD' && o.orderStatus !== 'Cancelled'));
  const totalRevenue = successfulOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const totalOrders = successfulOrders.length;
  const failedPayments = orders.filter(o => o.paymentStatus === 'Failed').length;
  const pendingPayments = orders.filter(o => o.paymentMethod === 'ONLINE' && (o.paymentStatus === 'Awaiting' || o.paymentStatus === 'Pending') && o.orderStatus !== 'Cancelled');
  const cancelledOrders = orders.filter(o => o.orderStatus === 'Cancelled').length;
  const recentOrders = orders.slice(0, 5);

  const lowStockProducts = products
    .map((p: any) => ({
      ...p,
      totalStock: p.options?.reduce((sum: number, o: any) => sum + (o.stock || 0), 0) || 0
    }))
    .filter((p: any) => p.totalStock < 10);

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold font-[family-name:var(--font-outfit)] text-white mb-10 tracking-tight">System Overview</h1>
      
      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-green-500/20 blur-3xl group-hover:bg-green-500/40 transition-all rounded-full pointer-events-none"></div>
          <div className="p-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl w-fit mb-4"><IndianRupee className="w-6 h-6"/></div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Revenue</p>
          <p className="text-2xl md:text-3xl font-bold text-white">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/20 blur-3xl group-hover:bg-blue-500/40 transition-all rounded-full pointer-events-none"></div>
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl w-fit mb-4"><ShoppingBag className="w-6 h-6"/></div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Successful</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{totalOrders}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/20 blur-3xl group-hover:bg-red-500/40 transition-all rounded-full pointer-events-none"></div>
          <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl w-fit mb-4"><XCircle className="w-6 h-6"/></div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Failed</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{failedPayments}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-spice-500/20 blur-3xl group-hover:bg-spice-500/40 transition-all rounded-full pointer-events-none"></div>
          <div className="p-2 bg-spice-500/10 border border-spice-500/20 text-spice-400 rounded-xl w-fit mb-4"><Package className="w-6 h-6"/></div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Products</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{products.length}</p>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-10">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-yellow-400">Pending Payments ({pendingPayments.length})</h2>
          </div>
          <div className="space-y-2">
            {pendingPayments.map(o => (
              <div key={o.id} className="flex justify-between items-center text-sm bg-yellow-500/5 border border-yellow-500/10 rounded-lg px-4 py-2">
                <span className="font-mono text-yellow-300">{o.customOrderId}</span>
                <span className="text-yellow-400 font-bold">₹{o.totalAmount}</span>
                <span className="text-yellow-400/60 text-xs">{new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column: Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2"><TrendingUp className="w-5 h-5" /><span>Recent Orders</span></h2>
            <Link href="/admin/orders" className="text-xs text-spice-400 hover:text-spice-300 font-bold uppercase tracking-wider">View All →</Link>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            {recentOrders.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-bold text-sm">No orders yet.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <div>
                      <p className="font-mono font-bold text-white text-sm">{order.customOrderId}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right flex items-center space-x-3">
                      <span className="font-bold text-white">₹{order.totalAmount}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.orderStatus === 'Delivered' ? 'bg-green-500/20 text-green-400' :
                        order.orderStatus === 'Cancelled' ? 'bg-red-500/20 text-red-400' :
                        order.orderStatus === 'Payment Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        order.orderStatus === 'Shipped' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-gray-400'
                      }`}>{order.orderStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2"><AlertTriangle className="w-5 h-5" /><span>Low Stock Alerts</span></h2>
            <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-full text-[10px] font-bold">{lowStockProducts.length}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            {lowStockProducts.length === 0 ? (
              <div className="p-12 text-center text-green-400 font-bold text-sm tracking-widest uppercase">All inventory optimally stocked.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <div>
                      <p className="font-bold text-white text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{p.category}</p>
                    </div>
                    <span className={`text-xl font-bold ${p.totalStock === 0 ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>{p.totalStock}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-wrap gap-6 items-center justify-around text-center">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Cancelled</p>
          <p className="text-2xl font-bold text-red-400">{cancelledOrders}</p>
        </div>
        <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">COD Orders</p>
          <p className="text-2xl font-bold text-blue-400">{orders.filter(o => o.paymentMethod === 'COD' && o.orderStatus !== 'Cancelled').length}</p>
        </div>
        <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Online Paid</p>
          <p className="text-2xl font-bold text-green-400">{orders.filter(o => o.paymentMethod === 'ONLINE' && o.paymentStatus === 'Success').length}</p>
        </div>
        <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Avg Order</p>
          <p className="text-2xl font-bold text-spice-400">₹{totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0}</p>
        </div>
      </div>

      {/* Admin Tools */}
      <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2"><Wrench className="w-5 h-5" /><span>Admin Tools</span></h2>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={async () => {
              if (migrating) return;
              setMigrating(true);
              setMigrationResult(null);
              try {
                const res = await fetch('/api/admin/migrate-refunds', { method: 'POST', credentials: 'include' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setMigrationResult(`✅ ${data.message}`);
                toast.success(data.message);
              } catch (err: any) {
                setMigrationResult(`❌ ${err.message}`);
                toast.error(err.message);
              } finally {
                setMigrating(false);
              }
            }}
            disabled={migrating}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-2.5 px-6 rounded-xl transition flex items-center space-x-2"
          >
            {migrating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            <span>{migrating ? 'Running...' : 'Run Refund Migration'}</span>
          </button>
          {migrationResult && <span className="text-sm text-gray-400">{migrationResult}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <button
            onClick={async () => {
              if (cleaning) return;
              if (!confirm('Delete ALL orders and reset counter? This cannot be undone.')) return;
              setCleaning(true);
              setCleanResult(null);
              try {
                const res = await fetch('/api/admin/cleanup-legacy-orders', { method: 'POST', credentials: 'include' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setCleanResult(`✅ ${data.message}`);
                toast.success(data.message);
              } catch (err: any) {
                setCleanResult(`❌ ${err.message}`);
                toast.error(err.message);
              } finally {
                setCleaning(false);
              }
            }}
            disabled={cleaning}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-2.5 px-6 rounded-xl transition flex items-center space-x-2"
          >
            {cleaning && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            <span>{cleaning ? 'Cleaning...' : 'Clean Old Test Orders'}</span>
          </button>
          {cleanResult && <span className="text-sm text-gray-400">{cleanResult}</span>}
        </div>
      </div>
    </div>
  );
}
