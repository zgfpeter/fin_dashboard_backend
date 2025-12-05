import mongoose, { Document, Schema } from "mongoose";
export type ExpenseCategory =
  | "Subscription"
  | "Bill"
  | "Loan"
  | "Insurance"
  | "Tax"
  | "Other";
export interface IDashboard extends Document {
  // user id, each user will have their own data
  userId: mongoose.Types.ObjectId;
  overview: {
    totalBalance: number;
    monthlyChange: number;
  };
  transactions: {
    _id: string; // because mongodb creates _id automatically
    date: string;
    company: string;
    amount: number;
    transactionType: string;
    category: ExpenseCategory;
  }[];
  upcomingCharges: {
    _id: string;
    date: string;
    company: string;
    amount: number;
    category: ExpenseCategory;
  }[];
  debts: {
    _id: string;
    company: string;
    currentPaid: number;
    totalAmount: number;
    dueDate: string;
  }[];
  goals: {
    _id: string;
    title: string;
    targetDate: string;
    currentAmount: number;
    targetAmount: number;
  }[];
  income: {
    _id: string;
    company: string;
    amount: number;
  }[];
}

// this is how the data will look like in the database
const DashboardSchema = new Schema<IDashboard>(
  {
    // user id, each user will have their own data
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    overview: {
      totalBalance: Number,
      monthlyChange: Number,
    },

    transactions: [
      {
        date: String,
        company: String,
        amount: Number,
        transactionType: String,
        category: {
          type: String,
          enum: ["Subscription", "Bill", "Loan", "Insurance", "Tax", "Other"],
        },
        _id: { type: Schema.Types.ObjectId, auto: true }, // <-- add this
      },
    ],

    upcomingCharges: [
      {
        date: String,
        company: String,
        amount: Number,
        category: {
          type: String,
          enum: ["Subscription", "Bill", "Loan", "Insurance", "Tax", "Other"],
        },
        recurring: Boolean,
        _id: { type: Schema.Types.ObjectId, auto: true },
      },
    ],

    debts: [
      {
        company: String,
        currentPaid: Number,
        totalAmount: Number,
        dueDate: String,
        _id: { type: Schema.Types.ObjectId, auto: true },
      },
    ],

    goals: [
      {
        title: String,
        targetDate: String,
        currentAmount: Number,
        targetAmount: Number,
        _id: { type: Schema.Types.ObjectId, auto: true },
      },
    ],

    income: [
      {
        company: String,
        amount: Number,
        _id: { type: Schema.Types.ObjectId, auto: true },
      },
    ],
  },
  {
    collection: "finance_collection",
  }
);

export type TransactionCSV = {
  company: string;
  description: string;
  amount: string;
};

// don't allow duplicate charges
DashboardSchema.path("upcomingCharges").validate(function (charges: any[]) {
  const seen = new Set();
  for (const charge of charges) {
    // define what counts as a duplicate: company + date
    const key = `${charge.company}-${charge.date}`;
    if (seen.has(key)) return false; // duplicate found
    seen.add(key);
  }
  return true;
}, "Duplicate upcoming charges are not allowed.");

// the model Dashboard is what i use to query the database
export default mongoose.model<IDashboard>(
  "Dashboard",
  DashboardSchema,
  "finance_collection"
);
