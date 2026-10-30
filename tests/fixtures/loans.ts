// Mocked integration DTOs based on core LoanAccountData / LoanProductData, not live accounts.
import { clientId, login } from "./savings";
export { clientId, login };
export const productId = 27;
const option = (id: number, value: string) => ({ id, value });
export const products = [
  { id: productId, name: "Synthetic Loan" },
  { id: 28, name: "Synthetic Alternative" },
];
export const product = (id = productId) => ({
  id,
  name: id === productId ? "Synthetic Loan" : "Synthetic Alternative",
  minPrincipal: 100,
  maxPrincipal: 10000,
  minNumberOfRepayments: 2,
  maxNumberOfRepayments: 24,
  minInterestRatePerPeriod: 0,
  maxInterestRatePerPeriod: 10,
  allowAttributeOverrides: {
    amortizationType: false,
    interestType: false,
    interestCalculationPeriodType: false,
    repaymentFrequencyType: false,
  },
});
export const template = (id = productId) => ({
  clientId,
  clientName: "Synthetic Customer",
  loanProductId: id,
  loanProductName: product(id).name,
  currency: { code: "MXN", decimalPlaces: 2 },
  productOptions: products,
  principal: id === productId ? 1000 : 2000,
  termFrequency: 12,
  termPeriodFrequencyType: option(2, "Months"),
  numberOfRepayments: 12,
  repaymentEvery: 1,
  repaymentFrequencyType: option(2, "Months"),
  interestRatePerPeriod: 1.5,
  interestRateFrequencyType: option(2, "Per month"),
  amortizationType: option(1, "Equal installments"),
  interestType: option(0, "Declining balance"),
  interestCalculationPeriodType: option(1, "Same as repayment period"),
  transactionProcessingStrategyCode: "mifos-standard-strategy",
  transactionProcessingStrategyName: "Mifos standard",
  timeline: { submittedOnDate: [2026, 10, 30], expectedDisbursementDate: [2026, 11, 5] },
  termFrequencyTypeOptions: [option(2, "Months"), option(1, "Weeks")],
  repaymentFrequencyTypeOptions: [option(2, "Months")],
  amortizationTypeOptions: [option(1, "Equal installments")],
  interestTypeOptions: [option(0, "Declining balance")],
  interestCalculationPeriodTypeOptions: [option(1, "Same as repayment period")],
  loanPurposeOptions: [{ id: 3, name: "Equipment" }],
  charges: [],
  datatables: [],
});
export const loan = (state = "submitted.and.pending.approval", principal = 1000) => ({
  ...template(),
  id: 473,
  accountNo: "SYN-473",
  principal,
  status: {
    id:
      state === "submitted.and.pending.approval"
        ? 100
        : state === "withdrawn.by.client"
          ? 400
          : 200,
    code: `loanStatusType.${state}`,
    value:
      state === "submitted.and.pending.approval"
        ? "Submitted and pending approval"
        : state === "withdrawn.by.client"
          ? "Withdrawn by applicant"
          : "Approved",
    pendingApproval: state === "submitted.and.pending.approval",
  },
});
export const createBody = {
  locale: "en",
  dateFormat: "yyyy-MM-dd",
  clientId,
  productId,
  loanType: "individual",
  principal: 1000,
  loanTermFrequency: 12,
  loanTermFrequencyType: 2,
  numberOfRepayments: 12,
  repaymentEvery: 1,
  repaymentFrequencyType: 2,
  interestRatePerPeriod: 1.5,
  amortizationType: 1,
  interestType: 0,
  interestCalculationPeriodType: 1,
  transactionProcessingStrategyCode: "mifos-standard-strategy",
  submittedOnDate: "2026-10-30",
  expectedDisbursementDate: "2026-11-05",
};
