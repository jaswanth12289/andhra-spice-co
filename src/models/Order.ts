import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOrder extends Document {
  customOrderId: string;
  userId: mongoose.Types.ObjectId | string;
  phoneNumber: string;
  products: {
    productId: mongoose.Types.ObjectId | string;
    quantity: number;
    price: number;
    name: string;
    weight: string;
  }[];
  totalAmount: number;
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
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  customOrderId: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phoneNumber: { type: String, required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    name: { type: String, required: true },
    weight: { type: String, required: true }
  }],
  totalAmount: { type: Number, required: true },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'India' }
  },
  paymentMethod: { type: String, enum: ['ONLINE', 'COD'], required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Success', 'Failed', 'Refunded'], default: 'Pending' },
  orderStatus: { 
    type: String, 
    enum: ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Placed'
  },
  courierType: { type: String, enum: ['India Post', 'DTDC'] },
  trackingId: { type: String },
  adminNotes: { type: String }
}, { timestamps: true });

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
