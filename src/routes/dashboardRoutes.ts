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

// import file
// ! NOT GREAT, IDEALLY THE USER SHOULD BE ABLE TO UPLOAD DATA SEPARATELY
// !FOR EXAMPLE, UPLOAD CHARGES, UPLOAD TRANSACTIONS ETC, SO A DIFFERENT BUTTON FOR EACH IMPORT
// const storage = multer.memoryStorage(); // keeps file in memory
