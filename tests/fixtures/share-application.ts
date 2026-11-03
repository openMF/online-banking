// Synthetic DTOs based on SelfShareAccountsApiResource and the core ShareProductData source.
import { clientId, share } from "./shares";
export { clientId, login } from "./shares";
export const productId = 6;
export const charge = (overrides: Record<string, unknown> = {}) => ({
  id: 2,
  name: "Synthetic activation fee",
  active: true,
  currency: { code: "MXN", decimalPlaces: 2 },
  amount: 2.35,
  chargeTimeType: { id: 13 },
  chargeCalculationType: { id: 1 },
  ...overrides,
});
export const product = (overrides: Record<string, unknown> = {}) => ({
  id: productId,
  name: "Synthetic Equity",
  currency: { code: "MXN", decimalPlaces: 2 },
  unitPrice: 0.1,
  minimumShares: 2,
  nominalShares: 10,
  maximumShares: 50,
  lockinPeriod: 3,
  lockPeriodTypeEnum: { id: 2 },
  minimumActivePeriod: 30,
  minimumActivePeriodForDividendsTypeEnum: { id: 0 },
  marketPrice: [{ id: 1, fromDate: [2026, 1, 1], shareValue: 10.25 }],
  charges: [charge()],
  ...overrides,
});
export const template = (selected = false, overrides: Record<string, unknown> = {}) => ({
  clientId,
  productOptions: selected ? [product(overrides)] : [{ id: productId, name: "Synthetic Equity" }],
  // These are available options, not the product defaults. Never send all of them.
  chargeOptions: [charge(), charge({ id: 99, name: "Unselected fee" })],
});
export const savingsAccount = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  accountNo: "SYN-SAV-5",
  clientId,
  productName: "Synthetic Savings",
  status: { id: 300, code: "savingsAccountStatusType.active", value: "Active" },
  depositType: { id: 100 },
  currency: { code: "MXN", decimalPlaces: 2 },
  ...overrides,
});
export const discovery = () => ({
  savingsAccounts: [
    savingsAccount(),
    savingsAccount({
      id: 7,
      accountNo: "SYN-CLOSED",
      status: { id: 600, code: "savingsAccountStatusType.closed", value: "Closed" },
    }),
    savingsAccount({ id: 8, accountNo: "SYN-USD", currency: { code: "USD", decimalPlaces: 2 } }),
  ],
  shareAccounts: [],
});
export const application = (status = 100, overrides: Record<string, unknown> = {}) =>
  share({
    id: 477,
    accountNo: "SH-477",
    status: { id: status },
    summary: {
      totalPendingForApprovalShares: status === 100 ? 10 : 0,
      totalApprovedShares: status === 100 ? 0 : 10,
    },
    purchasedShares: [
      {
        id: 1,
        accountId: 477,
        numberOfShares: 10,
        type: { id: 500 },
        status: { id: status === 100 ? 100 : 300 },
      },
    ],
    ...overrides,
  });
export const values = { savingsAccountId: "5", requestedShares: "10", date: "2026-11-03" };
