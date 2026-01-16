import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId; // Link to User
  date: Date;
  company: string;
  amount: number;
  transactionType: "income" | "expense";
  category: string;
  account: string;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  }, // Index for fast queries
  date: { type: Date, required: true },
  company: { type: String, required: true },
  amount: { type: Number, required: true },
  transactionType: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },
  category: {
    type: String,
    enum: ["subscription", "bill", "loan", "insurance", "tax", "other"],
  },
  account: {
    type: String,
    enum: ["checking", "savings", "credit", "cash"],
    default: "cash",
  },
});

// This creates a "transactions" collection in MongoDB
export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
