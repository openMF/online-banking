/**
 * Typed wrappers for every Self Service Plugin endpoint under /v1/self/*.
 * Source of truth: https://github.com/openMF/selfservice-plugin (develop)
 *
 * Base path is built from SELF_SERVICE_BASE_URL + SELF_SERVICE_ENDPOINT.
 */

import { selfRequest, setSessionAuth, type AuthCredentials, type RequestOptions } from "./client";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type Id = string | number;
type Json = Record<string, unknown>;

function opts(extra: RequestOptions = {}): RequestOptions {
  return extra;
}

// ===========================================================================
// Authentication  —  /v1/self/authentication
// ===========================================================================

/** POST /v1/self/authentication — login (HTTP Basic). Returns user/session payload. */
export async function authenticate(username: string, password: string) {
  const creds: AuthCredentials = { username, password };
  const result = await selfRequest<Json>("/authentication", {
    method: "POST",
    auth: creds,
  });
  setSessionAuth(creds);
  return result;
}

/** POST /v1/self/authentication/token — obtain / refresh access token when enabled. */
export async function authenticationToken(body?: Json) {
  return selfRequest<Json>("/authentication/token", {
    method: "POST",
    body: body ?? {},
  });
}

/** POST /v1/self/authentication/logout */
export async function logout() {
  try {
    await selfRequest("/authentication/logout", { method: "POST" });
  } finally {
    setSessionAuth(null);
  }
}

// ===========================================================================
// Registration & enrollment  —  /v1/self/registration
// ===========================================================================

/** POST /v1/self/registration — start self-registration */
export async function register(body: Json) {
  return selfRequest<Json>("/registration", { method: "POST", body, auth: null });
}

/** POST /v1/self/registration/user — create self-service user */
export async function registerUser(body: Json) {
  return selfRequest<Json>("/registration/user", { method: "POST", body, auth: null });
}

/** POST /v1/self/registration/user/confirm — confirm with token */
export async function confirmRegistration(body: Json) {
  return selfRequest<Json>("/registration/user/confirm", { method: "POST", body, auth: null });
}

/** POST /v1/self/registration/client-user — link client + user */
export async function registerClientUser(body: Json) {
  return selfRequest<Json>("/registration/client-user", { method: "POST", body, auth: null });
}

/** POST /v1/self/registration/client-user/confirm */
export async function confirmClientUser(body: Json) {
  return selfRequest<Json>("/registration/client-user/confirm", {
    method: "POST",
    body,
    auth: null,
  });
}

/** GET /v1/self/registration/identifiers */
export async function registrationIdentifiers(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/registration/identifiers", { query, auth: null });
}

// ===========================================================================
// Password recovery  —  /v1/self/password
// ===========================================================================

/** POST /v1/self/password/request — request reset token */
export async function requestPasswordReset(body: Json) {
  return selfRequest<Json>("/password/request", { method: "POST", body, auth: null });
}

/** POST /v1/self/password/renew — set new password with token */
export async function renewPassword(body: Json) {
  return selfRequest<Json>("/password/renew", { method: "POST", body, auth: null });
}

// ===========================================================================
// Current user  —  /v1/self/user , /v1/self/userdetails
// ===========================================================================

/** GET /v1/self/user */
export async function getUser() {
  return selfRequest<Json>("/user");
}

/** PUT /v1/self/user — update profile / password */
export async function updateUser(body: Json) {
  return selfRequest<Json>("/user", { method: "PUT", body });
}

/** GET /v1/self/userdetails */
export async function getUserDetails() {
  return selfRequest<Json>("/userdetails");
}

// ===========================================================================
// Clients  —  /v1/self/clients
// ===========================================================================

/** GET /v1/self/clients */
export async function listClients(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/clients", { query });
}

/** GET /v1/self/clients/{clientId} */
export async function getClient(clientId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/clients/${clientId}`, { query });
}

/** GET /v1/self/clients/{clientId}/accounts */
export async function getClientAccounts(clientId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/clients/${clientId}/accounts`, { query });
}

/** GET /v1/self/clients/{clientId}/charges */
export async function getClientCharges(clientId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/clients/${clientId}/charges`, { query });
}

/** GET /v1/self/clients/{clientId}/charges/{chargeId} */
export async function getClientCharge(clientId: Id, chargeId: Id) {
  return selfRequest<Json>(`/clients/${clientId}/charges/${chargeId}`);
}

/** GET /v1/self/clients/{clientId}/transactions */
export async function getClientTransactions(clientId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/clients/${clientId}/transactions`, { query });
}

/** GET /v1/self/clients/{clientId}/transactions/{transactionId} */
export async function getClientTransaction(clientId: Id, transactionId: Id) {
  return selfRequest<Json>(`/clients/${clientId}/transactions/${transactionId}`);
}

/** GET /v1/self/clients/{clientId}/images */
export async function getClientImage(clientId: Id, query?: RequestOptions["query"]) {
  return selfRequest<unknown>(`/clients/${clientId}/images`, { query });
}

/** POST /v1/self/clients/{clientId}/images */
export async function uploadClientImage(clientId: Id, body: unknown, contentType?: string) {
  return selfRequest(`/clients/${clientId}/images`, {
    method: "POST",
    body,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });
}

/** DELETE /v1/self/clients/{clientId}/images */
export async function deleteClientImage(clientId: Id) {
  return selfRequest(`/clients/${clientId}/images`, { method: "DELETE" });
}

// ===========================================================================
// Savings accounts  —  /v1/self/savingsaccounts
// ===========================================================================

/** GET /v1/self/savingsaccounts */
export async function listSavingsAccounts(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/savingsaccounts", { query });
}

/** GET /v1/self/savingsaccounts/{accountId} */
export async function getSavingsAccount(accountId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/savingsaccounts/${accountId}`, { query });
}

/** GET /v1/self/savingsaccounts/{accountId}/transactions/{transactionId} */
export async function getSavingsTransaction(accountId: Id, transactionId: Id) {
  return selfRequest<Json>(`/savingsaccounts/${accountId}/transactions/${transactionId}`);
}

/** GET /v1/self/savingsaccounts/{accountId}/charges */
export async function getSavingsCharges(accountId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/savingsaccounts/${accountId}/charges`, { query });
}

/** GET /v1/self/savingsaccounts/{accountId}/charges/{chargeId} */
export async function getSavingsCharge(accountId: Id, chargeId: Id) {
  return selfRequest<Json>(`/savingsaccounts/${accountId}/charges/${chargeId}`);
}

/** GET /v1/self/savingsaccounts/template */
export async function getSavingsTemplate(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/savingsaccounts/template", { query });
}

/** POST /v1/self/savingsaccounts — apply for savings product */
export async function createSavingsAccount(body: Json) {
  return selfRequest<Json>("/savingsaccounts", { method: "POST", body });
}

/** PUT /v1/self/savingsaccounts/{accountId} */
export async function updateSavingsAccount(accountId: Id, body: Json) {
  return selfRequest<Json>(`/savingsaccounts/${accountId}`, { method: "PUT", body });
}

// ===========================================================================
// Loans  —  /v1/self/loans
// ===========================================================================

/** GET /v1/self/loans */
export async function listLoans(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/loans", { query });
}

/** GET /v1/self/loans/{loanId} */
export async function getLoan(loanId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/loans/${loanId}`, { query });
}

/** GET /v1/self/loans/{loanId}/transactions */
export async function getLoanTransactions(loanId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/loans/${loanId}/transactions`, { query });
}

/** GET /v1/self/loans/{loanId}/transactions/{transactionId} */
export async function getLoanTransaction(loanId: Id, transactionId: Id) {
  return selfRequest<Json>(`/loans/${loanId}/transactions/${transactionId}`);
}

/** GET /v1/self/loans/{loanId}/charges */
export async function getLoanCharges(loanId: Id) {
  return selfRequest<Json>(`/loans/${loanId}/charges`);
}

/** GET /v1/self/loans/{loanId}/charges/{chargeId} */
export async function getLoanCharge(loanId: Id, chargeId: Id) {
  return selfRequest<Json>(`/loans/${loanId}/charges/${chargeId}`);
}

/** GET /v1/self/loans/{loanId}/guarantors */
export async function getLoanGuarantors(loanId: Id) {
  return selfRequest<Json>(`/loans/${loanId}/guarantors`);
}

/** GET /v1/self/loans/template */
export async function getLoanTemplate(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/loans/template", { query });
}

/** POST /v1/self/loans — apply for a loan */
export async function createLoan(body: Json) {
  return selfRequest<Json>("/loans", { method: "POST", body });
}

/** PUT /v1/self/loans/{loanId} */
export async function updateLoan(loanId: Id, body: Json) {
  return selfRequest<Json>(`/loans/${loanId}`, { method: "PUT", body });
}

// --- Public loan simulation (no auth required typically) ---

/** GET /v1/self/loans/simulate/products */
export async function simulateLoanProducts(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/loans/simulate/products", { query, auth: null });
}

/** GET /v1/self/loans/simulate/template */
export async function simulateLoanTemplate(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/loans/simulate/template", { query, auth: null });
}

/** POST /v1/self/loans/simulate */
export async function simulateLoan(body: Json) {
  return selfRequest<Json>("/loans/simulate", { method: "POST", body, auth: null });
}

// ===========================================================================
// Share accounts  —  /v1/self/shareaccounts
// ===========================================================================

/** GET /v1/self/shareaccounts */
export async function listShareAccounts(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/shareaccounts", { query });
}

/** GET /v1/self/shareaccounts/{accountId} */
export async function getShareAccount(accountId: Id, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/shareaccounts/${accountId}`, { query });
}

/** POST /v1/self/shareaccounts */
export async function createShareAccount(body: Json) {
  return selfRequest<Json>("/shareaccounts", { method: "POST", body });
}

// ===========================================================================
// Account transfers  —  /v1/self/accounttransfers
// ===========================================================================

/** GET /v1/self/accounttransfers/template */
export async function getTransferTemplate(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/accounttransfers/template", { query });
}

/** POST /v1/self/accounttransfers/prepare */
export async function prepareTransfer(body: Json) {
  return selfRequest<Json>("/accounttransfers/prepare", { method: "POST", body });
}

/** POST /v1/self/accounttransfers/quote */
export async function quoteTransfer(body: Json) {
  return selfRequest<Json>("/accounttransfers/quote", { method: "POST", body });
}

/** POST /v1/self/accounttransfers/confirm */
export async function confirmTransfer(body: Json) {
  return selfRequest<Json>("/accounttransfers/confirm", { method: "POST", body });
}

/** POST /v1/self/accounttransfers — create transfer (legacy / simple) */
export async function createTransfer(body: Json) {
  return selfRequest<Json>("/accounttransfers", { method: "POST", body });
}

/** POST /v1/self/accounttransfers/otp/resend */
export async function resendTransferOtp(body?: Json) {
  return selfRequest<Json>("/accounttransfers/otp/resend", {
    method: "POST",
    body: body ?? {},
  });
}

/** POST /v1/self/accounttransfers/{accountId}/details */
export async function transferAccountDetails(accountId: Id, body?: Json) {
  return selfRequest<Json>(`/accounttransfers/${accountId}/details`, {
    method: "POST",
    body: body ?? {},
  });
}

/** GET /v1/self/accounttransfers/{accountId}/details/{txnId} */
export async function getTransferDetail(accountId: Id, txnId: Id) {
  return selfRequest<Json>(`/accounttransfers/${accountId}/details/${txnId}`);
}

// ===========================================================================
// Beneficiaries (TPT)  —  /v1/self/beneficiaries/tpt
// ===========================================================================

/** GET /v1/self/beneficiaries/tpt/template */
export async function getBeneficiaryTemplate() {
  return selfRequest<Json>("/beneficiaries/tpt/template");
}

/** GET /v1/self/beneficiaries/tpt */
export async function listBeneficiaries() {
  return selfRequest<Json>("/beneficiaries/tpt");
}

/** POST /v1/self/beneficiaries/tpt */
export async function createBeneficiary(body: Json) {
  return selfRequest<Json>("/beneficiaries/tpt", { method: "POST", body });
}

/** PUT /v1/self/beneficiaries/tpt/{beneficiaryId} */
export async function updateBeneficiary(beneficiaryId: Id, body: Json) {
  return selfRequest<Json>(`/beneficiaries/tpt/${beneficiaryId}`, {
    method: "PUT",
    body,
  });
}

/** DELETE /v1/self/beneficiaries/tpt/{beneficiaryId} */
export async function deleteBeneficiary(beneficiaryId: Id) {
  return selfRequest(`/beneficiaries/tpt/${beneficiaryId}`, { method: "DELETE" });
}

// ===========================================================================
// Products catalog
// ===========================================================================

/** GET /v1/self/loanproducts */
export async function listLoanProducts(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/loanproducts", { query });
}

/** GET /v1/self/loanproducts/{productId} */
export async function getLoanProduct(productId: Id) {
  return selfRequest<Json>(`/loanproducts/${productId}`);
}

/** GET /v1/self/savingsproducts */
export async function listSavingsProducts(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/savingsproducts", { query });
}

/** GET /v1/self/savingsproducts/{productId} */
export async function getSavingsProduct(productId: Id) {
  return selfRequest<Json>(`/savingsproducts/${productId}`);
}

/** GET /v1/self/products/share */
export async function listShareProducts(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/products/share", { query });
}

/** GET /v1/self/products/share/{productId} */
export async function getShareProduct(productId: Id) {
  return selfRequest<Json>(`/products/share/${productId}`);
}

// ===========================================================================
// Reports  —  /v1/self/runreports
// ===========================================================================

/** GET /v1/self/runreports/{reportName} */
export async function runReport(reportName: string, query?: RequestOptions["query"]) {
  return selfRequest<Json>(`/runreports/${encodeURIComponent(reportName)}`, { query });
}

/** GET /v1/self/runreports */
export async function listReports(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/runreports", { query });
}

// ===========================================================================
// Surveys & scorecards
// ===========================================================================

/** GET /v1/self/surveys */
export async function listSurveys() {
  return selfRequest<Json>("/surveys");
}

/** GET /v1/self/surveys/scorecards/clients/{clientId} */
export async function getClientScorecards(clientId: Id) {
  return selfRequest<Json>(`/surveys/scorecards/clients/${clientId}`);
}

/** GET /v1/self/surveys/scorecards/{surveyId} */
export async function getSurveyScorecards(surveyId: Id) {
  return selfRequest<Json>(`/surveys/scorecards/${surveyId}`);
}

/** POST /v1/self/surveys/scorecards/{surveyId} */
export async function submitScorecard(surveyId: Id, body: Json) {
  return selfRequest<Json>(`/surveys/scorecards/${surveyId}`, { method: "POST", body });
}

// ===========================================================================
// Offices  —  /v1/self/offices
// ===========================================================================

/** GET /v1/self/offices */
export async function listOffices(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/offices", { query });
}

/** GET /v1/self/offices/template */
export async function getOfficeTemplate() {
  return selfRequest<Json>("/offices/template");
}

/** GET /v1/self/offices/{officeId} */
export async function getOffice(officeId: Id) {
  return selfRequest<Json>(`/offices/${officeId}`);
}

/** GET /v1/self/offices/external-id/{externalId} */
export async function getOfficeByExternalId(externalId: string) {
  return selfRequest<Json>(`/offices/external-id/${encodeURIComponent(externalId)}`);
}

/** GET /v1/self/offices/{officeId}/details */
export async function getOfficeDetails(officeId: Id) {
  return selfRequest<Json>(`/offices/${officeId}/details`);
}

/** GET /v1/self/offices/{officeId}/services */
export async function getOfficeServices(officeId: Id) {
  return selfRequest<Json>(`/offices/${officeId}/services`);
}

/** GET /v1/self/offices/{officeId}/geolocation */
export async function getOfficeGeolocation(officeId: Id) {
  return selfRequest<Json>(`/offices/${officeId}/geolocation`);
}

/** GET /v1/self/offices/{officeId}/address */
export async function getOfficeAddress(officeId: Id) {
  return selfRequest<Json>(`/offices/${officeId}/address`);
}

// ===========================================================================
// Pockets  —  /v1/self/pockets
// ===========================================================================

/** GET /v1/self/pockets */
export async function listPockets(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/pockets", { query });
}

/** POST /v1/self/pockets */
export async function createPocket(body: Json) {
  return selfRequest<Json>("/pockets", { method: "POST", body });
}

// ===========================================================================
// Payment link, remittance, transfer fees, SINPE
// ===========================================================================

/** GET|POST /v1/self/paymentlink */
export async function getPaymentLink(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/paymentlink", { query });
}

export async function createPaymentLink(body: Json) {
  return selfRequest<Json>("/paymentlink", { method: "POST", body });
}

/** /v1/self/remittance */
export async function listRemittances(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/remittance", { query });
}

export async function createRemittance(body: Json) {
  return selfRequest<Json>("/remittance", { method: "POST", body });
}

/** /v1/self/transfer-fees */
export async function getTransferFees(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/transfer-fees", { query });
}

/** /v1/self/sinpe/enrollment */
export async function getSinpeEnrollment(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/sinpe/enrollment", { query });
}

export async function createSinpeEnrollment(body: Json) {
  return selfRequest<Json>("/sinpe/enrollment", { method: "POST", body });
}

// ===========================================================================
// Self-service onboarding steps  —  /v1/self/onboarding/steps
// ===========================================================================

/** GET /v1/self/onboarding/steps */
export async function getOnboardingSteps(query?: RequestOptions["query"]) {
  return selfRequest<Json>("/onboarding/steps", { query });
}

/** POST /v1/self/onboarding/steps */
export async function updateOnboardingSteps(body: Json) {
  return selfRequest<Json>("/onboarding/steps", { method: "POST", body });
}

// ===========================================================================
// Convenience: fetch all account types for the logged-in client
// ===========================================================================

export async function getPortfolioSummary(clientId: Id) {
  const [accounts, savings, loans, shares] = await Promise.all([
    getClientAccounts(clientId).catch(() => null),
    listSavingsAccounts({ clientId: String(clientId) }).catch(() => null),
    listLoans({ clientId: String(clientId) }).catch(() => null),
    listShareAccounts({ clientId: String(clientId) }).catch(() => null),
  ]);
  return { accounts, savings, loans, shares };
}

// Re-export session helpers
export { setSessionAuth, getSessionAuth, SelfServiceError } from "./client";
export { getSelfServiceConfig, selfUrl } from "./config";
export type { AuthCredentials, TokenAuth, RequestOptions } from "./client";
