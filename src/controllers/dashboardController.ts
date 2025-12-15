// get the whole single data object ( in my database i have one object with all the data )
import type { Request, Response } from "express";
import Dashboard from "../models/Dashboard";
import { AuthRequest } from "../middleware/authMiddleware";
// Helper function to safely get User ID
const getUserId = (req: AuthRequest) => {
  return req.user?.id || req.user?._id;
};
export const getDashboard = async (req: Request, res: Response) => {
  try {
    // find the logged-in user's id. ( middleware sets req.user)
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Invalid User Token" });
    }

    // get the dashboard for this specific user
    const dashboard = await Dashboard.findOne({ userId });

    if (!dashboard) {
      console.log("Dashboard not found for user:", userId);
      return res.status(404).json({ message: "Dashboard not found" });
    }

    res.status(200).json(dashboard);
  } catch (error) {
    console.log("Dashboard error: ", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateOverview = async (req: Request, res: Response) => {
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
export const getTransactions = async (req: Request, res: Response) => {
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
export const getUpcomingCharges = async (req: Request, res: Response) => {
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
export const getDebts = async (req: Request, res: Response) => {
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
export const addNewDebt = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const newDebt = req.body;
  console.log("New goal: ", newDebt);
  try {
    // get the dashboard ( the object containing all the data, including the debts array)
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    // insert the new goal into the debt array
    dashboard.debts.push(newDebt);
    await dashboard.save(); // save changes
    const addedDebt = dashboard.debts[dashboard.debts.length - 1]; // the new goal will be the last one, so i can send it back
    res.status(201).json({
      message: "Goal added successfully",
      addedDebt: addedDebt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateDebt = async (req: Request, res: Response) => {
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
export const deleteDebt = async (req: Request, res: Response) => {
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
export const getGoals = async (req: Request, res: Response) => {
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
export const addNewGoal = async (req: Request, res: Response) => {
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

export const updateGoal = async (req: Request, res: Response) => {
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
      if (c._id.toString() === id) return false; // skip the goal if same id
      return (
        c.title === updateData.title && c.targetDate === updateData.targetDate
      );
    });
    if (duplicate) {
      return res.status(400).json({
        message: "A goal with the same details already exists.",
      });
    }

    const goalIndex = dashboard.goals.findIndex((c) => c._id.toString() === id);
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
export const deleteGoal = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  try {
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });

    dashboard.goals = dashboard.goals.filter(
      (goal) => goal._id.toString() !== id
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

// get income
export const getIncome = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const dashboard = await Dashboard.findOne({ userId }, "income");
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.income);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//POST a new upcoming charge
export const addNewCharge = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const newUpcomingCharge = req.body;
  console.log("New upcoming charge: ", newUpcomingCharge);
  try {
    // get the dashboard ( the object containing all the data, including the upcoming charge array)
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    // insert the new upcoming charge into the upcoming charges array
    dashboard.upcomingCharges.push(newUpcomingCharge);
    await dashboard.save(); // save changes
    const addedUpcomingCharge =
      dashboard.upcomingCharges[dashboard.upcomingCharges.length - 1]; // the new upcoming charge will be the last one, so i can send it back
    res.status(201).json({
      message: "Upcoming charge added successfully",
      upcomingCharge: addedUpcomingCharge,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT upcoming charges
// TODO maybe add a check if the upcoming charge exists? unless i want multiple charges, it could be that the user is charged multiple times, same day, same amount, same company?
export const updateCharge = async (req: Request, res: Response) => {
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
        c._id.toString() !== id &&
        c.company === updateData.company &&
        c.date === updateData.date &&
        c.category === updateData.category
    );
    if (duplicate) {
      return res.status(400).json({
        message:
          "An upcoming charge with the same company and date already exists.",
      });
    }

    const chargeIndex = dashboard.upcomingCharges.findIndex(
      (c) => c._id.toString() === id
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
export const deleteCharge = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  try {
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });

    dashboard.upcomingCharges = dashboard.upcomingCharges.filter(
      (charge) => charge._id.toString() !== id
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
export const deleteTransaction = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { id } = req.params;
  try {
    const dashboard = await Dashboard.findOne({ userId });

    if (!dashboard) return res.status(404).json({ message: "Not found" });

    // filter by transaction id
    dashboard.transactions = dashboard.transactions.filter(
      (t) => t._id.toString() !== id
    );
    // filter out the transaction with the specific id from params
    // save changes
    await dashboard.save();
    res.status(200).json({
      message: "Deleted successfully ",
      transactions: dashboard.transactions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

// add a new transaction
export const addTransaction = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const newTransaction = req.body;

  try {
    // get the dashboard ( the object containing all the data, including the transactions array)
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    // insert the new transaction into the transactions array
    dashboard.transactions.push(newTransaction);
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
export const updateTransaction = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params; // Transaction id
  const updateData = req.body;
  if (!id) return res.status(400).json({ message: "Missing transaction id" });
  try {
    const dashboard = await Dashboard.findOne({ userId });
    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    // Prevent exact duplicate (but maybe a transaction with the same data should be allowed )
    const duplicate = dashboard.transactions.some((c) => {
      if (c._id.toString() === id) return false; // skip the transaction if same id
      return (
        c.company === updateData.company &&
        c.date === updateData.date &&
        c.transactionType === updateData.transactionType &&
        c.category === updateData.category &&
        c.amount === updateData.amount
      );
    });
    if (duplicate) {
      return res.status(400).json({
        message: "A transaction with the same details already exists.",
      });
    }

    const transactionIndex = dashboard.transactions.findIndex(
      (c) => c._id.toString() === id
    );
    if (transactionIndex === -1)
      return res.status(404).json({ message: "Transaction not found" });

    // Update the transaction
    dashboard.transactions[transactionIndex] = { _id: id, ...updateData };
    await dashboard.save();

    res.status(200).json({
      message: "Updated successfully",
      updatedTransaction: dashboard.transactions[transactionIndex],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
