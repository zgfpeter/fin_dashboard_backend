import mongoose, { Schema, Document } from "mongoose";

export interface IDebt extends Document {
  userId: mongoose.Types.ObjectId;
  company: string;
  currentPaid: number;
  totalAmount: number;
  dueDate: Date;
}

const DebtSchema = new Schema<IDebt>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  company: { type: String, required: true },
  currentPaid: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
});

export default mongoose.models.Debt ||
  mongoose.model<IDebt>("Debt", DebtSchema);
