/**
 * Mifos Self Service Plugin client
 * @see https://github.com/openMF/selfservice-plugin
 */

export * from "./config";
export * from "./client";
export * as selfApi from "./api";
export {
  authenticate,
  logout,
  register,
  listSavingsAccounts,
  listLoans,
  listShareAccounts,
  createTransfer,
  prepareTransfer,
  quoteTransfer,
  confirmTransfer,
  listBeneficiaries,
  createBeneficiary,
  getUser,
  getUserDetails,
  getClient,
  getClientAccounts,
  getPortfolioSummary,
  listLoanProducts,
  listSavingsProducts,
  listShareProducts,
  setSessionAuth,
  getSessionAuth,
  SelfServiceError,
  getSelfServiceConfig,
  selfUrl,
} from "./api";
