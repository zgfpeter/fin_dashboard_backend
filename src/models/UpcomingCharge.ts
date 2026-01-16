import mongoose, { Schema, Document } from "mongoose";

export interface IUpcomingCharge extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  company: string;
  amount: number;
  category: string;
  recurring: boolean;
  repeating?: "Weekly" | "Monthly" | "Yearly";
}

const UpcomingChargeSchema = new Schema<IUpcomingCharge>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  date: { type: Date, required: true },
  company: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  recurring: { type: Boolean, default: false },
  repeating: {
    type: String,
    enum: ["Weekly", "Monthly", "Yearly"],
  },
});

export default mongoose.models.UpcomingCharge ||
  mongoose.model<IUpcomingCharge>("UpcomingCharge", UpcomingChargeSchema);
