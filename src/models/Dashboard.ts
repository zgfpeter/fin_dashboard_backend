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
      _id?: string;
      userId: string;
      type: AccountType;
      balance: number;
      createdAt: Date;
    }
  ];
  transactions: {
    _id?: mongoose.Types.ObjectId; // because mongodb creates _id automatically
    date: Date;
    company: string;
    amount: number;
    transactionType: "income" | "expense";
    category: ExpenseCategory;
    account: AccountType;
  }[];
  upcomingCharges: {
    _id?: mongoose.Types.ObjectId;
    date: Date;
    company: string;
    amount: number;
    category: ExpenseCategory;
    recurring?: boolean;
  }[];
  debts: {
    _id: mongoose.Types.ObjectId;
    company: string;
    currentPaid: number;
    totalAmount: number;
    dueDate: Date;
  }[];
  goals: {
    _id?: mongoose.Types.ObjectId;
    title: string;
    targetDate: Date;
    currentAmount: number;
    targetAmount: number;
  }[];
  income: {
    _id?: mongoose.Types.ObjectId;
    company: string;
    amount: number;
    date: Date;
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
      totalBalance: { type: Number, default: 0 },
      monthlyChange: { type: Number, default: 0 },
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
          required: true,
        },
        balance: {
          type: Number,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    transactions: [
      {
        date: {
          type: Date,
          required: true,
        },
        company: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
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
        date: {
          type: Date,
          required: true,
        },
        company: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        category: {
          type: String,
          enum: ["subscription", "bill", "loan", "insurance", "tax", "other"],
          required: true,
        },
        recurring: {
          type: Boolean,
          default: false,
        },
      },
    ],

    debts: [
      {
        company: {
          type: String,
          required: true,
        },
        currentPaid: {
          type: Number,
          required: true,
        },
        totalAmount: {
          type: Number,
          required: true,
        },
        dueDate: {
          type: Date,
          required: true,
        },
      },
    ],

    goals: [
      {
        title: {
          type: String,
          required: true,
        },
        targetDate: {
          type: Date,
          required: true,
        },
        currentAmount: {
          type: Number,
          required: true,
        },
        targetAmount: {
          type: Number,
          required: true,
        },
      },
    ],

    income: [
      {
        company: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
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
