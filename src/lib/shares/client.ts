import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { positiveId, record } from "../savings/client";
import { dateFrom } from "../loans/client";

export type Failure = "expired" | "denied" | "missing" | "malformed" | "unavailable" | "cancelled";
export class ShareError extends Error {
  constructor(readonly code: Failure) {
    super(code);
    this.name = "ShareError";
  }
}
const bad = (): never => {
  throw new ShareError("malformed");
};
const text = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  return typeof v === "string" && v.trim() && v.length <= 500 ? v.trim() : bad();
};
function count(v: unknown): number | undefined {
  if (v == null) return undefined;
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : bad();
}
/** JSON has already been decoded by CustomerSession. Refuse unsafe precision rather than
 * presenting rounded binary numbers as authoritative money. No monetary arithmetic uses Number. */
export function decimal(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
  let s = String(v);
  if (s.includes("e")) {
    const [coefficient, exponent] = s.split("e");
    const [whole, fraction = ""] = coefficient.split(".");
    const digits = whole + fraction;
    // Only the decimal point position uses Number; monetary digits stay strings.
    const point = whole.length + Number(exponent);
    s =
      point <= 0
        ? `0.${"0".repeat(-point)}${digits}`
        : point >= digits.length
          ? digits + "0".repeat(point - digits.length)
          : `${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  return /^\d+(\.\d+)?$/.test(s) && s.replace(/[^0-9]/g, "").replace(/^0+/, "").length <= 15
    ? s
    : undefined;
}
export function valueAtPrice(
  quantity: number | undefined,
  price: string | undefined,
): string | undefined {
  if (quantity == null || price == null) return undefined;
  const [whole, fraction = ""] = price.split(".");
  const digits = (BigInt(whole + fraction) * BigInt(quantity))
    .toString()
    .padStart(fraction.length + 1, "0");
  return fraction
    ? `${digits.slice(0, -fraction.length)}.${digits.slice(-fraction.length)}`
    : digits;
}
/** Exact decimal display. Keep any backend precision beyond the currency's minimum. */
export function formatMoney(
  value: string | undefined,
  currency: ShareAccount["currency"],
  locale: string,
): string | undefined {
  if (value == null || !currency) return undefined;
  const [whole, fraction = ""] = value.split(".");
  const separator =
    new Intl.NumberFormat(locale).formatToParts(1.1).find((p) => p.type === "decimal")?.value ??
    ".";
  const decimals = fraction.padEnd(currency.decimalPlaces, "0");
  return `${new Intl.NumberFormat(locale).format(BigInt(whole))}${decimals ? separator + decimals : ""} ${currency.code}`;
}
export interface ShareAccount {
  detailUnavailable?: boolean;
  id: number;
  accountNo?: string;
  productName?: string;
  productId?: number;
  status: "active" | "pending" | "approved" | "closed" | "rejected" | "unknown";
  held?: number;
  approved?: number;
  pending?: number;
  currency?: { code: string; decimalPlaces: number };
  unitPrice?: string;
  value?: string;
  dividends?: {
    id: number;
    amount?: string;
    date?: string;
    status: "posted" | "initiated" | "unknown";
  }[];
}
export function parseShare(data: unknown, clientId: number, accountId?: number): ShareAccount {
  if (
    !record(data) ||
    !positiveId(data.id) ||
    (accountId != null && data.id !== accountId) ||
    ((accountId != null || "clientId" in data) && data.clientId !== clientId)
  )
    return bad();
  const statuses: Record<number, ShareAccount["status"]> = {
    100: "pending",
    200: "approved",
    300: "active",
    500: "rejected",
    600: "closed",
  };
  const status =
    record(data.status) && typeof data.status.id === "number"
      ? (statuses[data.status.id] ?? "unknown")
      : "unknown";
  const summary = accountId != null ? data.summary : data;
  if (summary != null && !record(summary)) return bad();
  const approved = record(summary) ? count(summary.totalApprovedShares) : undefined;
  const pending = record(summary) ? count(summary.totalPendingForApprovalShares) : undefined;
  let currency: ShareAccount["currency"];
  if (data.currency != null) {
    const c = data.currency;
    if (
      !record(c) ||
      typeof c.code !== "string" ||
      !/^[A-Z]{3}$/.test(c.code) ||
      typeof c.decimalPlaces !== "number" ||
      !Number.isInteger(c.decimalPlaces) ||
      c.decimalPlaces < 0 ||
      c.decimalPlaces > 20
    )
      return bad();
    currency = { code: c.code, decimalPlaces: c.decimalPlaces };
  }
  // Approval precedes activation; approval alone does not prove issued holdings.
  const held =
    status === "active" || status === "closed"
      ? approved
      : status === "pending" || status === "rejected" || status === "approved"
        ? 0
        : undefined;
  const unitPrice = decimal(data.currentMarketPrice);
  let dividends: ShareAccount["dividends"];
  if (data.dividends != null) {
    if (!Array.isArray(data.dividends)) return bad();
    const ids = new Set<number>();
    dividends = data.dividends.map((d) => {
      if (!record(d) || !positiveId(d.id) || ids.has(d.id)) return bad();
      ids.add(d.id);
      let date: string | undefined;
      try {
        date = dateFrom(d.postedDate) || undefined;
      } catch {
        return bad();
      }
      return {
        id: d.id,
        amount: decimal(d.amount),
        date,
        status:
          record(d.status) && d.status.id === 300 && positiveId(d.savingsTransactionId)
            ? "posted"
            : record(d.status) && d.status.id === 100
              ? "initiated"
              : "unknown",
      };
    });
  }
  if (data.productId != null && !positiveId(data.productId)) return bad();
  return {
    id: data.id,
    accountNo: text(data.accountNo),
    productName: text(data.productName),
    productId: data.productId as number | undefined,
    status,
    approved,
    held,
    pending,
    currency,
    unitPrice,
    value: currency ? valueAtPrice(held, unitPrice) : undefined,
    dividends,
  };
}
export function createShareClient(session: CustomerSession) {
  const clients = [...session.identity.clients];
  const authorize = (clientId: number) => {
    if (!positiveId(clientId) || !clients.includes(clientId)) throw new ShareError("denied");
  };
  async function read(path: string, signal?: AbortSignal) {
    try {
      if (signal?.aborted) throw new ShareError("cancelled");
      const r = await session.request(path, { method: "GET", signal });
      if (signal?.aborted) throw new ShareError("cancelled");
      if (!r.ok)
        throw new ShareError(
          r.status === 401
            ? "expired"
            : r.status === 403
              ? "denied"
              : r.status === 404
                ? "missing"
                : "unavailable",
        );
      return r.data;
    } catch (e) {
      if (e instanceof ShareError) throw e;
      if (e instanceof AuthenticationError && e.code === "expired") throw new ShareError("expired");
      throw new ShareError(
        signal?.aborted || (e instanceof AuthenticationError && e.code === "cancelled")
          ? "cancelled"
          : "unavailable",
      );
    }
  }
  return {
    async list(clientId: number, signal?: AbortSignal): Promise<ShareAccount[]> {
      authorize(clientId);
      const data = await read(`clients/${clientId}/accounts`, signal);
      if (!record(data)) return bad();
      // Gson omits null collections. Empty core discovery may omit shareAccounts.
      if (data.shareAccounts == null) return [];
      if (!Array.isArray(data.shareAccounts)) return bad();
      const list = data.shareAccounts.map((a) => parseShare(a, clientId));
      if (new Set(list.map((a) => a.id)).size !== list.length) return bad();
      // Bounded enrichment: discovery has no price or dividend data. Preserve summaries
      // on per-account failures; authentication failures invalidate the whole result.
      const result: ShareAccount[] = [];
      for (let start = 0; start < list.length; start += 4) {
        result.push(
          ...(await Promise.all(
            list.slice(start, start + 4).map(async (a) => {
              try {
                return parseShare(await read(`shareaccounts/${a.id}`, signal), clientId, a.id);
              } catch (e) {
                if (e instanceof ShareError && ["expired", "denied", "cancelled"].includes(e.code))
                  throw e;
                return { ...a, detailUnavailable: true };
              }
            }),
          )),
        );
      }
      return result;
    },
    async detail(clientId: number, accountId: number, signal?: AbortSignal): Promise<ShareAccount> {
      authorize(clientId);
      if (!positiveId(accountId)) throw new ShareError("denied");
      // Backend checks user/account ownership. Response must also match the selected client.
      return parseShare(await read(`shareaccounts/${accountId}`, signal), clientId, accountId);
    },
  };
}
export type ShareClient = ReturnType<typeof createShareClient>;
