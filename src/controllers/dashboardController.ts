// get the whole single data object ( in my database i have one object with all the data )
import type { Request, Response } from "express";
import Dashboard from "../models/Dashboard";
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const dashboard = await Dashboard.findOne();
    if (!dashboard) {
      return res.status(404).json({ message: "Not found." });
    }

    res.send(dashboard);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get transactions
export const getTransactions = async (req: Request, res: Response) => {
  try {
    // the second argument "upcomingCharges" tells Mongoos to only return the transactions field

    const dashboard = await Dashboard.findOne({}, "transactions");

    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get upcoming Charges
export const getUpcomingCharges = async (req: Request, res: Response) => {
  try {
    const dashboard = await Dashboard.findOne({}, "upcomingCharges");
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.upcomingCharges);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get debts
export const getDebts = async (req: Request, res: Response) => {
  try {
    const dashboard = await Dashboard.findOne({}, "debts");
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.debts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get Goals
export const getGoals = async (req: Request, res: Response) => {
  try {
    const dashboard = await Dashboard.findOne({}, "goals");
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.goals);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// get income
export const getIncome = async (req: Request, res: Response) => {
  try {
    const dashboard = await Dashboard.findOne({}, "income");
    if (!dashboard) return res.status(404).json({ message: "Not found" });
    res.json(dashboard.income);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//POST a new upcoming charge
export const addNewCharge = async (req: Request, res: Response) => {
  const newUpcomingCharge = req.body;
  console.log("New upcoming charge: ", newUpcomingCharge);

  try {
    // get the dashboard ( the object containing all the data, including the upcoming charge array)
    const dashboard = await Dashboard.findOne();
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
  const { id } = req.params; //get the id of the upcoming charge from the params
  const updateData = req.body; // get the data from the body ( the form in my frontend edit)
  console.log("Updating...", id);
  try {
    const dashboard = await Dashboard.findOne();
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
  const { id } = req.params;
  console.log("Deleting...", id);
  try {
    const dashboard = await Dashboard.findOne();
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
  const { id } = req.params;

  try {
    const dashboard = await Dashboard.findOne();

    if (!dashboard) return res.status(404).json({ message: "Not found" });

    dashboard.transactions = dashboard.transactions.filter(
      (charge) => charge._id.toString() !== id
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
  const newTransaction = req.body;
  console.log(newTransaction);

  try {
    // get the dashboard ( the object containing all the data, including the transactions array)
    const dashboard = await Dashboard.findOne();
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
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Missing transaction id" });

  const updateData = req.body;
  try {
    const dashboard = await Dashboard.findOne();
    if (!dashboard)
      return res.status(404).json({ message: "Dashboard not found" });

    // Prevent duplicate company + date
    const duplicate = dashboard.transactions.some(
      (c) =>
        c._id.toString() !== id &&
        c.company === updateData.company &&
        c.date === updateData.date &&
        c.transactionType === updateData.transactionType &&
        c.category === updateData.category
    );
    if (duplicate) {
      return res.status(400).json({
        message: "A transaction with the same company and date already exists.",
      });
    }

    const transactionIndex = dashboard.transactions.findIndex(
      (c) => c._id.toString() === id
    );
    if (transactionIndex === -1)
      return res.status(404).json({ message: "transaction not found" });

    // Update the transaction
    dashboard.transactions[transactionIndex] = { _id: id, ...updateData };
    await dashboard.save();

    // Update upcomingCharges
    const result = await Dashboard.findOneAndUpdate(
      { "upcomingCharges._id": id },
      { $set: { "upcomingCharges.$": { _id: id, ...updateData } } },
      { new: true }
    );

    if (!result)
      return res.status(404).json({ message: "Upcoming charge not found" });

    res.status(200).json({
      message: "Updated successfully",
      updatedTransaction: dashboard.transactions[transactionIndex],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
