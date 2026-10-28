// Synthetic DTOs shaped after SavingsAccountData / CommandProcessingResult, never live data.
export const clientId = 9001;
export const productId = 15;
export const products = [{ id: productId, name: "Synthetic Flexible Savings", shortName: "SYN" }];
export const template = (selected = false) => ({
  clientId,
  clientName: "Synthetic Customer",
  productOptions: products,
  ...(selected
    ? {
        savingsProductId: productId,
        savingsProductName: products[0].name,
        currency: { code: "MXN", decimalPlaces: 2, name: "Mexican Peso" },
        nominalAnnualInterestRate: 3.5,
        minRequiredOpeningBalance: 100,
        interestCompoundingPeriodType: {
          id: 1,
          code: "savings.interest.period.savingsCompoundingInterestPeriodType.daily",
          value: "Daily",
        },
        interestPostingPeriodType: { id: 4, value: "Monthly" },
        interestCalculationType: { id: 1, value: "Daily Balance" },
        interestCalculationDaysInYearType: { id: 365, value: "365 Days" },
        timeline: { submittedOnDate: [2026, 10, 27] },
        charges: [],
        datatables: [],
      }
    : {}),
});
export const account = (state = "submitted.and.pending.approval") => ({
  id: 469,
  clientId,
  accountNo: "SYN-00000469",
  savingsProductId: productId,
  savingsProductName: products[0].name,
  status: {
    id: state === "active" ? 300 : state === "approved" ? 200 : 100,
    code: `savingsAccountStatusType.${state}`,
    value:
      state === "active"
        ? "Active"
        : state === "approved"
          ? "Approved"
          : "Submitted and pending approval",
    submittedAndPendingApproval: state === "submitted.and.pending.approval",
    approved: state === "approved",
    active: state === "active",
  },
});
export const login = {
  authenticated: true,
  username: "synthetic-customer",
  userId: 452,
  roles: [{ id: 1, name: "Customer" }],
  permissions: ["READ_CLIENT", "READ_SAVINGSACCOUNT", "CREATE_SAVINGSACCOUNT"],
  clients: [clientId],
  base64EncodedAuthenticationKey: btoa("00000000-0000-4000-8000-000000000001"),
  shouldRenewPassword: false,
  isTwoFactorAuthenticationRequired: false,
};
