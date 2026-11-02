// Synthetic DTOs shaped after SavingsAccountSummaryData in GET /self/clients/{id}/accounts, never
// live data. Like Fineract, a zero balance is left out (null) instead of being sent as 0.
const statuses = {
  pending: [100, "submitted.and.pending.approval", "Submitted and pending approval"],
  approved: [200, "approved", "Approved"],
  active: [300, "active", "Active"],
  withdrawn: [400, "withdrawn.by.applicant", "Withdrawn by applicant"],
  rejected: [500, "rejected", "Rejected"],
  closed: [600, "closed", "Closed"],
  matured: [800, "matured", "Matured"],
} as const;
const deposits = {
  savings: [100, "savingsDeposit", "Savings"],
  fixed: [200, "fixedDeposit", "Fixed Deposit"],
  recurring: [300, "recurringDeposit", "Recurring Deposit"],
} as const;
export const summary = (
  id: number,
  state: keyof typeof statuses = "active",
  extra: Record<string, unknown> = {},
  deposit: keyof typeof deposits = "savings",
) => {
  const [statusId, code, value] = statuses[state];
  const [depositId, depositCode, depositValue] = deposits[deposit];
  return {
    id,
    accountNo: String(id).padStart(9, "0"),
    productId: 7,
    productName: "Synthetic Wallet",
    shortProductName: "SYW",
    status: {
      id: statusId,
      code: `savingsAccountStatusType.${code}`,
      value,
      submittedAndPendingApproval: state === "pending",
      approved: state === "approved",
      active: state === "active",
      closed: state === "closed",
    },
    currency: {
      code: "MXN",
      name: "Mexican Peso",
      decimalPlaces: 2,
      displaySymbol: "$",
      nameCode: "currency.MXN",
      displayLabel: "Mexican Peso ($)",
    },
    accountType: { id: 1, code: "accountType.individual", value: "Individual" },
    depositType: {
      id: depositId,
      code: `depositAccountType.${depositCode}`,
      value: depositValue,
    },
    ...extra,
  };
};
/**
 * The answer for one client: an active wallet with money, an empty one, and an application. A
 * second client gets an `offset`, so its accounts have their own ids.
 */
export const accounts = (offset = 0) => ({
  savingsAccounts: [
    summary(offset + 57, "pending", {}, "recurring"),
    summary(offset + 42, "active", { availableBalance: 1250.5, accountBalance: 1250.5 }),
    summary(offset + 43, "active"),
  ],
});
