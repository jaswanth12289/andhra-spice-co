'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, CreditCard, Trash2 } from 'lucide-react';

function PaymentBadge({ status, method }: { status: string; method: string }) {
  if (status === 'Success') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Paid</span>;
  if (status === 'Failed') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Failed</span>;
  if (status === 'Awaiting' || (status === 'Pending' && method === 'ONLINE')) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" />Unpaid</span>;
  if (status === 'Pending' && method === 'COD') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><CreditCard className="w-3 h-3 mr-1" />COD</span>;
  if (status === 'Refunded') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><RefreshCw className="w-3 h-3 mr-1" />Refunded</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">{status}</span>;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent, orderId: string) => {
    e.preventDefault();
    setUpdatingId(orderId);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success('Order status updated');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to permanently delete this order? This action cannot be undone.')) return;
    
    setDeletingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      toast.success('Order deleted successfully');
      setOrders(orders.filter(o => o.id !== orderId));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const isUnpaidOnline = (order: any) => {
    return order.paymentMethod === 'ONLINE' && 
      order.paymentStatus !== 'Success' && 
      order.paymentStatus !== 'Refunded' &&
      order.orderStatus !== 'Cancelled';
  };

  if (loading) return <div className="text-center py-20 font-bold animate-pulse text-xl">Loading Orders...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold font-outfit mb-6">Order Management</h1>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-spice-900 p-10 text-center rounded-2xl border border-spice-200">
          <p className="font-bold text-lg text-spice-500">No orders placed yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id || order.customOrderId} className={`bg-white dark:bg-spice-900 border rounded-2xl shadow-sm p-6 overflow-hidden ${
              isUnpaidOnline(order) ? 'border-yellow-400 dark:border-yellow-600' : 'border-spice-200 dark:border-spice-800'
            }`}>
              {/* Unpaid ONLINE warning banner */}
              {isUnpaidOnline(order) && (
                <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-lg mb-4 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>ONLINE payment not received — do NOT ship this order until payment is confirmed.</span>
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-spice-200 dark:border-spice-800 pb-4 mb-4 gap-4">
                <div>
                  <h3 className="text-xl font-bold font-outfit flex items-center space-x-3 flex-wrap gap-2">
                    <span className="bg-spice-100 dark:bg-black px-3 py-1 rounded font-mono text-lg">{order.customOrderId}</span>
                    <span className={`px-3 py-1 rounded text-sm font-bold ${
                      order.orderStatus === 'Delivered' ? 'bg-green-100 text-green-700' : 
                      order.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-700' : 
                      order.orderStatus === 'Payment Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{order.orderStatus}</span>
                    <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
                  </h3>
                  <p className="text-sm opacity-70 mt-2">{new Date(order.createdAt).toLocaleString()} &bull; {order.paymentMethod} &bull; ₹{order.totalAmount}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{order.phoneNumber}</p>
                  <p className="text-sm opacity-80 max-w-xs">{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold mb-3 border-b border-spice-100 pb-2">Order Items</h4>
                  <ul className="space-y-2">
                    {order.products.map((p: any) => (
                      <li key={p.productId} className="flex justify-between text-sm">
                        <span>{p.quantity} x {p.name}</span>
                        <span className="font-bold">₹{p.price * p.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold mb-3 border-b border-spice-100 pb-2">Admin Controls</h4>
                  <form onSubmit={(e) => handleUpdate(e, order.id)} className="space-y-4 bg-spice-50 dark:bg-black p-4 rounded-xl border border-spice-200 dark:border-spice-800">
                    <div>
                      <label className="block text-xs font-bold mb-1">Update Status</label>
                      <select name="orderStatus" defaultValue={order.orderStatus} className="w-full p-2 border border-spice-300 rounded dark:bg-spice-900 dark:border-spice-700 outline-none text-sm">
                        <option value="Payment Pending">Payment Pending</option>
                        <option value="Placed">Placed</option>
                        <option value="Packed">Packed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1">Courier</label>
                        <select name="courierType" defaultValue={order.courierType || ''} className="w-full p-2 border border-spice-300 rounded dark:bg-spice-900 dark:border-spice-700 outline-none text-sm">
                          <option value="">Select Courier</option>
                          <option value="India Post">India Post</option>
                          <option value="DTDC">DTDC</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Tracking ID</label>
                        <input name="trackingId" type="text" defaultValue={order.trackingId || ''} className="w-full p-2 border border-spice-300 rounded dark:bg-spice-900 dark:border-spice-700 outline-none text-sm" placeholder="Tracking #" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Admin Notes (Hidden from user)</label>
                      <textarea name="adminNotes" defaultValue={order.adminNotes || ''} className="w-full p-2 border border-spice-300 rounded dark:bg-spice-900 dark:border-spice-700 outline-none text-sm h-16" placeholder="Internal notes..." />
                    </div>

                    <button type="submit" disabled={updatingId === order.id} className="w-full bg-spice-800 hover:bg-spice-900 text-white font-bold py-2 rounded transition">
                      {updatingId === order.id ? 'Saving...' : 'Save Updates & Notify'}
                    </button>
                    {(order.orderStatus === 'Shipped' || order.trackingId) && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-bold text-center">Saving will trigger an Email Notification to the customer.</p>
                    )}
                    <div className="pt-4 mt-2 border-t border-spice-200 dark:border-spice-800">
                      <button 
                        type="button" 
                        onClick={() => handleDelete(order.id)} 
                        disabled={deletingId === order.id}
                        className="w-full flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-bold py-2 rounded transition"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deletingId === order.id ? 'Deleting...' : 'Delete Order'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
