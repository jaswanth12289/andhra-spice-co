'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Package, Truck, CheckCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
        else toast.error(data.error || 'Failed to load orders');
      })
      .catch(() => toast.error('Network Error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const isCancellable = (order: any) => {
    if (order.orderStatus !== 'Placed' && order.orderStatus !== 'Packed') return false;
    const hoursSinceOrder = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceOrder < 24;
  };

  if (authLoading || loading) return <div className="min-h-[60vh] flex items-center justify-center font-bold text-xl animate-pulse">Loading Vault...</div>;

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl font-bold font-outfit mb-4">Access Denied</h2>
        <p className="opacity-70 mb-8">Please login to view your order history.</p>
        <Link href="/login" className="bg-spice-600 text-white px-8 py-3 rounded-full font-bold hover:bg-spice-700 transition">Log In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-28 pb-16 min-h-[80vh]">
      <h1 className="text-4xl font-bold font-outfit mb-2">My Orders</h1>
      <p className="text-gray-500 mb-10 border-b border-spice-200 dark:border-spice-800 pb-4">Track and review your previous acquisitions.</p>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-spice-50 dark:bg-spice-900 rounded-3xl border border-spice-200 dark:border-spice-800">
          <Package className="w-16 h-16 mx-auto text-spice-300 mb-4" />
          <p className="text-xl font-bold">No orders found.</p>
          <Link href="/products" className="inline-block mt-6 text-spice-600 font-bold hover:underline">Explore the Collection</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map(order => (
            <div key={order.id || order.customOrderId} className="bg-white dark:bg-black border border-spice-200 dark:border-spice-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 pb-6 border-b border-spice-100 dark:border-spice-900">
                <div>
                  <span className="text-xs font-bold text-spice-500 uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                  <h3 className="text-xl font-bold mt-1 font-mono">Order {order.customOrderId}</h3>
                </div>
                
                <div className="mt-4 md:mt-0 text-left md:text-right">
                  <div className="text-2xl font-light">₹{order.totalAmount}</div>
                  <div className="text-xs uppercase tracking-widest opacity-60 font-bold mt-1">{order.paymentMethod} • {order.paymentStatus}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs uppercase tracking-widest font-bold opacity-60">Items</h4>
                  {order.products.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm bg-spice-50 dark:bg-spice-900/40 p-3 rounded-lg border border-spice-100 dark:border-spice-800/50">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{p.quantity}x {p.name} <span className="opacity-50 text-xs ml-2">({p.weight || 'Default'})</span></span>
                      <span className="font-bold">₹{p.price * p.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-spice-50 dark:bg-spice-900/30 p-6 rounded-xl border border-spice-100 dark:border-spice-800">
                  <h4 className="text-xs uppercase tracking-widest font-bold opacity-60 mb-4">Delivery Status</h4>
                  
                  <div className="flex items-center space-x-3 mb-4">
                    {order.orderStatus === 'Delivered' ? <CheckCircle className="text-green-500" /> : <Truck className="text-spice-500" />}
                    <span className="font-bold text-lg">{order.orderStatus}</span>
                  </div>

                  {order.orderStatus === 'Shipped' && order.trackingId && (
                    <div className="mt-6">
                      <div className="text-xs opacity-70 mb-1">Shipped via {order.courierType}</div>
                      <div className="font-mono text-sm uppercase bg-white dark:bg-black px-3 py-2 border border-spice-200 dark:border-spice-700 rounded mb-4">
                        {order.trackingId}
                      </div>
                      
                      {order.courierType === 'DTDC' && (
                        <a href={`https://www.dtdc.in/tracking?awb=${order.trackingId}`} target="_blank" rel="noreferrer" className="flex items-center justify-center space-x-2 w-full bg-spice-100 hover:bg-spice-200 text-spice-900 dark:bg-spice-800 dark:hover:bg-spice-700 dark:text-white py-2 rounded-lg font-bold transition text-sm">
                          <span>Track Package</span> <ExternalLink className="w-4 h-4"/>
                        </a>
                      )}
                      {order.courierType === 'India Post' && (
                        <a href={`https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`} target="_blank" rel="noreferrer" className="flex items-center justify-center space-x-2 w-full bg-spice-100 hover:bg-spice-200 text-spice-900 dark:bg-spice-800 dark:hover:bg-spice-700 dark:text-white py-2 rounded-lg font-bold transition text-sm">
                          <span>Track Package</span> <ExternalLink className="w-4 h-4"/>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-spice-200 dark:border-spice-800/50">
                    <p className="text-xs opacity-70 mb-4">{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                    
                    {isCancellable(order) && (
                      <button 
                        onClick={() => handleCancel(order.customOrderId || order.id)}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/10 dark:hover:bg-red-900/20 dark:text-red-500 py-2 rounded-lg font-bold transition text-sm flex items-center justify-center"
                      >
                        Cancel Order <span className="ml-1 opacity-60 text-xs font-normal">(available for 24h)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
