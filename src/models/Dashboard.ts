import mongoose, { Document, Schema } from "mongoose";
export type ExpenseCategory =
  | "subscription"
  | "bill"
  | "loan"
  | "insurance"
  | "tax"
  | "other";

export type AccountType = "checking" | "savings" | "credit" | "cash";

// an interface for Typescript, it helps it understand the types of my data. It only exists at development type, is completely remoed when the code runs.
// Defines what properties exist, what types are expected.
// it Doesn't validate data, doesn't create a database structure, mongodb never sees it.
export interface IDashboard extends Document {
  // user id, each user will have their own data
  userId: mongoose.Types.ObjectId;
  overview: {
    totalBalance: number;
    monthlyChange: number;
  };
  accounts: [
    {
      _id: string;
      userId: string;
      type: AccountType;
      balance: number;
      createdAt: string;
    }
  ];
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

// A mongoose schema. Exists at runtime, tells MongoDB how to store, validate, and structure data. This is what actually enforces rules in the database.
// I need both the interface, and the schema.
// With new Schema<IDashboard>... mongoose knows the structure, typescript knows the document type returned.
// So when i do await Dashboard.findOne(...), i get intellisense, type checking, fewer runtime bugs
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
    accounts: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        type: {
          type: String,
          enum: ["checking", "savings", "credit", "cash"],
        },
        balance: Number,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        _id: {
          type: Schema.Types.ObjectId,
          auto: true,
        },
      },
    ],

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
        _id: { type: Schema.Types.ObjectId, auto: true },
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
