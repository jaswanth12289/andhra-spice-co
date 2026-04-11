import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  addresses?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  addresses: [{
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  }]
}, { timestamps: true });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
