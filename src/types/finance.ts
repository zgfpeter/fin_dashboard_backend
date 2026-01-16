export type ExpenseCategory =
  | "subscription"
  | "bill"
  | "loan"
  | "insurance"
  | "tax"
  | "other";

export type AccountType = "checking" | "savings" | "credit" | "cash";

export type TransactionType = "income" | "expense";

export type RepeatingOption = "Weekly" | "Monthly" | "Yearly";
