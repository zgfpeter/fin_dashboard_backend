// recurringCharge.ts
import mongoose, { Schema, Document, HydratedDocument } from "mongoose";
import { ExpenseCategory } from "../types/finance";

// ---------- TYPES ----------
export interface IRecurringCharge extends Document {
  userId: mongoose.Types.ObjectId;

  startDate: Date;
  company: string;
  amount: number;
  category: ExpenseCategory;

  repeating: "Weekly" | "BiWeekly" | "Monthly" | "Yearly";
  interval: number;

  endDate?: Date;
  count?: number;

  lastGenerated?: Date;
  createdAt: Date;
}

// ---------- SCHEMA ----------
const RecurringChargeSchema = new Schema<IRecurringCharge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    company: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["subscription", "bill", "loan", "insurance", "tax", "other"],
      required: true,
    },
    repeating: {
      type: String,
      enum: ["Weekly", "BiWeekly", "Monthly", "Yearly"],
      required: true,
    },
    interval: { type: Number, default: 1, min: 1 },
    endDate: { type: Date },
    count: { type: Number, min: 1 },
    lastGenerated: { type: Date },
  },
  { timestamps: true }
);

// Export the model
export default mongoose.model<IRecurringCharge>(
  "RecurringCharge",
  RecurringChargeSchema
);
