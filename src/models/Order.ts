export interface IOrder {
  id?: string;
  customOrderId: string;
  userId: string;
  phoneNumber: string;
  products: {
    productId: string;
    quantity: number;
    price: number;
    name: string;
    weight: string;
  }[];
  totalAmount: number;
  deliveryCharge: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: 'ONLINE' | 'COD';
  paymentStatus: 'Pending' | 'Success' | 'Failed' | 'Refunded';
  orderStatus: 'Placed' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  courierType?: 'India Post' | 'DTDC';
  trackingId?: string;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}
