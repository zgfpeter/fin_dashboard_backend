import mongoose, { Document, Schema } from "mongoose";
export type ExpenseCategory =
  | "Subscription"
  | "Bill"
  | "Loan"
  | "Insurance"
  | "Tax"
  | "Other";
export interface IDashboard extends Document {
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

// for the edit overview
// // PUT /api/dashboard/overview
// router.put("/dashboard/overview", async (req, res) => {
//   const { totalBalance, monthlyChange, savings, checkings } = req.body;

//   // Basic validation
//   if (totalBalance == null || isNaN(totalBalance) || totalBalance < 0) {
//     return res.status(400).json({ message: "Invalid totalBalance" });
//   }
//   if (monthlyChange == null || isNaN(monthlyChange)) {
//     return res.status(400).json({ message: "Invalid monthlyChange" });
//   }
//   if (savings != null && (isNaN(savings) || savings < 0)) {
//     return res.status(400).json({ message: "Invalid savings" });
//   }
//   if (checkings != null && (isNaN(checkings) || checkings < 0)) {
//     return res.status(400).json({ message: "Invalid checkings" });
//   }

//   try {
//     // Get the single dashboard object
//     const dashboard = await Dashboard.findOne();
//     if (!dashboard) {
//       return res.status(404).json({ message: "Dashboard not found" });
//     }

//     // Update the overview
//     dashboard.overview = {
//       totalBalance,
//       monthlyChange,
//       savings,
//       checkings,
//     };

//     await dashboard.save();

//     res.status(200).json({
//       message: "Overview updated successfully",
//       overview: dashboard.overview,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

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

export default mongoose.model<IDashboard>(
  "Dashboard",
  DashboardSchema,
  "finance_collection"
);
