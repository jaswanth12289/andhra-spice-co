import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICounter extends Document {
  id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter: Model<ICounter> = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

export default Counter;
