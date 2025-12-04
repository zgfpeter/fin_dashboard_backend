import { Router } from "express";
const router = Router();
import mongoose from "mongoose";
import Dashboard from "../models/Dashboard";
// import controllers
import {
  addNewCharge,
  addTransaction,
  deleteCharge,
  deleteTransaction,
  getDashboard,
  getDebts,
  getGoals,
  getIncome,
  getTransactions,
  getUpcomingCharges,
  updateCharge,
  updateTransaction,
} from "../controllers/dashboardController";

//import ParseFile from "../lib/parseFile";
// get the whole single data object ( in my database i have one object with all the data )
router.get("/dashboard", getDashboard);

// get transactions
router.get("/dashboard/transactions", getTransactions);

// get upcoming Charges
router.get("/dashboard/upcomingCharges", getUpcomingCharges);
// get debts

router.get("/dashboard/debts", getDebts);
// get goals

router.get("/dashboard/goals", getGoals);

// get income
router.get("/dashboard/income", getIncome);

//POST a new upcoming charge
router.post("/dashboard/upcomingCharges", addNewCharge);

// PUT upcoming charges
// TODO maybe add a check if the upcoming charge exists? unless i want multiple charges, it could be that the user is charged multiple times, same day, same amount, same company?
router.put("/dashboard/upcomingCharges/:id", updateCharge);

// DELETE upcoming charge
router.delete("/dashboard/upcomingCharges/:id", deleteCharge);

// delete transaction
router.delete("/dashboard/transactions/:id", deleteTransaction);

// add a new transaction
router.post("/dashboard/transactions", addTransaction);

// PUT ( EDIT ) transaction
// TODO maybe add a check if the transaction exists? unless i want multiple transactions, it could be that the user is charged multiple times, same day, same amount, same company?
router.put("/dashboard/transactions/:id", updateTransaction);

export default router;
export async function insertDummyData() {
  const dashboard = new Dashboard({
    overview: {
      totalBalance: 12000,
      monthlyChange: 450,
    },

    transactions: [
      {
        date: "2025-12-01",
        company: "Netflix",
        amount: 15,
        transactionType: "expense",
        category: "Subscription",
      },
      {
        date: "2025-12-02",
        company: "Electricity Co",
        amount: 80,
        transactionType: "expense",
        category: "Bill",
      },
      {
        date: "2025-12-03",
        company: "Acme Corp",
        amount: 2000,
        transactionType: "income",
        category: "Other",
      },
      {
        date: "2025-12-01",
        company: "Netflix",
        amount: 15,
        transactionType: "expense",
        category: "Subscription",
      },
      {
        date: "2025-12-02",
        company: "Electricity Co",
        amount: 80,
        transactionType: "expense",
        category: "Bill",
      },
      {
        date: "2025-12-03",
        company: "Acme Corp",
        amount: 2000,
        transactionType: "income",
        category: "Other",
      },
      {
        date: "2025-12-04",
        company: "Spotify",
        amount: 10,
        transactionType: "expense",
        category: "Subscription",
      },
      {
        date: "2025-12-05",
        company: "Water Co",
        amount: 25,
        transactionType: "expense",
        category: "Bill",
      },
      {
        date: "2025-12-06",
        company: "Government",
        amount: 500,
        transactionType: "income",
        category: "Tax",
      },
      {
        date: "2025-12-07",
        company: "Car Insurance",
        amount: 100,
        transactionType: "expense",
        category: "Insurance",
      },
      {
        date: "2025-12-08",
        company: "Loan Payment",
        amount: 200,
        transactionType: "expense",
        category: "Loan",
      },
      {
        date: "2025-12-09",
        company: "Gym",
        amount: 50,
        transactionType: "expense",
        category: "Subscription",
      },
      {
        date: "2025-12-10",
        company: "Tax Payment",
        amount: 300,
        transactionType: "expense",
        category: "Tax",
      },
      {
        date: "2025-12-11",
        company: "Car Tax",
        amount: 800,
        transactionType: "expense",
        category: "Tax",
      },
      {
        date: "2025-12-12",
        company: "Electricity Co",
        amount: 75,
        transactionType: "expense",
        category: "Bill",
      },
      {
        date: "2025-12-13",
        company: "Netflix",
        amount: 15,
        transactionType: "expense",
        category: "Subscription",
      },
      {
        date: "2025-12-14",
        company: "Water Co",
        amount: 30,
        transactionType: "expense",
        category: "Bill",
      },
      {
        date: "2025-12-15",
        company: "Insurance",
        amount: 600,
        transactionType: "income",
        category: "Insurance",
      },
      {
        date: "2025-12-16",
        company: "Car Loan",
        amount: 500,
        transactionType: "expense",
        category: "Loan",
      },
      {
        date: "2025-12-17",
        company: "Insurance",
        amount: 120,
        transactionType: "expense",
        category: "Insurance",
      },
      {
        date: "2025-12-18",
        company: "Spotify",
        amount: 10,
        transactionType: "expense",
        category: "Subscription",
      },
      {
        date: "2025-12-19",
        company: "INTERLIFE",
        amount: 350,
        transactionType: "expense",
        category: "Insurance",
      },
      {
        date: "2025-12-20",
        company: "ZARA",
        amount: 1500,
        transactionType: "expense",
        category: "Subscription",
      },
    ],

    upcomingCharges: [
      {
        date: "2025-12-10",
        company: "Gym",
        amount: 50,
        category: "Subscription",
        recurring: true,
      },
      {
        date: "2025-12-15",
        company: "Water Co",
        amount: 30,
        category: "Bill",
      },
      {
        date: "2025-12-21",
        company: "Gym",
        amount: 50,
        category: "Subscription",
        recurring: true,
      },
      {
        date: "2025-12-22",
        company: "Water Co",
        amount: 30,
        category: "Bill",
      },
      {
        date: "2025-12-23",
        company: "Netflix",
        amount: 15,
        category: "Subscription",
      },
      {
        date: "2025-12-24",
        company: "Car Insurance",
        amount: 100,
        category: "Insurance",
      },
      {
        date: "2025-12-25",
        company: "Tax Payment",
        amount: 300,
        category: "Tax",
      },
      {
        date: "2025-12-26",
        company: "Loan Payment",
        amount: 200,
        category: "Loan",
      },
      {
        date: "2025-12-27",
        company: "Spotify",
        amount: 10,
        category: "Subscription",
      },
      {
        date: "2025-12-28",
        company: "Electricity Co",
        amount: 80,
        category: "Bill",
      },
      {
        date: "2025-12-28",
        company: "Paolo's",
        amount: 150,
        category: "Other",
      },
    ],

    debts: [
      {
        company: "Bank Loan",
        currentPaid: 5000,
        totalAmount: 10000,
        dueDate: "2026-01-01",
      },
      {
        company: "Car Loan",
        currentPaid: 3000,
        totalAmount: 8000,
        dueDate: "2026-06-01",
      },
    ],

    goals: [
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Vacation Fund",
        targetDate: "2026-07-01",
        currentAmount: 1500,
        targetAmount: 3000,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Emergency Fund",
        targetDate: "2026-12-31",
        currentAmount: 2000,
        targetAmount: 5000,
      },
    ],

    income: [
      {
        _id: new mongoose.Types.ObjectId(),
        company: "Acme Corp",
        amount: 2000,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        company: "Freelance",
        amount: 500,
      },
    ],
  });

  await dashboard.save();
  console.log("Dummy dashboard inserted!");
}

// import file
// ! NOT GREAT, IDEALLY THE USER SHOULD BE ABLE TO UPLOAD DATA SEPARATELY
// !FOR EXAMPLE, UPLOAD CHARGES, UPLOAD TRANSACTIONS ETC, SO A DIFFERENT BUTTON FOR EACH IMPORT
// const storage = multer.memoryStorage(); // keeps file in memory
// // max size 1MB
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
// });
// router.post("/upload", upload.single("file"), (req, res) => {
//   const file = req.file; // this file is the uploaded file
//   if (!file) {
//     return res.status(400).json({ message: "No file uploaded" });
//   } else {
//     const parsedRecords = ParseFile(req?.file?.buffer);
//     console.log(parsedRecords);
//   }

//   console.log("Received file: ", file.originalname);
//   console.log("Buffer size: ", file.buffer.length);

//   res.send({ success: true, filename: file.originalname });
// });

/// {
