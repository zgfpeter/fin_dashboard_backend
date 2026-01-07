// get the whole single data object ( in my database i have one object with all the data )
import type { Request, Response } from "express";
import Dashboard, { AccountType } from "../models/Dashboard";
import { AuthRequest } from "../middleware/authMiddleware";
import RecurringCharge from "../models/RecurringCharge";
import { generateOccurrencesIso } from "../utils/recurrence";

import mongoose from "mongoose";
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

    // get the dashboard for this specific user
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
        transactions: [],
        upcomingCharges: [],
        debts: [],
        goals: [],
      });
    }

    res.status(200).json(dashboard);
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
        (a) => a._id?.toString() === acc._id
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
    // the second argument "upcomingCharges" tells Mongoos to only return the transactions field
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const dashboard = await Dashboard.findOne({ userId }, "transactions");

    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get upcoming Charges
export const getUpcomingCharges = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const dashboard = await Dashboard.findOne({ userId }, "upcomingCharges");
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.upcomingCharges);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get debts
export const getDebts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const dashboard = await Dashboard.findOne({ userId }, "debts");
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.debts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//POST a new debt
export const addNewDebt = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const newDebt = req.body;
  console.log("New Debt: ", newDebt);
  try {
    // get the dashboard ( the object containing all the data, including the debts array)
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    // insert the new Debt into the debt array
    dashboard.debts.push(newDebt);
    await dashboard.save(); // save changes
    const addedDebt = dashboard.debts[dashboard.debts.length - 1]; // the new Debt will be the last one, so i can send it back
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
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    // Prevent exact duplicate (but maybe a debt with the same data should be allowed )
    const duplicate = dashboard.debts.some((c) => {
      if (c._id.toString() === id) return false; // skip the debt if same id
      return (
        c.company === updateData.company && c.dueDate === updateData.dueDate
      );
    });
    if (duplicate) {
      return res.status(400).json({
        message: "A debt with the same details already exists.",
      });
    }

    const debtIndex = dashboard.debts.findIndex((c) => c._id.toString() === id);
    if (debtIndex === -1)
      return res.status(404).json({ message: "Debt not found" });

    // Update the debt
    dashboard.debts[debtIndex] = { _id: id, ...updateData };
    await dashboard.save();

    res.status(200).json({
      message: "Updated successfully",
      updatedGoal: dashboard.debts[debtIndex],
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
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });

    dashboard.debts = dashboard.debts.filter(
      (goal) => goal._id.toString() !== id
    );

    await dashboard.save();
    res.status(200).json({
      message: "Deleted successfully",
      debts: dashboard.debts,
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
    const dashboard = await Dashboard.findOne({ userId }, "goals");
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.goals);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
//POST a new goal
export const addNewGoal = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const newGoal = req.body;
  console.log("New goal: ", newGoal);
  try {
    // get the dashboard ( the object containing all the data, including the goals array)
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    // insert the new goal into the goals array
    dashboard.goals.push(newGoal);
    await dashboard.save(); // save changes
    const addedGoal = dashboard.goals[dashboard.goals.length - 1]; // the new goal will be the last one, so i can send it back
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
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    // Prevent exact duplicate (but maybe a goal with the same data should be allowed )
    const duplicate = dashboard.goals.some((c) => {
      if (c._id?.toString() === id) return false; // skip the goal if same id
      return (
        c.title === updateData.title && c.targetDate === updateData.targetDate
      );
    });
    if (duplicate) {
      return res.status(400).json({
        message: "A goal with the same details already exists.",
      });
    }

    const goalIndex = dashboard.goals.findIndex(
      (c) => c._id?.toString() === id
    );
    if (goalIndex === -1)
      return res.status(404).json({ message: "Goal not found" });

    // Update the goal
    dashboard.goals[goalIndex] = { _id: id, ...updateData };
    await dashboard.save();

    res.status(200).json({
      message: "Updated successfully",
      updatedGoal: dashboard.goals[goalIndex],
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
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });

    dashboard.goals = dashboard.goals.filter(
      (goal) => goal._id?.toString() !== id
    );

    await dashboard.save();
    res.status(200).json({
      message: "Deleted successfully",
      goals: dashboard.goals,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

// // get income
// export const getIncome = async (req: AuthRequest, res: Response) => {
//   try {
//     const userId = getUserId(req);
//     if (!userId) return res.status(401).json({ message: "Unauthorized" });
//     const dashboard = await Dashboard.findOne({ userId }, "income");
//     if (!dashboard) return res.status(404).json({ message: "Not found" });
//     res.json(dashboard.income);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

//POST a new upcoming charge
// controllers/dashboardController.ts (snippet)

// POST a new upcoming charge
// POST a new upcoming charge
// POST a new upcoming charge
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
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });

    // NON-REPEATING (single upcoming charge)
    if (!repeating || repeating === "noRepeat") {
      const upcoming = {
        date: new Date(date),
        company: company.trim(),
        amount: Number(amount),
        category,
        recurring: false,
      };
      // FIX: avoid exact duplicates (company + date)
      const duplicate = dashboard.upcomingCharges.some(
        (c: any) =>
          c.company === upcoming.company &&
          new Date(c.date).toISOString().slice(0, 10) ===
            new Date(upcoming.date).toISOString().slice(0, 10)
      );
      if (duplicate) {
        return res.status(400).json({
          message:
            "An upcoming charge with the same company and date already exists.",
        });
      }

      dashboard.upcomingCharges.push(upcoming);
      await dashboard.save();
      const addedUpcomingCharge =
        dashboard.upcomingCharges[dashboard.upcomingCharges.length - 1];
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

    // DO NOT set lastGenerated at creation time
    // it should either be omitted or set later by the runner

    // create the rule
    const ruleRaw = await RecurringCharge.create(ruleData);

    // SAFETY: normalize returned value to a single document (some TS overloads make `create` look like it can return arrays)
    const rule = Array.isArray(ruleRaw) ? ruleRaw[0] : ruleRaw;

    // get rule id string once and use it for all comparisons (avoids TS complaining about _id on unions)
    const ruleIdStr = (rule as any)?._id
      ? (rule as any)._id.toString()
      : undefined;

    // Decide how many occurrences to generate initially
    const DEFAULT_GEN = 12; // e.g. next 12 occurrences (1 year for monthly)
    // FIX: compute how many already exist for this user+rule (should be 0 right after creation, but defensive)
    const alreadyGenerated = dashboard.upcomingCharges.filter(
      (c: any) =>
        c.parentRecurringId &&
        ruleIdStr &&
        c.parentRecurringId.toString() === ruleIdStr
    ).length;

    const maxToGenerate = Math.min(
      count ? Math.max(0, Number(count) - alreadyGenerated) : DEFAULT_GEN,
      36
    ); // hard cap 36

    // generate ISO occurrences
    // generate ISO occurrences
    // generate ISO occurrences
    // build the options object but only add untilIso if endDate exists — avoids `string | undefined` mismatch
    const genOptions = {
      startDateIso: (date as string).slice(0, 10), // ensure YYYY-MM-DD
      // make sure repeating is a plain string (it may be typed as `any` from req.body)
      repeating: String(repeating),
      interval: Number(interval) || 1,
      maxCount: maxToGenerate,
      // don't put `untilIso` here when `endDate` is falsy — we'll add it conditionally below
    } as {
      startDateIso: string;
      repeating: string;
      interval?: number;
      maxCount?: number;
      untilIso?: string;
    };

    if (endDate) {
      // only attach untilIso when we actually have a string — this satisfies TS
      (genOptions as any).untilIso = (endDate as string).slice(0, 10);
    }

    const occurrencesIso = generateOccurrencesIso(genOptions);

    // Convert and push into dashboard.upcomingCharges, but avoid duplicate if any existing parentRecurringId + date exists
    // FIX: check existing dates for this rule before pushing
    const existingDates = new Set(
      dashboard.upcomingCharges
        .filter(
          (c: any) =>
            c.parentRecurringId &&
            ruleIdStr &&
            c.parentRecurringId.toString() === ruleIdStr
        )
        .map((c: any) =>
          c.date instanceof Date
            ? c.date.toISOString().slice(0, 10)
            : new Date(c.date).toISOString().slice(0, 10)
        )
    );

    const docsToInsert: any[] = [];
    for (const iso of occurrencesIso) {
      if (existingDates.has(iso)) continue;
      docsToInsert.push({
        date: new Date(iso + "T00:00:00Z"), // store as Date
        company: company.trim(),
        amount: Number(amount),
        category,
        recurring: true,
        parentRecurringId: (rule as any)._id, // store the actual ObjectId
        repeating,
      });
      existingDates.add(iso);
    }

    if (docsToInsert.length > 0) {
      for (const doc of docsToInsert) dashboard.upcomingCharges.push(doc);
      // mark lastGenerated as last created occurrence
      const lastIso = docsToInsert[docsToInsert.length - 1].date
        .toISOString()
        .slice(0, 10);
      (rule as any).lastGenerated = new Date(lastIso + "T00:00:00Z");
      await rule.save();
      await dashboard.save();
    } else {
      // nothing to insert, but still persist the rule
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
  const updateData = req.body; // get the data from the body ( the form in my frontend edit)
  console.log("Updating...", id);
  try {
    const dashboard = await Dashboard.findOne({ userId });

    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    // Prevent duplicate company + date
    const duplicate = dashboard.upcomingCharges.some(
      (c) =>
        c._id?.toString() !== id &&
        c.company === updateData.company &&
        new Date(c.date).getTime() === new Date(updateData.date).getTime() &&
        c.category === updateData.category
    );
    if (duplicate) {
      return res.status(400).json({
        message:
          "An upcoming charge with the same company and date already exists.",
      });
    }

    const chargeIndex = dashboard.upcomingCharges.findIndex(
      (c) => c._id?.toString() === id
    );
    if (chargeIndex === -1)
      return res.status(404).json({ message: "Upcoming charge not found" });

    // Update the charge
    dashboard.upcomingCharges[chargeIndex] = { _id: id, ...updateData };
    await dashboard.save();

    res.status(200).json({
      message: "Updated successfully",
      updatedCharge: dashboard.upcomingCharges[chargeIndex], // send the updated charge back
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
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });

    dashboard.upcomingCharges = dashboard.upcomingCharges.filter(
      (charge) => charge._id?.toString() !== id
    );

    await dashboard.save();
    res.status(200).json({
      message: "Deleted successfully",
      upcomingCharges: dashboard.upcomingCharges,
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
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });

    const txIndex = dashboard.transactions.findIndex(
      (t) => t._id?.toString() === id
    );
    if (txIndex === -1)
      return res.status(404).json({ message: "Transaction not found" });

    const tx = dashboard.transactions[txIndex];

    const effect = tx.transactionType === "income" ? tx.amount : -tx.amount;

    const account = dashboard.accounts.find((a) => a.type === tx.account);

    if (account) {
      account.balance -= effect;
    }

    dashboard.transactions.splice(txIndex, 1);
    await dashboard.save();

    res.status(200).json({
      message: "Deleted successfully",
      transactions: dashboard.transactions,
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

  // 3️Normalize transaction
  const newTransaction = {
    date: new Date(date),
    company: company.trim(),
    amount: Number(amount),
    transactionType,
    category: transactionType === "expense" ? category : undefined,
    account: account,
    createdAt: new Date(),
  };
  try {
    // get the dashboard ( the object containing all the data, including the transactions array)
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    // insert the new transaction into the transactions array
    dashboard.transactions.push(newTransaction);
    const accountIndex = dashboard.accounts.findIndex(
      (a) => a.type === account
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
        userId: new mongoose.Types.ObjectId(userId).toString(), // ensure ObjectId
        type: account as AccountType,
        balance:
          transactionType === "expense" ? -Number(amount) : Number(amount),
        createdAt: new Date(),
      });
    }
    await dashboard.save(); // save changes
    const addedTransaction =
      dashboard.transactions[dashboard.transactions.length - 1]; // the new transaction will be the last one, so i can send it back
    res.status(201).json({
      message: "Transaction added successfully",
      transaction: addedTransaction,
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
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    const txIndex = dashboard.transactions.findIndex(
      (t) => t._id?.toString() === id
    );
    if (txIndex === -1)
      return res.status(404).json({ message: "Transaction not found" });

    const oldTx = dashboard.transactions[txIndex];

    // Undo old transaction effect
    const oldEffect =
      oldTx.transactionType === "income" ? oldTx.amount : -oldTx.amount;

    const oldAccount = dashboard.accounts.find((a) => a.type === oldTx.account);

    if (oldAccount) {
      oldAccount.balance -= oldEffect;
    }

    // Apply new transaction effect
    const newAmount = Number(updateData.amount);
    const newEffect =
      updateData.transactionType === "income" ? newAmount : -newAmount;

    let newAccount = dashboard.accounts.find(
      (a) => a.type === updateData.account
    );

    if (!newAccount) {
      newAccount = {
        userId,
        type: updateData.account,
        balance: 0,
        createdAt: new Date(),
      };
      dashboard.accounts.push(newAccount as any);
    }

    newAccount.balance += newEffect;

    // Update transaction safely
    Object.assign(oldTx, {
      ...updateData,
      amount: newAmount,
      date: new Date(updateData.date),
    });

    await dashboard.save();

    res.status(200).json({
      message: "Transaction updated successfully",
      updatedTransaction: oldTx,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// get monthly income summary
// ! overkill here, if i had millions of records it might be worth it
// but since i'm fetching the dashboard on the frontend, i can do the calculations there.
// if i do aggregations, that means a second query, extra DB work, extra latency
// export const getIncomeSumary = async (req: AuthAuthRequest, res: Response) => {
//   const userId = getUserId(req);
//   if (!userId) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }
//   const now = new Date(); // get present date
//   const startOfThisMonth = new Date(
//     now.getFullYear(),
//     now.getMonth(), // get the current year and month
//     1 // day, can take values from 1 to 31
//   );

//   const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // get last month

//   const result = await Dashboard.aggregate([
//     { $match: { userId: new mongoose.Types.ObjectId(userId) } },
//     { $unwind: "$income" },
//     {
//       $match: {
//         "income.date": {
//           $gte: startOfLastMonth,
//           $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
//         },
//       },
//     },
//     {
//       $group: {
//         _id: {
//           month: { $month: "$income.date" },
//           year: { $year: "$income.date" },
//         },
//         total: { $sum: "$income.amount" },
//       },
//     },
//   ]);

//   let thisMonth = 0;
//   let lastMonth = 0;
//   result.forEach((r) => {
//     if (
//       r._id.month === startOfThisMonth.getMonth() + 1 &&
//       r._id.year === startOfThisMonth.getFullYear()
//     ) {
//       thisMonth = r.total;
//     }

//     if (
//       r._id.month === startOfLastMonth.getMonth() + 1 &&
//       r._id.year === startOfLastMonth.getFullYear()
//     ) {
//       lastMonth = r.total;
//     }
//   });

//   console.log("This month:", thisMonth);
//   console.log("Last month: ", lastMonth);
//   console.log("Difference: ", thisMonth - lastMonth);
//   res.json({ thisMonth, lastMonth, difference: thisMonth - lastMonth }); // send back the amounts for this month, last month, and the difference
// };
