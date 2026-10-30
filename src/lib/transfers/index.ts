import { SelfServiceError, selfRequest, type RequestOptions } from "../selfservice/http";
import {
  createTransfer,
  getTransferTemplate,
  type CreateTransferBody,
  type TransferKind,
} from "../selfservice/transfers";

export type { TransferKind };

/** Account type ids of the plugin: 1 loan, 2 savings. */
export const SAVINGS_ACCOUNT = 2;

/**
 * Why a transfer, or what it needs, failed. The screen shows a fixed, translated message per code,
 * never the text of the server.
 */
export type TransferErrorCode =
  /** The session ended or cannot be used for this step. */
  | "session"
  /** The verification is missing, used up, expired or was for another transfer: ask again. */
  | "stepup"
  /** The source account cannot cover the amount. Nothing moved. */
  | "funds"
  /** The amount is over the limit of the beneficiary. Nothing moved. */
  | "limit"
  /** The daily limit of the account is used up. Nothing moved. */
  | "daily"
  /** The server does not accept one of the two accounts: the list changed. Nothing moved. */
  | "accounts"
  /** Source and destination are the same account. Nothing moved. */
  | "same"
  /** The day of the device is not the day of the institution (a date in the future). Nothing moved. */
  | "date"
  /** The server refused the data (amount, description, date). Nothing moved. */
  | "invalid"
  /** The server refused the transfer for a reason this app does not know. Nothing moved. */
  | "refused"
  /** The server is busy (rate limit). Nothing moved. */
  | "busy"
  /**
   * The transfer was sent but the answer did not arrive, or the server failed while handling it:
   * the money may have moved. Never send it again before the user has checked.
   */
  | "uncertain"
  /** The answer of the server is not what a transfer answer looks like. */
  | "malformed"
  | "network"
  | "offline"
  | "timeout"
  | "unavailable"
  | "unknown";

export class TransferError extends Error {
  readonly code: TransferErrorCode;

  constructor(code: TransferErrorCode) {
    // Never an account number, an amount, the token or the server's text.
    super(`transfer: ${code}`);
    this.name = "TransferError";
    this.code = code;
  }
}

function codesOf(error: SelfServiceError): string {
  const nested = Array.isArray(error.details.errorCodes) ? error.details.errorCodes : [];
  return [error.code, ...nested].join(" ").toLowerCase();
}

/**
 * Maps anything thrown by the API layer to a {@link TransferError}.
 *
 * `write` is true for the POST of a transfer. There, a failure that leaves the answer unknown
 * (no answer, a timeout, a server error) is `uncertain`, never "unavailable": the transfer may
 * have run, so the screen must not offer to send it again.
 */
export function toTransferError(error: unknown, write = false): TransferError {
  if (error instanceof TransferError) return error;
  if (!(error instanceof SelfServiceError)) return new TransferError("unknown");

  const { status } = error;
  if (status === 401) return new TransferError("session");

  if (write && (status === 0 || status === 408 || status >= 500)) {
    return new TransferError("uncertain");
  }
  if (status === 0) {
    const problem = error.problem;
    return new TransferError(problem === "offline" || problem === "timeout" ? problem : "network");
  }
  if (status === 429) return new TransferError(write ? "busy" : "unavailable");
  if (status >= 500 || status === 408) return new TransferError("unavailable");

  const stepUp = error.stepUpCode;
  if (stepUp === "session.required") return new TransferError("session");
  if (stepUp !== null) return new TransferError("stepup");

  const codes = codesOf(error);
  if (/insufficient/.test(codes)) return new TransferError("funds");
  if (/beneficiary\.transfer\.amount\.limit/.test(codes)) return new TransferError("limit");
  if (/daily\.tpt\.transfer\.limit/.test(codes)) return new TransferError("daily");
  if (/invalid\.(from|to)\.account/.test(codes)) return new TransferError("accounts");
  if (/same\.from\.to/.test(codes)) return new TransferError("same");
  if (/in\.the\.future/.test(codes)) return new TransferError("date");
  if (status === 400 || status === 422) return new TransferError("invalid");
  return new TransferError("refused");
}

// -------------------------------------------------------------------------------------------------
// what the server tells us, read with care
// -------------------------------------------------------------------------------------------------

export interface TransferAccount {
  accountId: number;
  accountNo: string;
  /** 1 loan, 2 savings. */
  accountType: number;
  clientId: number;
  officeId: number;
  /** Name of the owner (for a beneficiary: the person who receives). */
  clientName?: string;
  officeName?: string;
}

export interface TransferTemplate {
  from: TransferAccount[];
  to: TransferAccount[];
}

/** What a savings account says about itself: only what the transfer screen shows. */
export interface AccountSummary {
  currency?: { code: string; decimalPlaces: number };
  /** The balance the account can spend. It is advice: the server decides. */
  available?: number;
}

export interface TransferInput {
  from: TransferAccount;
  to: TransferAccount;
  /** A normalised decimal, see {@link parseAmount}. */
  amount: string;
  description: string;
}

export interface TransferReceipt {
  /** The id the server gave the transfer. The http api never reports success without one. */
  reference?: number;
  from: TransferAccount;
  to: TransferAccount;
  amount: string;
  description: string;
  /** `yyyy-MM-dd`, the date sent to the server. */
  date: string;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const positiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function parseAccount(value: unknown): TransferAccount {
  if (!record(value)) throw new TransferError("malformed");
  const type = record(value.accountType) ? value.accountType.id : undefined;
  if (
    !positiveId(value.accountId) ||
    !text(value.accountNo) ||
    !positiveId(type) ||
    !positiveId(value.clientId) ||
    !positiveId(value.officeId)
  )
    throw new TransferError("malformed");
  return {
    accountId: value.accountId,
    accountNo: value.accountNo.trim(),
    accountType: type,
    clientId: value.clientId,
    officeId: value.officeId,
    clientName: text(value.clientName) ? value.clientName.trim() : undefined,
    officeName: text(value.officeName) ? value.officeName.trim() : undefined,
  };
}

function parseAccounts(value: unknown): TransferAccount[] {
  if (!Array.isArray(value)) throw new TransferError("malformed");
  const accounts = value.map(parseAccount);
  const keys = accounts.map((account) => `${account.accountType}:${account.accountId}`);
  if (new Set(keys).size !== keys.length) throw new TransferError("malformed");
  return accounts;
}

/** Reads `GET /accounttransfers/template`. Anything unexpected is `malformed`, never guessed. */
export function parseTemplate(data: unknown): TransferTemplate {
  if (!record(data)) throw new TransferError("malformed");
  return { from: parseAccounts(data.fromAccountOptions), to: parseAccounts(data.toAccountOptions) };
}

/** Reads a savings account (`GET /savingsaccounts/{id}`). It only adds advice, so it is lenient. */
export function parseSummary(data: unknown): AccountSummary {
  if (!record(data)) return {};
  const summary: AccountSummary = {};
  const currency = data.currency;
  if (
    record(currency) &&
    typeof currency.code === "string" &&
    /^[A-Z]{3}$/.test(currency.code) &&
    typeof currency.decimalPlaces === "number" &&
    Number.isInteger(currency.decimalPlaces) &&
    currency.decimalPlaces >= 0 &&
    currency.decimalPlaces <= 6
  ) {
    summary.currency = { code: currency.code, decimalPlaces: currency.decimalPlaces };
  }
  const balance = record(data.summary) ? data.summary.availableBalance : undefined;
  if (typeof balance === "number" && Number.isFinite(balance)) summary.available = balance;
  return summary;
}

// -------------------------------------------------------------------------------------------------
// amounts
// -------------------------------------------------------------------------------------------------

export type AmountProblem = "empty" | "format" | "zero" | "decimals";

export type ParsedAmount = { ok: true; value: string } | { ok: false; problem: AmountProblem };

/** Up to 12 whole digits: 999,999,999,999 is far beyond anything a self-service user moves. */
const WHOLE = String.raw`(?:\d{1,12}|\d{1,3}(?:,\d{3}){1,3})`;

/**
 * Reads the amount a person typed, as an exact decimal text with `decimals` places (`"1,250.5"`
 * gives `"1250.50"`). There is no float anywhere: what is sent is what was read.
 *
 * A comma is accepted only as a thousands separator (`1,250.50`). `1,5` is refused instead of
 * being read as 15 (or as 1.5): when the meaning is unclear, the person is asked.
 */
export function parseAmount(input: string, decimals = 2): ParsedAmount {
  const raw = input.trim();
  if (!raw) return { ok: false, problem: "empty" };
  const match = new RegExp(`^(${WHOLE})(?:\\.(\\d+))?$`).exec(raw);
  if (!match) return { ok: false, problem: "format" };
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return { ok: false, problem: "decimals" };
  const whole = match[1].replace(/,/g, "").replace(/^0+(?=\d)/, "");
  // Two places at least (`10.50`), more only when typed and the currency has them.
  const padded = fraction.padEnd(Math.min(decimals, 2), "0");
  if (/^0*$/.test(whole + padded)) return { ok: false, problem: "zero" };
  return { ok: true, value: padded ? `${whole}.${padded}` : whole };
}

/** `"1250.5"` as `"1,250.50"`: for showing an amount, never for sending one. */
export function formatAmount(value: string, decimals = 2): string {
  const [whole, fraction = ""] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const shown = fraction.padEnd(Math.min(decimals, 2), "0").slice(0, Math.max(decimals, 0));
  return shown ? `${grouped}.${shown}` : grouped;
}

/** Today in the time of the person, as `yyyy-MM-dd`. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${String(now.getFullYear()).padStart(4, "0")}-${month}-${day}`;
}

/**
 * The fields of the transfer a one-time token is bound to. The server hashes exactly these five
 * (`OWN_TRANSFER` and `TPT_TRANSFER`), so they are built here, once, for both the verification
 * and the transfer: a token for one transfer cannot be used for another.
 */
export function stepUpPayload(input: Pick<TransferInput, "from" | "to" | "amount">) {
  return {
    fromAccountId: input.from.accountId,
    fromAccountType: input.from.accountType,
    toAccountId: input.to.accountId,
    toAccountType: input.to.accountType,
    transferAmount: input.amount,
  };
}

/** A key that changes with anything the token is bound to. */
export function transferKey(input: Pick<TransferInput, "from" | "to" | "amount">): string {
  return Object.values(stepUpPayload(input)).join("|");
}

// -------------------------------------------------------------------------------------------------
// the api of the screen
// -------------------------------------------------------------------------------------------------

/** What the screen needs to make a transfer. One implementation: the real self-service API. */
export interface TransfersApi {
  getTemplate(kind: TransferKind, signal?: AbortSignal): Promise<TransferTemplate>;
  /** Best effort: advice for the screen. Resolves to `{}` when the account cannot be read. */
  getSummary(account: TransferAccount, signal?: AbortSignal): Promise<AccountSummary>;
  /**
   * One send. `stepUpToken` is the grant of a verification for the action of the transfer, when the
   * server asked for one. Never repeated by this api.
   */
  create(kind: TransferKind, input: TransferInput, stepUpToken?: string): Promise<TransferReceipt>;
}

type Seams = Pick<RequestOptions, "fetchImpl" | "config" | "session" | "customer"> & {
  /** Test seam: the clock. */
  now?: () => Date;
};

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * The reference of the transfer an answer confirms. The request already went out, so an answer that
 * does not confirm it (not an object, no transfer id, another account, rolled back) is not an
 * error to retry but a result we cannot know: the money may have moved. It is `uncertain`, never a
 * success and never sent again.
 */
function readReference(answer: unknown, fromAccountId: number): number {
  if (!record(answer) || !positiveId(answer.resourceId)) throw new TransferError("uncertain");
  if (answer.savingsId !== undefined && answer.savingsId !== fromAccountId) {
    throw new TransferError("uncertain");
  }
  if (answer.rollbackTransaction === true) throw new TransferError("uncertain");
  return answer.resourceId;
}

export function createHttpTransfersApi(seams: Seams = {}): TransfersApi {
  const { now, ...transport } = seams;
  return {
    async getTemplate(kind, signal) {
      try {
        return parseTemplate(await getTransferTemplate(kind, { ...transport, signal }));
      } catch (error) {
        throw toTransferError(error);
      }
    },

    async getSummary(account, signal) {
      if (account.accountType !== SAVINGS_ACCOUNT) return {};
      try {
        const data = await selfRequest<unknown>(`/savingsaccounts/${account.accountId}`, {
          ...transport,
          signal,
        });
        return parseSummary(data);
      } catch (error) {
        // The advice is optional. A session that ended is still the caller's business.
        if (toTransferError(error).code === "session") throw new TransferError("session");
        return {};
      }
    },

    async create(kind, input, stepUpToken) {
      if (isOffline()) throw new TransferError("offline"); // nothing was sent
      const date = todayIso(now?.());
      const body: CreateTransferBody = {
        fromOfficeId: input.from.officeId,
        fromClientId: input.from.clientId,
        fromAccountId: input.from.accountId,
        fromAccountType: input.from.accountType,
        toOfficeId: input.to.officeId,
        toClientId: input.to.clientId,
        toAccountId: input.to.accountId,
        toAccountType: input.to.accountType,
        transferDate: date,
        transferAmount: input.amount,
        transferDescription: input.description,
        dateFormat: "yyyy-MM-dd",
        locale: "en",
      };
      let answer: unknown;
      try {
        answer = await createTransfer(kind, body, { ...transport, stepUpToken });
      } catch (error) {
        throw toTransferError(error, true);
      }
      const reference = readReference(answer, input.from.accountId);
      return {
        reference,
        from: input.from,
        to: input.to,
        amount: input.amount,
        description: input.description,
        date,
      };
    },
  };
}
