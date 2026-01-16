import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import { generateOccurrencesIso } from "../utils/recurrence";

// Import your separate models
import Dashboard, { IAccount } from "../models/Dashboard";
import { AccountType } from "../types/finance";
import Transaction from "../models/Transaction";
import UpcomingCharge from "../models/UpcomingCharge";
import Debt from "../models/Debt";
import Goal from "../models/Goal";
import RecurringCharge from "../models/RecurringCharge";

// Request comes from express and has the standart express request properties: body, params, query etc
// AuthRequest is my custom request type that extends Request with a user property injected by my auth middleware
// I should use Request for routes that don't need authentication, like userSignUp and UserLogin, but AuthRequest for routes that do need authentication, so that they are protected

// Helper function to safely get User ID
const getUserId = (req: AuthRequest) => {
  return req.user?.id || req.user?._id;
};

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // find the logged-in user's id. ( middleware sets req.user)
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Invalid User Token" });
    }

    // get the dashboard for this specific user (Overview + Accounts)
    let dashboard = await Dashboard.findOne({ userId });

    // if no dashboard exists, create it
    if (!dashboard) {
      dashboard = await Dashboard.create({
        userId,
        overview: {
          totalBalance: 0,
          monthlyChange: 0,
        },
        accounts: [
          {
            type: "cash",
            balance: 0,
          },
        ],
        // No longer need empty arrays here, they live in their own collections
      });
    }

    // Fetch related data in parallel from separate collections
    // TODO FIND A BETTER WAY TO RETURN SORTED ARRAYS -> Solved: Database sorting is much more efficient!
    const [transactions, upcomingCharges, debts, goals] = await Promise.all([
      Transaction.find({ userId }).sort({ date: 1 }),
      UpcomingCharge.find({ userId }).sort({ date: 1 }),
      Debt.find({ userId }).sort({ dueDate: 1 }),
      Goal.find({ userId }).sort({ targetDate: 1 }),
    ]);

    // Assemble the full object for the frontend
    const out = {
      ...dashboard.toObject(),
      transactions,
      upcomingCharges,
      debts,
      goals,
    };

    res.status(200).json(out);
  } catch (error) {
    console.log("Dashboard error: ", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateOverview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { totalBalance, accounts } = req.body;
    const dashboard = await Dashboard.findOne({ userId }); // get the dashboard for that user
    if (!dashboard) {
      return res.status(404).json({ message: "Dashboard not found" });
    }
    dashboard.overview.totalBalance = totalBalance; // update balance and accounts
    dashboard.accounts = accounts.map((acc: any) => {
      // find if this account already exists
      const existingAcc = dashboard.accounts.find(
        (a: IAccount) => a._id?.toString() === acc._id
      );

      if (existingAcc) {
        // update existing account
        existingAcc.type = acc.type;
        existingAcc.balance = acc.balance;
        return existingAcc;
      } else {
        // new account, let Mongoose generate _id
        return {
          ...acc,
          userId,
          createdAt: new Date(),
        };
      }
    });
    await dashboard.save(); // save changes
    console.log("Successfully updated overview");
    return res.json({ message: "Updated successfully" });
  } catch (error) {
    console.log("Failed to update overview");
    return res.status(500).json({ message: "Server error ", error });
  }
};

// get transactions
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // sort by date (Database sort is faster than JS sort)
    const transactions = await Transaction.find({ userId }).sort({ date: 1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get upcoming Charges
export const getUpcomingCharges = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // sort by date descending
    const charges = await UpcomingCharge.find({ userId }).sort({ date: -1 });

    res.json(charges);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get debts
export const getDebts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // sort by date
    const debts = await Debt.find({ userId }).sort({ dueDate: 1 });
    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//POST a new debt
export const addNewDebt = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const newDebtData = req.body;
  console.log("New Debt: ", newDebtData);
  try {
    // FIX: create directly in Debt collection
    const addedDebt = await Debt.create({
      userId, // Link to user
      ...newDebtData,
    });

    res.status(201).json({
      message: "Debt added successfully",
      addedDebt: addedDebt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateDebt = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params; // Debt id
  const updateData = req.body;
  if (!id) return res.status(400).json({ message: "Missing debt id" });
  try {
    // Prevent exact duplicate logic
    const duplicate = await Debt.findOne({
      userId,
      _id: { $ne: id },
      company: updateData.company,
      dueDate: updateData.dueDate,
    });

    if (duplicate) {
      return res.status(400).json({
        message: "A debt with the same details already exists.",
      });
    }

    // Update the debt directly in collection
    const updatedDebt = await Debt.findOneAndUpdate(
      { _id: id, userId }, // ensure user owns it
      {
        ...updateData,
        dueDate: new Date(updateData.dueDate),
      },
      { new: true }
    );

    if (!updatedDebt)
      return res.status(404).json({ message: "Debt not found" });

    res.status(200).json({
      message: "Updated successfully",
      updatedGoal: updatedDebt, // keeping field name consistent with your frontend expectation?
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE debt
export const deleteDebt = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  try {
    const result = await Debt.findOneAndDelete({ _id: id, userId });

    if (!result) return res.status(404).json({ message: "Not found" });

    // Return remaining debts for frontend state update if needed
    const remainingDebts = await Debt.find({ userId });

    res.status(200).json({
      message: "Deleted successfully",
      debts: remainingDebts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

// get Goals
export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // sort by target date
    const goals = await Goal.find({ userId }).sort({ targetDate: 1 });

    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//POST a new goal
export const addNewGoal = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const newGoalData = req.body;
  console.log("New goal: ", newGoalData);
  try {
    // FIX: create directly in Goal collection
    const addedGoal = await Goal.create({
      userId,
      ...newGoalData,
    });

    res.status(201).json({
      message: "Goal added successfully",
      addedGoal: addedGoal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateGoal = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params; // Goal id
  const updateData = req.body;
  if (!id) return res.status(400).json({ message: "Missing goal id" });
  try {
    // Prevent exact duplicate
    const duplicate = await Goal.findOne({
      userId,
      _id: { $ne: id },
      title: updateData.title,
      targetDate: updateData.targetDate,
    });

    if (duplicate) {
      return res.status(400).json({
        message: "A goal with the same details already exists.",
      });
    }

    // Update the goal
    const updatedGoal = await Goal.findOneAndUpdate(
      { _id: id, userId },
      {
        ...updateData,
        targetDate: new Date(updateData.targetDate),
      },
      { new: true }
    );

    if (!updatedGoal)
      return res.status(404).json({ message: "Goal not found" });

    res.status(200).json({
      message: "Updated successfully",
      updatedGoal: updatedGoal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE goal
export const deleteGoal = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  try {
    const result = await Goal.findOneAndDelete({ _id: id, userId });
    if (!result) return res.status(404).json({ message: "Not found" });

    const remainingGoals = await Goal.find({ userId });

    res.status(200).json({
      message: "Deleted successfully",
      goals: remainingGoals,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

//POST a new upcoming charge
export const addNewCharge = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  // We expect body to be something like:
  // { date, company, amount, category, repeating, interval, endDate, count }
  const {
    date,
    company,
    amount,
    category,
    repeating = "noRepeat",
    interval = 1,
    endDate,
    count,
  } = req.body as any;

  // Basic validation
  if (!date || !company || !amount || !category) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // FIX: basic server-side sanity checks
  if (repeating && repeating !== "noRepeat") {
    const valid = ["Weekly", "BiWeekly", "Monthly", "Yearly"].includes(
      repeating
    );
    if (!valid)
      return res.status(400).json({ message: "Invalid repeating value" });
    if (!Number.isFinite(Number(interval)) || Number(interval) < 1) {
      return res.status(400).json({ message: "Invalid interval" });
    }
    if (
      count !== undefined &&
      !(Number.isFinite(Number(count)) && Number(count) >= 1)
    ) {
      return res.status(400).json({ message: "Invalid count" });
    }
  }

  try {
    // NON-REPEATING (single upcoming charge)
    if (!repeating || repeating === "noRepeat") {
      // FIX: check duplicate via DB query
      const duplicate = await UpcomingCharge.findOne({
        userId,
        company: company.trim(),
        date: new Date(date),
      });

      if (duplicate) {
        return res.status(400).json({
          message:
            "An upcoming charge with the same company and date already exists.",
        });
      }

      const addedUpcomingCharge = await UpcomingCharge.create({
        userId,
        date: new Date(date),
        company: company.trim(),
        amount: Number(amount),
        category,
        recurring: false,
      });

      return res.status(201).json({
        message: "Upcoming charge added successfully",
        upcomingCharge: addedUpcomingCharge,
      });
    }

    // REPEATING: create RecurringCharge + generate initial occurrences
    // Create recurring rule

    // build a ruleData object so we never pass `undefined` for optional fields
    const ruleData: any = {
      userId,
      startDate: new Date(date),
      company: company.trim(),
      amount: Number(amount),
      category,
      repeating,
      interval: Number(interval) || 1,
    };

    // only add optional fields if they exist
    if (endDate) {
      ruleData.endDate = new Date(endDate);
    }

    if (count !== undefined) {
      ruleData.count = Number(count);
    }

    // create the rule
    const ruleRaw = await RecurringCharge.create(ruleData);

    // SAFETY: normalize returned value to a single document
    const rule = Array.isArray(ruleRaw) ? ruleRaw[0] : ruleRaw;
    if (!rule) {
      return res
        .status(500)
        .json({ message: "Failed to create recurring rule" });
    }

    // get rule id string
    const ruleIdStr = (rule as any)?._id.toString();

    // Decide how many occurrences to generate initially
    const DEFAULT_GEN = 12; // e.g. next 12 occurrences

    // FIX: count how many generated via DB query
    const alreadyGenerated = await UpcomingCharge.countDocuments({
      userId,
      parentRecurringId: rule._id,
    });

    const maxToGenerate = Math.min(
      count ? Math.max(0, Number(count) - alreadyGenerated) : DEFAULT_GEN,
      36
    ); // hard cap 36

    // generate ISO occurrences
    const genOptions = {
      startDateIso: (date as string).slice(0, 10), // ensure YYYY-MM-DD
      repeating: String(repeating),
      interval: Number(interval) || 1,
      maxCount: maxToGenerate,
    } as {
      startDateIso: string;
      repeating: string;
      interval?: number;
      maxCount?: number;
      untilIso?: string;
    };

    if (endDate) {
      (genOptions as any).untilIso = (endDate as string).slice(0, 10);
    }

    const occurrencesIso = generateOccurrencesIso(genOptions);

    // FIX: Check existing dates in DB to avoid dupes
    const existingCharges = await UpcomingCharge.find({
      userId,
      parentRecurringId: rule._id,
    });

    const existingDates = new Set(
      existingCharges.map((c) => c.date.toISOString().slice(0, 10))
    );

    const docsToInsert: any[] = [];
    for (const iso of occurrencesIso) {
      if (existingDates.has(iso)) continue;
      docsToInsert.push({
        userId, // IMPORTANT: Link to user
        date: new Date(iso + "T00:00:00Z"),
        company: company.trim(),
        amount: Number(amount),
        category,
        recurring: true,
        parentRecurringId: (rule as any)._id,
        repeating,
      });
      existingDates.add(iso);
    }

    if (docsToInsert.length > 0) {
      // Bulk insert
      await UpcomingCharge.insertMany(docsToInsert);

      // mark lastGenerated
      const lastIso = docsToInsert[docsToInsert.length - 1].date
        .toISOString()
        .slice(0, 10);
      (rule as any).lastGenerated = new Date(lastIso + "T00:00:00Z");
      await rule.save();
    } else {
      await rule.save();
    }

    res.status(201).json({
      message: "Recurring rule created and initial occurrences generated",
      recurringRule: rule,
      createdCount: docsToInsert.length,
    });
  } catch (error) {
    console.error("addNewCharge error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: (error as Error).message });
  }
};

// PUT upcoming charges
// TODO maybe add a check if the upcoming charge exists? unless i want multiple charges, it could be that the user is charged multiple times, same day, same amount, same company?
export const updateCharge = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params; //get the id of the upcoming charge from the params
  const updateData = req.body; // get the data from the body
  console.log("Updating...", id);
  try {
    // Prevent duplicate company + date check via DB
    const duplicate = await UpcomingCharge.findOne({
      userId,
      _id: { $ne: id },
      company: updateData.company,
      date: new Date(updateData.date),
      category: updateData.category,
    });

    if (duplicate) {
      return res.status(400).json({
        message:
          "An upcoming charge with the same company and date already exists.",
      });
    }

    // Update the charge
    const updatedCharge = await UpcomingCharge.findOneAndUpdate(
      { _id: id, userId },
      { ...updateData, date: new Date(updateData.date) },
      { new: true }
    );

    if (!updatedCharge)
      return res.status(404).json({ message: "Upcoming charge not found" });

    res.status(200).json({
      message: "Updated successfully",
      updatedCharge: updatedCharge, // send the updated charge back
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE upcoming charge
export const deleteCharge = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  try {
    const result = await UpcomingCharge.findOneAndDelete({ _id: id, userId });
    if (!result) return res.status(404).json({ message: "Not found" });

    const remainingCharges = await UpcomingCharge.find({ userId });

    res.status(200).json({
      message: "Deleted successfully",
      upcomingCharges: remainingCharges,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

// delete transaction
export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;

  try {
    // 1. Find transaction first to reverse balance effect
    const tx = await Transaction.findOne({ _id: id, userId });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });

    // 2. Update dashboard balance
    const dashboard = await Dashboard.findOne({ userId });
    if (dashboard) {
      const effect = tx.transactionType === "income" ? tx.amount : -tx.amount;
      const account = dashboard.accounts.find(
        (a: IAccount) => a.type === tx.account
      );

      if (account) {
        account.balance -= effect;
        await dashboard.save();
      }
    }

    // 3. Delete from collection
    await Transaction.findByIdAndDelete(id);

    // 4. Return remaining (optional)
    const remaining = await Transaction.find({ userId });

    res.status(200).json({
      message: "Deleted successfully",
      transactions: remaining,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// add a new transaction
export const addTransaction = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { date, company, amount, transactionType, category, account } =
    req.body;

  // Basic validation. Even though i do validate on the frontend, validation on the backend is critical. Guarantees data integrity.
  if (!date || !company || !amount || !transactionType || !account) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!["income", "expense"].includes(transactionType)) {
    return res.status(400).json({ message: "Invalid transaction type" });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({ message: "Amount must be positive" });
  }

  // Expense
  if (transactionType === "expense" && !category) {
    return res
      .status(400)
      .json({ message: "Category is required for expenses" });
  }

  try {
    // Create Transaction Document
    const newTransaction = await Transaction.create({
      userId,
      date: new Date(date),
      company: company.trim(),
      amount: Number(amount),
      transactionType,
      category: transactionType === "expense" ? category : undefined,
      account: account,
    });

    // Update Dashboard Accounts Balance
    const dashboard = await Dashboard.findOne({ userId });
    if (dashboard) {
      const accountIndex = dashboard.accounts.findIndex(
        // a is of type IAccount?
        (a: IAccount) => a.type === account
      );

      // Update account balance or create the account if it doesn't exist
      if (accountIndex !== -1 && dashboard.accounts[accountIndex]) {
        if (transactionType === "expense") {
          dashboard.accounts[accountIndex].balance -= Number(amount);
        } else {
          dashboard.accounts[accountIndex].balance += Number(amount);
        }
      } else {
        // Create the account if it doesn’t exist
        dashboard.accounts.push({
          userId: new mongoose.Types.ObjectId(userId),
          // userId is not needed inside embedded if not defined in schema, but dashboard has userId
          type: account as AccountType,
          balance:
            transactionType === "expense" ? -Number(amount) : Number(amount),
          createdAt: new Date(),
        });
      }
      await dashboard.save(); // save changes
    }

    res.status(201).json({
      message: "Transaction added successfully",
      transaction: newTransaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT ( EDIT ) transaction
// TODO maybe add a check if the transaction exists? unless i want multiple transactions, it could be that the user is charged multiple times, same day, same amount, same company?
export const updateTransaction = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  const updateData = req.body;

  try {
    // Find old transaction to revert balance
    const oldTx = await Transaction.findOne({ _id: id, userId });
    if (!oldTx)
      return res.status(404).json({ message: "Transaction not found" });

    // Fetch Dashboard
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    //  Undo old transaction effect on balance
    const oldEffect =
      oldTx.transactionType === "income" ? oldTx.amount : -oldTx.amount;

    const oldAccount = dashboard.accounts.find(
      (a: IAccount) => a.type === oldTx.account
    );
    if (oldAccount) {
      oldAccount.balance -= oldEffect;
    }

    //  Update Transaction Document

    const updatedTx = await Transaction.findByIdAndUpdate(
      id,
      { ...updateData, date: new Date(updateData.date) },
      { new: true }
    );

    // Apply new transaction effect on balance
    const newAmount = Number(updateData.amount);
    const newEffect =
      updateData.transactionType === "income" ? newAmount : -newAmount;

    let newAccount = dashboard.accounts.find(
      (a: IAccount) => a.type === updateData.account
    );

    if (!newAccount) {
      const accountToPush = {
        userId: new mongoose.Types.ObjectId(userId), // Explicitly add userId if your Schema requires it inside embedded docs
        type: updateData.account as AccountType, // Cast to your specific string union
        balance: 0,
        createdAt: new Date(),
      };
      // push new account
      dashboard.accounts.push(accountToPush);
      // refference new account
      newAccount = dashboard.accounts[dashboard.accounts.length - 1];
    }

    newAccount.balance += newEffect;
    await dashboard.save();

    res.status(200).json({
      message: "Transaction updated successfully",
      updatedTransaction: updatedTx,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
