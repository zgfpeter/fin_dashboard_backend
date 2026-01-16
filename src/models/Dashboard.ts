import mongoose, { Schema, Document } from "mongoose";
import { AccountType } from "../types/finance";

export interface IAccount {
  _id?: mongoose.Types.ObjectId;
  type: AccountType; // Use shared type
  balance: number;
  createdAt: Date;
}
export interface IDashboard extends Document {
  userId: mongoose.Types.ObjectId;
  overview: {
    totalBalance: number;
    monthlyChange: number;
  };
  // Accounts are usually few (checking, savings), so it is OK to keep them embedded if you want
  accounts: IAccount[];
}

const DashboardSchema = new Schema<IDashboard>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  overview: {
    totalBalance: { type: Number, default: 0 },
    monthlyChange: { type: Number, default: 0 },
  },
  accounts: [
    {
      type: {
        type: String,
        enum: ["checking", "savings", "credit", "cash"],
        required: true,
      },
      balance: { type: Number, required: true },
    },
  ],
});

export default mongoose.models.Dashboard ||
  mongoose.model<IDashboard>("Dashboard", DashboardSchema);
