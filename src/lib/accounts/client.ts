import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { positiveId, record } from "../savings/client";

export type AccountsFailure = "expired" | "denied" | "unavailable" | "offline" | "malformed";
export class AccountsError extends Error {
  constructor(readonly code: AccountsFailure) {
    // Never include response bodies: server text is not shown to the customer.
    super(code);
    this.name = "AccountsError";
  }
}
export type DepositType = "savings" | "fixed" | "recurring" | "current";
export interface SavingsSummary {
  id: number;
  accountNo: string;
  productName?: string;
  status: { id: number; code: string; value: string };
  depositType: DepositType;
  currency: { code: string; decimalPlaces: number };
  /** Absent for an account that was never active: it has no balance to show. */
  availableBalance?: number;
}
export interface ClientSavings {
  clientId: number;
  accounts: SavingsSummary[];
}

const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const malformed = (): never => {
  throw new AccountsError("malformed");
};
const depositTypes: Record<number, DepositType> = {
  100: "savings",
  200: "fixed",
  300: "recurring",
  400: "current",
};
// The code Fineract pairs with each status id (SavingsAccountStatusType).
const statusCodes: Record<number, string> = {
  100: "submitted.and.pending.approval",
  200: "approved",
  300: "active",
  303: "transfer.in.progress",
  304: "transfer.on.hold",
  400: "withdrawn.by.applicant",
  500: "rejected",
  600: "closed",
  700: "pre.mature.closure",
  800: "matured",
};
// Active, transfer in progress or on hold, closed, closed early, matured.
const everActive = new Set([300, 303, 304, 600, 700, 800]);
// Active first, then applications, then finished accounts, then refused applications.
const statusRank: Record<number, number> = {
  300: 0,
  303: 0,
  304: 0,
  100: 1,
  200: 1,
  600: 2,
  700: 2,
  800: 2,
  400: 3,
  500: 3,
};

/** Adapter for core SavingsAccountSummaryData, as listed by `GET /self/clients/{id}/accounts`. */
export function parseSavingsAccount(data: unknown): SavingsSummary {
  if (!record(data) || !positiveId(data.id) || !text(data.accountNo)) return malformed();
  const status = data.status;
  if (!record(status) || !positiveId(status.id) || !text(status.code) || !text(status.value))
    return malformed();
  // The id decides the label and the balance, so it must agree with the code it came with.
  const known = statusCodes[status.id];
  if (known && status.code !== `savingsAccountStatusType.${known}`) return malformed();
  const type = record(data.depositType) ? data.depositType.id : undefined;
  const depositType = positiveId(type) ? depositTypes[type] : undefined;
  if (!depositType) return malformed();
  const currency = data.currency;
  if (
    !record(currency) ||
    typeof currency.code !== "string" ||
    !/^[A-Z]{3}$/.test(currency.code) ||
    typeof currency.decimalPlaces !== "number" ||
    !Number.isInteger(currency.decimalPlaces) ||
    currency.decimalPlaces < 0 ||
    currency.decimalPlaces > 20
  )
    return malformed();
  const balance = data.availableBalance;
  if (balance != null && (typeof balance !== "number" || !Number.isFinite(balance)))
    return malformed();
  const account: SavingsSummary = {
    id: data.id,
    accountNo: data.accountNo.trim(),
    productName: text(data.productName) ? data.productName.trim() : undefined,
    status: { id: status.id, code: status.code, value: status.value },
    depositType,
    currency: { code: currency.code, decimalPlaces: currency.decimalPlaces },
  };
  // Fineract sends a zero balance as null; an account that was never active has none at all.
  if (everActive.has(status.id)) account.availableBalance = balance ?? 0;
  return account;
}
export function parseSavingsAccounts(data: unknown, clientId?: number): SavingsSummary[] {
  if (!record(data)) return malformed();
  if (clientId != null && data.clientId != null && data.clientId !== clientId) return malformed();
  if (data.savingsAccounts == null) return [];
  if (!Array.isArray(data.savingsAccounts)) return malformed();
  const accounts = data.savingsAccounts.map((account) => {
    if (
      clientId != null &&
      record(account) &&
      account.clientId != null &&
      account.clientId !== clientId
    )
      return malformed();
    return parseSavingsAccount(account);
  });
  if (new Set(accounts.map((account) => account.id)).size !== accounts.length) malformed();
  // A stable sort keeps the server's account-number order inside each group.
  return accounts.sort((a, b) => (statusRank[a.status.id] ?? 4) - (statusRank[b.status.id] ?? 4));
}

/** One read-only GET. Every failure becomes an AccountsError, never the server's own text. */
export async function readAccounts(
  session: CustomerSession,
  resource: string,
  signal?: AbortSignal,
  query?: Record<string, string | number>,
) {
  try {
    const response = await session.request(resource, { method: "GET", signal, query });
    if (response.status === 401) throw new AccountsError("expired");
    if (response.status === 403 || response.status === 404) throw new AccountsError("denied");
    if (!response.ok) throw new AccountsError("unavailable");
    return response.data;
  } catch (error) {
    if (error instanceof AccountsError) throw error;
    if (error instanceof AuthenticationError && error.code === "expired")
      throw new AccountsError("expired");
    throw new AccountsError(
      error instanceof AuthenticationError && error.code === "offline" ? "offline" : "unavailable",
    );
  }
}

/** Read only. Lists the accounts of the clients linked to this login, never any other client. */
export function createAccountsClient(session: CustomerSession) {
  return {
    /** One request per linked client. Any failure fails the whole list: a partial one looks complete. */
    async listSavings(signal?: AbortSignal): Promise<ClientSavings[]> {
      // A client listed twice by the login is still read, and shown, once.
      const clients = [...new Set(session.identity.clients)];
      if (!clients.every(positiveId)) throw new AccountsError("denied");
      return Promise.all(
        clients.map(async (clientId) => ({
          clientId,
          accounts: parseSavingsAccounts(
            await readAccounts(session, `clients/${clientId}/accounts`, signal, {
              fields: "savingsAccounts",
            }),
            clientId,
          ),
        })),
      );
    },
  };
}
export type AccountsClient = ReturnType<typeof createAccountsClient>;
