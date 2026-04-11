'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Truck, CheckCircle, Package, MapPin, XCircle } from 'lucide-react';

export default function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setOrder(data))
      .catch(() => toast.error('Order not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 font-bold text-xl animate-pulse">Loading order details...</div>;
  if (!order) return <div className="text-center py-20 text-xl font-bold">Order not found</div>;

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Order cancelled successfully');
      setOrder(data.order);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getTrackingLink = () => {
    if (!order.trackingId) return null;
    if (order.courierType === 'DTDC') return `https://www.dtdc.in/tracking?awb=${order.trackingId}`;
    if (order.courierType === 'India Post') return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-spice-900 border border-spice-200 p-8 sm:p-12 rounded-3xl shadow-lg">
        <div className="text-center mb-10 border-b pb-8">
          {order.orderStatus === 'Cancelled' ? (
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          ) : (
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          )}
          <h1 className="text-4xl font-bold font-outfit text-spice-900 dark:text-spice-100">
            {order.orderStatus === 'Cancelled' 
              ? (order.paymentStatus === 'Failed' ? 'Payment Failed' : 'Order Cancelled') 
              : 'Order Placed Successfully!'}
          </h1>
          <p className="mt-4 text-xl">Order ID: <span className="font-bold font-mono bg-spice-100 dark:bg-black px-4 py-2 rounded-lg">{order.customOrderId}</span></p>
          <p className="mt-2 text-spice-600 dark:text-spice-400">Total: ₹{order.totalAmount} &bull; Payment Mode: {order.paymentMethod} &bull; Status: {order.paymentStatus}</p>
        </div>

        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold font-outfit mb-4">Status: <span className={order.orderStatus === 'Cancelled' ? 'text-red-500' : 'text-spice-600'}>{order.orderStatus}</span></h2>
          {order.orderStatus === 'Shipped' || order.orderStatus === 'Out for Delivery' ? (
            <div className="bg-spice-50 dark:bg-spice-800 p-6 rounded-xl border border-spice-200 max-w-lg mx-auto">
              <Truck className="w-10 h-10 mx-auto text-spice-600 mb-2" />
              <p className="font-bold text-lg mb-1">{order.courierType}</p>
              <p className="font-mono bg-white dark:bg-black p-2 rounded inline-block border mb-4">{order.trackingId}</p>
              <p className="text-sm font-bold text-green-600 mb-4">Estimated Delivery: 3-5 days</p>
              {getTrackingLink() && (
                <a href={getTrackingLink()!} target="_blank" className="block w-full bg-spice-600 hover:bg-spice-700 text-white font-bold py-3 rounded-xl transition">Track Package</a>
              )}
            </div>
          ) : order.orderStatus === 'Cancelled' ? (
            <div className="text-red-500 flex justify-center items-center space-x-2">
              <span>{order.paymentStatus === 'Failed' ? 'Your online payment failed or was abandoned. The order has been automatically cancelled and stock has been restored.' : 'This order has been safely cancelled and stock is restored.'}</span>
            </div>
          ) : (
             <div className="text-spice-500 flex justify-center items-center space-x-2">
               <Package /><span>We are processing your order.</span>
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2" /> Shipping Address</h3>
            <div className="bg-spice-50 dark:bg-black p-4 rounded-xl border border-spice-200">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p className="font-bold mt-2">Phone: {order.phoneNumber}</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center"><Package className="w-5 h-5 mr-2" /> Items</h3>
            <div className="bg-spice-50 dark:bg-black p-4 rounded-xl border border-spice-200 max-h-48 overflow-y-auto">
              {order.products.map((p: any) => (
                <div key={p.productId} className="flex justify-between border-b border-spice-200 py-2 last:border-0 text-sm">
                  <span>{p.quantity} x {p.name}</span>
                  <span className="font-bold">₹{p.price * p.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center space-x-4">
          <Link href="/products" className="inline-block bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-8 rounded-full transition hover:opacity-80">
            Continue Shopping
          </Link>
          {(order.orderStatus === 'Placed' || order.orderStatus === 'Packed') && (
            <button onClick={handleCancel} className="inline-block border-2 border-red-500 text-red-500 font-bold py-3 px-8 rounded-full transition hover:bg-red-500 hover:text-white">
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
