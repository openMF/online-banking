import type { CustomerSession } from "../authentication/client";
import { positiveId, record, validDate } from "../savings/client";
import { AccountsError, parseSavingsAccount, readAccounts, type SavingsSummary } from "./client";

/** Which way a movement moves the money: into the account, out of it, or neither. */
export type Direction = "in" | "out" | "none";
export interface Movement {
  id: number;
  /** `yyyy-MM-dd` */
  date: string;
  type: { id: number; value: string };
  direction: Direction;
  /** Always positive: `direction` gives the sign. */
  amount: number;
  /** The balance after this movement. */
  runningBalance?: number;
}
export interface MovementDetail extends Movement {
  paymentType?: string;
  receiptNumber?: string;
  note?: string;
  reversed: boolean;
}
export interface SavingsDetails extends Omit<SavingsSummary, "depositType" | "availableBalance"> {
  clientId: number;
  /** Absent for an account that was never active, like the list's balance. */
  balances?: { available: number; ledger: number; onHold: number };
  /** Earned and posted interest are absent when the balances are. */
  interest: { rate: number; earned?: number; posted?: number };
  dates: { submitted?: string; approved?: string; activated?: string; closed?: string };
  /** Newest first, without reversed movements. */
  movements: Movement[];
}

const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const malformed = (): never => {
  throw new AccountsError("malformed");
};
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
// Fineract sends a zero amount as null.
const amount = (value: unknown): number =>
  value == null ? 0 : finite(value) ? value : malformed();
/** A Fineract `[y, m, d]` date as `yyyy-MM-dd`, or undefined when there is none. */
function day(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isInteger))
    return malformed();
  const [year, month, date] = value as number[];
  const result = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  return validDate(result) ? result : malformed();
}
// SavingsAccountTransactionType: the code Fineract pairs with each id, and its TransactionEntryType.
const movementTypes: Record<number, [code: string, direction: Direction]> = {
  1: ["deposit", "in"],
  2: ["withdrawal", "out"],
  3: ["interestPosting", "in"],
  4: ["withdrawalFee", "out"],
  5: ["annualFee", "out"],
  6: ["waiveCharge", "none"],
  7: ["payCharge", "out"],
  8: ["dividendPayout", "in"],
  10: ["accrual", "none"],
  12: ["initiateTransfer", "none"],
  13: ["approveTransfer", "none"],
  14: ["withdrawTransfer", "none"],
  15: ["rejectTransfer", "none"],
  16: ["writtenoff", "none"],
  17: ["overdraftInterest", "out"],
  18: ["withholdTax", "out"],
  19: ["escheat", "out"],
  20: ["onHold", "out"],
  21: ["release", "in"],
};

/** One movement of `accountId`, as both reads send it. Refuses anything it cannot verify. */
function parseMovement(data: unknown, accountId: number): Movement & { reversed: boolean } {
  if (!record(data) || !positiveId(data.id)) return malformed();
  if (data.accountId != null && data.accountId !== accountId) return malformed();
  const type = data.transactionType;
  if (!record(type) || !positiveId(type.id) || !text(type.code) || !text(type.value))
    return malformed();
  const known = movementTypes[type.id];
  if (known && type.code !== `savingsAccountTransactionType.${known[0]}`) return malformed();
  const date = day(data.date);
  if (!date || !finite(data.amount) || data.amount < 0) return malformed();
  if (data.runningBalance != null && !finite(data.runningBalance)) return malformed();
  if (data.reversed != null && typeof data.reversed !== "boolean") return malformed();
  return {
    id: data.id,
    date,
    type: { id: type.id, value: type.value },
    // A type this screen does not know is shown with the server's label and no sign.
    direction: known?.[1] ?? "none",
    amount: data.amount,
    runningBalance: finite(data.runningBalance) ? data.runningBalance : undefined,
    reversed: data.reversed === true,
  };
}

/** Adapter for core SavingsAccountData, as read by `GET /self/savingsaccounts/{id}`. */
export function parseSavingsDetails(
  data: unknown,
  accountId: number,
  clients: readonly number[],
): SavingsDetails {
  if (!record(data) || data.id !== accountId) return malformed();
  // The plugin checks who owns the account; this keeps another client's account off the screen.
  if (!positiveId(data.clientId) || !clients.includes(data.clientId)) return malformed();
  const summary = data.summary ?? {};
  const timeline = data.timeline ?? {};
  if (!record(summary) || !record(timeline)) return malformed();
  const { depositType, availableBalance, ...account } = parseSavingsAccount({
    ...data,
    productName: data.savingsProductName,
    availableBalance: summary.availableBalance,
  });
  if (depositType !== "savings") return malformed();
  const rate = amount(data.nominalAnnualInterestRate);
  const onHold = amount(data.onHoldFunds) + amount(data.savingsAmountOnHold);
  if (rate < 0 || onHold < 0) return malformed();
  if (data.transactions != null && !Array.isArray(data.transactions)) return malformed();
  const rows = ((data.transactions ?? []) as unknown[]).map((row) => parseMovement(row, accountId));
  if (new Set(rows.map((row) => row.id)).size !== rows.length) return malformed();
  const details: SavingsDetails = {
    ...account,
    clientId: data.clientId,
    interest: { rate },
    dates: {
      submitted: day(timeline.submittedOnDate),
      approved: day(timeline.approvedOnDate),
      activated: day(timeline.activatedOnDate),
      closed: day(timeline.closedOnDate),
    },
    movements: rows
      .filter((row) => !row.reversed)
      .map(({ reversed: _, ...movement }) => movement)
      // Fineract already sends the newest first; a stable sort keeps its order within a day.
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
  };
  if (availableBalance !== undefined) {
    details.balances = {
      available: availableBalance,
      ledger: amount(summary.accountBalance),
      onHold,
    };
    details.interest.earned = amount(summary.totalInterestEarned);
    details.interest.posted = amount(summary.totalInterestPosted);
  }
  return details;
}

/** Adapter for core SavingsAccountTransactionData, as read by `GET /self/savingsaccounts/{id}/transactions/{id}`. */
export function parseMovementDetail(
  data: unknown,
  accountId: number,
  movementId: number,
): MovementDetail {
  if (!record(data) || data.id !== movementId || data.accountId !== accountId) return malformed();
  const detail: MovementDetail = parseMovement(data, accountId);
  const payment = data.paymentDetailData ?? {};
  if (!record(payment)) return malformed();
  const type = payment.paymentType ?? {};
  if (!record(type)) return malformed();
  if (text(type.name)) detail.paymentType = type.name.trim();
  if (text(payment.receiptNumber)) detail.receiptNumber = payment.receiptNumber.trim();
  if (text(data.note)) detail.note = data.note.trim();
  return detail;
}

/** Read only. One savings account of a client linked to this login, and its movements. */
export function createSavingsDetailsClient(session: CustomerSession) {
  return {
    /**
     * The account and its newest `limit` movements (the plugin's `lastTransactions`). It has no
     * offset: to list more, ask again with a larger limit.
     */
    async details(accountId: number, limit: number, signal?: AbortSignal): Promise<SavingsDetails> {
      if (!positiveId(accountId) || !positiveId(limit)) throw new AccountsError("denied");
      return parseSavingsDetails(
        await readAccounts(session, `savingsaccounts/${accountId}`, signal, {
          associations: "transactions",
          lastTransactions: limit,
        }),
        accountId,
        session.identity.clients,
      );
    },
    /** How the money of one movement moved: payment method, receipt and note. */
    async movement(
      accountId: number,
      movementId: number,
      signal?: AbortSignal,
    ): Promise<MovementDetail> {
      if (!positiveId(accountId) || !positiveId(movementId)) throw new AccountsError("denied");
      return parseMovementDetail(
        await readAccounts(
          session,
          `savingsaccounts/${accountId}/transactions/${movementId}`,
          signal,
        ),
        accountId,
        movementId,
      );
    },
  };
}
export type SavingsDetailsClient = ReturnType<typeof createSavingsDetailsClient>;
