// Synthetic DTOs shaped after SavingsAccountData and SavingsAccountTransactionData in
// GET /self/savingsaccounts/{id}?associations=transactions, never live data. Like Fineract, a
// zero amount is left out (null) instead of being sent as 0.
import { summary } from "./accounts";
import { clientId } from "./savings";

const types = {
  deposit: [1, "deposit", "Deposit"],
  withdrawal: [2, "withdrawal", "Withdrawal"],
  interestPosting: [3, "interestPosting", "Interest Posting"],
  payCharge: [7, "payCharge", "Pay Charge"],
  onHold: [20, "onHold", "Amount on hold"],
} as const;
export const movement = (
  id: number,
  kind: keyof typeof types = "deposit",
  extra: Record<string, unknown> = {},
  accountId = 42,
) => {
  const [typeId, code, value] = types[kind];
  return {
    id,
    transactionType: {
      id: typeId,
      code: `savingsAccountTransactionType.${code}`,
      value,
      deposit: kind === "deposit",
      withdrawal: kind === "withdrawal",
      interestPosting: kind === "interestPosting",
    },
    accountId,
    accountNo: String(accountId).padStart(9, "0"),
    date: [2026, 11, 2],
    currency: { code: "MXN", decimalPlaces: 2 },
    paymentDetailData:
      kind === "deposit" || kind === "withdrawal"
        ? { id, paymentType: { id: 1, name: "Synthetic cash" }, receiptNumber: `SYN-${id}` }
        : undefined,
    amount: 100,
    runningBalance: 100,
    reversed: false,
    submittedOnDate: [2026, 11, 2],
    interestedPostedAsOn: false,
    isManualTransaction: false,
    ...extra,
  };
};
/** Newest first, as Fineract sends them: 1,500.00 in, 0.50 of interest, 250.00 out. */
export const movements = (accountId = 42) => [
  movement(
    103,
    "withdrawal",
    { amount: 250, runningBalance: 1250.5, note: "Synthetic note" },
    accountId,
  ),
  movement(
    102,
    "interestPosting",
    { date: [2026, 10, 31], amount: 0.5, runningBalance: 1500.5 },
    accountId,
  ),
  movement(101, "deposit", { date: [2026, 10, 15], amount: 1500, runningBalance: 1500 }, accountId),
];
/** The account read for one of the linked client's plain savings accounts. */
export const details = (
  id = 42,
  state: "active" | "pending" = "active",
  extra: Record<string, unknown> = {},
) => {
  const { productName, accountType: _, ...account } = summary(id, state);
  const active = state === "active";
  return {
    ...account,
    clientId,
    clientName: "Synthetic Client",
    savingsProductId: 7,
    savingsProductName: productName,
    timeline: {
      submittedOnDate: [2026, 10, 1],
      submittedByUsername: "synthetic-staff",
      ...(active && { approvedOnDate: [2026, 10, 2], activatedOnDate: [2026, 10, 3] }),
    },
    nominalAnnualInterestRate: 4.5,
    onHoldFunds: null,
    savingsAmountOnHold: null,
    summary: {
      currency: account.currency,
      ...(active && {
        totalDeposits: 1500,
        totalWithdrawals: 250,
        totalInterestEarned: 0.62,
        totalInterestPosted: 0.5,
        accountBalance: 1250.5,
        availableBalance: 1250.5,
      }),
    },
    ...(active && { transactions: movements(id) }),
    ...extra,
  };
};
/** `count` deposits of 10.00, one a day, newest first. */
export const manyMovements = (count: number, accountId = 42) =>
  Array.from({ length: count }, (_, index) =>
    movement(
      1000 + count - index,
      "deposit",
      {
        date: [2026, 1 + Math.floor((count - 1 - index) / 28), 1 + ((count - 1 - index) % 28)],
        amount: 10,
        runningBalance: 10 * (count - index),
      },
      accountId,
    ),
  );
