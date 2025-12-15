import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";

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
  updateOverview,
  updateTransaction,
  updateGoal,
  addNewGoal,
  deleteGoal,
  updateDebt,
  addNewDebt,
  deleteDebt,
} from "../controllers/dashboardController";

// apply the middleware globally to this router
// any routes below will require a valid jwt token
const router = Router();
console.log("Auth Middleware Value:", authenticateToken);
router.use(authenticateToken);

router.get("/dashboard", getDashboard);

// update overview (total balance and accounts)
router.put("/dashboard/overview", updateOverview);

// get transactions
// Transactions
router
  .route("/dashboard/transactions")
  .get(getTransactions)
  .post(addTransaction);

router
  .route("/dashboard/transactions/:id")
  .put(updateTransaction)
  .delete(deleteTransaction);

// Upcoming Charges
router
  .route("/dashboard/upcomingCharges")
  .get(getUpcomingCharges)
  .post(addNewCharge);

router
  .route("/dashboard/upcomingCharges/:id")
  .put(updateCharge)
  .delete(deleteCharge);

// get debts

router.route("/dashboard/debts").get(getDebts).post(addNewDebt);

router.route("/dashboard/debts/:id").put(updateDebt).delete(deleteDebt);

// get goals
router.route("/dashboard/goals").get(getGoals).post(addNewGoal);

router.route("/dashboard/goals/:id").put(updateGoal).delete(deleteGoal);

// get income
router.get("/dashboard/income", getIncome);

export default router;
