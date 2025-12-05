import path from "path";
import dotenv from "dotenv";
// This tells the script: "Look for .env in the current working directory (Root)"
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import mongoose from "mongoose";
import Dashboard from "../models/Dashboard";
import User from "../models/User";

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://petros:Abc12345@freecluster.oelub3u.mongodb.net/finance_database?retryWrites=true&w=majority"
    );
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ DB Connection Error:", error);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  try {
    // 1. Find the user
    const user = await User.findOne(); // Finds the first user in your DB
    if (!user) {
      console.log("❌ No users found.");
      process.exit(1);
    }

    console.log(`🌱 Seeding data for: ${user.username}`);

    // 2. Clear old data
    await Dashboard.deleteOne({ userId: user._id });

    // 3. Define Data with EXPLICIT STRINGS
    const dashboardData = {
      userId: user._id,
      overview: {
        totalBalance: 4250.5,
        monthlyChange: 12.5,
      },
      income: [
        {
          company: "Tech Solutions Inc.",
          amount: 3500,
        },
        {
          company: "Upwork Freelance",
          amount: 450,
        },
      ],
      transactions: [
        {
          date: "2025-01-12", // <--- Explicit String
          company: "Spotify",
          amount: 12.99,
          transactionType: "expense",
          category: "Subscription",
        },
        {
          date: "2025-01-12",
          company: "Whole Foods",
          amount: 85.5,
          transactionType: "expense",
          category: "Other",
        },
        {
          date: "2025-01-10",
          company: "Tech Solutions Inc.",
          amount: 3500,
          transactionType: "income",
          category: "Other",
        },
        {
          date: "2025-01-05",
          company: "Geico",
          amount: 120.0,
          transactionType: "expense",
          category: "Insurance",
        },
        {
          date: "2024-12-28",
          company: "Electric Company",
          amount: 145.2,
          transactionType: "expense",
          category: "Bill",
        },
      ],
      upcomingCharges: [
        {
          date: "2025-02-01", // Future date
          company: "Netflix",
          amount: 15.99,
          category: "Subscription",
          recurring: true,
        },
        {
          date: "2025-02-01",
          company: "Apartment Rent",
          amount: 1200.0,
          category: "Bill",
          recurring: true,
        },
        {
          date: "2025-02-15",
          company: "Car Insurance",
          amount: 120.0,
          category: "Insurance",
          recurring: true,
        },
      ],
      debts: [
        {
          company: "Chase Credit Card",
          currentPaid: 500,
          totalAmount: 2000,
          dueDate: "2025-12-31",
        },
        {
          company: "Student Loan",
          currentPaid: 15000,
          totalAmount: 40000,
          dueDate: "2030-05-15",
        },
      ],
      goals: [
        {
          title: "Trip to Japan",
          targetDate: "2025-06-01",
          currentAmount: 1500,
          targetAmount: 5000,
        },
        {
          title: "New MacBook",
          targetDate: "2025-11-20",
          currentAmount: 800,
          targetAmount: 2500,
        },
      ],
    };

    // 4. Create
    await Dashboard.create(dashboardData as any);

    console.log("✅ Dummy data successfully seeded!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

//seedData();
