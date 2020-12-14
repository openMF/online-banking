/**
 * A Loan Request Model adhered from the API Docs
 */
export interface LoanRequest {
    locale: string;
    clientId: number;
    loanType: string;
    principal: string;
    productId: number;
    dateFormat: string;
    interestType: number;
    loanPurposeId: string;
    repaymentEvery: number;
    submittedOnDate: string;
    amortizationType: number;
    loanTermFrequency: number;
    numberOfRepayments: number;
    loanTermFrequencyType: number;
    interestRatePerPeriod: number;
    repaymentFrequencyType: number;
    expectedDisbursementDate: string;
    interestCalculationPeriodType: number;
    transactionProcessingStrategyId: number;
}
