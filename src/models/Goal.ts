import mongoose, { Schema, Document } from "mongoose";

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  targetDate: Date;
  currentAmount: number;
  targetAmount: number;
}

const GoalSchema = new Schema<IGoal>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  targetDate: { type: Date, required: true },
  currentAmount: { type: Number, required: true },
  targetAmount: { type: Number, required: true },
});

export default mongoose.models.Goal ||
  mongoose.model<IGoal>("Goal", GoalSchema);
