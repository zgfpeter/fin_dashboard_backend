// dashboard.ts
import mongoose, { Document, Schema, HydratedDocument } from "mongoose";

// ---------- TYPES ----------

// Expense categories and account types
export type ExpenseCategory =
  | "subscription"
  | "bill"
  | "loan"
  | "insurance"
  | "tax"
  | "other";

export type AccountType = "checking" | "savings" | "credit" | "cash";

// Subdocument types
export interface IAccount {
  _id?: mongoose.Types.ObjectId; // MongoDB auto-generated ID
  userId: string;
  type: AccountType;
  balance: number;
  createdAt: Date;
}

export interface ITransaction {
  _id: mongoose.Types.ObjectId;
  date: Date;
  company: string;
  amount: number;
  transactionType: "income" | "expense";
  category: ExpenseCategory;
  account: AccountType;
}

export interface IUpcomingCharge {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  company: string;
  amount: number;
  category: ExpenseCategory;
  recurring?: boolean;
  parentRecurringId?: mongoose.Types.ObjectId;
  repeating?: "Weekly" | "BiWeekly" | "Monthly" | "Yearly";
}

export interface IDebt {
  _id: mongoose.Types.ObjectId;
  company: string;
  currentPaid: number;
  totalAmount: number;
  dueDate: Date;
}

export interface IGoal {
  _id: mongoose.Types.ObjectId;
  title: string;
  targetDate: Date;
  currentAmount: number;
  targetAmount: number;
}

export interface IIncome {
  _id: mongoose.Types.ObjectId;
  company: string;
  amount: number;
  date: Date;
}

// ---------- DASHBOARD INTERFACE ----------

// an interface for Typescript, helps it understand the types of my data. Only exists at development, removed at runtime
export interface IDashboard extends Document {
  // user id, each user will have their own data
  userId: mongoose.Types.ObjectId;
  overview: {
    totalBalance: number;
    monthlyChange: number;
  };
  accounts: IAccount[]; // subdocuments as plain objects
  transactions: ITransaction[];
  upcomingCharges: IUpcomingCharge[];
  debts: IDebt[];
  goals: IGoal[];
  income: IIncome[];
}

// ---------- DASHBOARD SCHEMA ----------

// A mongoose schema. Exists at runtime, tells MongoDB how to store, validate, and structure data.
const DashboardSchema = new Schema<IDashboard>(
  {
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
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: {
          type: String,
          enum: ["checking", "savings", "credit", "cash"],
          required: true,
        },
        balance: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    transactions: [
      {
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
          required: true,
        },
      },
    ],
    upcomingCharges: [
      {
        date: { type: Date, required: true },
        company: { type: String, required: true },
        amount: { type: Number, required: true },
        category: {
          type: String,
          enum: ["subscription", "bill", "loan", "insurance", "tax", "other"],
          required: true,
        },
        recurring: { type: Boolean, default: false },
        parentRecurringId: {
          type: Schema.Types.ObjectId,
          ref: "RecurringCharge",
        },
        repeating: {
          type: String,
          enum: ["Weekly", "BiWeekly", "Monthly", "Yearly"],
        },
      },
    ],
    debts: [
      {
        company: { type: String, required: true },
        currentPaid: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
      },
    ],
    goals: [
      {
        title: { type: String, required: true },
        targetDate: { type: Date, required: true },
        currentAmount: { type: Number, required: true },
        targetAmount: { type: Number, required: true },
      },
    ],
    income: [
      {
        company: { type: String, required: true },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { collection: "finance_collection" }
);

// Prevent duplicate upcoming charges
DashboardSchema.path("upcomingCharges").validate(function (charges: any[]) {
  const seen = new Set();
  for (const charge of charges) {
    const key = `${charge.company}-${charge.date}-${
      charge.parentRecurringId ?? "single"
    }`;
    if (seen.has(key)) return false; // duplicate found
    seen.add(key);
  }
  return true;
}, "Duplicate upcoming charges are not allowed.");

// Export the model
export default mongoose.model<IDashboard>(
  "Dashboard",
  DashboardSchema,
  "finance_collection"
);
