export interface Currency {
  code: string;
  name: string;
  decimalPlaces: number;
  displaySymbol: string;
  nameCode: string;
  displayLabel: string;
}

export interface Status {
  id: number;
  code: string;
  value: string;
  submittedAndPendingApproval: boolean;
  approved: boolean;
  rejected: boolean;
  withdrawnByApplicant: boolean;
  active: boolean;
  closed: boolean;
}

export interface Timeline {
  submittedOnDate?: number[];
  submittedByUsername?: string;
  submittedByFirstname?: string;
  submittedByLastname?: string;
  approvedOnDate?: number[];
  approvedByUsername?: string;
  approvedByFirstname?: string;
  approvedByLastname?: string;
  activatedOnDate?: number[];
  activatedByUsername?: string;
  activatedByFirstname?: string;
  activatedByLastname?: string;
  closedOnDate?: number[];
  closedByUsername?: string;
  closedByFirstname?: string;
  closedByLastname?: string;
}

export interface SavingsAccount {
  id: number;
  accountNo: string;
  clientId: number;
  clientName: string;
  savingsProductId: number;
  savingsProductName: string;
  fieldOfficerId?: number;
  status: Status;
  currency: Currency;
  accountBalance: number;
  timeline: Timeline;
}

export interface LoanAccount {
  id: number;
  accountNo: string;
  clientId: number;
  clientName: string;
  loanProductId: number;
  loanProductName: string;
  isLoanProductLinkedToFloatingRate: boolean;
  fundId?: number;
  fundName?: string;
  loanPurposeId?: number;
  loanPurposeName?: string;
  loanOfficerId?: number;
  loanOfficerName?: string;
  currency: Currency;
  principal: number;
  approvedPrincipal: number;
  proposedPrincipal: number;
  status: Status;
  timeline: Timeline;
  feeChargesAtDisbursementCharged: number;
  expectedFirstRepaymentOnDate?: number[];
  annualInterestRate: number;
  loanBalance: number;
  totalExpectedRepayment: number;
}

export interface ShareAccount {
  id: number;
  accountNo: string;
  clientId: number;
  clientName: string;
  productId: number;
  productName: string;
  status: Status;
  currency: Currency;
  timeline: Timeline;
  totalApprovedShares: number;
  totalPendingForApprovalShares: number;
}

export interface AccountTransaction {
  id: number;
  accountId: number;
  accountNo: string;
  date: number[];
  currency: Currency;
  amount: number;
  runningBalance: number;
  outstandingLoanBalance?: number;
  reversed: boolean;
  type: {
    id: number;
    code: string;
    value: string;
    deposit: boolean;
    withdrawal: boolean;
    interestPosting: boolean;
    feeDeduction: boolean;
  };
}

export interface SavingsAccountDetails extends SavingsAccount {
  transactions?: AccountTransaction[];
}

export interface LoanAccountDetails extends LoanAccount {
  transactions?: AccountTransaction[];
  summary?: {
    totalOutstanding: number;
  };
}

export interface ShareAccountDetails extends ShareAccount {
  // Add detailed fields if needed
}

export interface ClientAccounts {
  loanAccounts?: LoanAccount[];
  savingsAccounts?: SavingsAccount[];
  shareAccounts?: ShareAccount[];
}
