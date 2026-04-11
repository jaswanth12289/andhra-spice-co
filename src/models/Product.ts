import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOption {
  weight: string;
  price: number;
  stock: number;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  options: IOption[];
  category: 'Whole Spices' | 'Powdered Spices' | 'Blended Masalas';
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IOption>({
  weight: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 }
}, { _id: false });

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  options: { type: [OptionSchema], required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Whole Spices', 'Powdered Spices', 'Blended Masalas'] 
  },
  imageUrl: { type: String, required: true }
}, { timestamps: true });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
