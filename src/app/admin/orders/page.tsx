'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, CreditCard, Trash2, Download, ShieldCheck, Printer } from 'lucide-react';

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

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (cursor?: string) => {
    try {
      const url = cursor 
        ? `/api/orders?limit=10&cursor=${encodeURIComponent(cursor)}`
        : `/api/orders?limit=10`;
        
      const res = await fetch(url);
      const data = await res.json();
      const newOrders = Array.isArray(data) ? data : [];
      
      if (newOrders.length < 10) setHasMore(false);
      
      if (cursor) {
        setOrders(prev => {
          // Prevent duplicates incase of strict mode double invocation
          const existingIds = new Set(prev.map(o => o.id));
          const uniqueNew = newOrders.filter(o => !existingIds.has(o.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setOrders(newOrders);
        if (newOrders.length === 10) setHasMore(true);
      }
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
      // Update locally to avoid wiping out pagination
      setOrders(orders.map(o => o.id === orderId ? { ...o, ...data } : o));
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

  const handleExportCSV = () => {
    if (orders.length === 0) return toast.error('No orders to export');

    const headers = ['Order ID', 'Date', 'Customer Phone', 'Payment Mode', 'Payment Status', 'Order Status', 'Total Amount', 'Items'];
    const rows = orders.map(o => {
      const itemsStr = o.products.map((p: any) => `${p.quantity}x ${p.name} (${p.weight})`).join('; ');
      return [
        o.customOrderId,
        `"${new Date(o.createdAt).toLocaleString()}"`,
        `"${o.phoneNumber}"`,
        o.paymentMethod,
        o.paymentStatus,
        o.orderStatus,
        o.totalAmount,
        `"${itemsStr}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AndhraSpice_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPackingSlip = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Packing Slip - ${order.customOrderId}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; line-height: 1.5; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { font-size: 16px; text-transform: uppercase; margin-top: 8px; color: #444; font-weight: bold; }
            .meta-info { margin-bottom: 30px; font-size: 16px; }
            .meta-info strong { display: inline-block; width: 100px; }
            .address-box { border: 2px solid #000; padding: 25px; margin-bottom: 40px; border-radius: 8px; }
            .address-title { font-weight: bold; margin-bottom: 15px; font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px; display: inline-block; }
            .address-content { font-size: 20px; line-height: 1.6; }
            .items-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 12px; text-align: left; font-size: 16px; }
            .items-table th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; }
            .footer { margin-top: 50px; text-align: center; font-size: 14px; color: #555; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print {
              body { padding: 0; margin: 0; -webkit-print-color-adjust: exact; }
              @page { margin: 1cm; size: A4; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Andhra Spice Co</h1>
            <div class="subtitle">Packing Slip / Shipping Label</div>
          </div>
          
          <div class="meta-info">
            <div><strong>Order ID:</strong> ${order.customOrderId}</div>
            <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
          </div>

          <div class="address-box">
            <div class="address-title">Ship To / Parcel Destination:</div>
            <div class="address-content">
              <strong>Customer Name:</strong> Andhra Spice Customer <br/>
              <strong>Address:</strong> <br/>
              ${order.shippingAddress.street}<br/>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br/>
              <strong>Phone:</strong> ${order.phoneNumber}
            </div>
          </div>

          <div class="items-section">
            <div class="items-title">Ordered Items:</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Weight/Variant</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${order.products.map((p: any) => \`
                  <tr>
                    <td><strong>\${p.name}</strong></td>
                    <td>\${p.weight || 'Standard'}</td>
                    <td>\${p.quantity}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <strong>Andhra Spice Co</strong> - Authentic Spices Delivered.<br/>
            Thank you for your order!
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    \`);
    printWindow.document.close();
  };

  if (loading) return <div className="text-center py-20 font-bold animate-pulse text-xl">Loading Orders...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h1 className="text-3xl font-bold font-outfit">Order Management</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleExportCSV}
            className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-4 py-2 rounded-xl font-bold transition flex items-center space-x-2 text-sm shadow"
          >
            <Download className="w-4 h-4" />
            <span>Export Visible Orders (CSV)</span>
          </button>
        </div>
      </div>

      {/* Operational Safety Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300">
        <h3 className="font-bold flex items-center mb-1"><ShieldCheck className="w-4 h-4 mr-2" /> Database Backup & Export Protocol</h3>
        <p className="opacity-90 leading-relaxed">
          <strong>Daily Export:</strong> Use the button above to export visible orders locally to CSV format.<br/>
          <strong>Full Cloud Backup:</strong> To perform a complete structural database backup, navigate to the <a href="https://console.cloud.google.com/firestore/databases/-default-/export" target="_blank" className="underline font-bold">Google Cloud Console</a> &rarr; Firestore &rarr; Import/Export and schedule a bucket export.
        </p>
      </div>

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
                  <h4 className="font-bold mb-3 border-b border-spice-100 pb-2 flex justify-between items-center">
                    <span>Admin Controls</span>
                    <button 
                      type="button" 
                      onClick={() => handlePrintPackingSlip(order)}
                      className="inline-flex items-center space-x-1.5 bg-spice-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-spice-900 transition shadow-sm"
                      title="Print Packing Slip (No Prices)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Slip</span>
                    </button>
                  </h4>
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

      {hasMore && orders.length > 0 && (
        <div className="flex justify-center mt-8">
          <button 
            onClick={() => {
              setLoadingMore(true);
              fetchOrders(orders[orders.length - 1].createdAt);
            }}
            disabled={loadingMore}
            className="bg-spice-100 hover:bg-spice-200 text-spice-800 dark:bg-spice-900/50 dark:text-spice-200 dark:hover:bg-spice-800 px-6 py-2 rounded-full font-bold transition flex items-center space-x-2"
          >
            {loadingMore && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{loadingMore ? 'Loading...' : 'Load More Orders'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
