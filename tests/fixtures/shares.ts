// Synthetic core ShareAccountData / account discovery contracts. No real account data.
import { clientId } from "./savings";
export { login, clientId } from "./savings";
export const share = (overrides: Record<string, unknown> = {}) => ({
  id: 476,
  clientId,
  accountNo: "SH-476",
  productId: 6,
  productName: "Synthetic Equity",
  status: { id: 300, code: "shareAccountStatusType.active", active: true },
  summary: { totalApprovedShares: 7, totalPendingForApprovalShares: 2 },
  currentMarketPrice: 10.25,
  currency: { code: "MXN", decimalPlaces: 2 },
  dividends: [
    {
      id: 1,
      amount: 2.35,
      postedDate: [2026, 10, 1],
      status: { id: 300 },
      savingsTransactionId: 51,
    },
    { id: 2, amount: 1.1, postedDate: [2026, 11, 1], status: { id: 100 } },
  ],
  ...overrides,
});
export const discovery = () => ({
  shareAccounts: [
    {
      ...share(),
      summary: undefined,
      currentMarketPrice: undefined,
      dividends: undefined,
      totalApprovedShares: 7,
      totalPendingForApprovalShares: 2,
    },
    {
      ...share({
        id: 477,
        accountNo: "SH-477",
        productName: "Synthetic Pending",
        status: { id: 100 },
      }),
      summary: undefined,
      totalApprovedShares: 0,
      totalPendingForApprovalShares: 12,
    },
  ],
});
