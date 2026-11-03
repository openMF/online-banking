import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { AccountsError, createAccountsClient, type SavingsSummary } from "../accounts/client";
import { positiveId, record, validDate } from "../savings/client";
import { dateFrom, parseOptions } from "../loans/client";
import { createShareClient, decimal, parseShare, ShareError, type ShareAccount } from "./client";

export type ApplicationFailure =
  | "expired"
  | "denied"
  | "unavailable"
  | "malformed"
  | "invalid"
  | "changed"
  | "rejected"
  | "uncertain"
  | "blocked"
  | "unsupported";
export class ShareApplicationError extends Error {
  constructor(readonly code: ApplicationFailure) {
    super(code);
    this.name = "ShareApplicationError";
  }
}
const fail = (code: ApplicationFailure = "malformed"): never => {
  throw new ShareApplicationError(code);
};
const label = (v: unknown): string =>
  typeof v === "string" && v.trim() && v.length <= 500 ? v.trim() : fail();
const integer = (v: unknown): number | undefined =>
  v == null ? undefined : typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : fail();
export interface ShareProduct {
  id: number;
  name: string;
}
export interface ShareTerms extends ShareProduct {
  clientId: number;
  currency: NonNullable<ShareAccount["currency"]>;
  unitPrice: string;
  minimum?: number;
  nominal?: number;
  maximum?: number;
  lockin?: { count: number; unit: number };
  minimumActive?: { count: number; unit: number };
  dividendsForInactive?: boolean;
  charges: { id: number; name: string; amount: string; calculation: number; timing: number }[];
  marketPrices: { date: string; price: string }[];
  fingerprint: string;
}
export interface ShareValues {
  savingsAccountId: string;
  requestedShares: string;
  date: string;
}
export interface ShareApplicationResult {
  resourceId: number;
  account?: ShareAccount;
  requested?: number;
}
export interface ShareAttempt {
  phase: "pending" | "uncertain" | "confirmed";
  result?: ShareApplicationResult;
}

export function parseProducts(data: unknown, clientId: number): ShareProduct[] {
  if (!record(data) || data.clientId !== clientId) return fail();
  try {
    // The self-service endpoint returns lookup products, not an eligibility guarantee.
    return parseOptions(data.productOptions);
  } catch {
    return fail();
  }
}
function period(count: unknown, type: unknown): ShareTerms["lockin"] {
  const n = integer(count);
  if (n == null) return undefined;
  if (!record(type) || ![0, 1, 2, 3].includes(type.id as number)) return fail("unsupported");
  return { count: n, unit: type.id as number };
}
export function parseTerms(data: unknown, clientId: number, productId: number): ShareTerms {
  const products = parseProducts(data, clientId);
  if (products.length !== 1 || products[0].id !== productId || !record(data)) return fail();
  const p = (data.productOptions as Record<string, unknown>[])[0];
  const currency = p.currency;
  if (
    !record(currency) ||
    typeof currency.code !== "string" ||
    !/^[A-Z]{3}$/.test(currency.code) ||
    typeof currency.decimalPlaces !== "number" ||
    !Number.isInteger(currency.decimalPlaces) ||
    currency.decimalPlaces < 0 ||
    currency.decimalPlaces > 20
  )
    return fail();
  const unitPrice = decimal(p.unitPrice);
  if (unitPrice == null) return fail();
  const minimum = integer(p.minimumShares),
    nominal = integer(p.nominalShares),
    maximum = integer(p.maximumShares);
  if (
    (minimum != null && maximum != null && minimum > maximum) ||
    (nominal != null &&
      ((minimum != null && nominal < minimum) || (maximum != null && nominal > maximum)))
  )
    return fail();
  if (p.charges != null && !Array.isArray(p.charges)) return fail();
  const charges = ((p.charges ?? []) as unknown[]).map((c) => {
    if (
      !record(c) ||
      !positiveId(c.id) ||
      c.active !== true ||
      !record(c.currency) ||
      c.currency.code !== currency.code ||
      !record(c.chargeTimeType) ||
      ![13, 14, 15].includes(c.chargeTimeType.id as number) ||
      !record(c.chargeCalculationType) ||
      ![1, 2].includes(c.chargeCalculationType.id as number)
    )
      return fail("unsupported");
    const amount = decimal(c.amount);
    if (amount == null || !/[1-9]/.test(amount)) return fail();
    return {
      id: c.id,
      name: label(c.name),
      amount,
      calculation: c.chargeCalculationType.id as number,
      timing: c.chargeTimeType.id as number,
    };
  });
  if (new Set(charges.map((c) => c.id)).size !== charges.length) return fail();
  if (p.marketPrice != null && !Array.isArray(p.marketPrice)) return fail();
  const marketPrices = ((p.marketPrice ?? []) as unknown[]).map((m) => {
    if (!record(m)) return fail();
    let date: string;
    try {
      date = dateFrom(m.fromDate);
    } catch {
      return fail();
    }
    const price = decimal(m.shareValue);
    if (!date || price == null) return fail();
    return { date, price };
  });
  const lockin = period(p.lockinPeriod, p.lockPeriodTypeEnum);
  const minimumActive = period(p.minimumActivePeriod, p.minimumActivePeriodForDividendsTypeEnum);
  // Core currently accepts only DAYS for a supplied minimum-active period.
  if (minimumActive && minimumActive.unit !== 0) return fail("unsupported");
  if (
    p.allowDividendCalculationForInactiveClients != null &&
    typeof p.allowDividendCalculationForInactiveClients !== "boolean"
  )
    return fail();
  const dividendsForInactive = p.allowDividendCalculationForInactiveClients as boolean | undefined;
  const terms = {
    ...products[0],
    clientId,
    currency: { code: currency.code, decimalPlaces: currency.decimalPlaces },
    unitPrice,
    minimum,
    nominal,
    maximum,
    lockin,
    minimumActive,
    dividendsForInactive,
    charges,
    marketPrices,
  };
  return { ...terms, fingerprint: JSON.stringify(terms) };
}
export function eligibleSavings(accounts: SavingsSummary[], terms: ShareTerms): SavingsSummary[] {
  return accounts.filter(
    (a) =>
      a.status.id === 300 && a.depositType === "savings" && a.currency.code === terms.currency.code,
  );
}
export function requestedCount(value: string, terms: ShareTerms): number {
  if (!/^[1-9]\d*$/.test(value)) return fail("invalid");
  const n = Number(value);
  if (
    !Number.isSafeInteger(n) ||
    n < (terms.minimum ?? 1) ||
    n > (terms.maximum ?? Number.MAX_SAFE_INTEGER)
  )
    return fail("invalid");
  return n;
}
/** The application date controls the backend market-price schedule. This is an estimate only. */
export function priceOn(terms: ShareTerms, date: string): string {
  let price = terms.unitPrice;
  let latestDate = "";
  for (const m of terms.marketPrices) {
    if (m.date <= date && m.date >= latestDate) {
      latestDate = m.date;
      price = m.price;
    }
  }
  return price;
}
export function applicationPayload(
  terms: ShareTerms,
  accounts: SavingsSummary[],
  values: ShareValues,
) {
  const requestedShares = requestedCount(values.requestedShares, terms);
  if (!validDate(values.date) || !/^[1-9]\d*$/.test(values.savingsAccountId))
    return fail("invalid");
  const savingsAccountId = Number(values.savingsAccountId);
  if (
    !positiveId(savingsAccountId) ||
    !eligibleSavings(accounts, terms).some((a) => a.id === savingsAccountId)
  )
    return fail("invalid");
  return {
    clientId: terms.clientId,
    productId: terms.id,
    savingsAccountId,
    requestedShares,
    submittedDate: values.date,
    applicationDate: values.date,
    dateFormat: "yyyy-MM-dd",
    locale: "en",
    // Core does not copy these terms/charges at creation. Preserve product defaults explicitly.
    ...(terms.lockin
      ? {
          lockinPeriodFrequency: terms.lockin.count,
          lockinPeriodFrequencyType: String(terms.lockin.unit),
        }
      : {}),
    ...(terms.minimumActive
      ? {
          minimumActivePeriod: terms.minimumActive.count,
          minimumActivePeriodFrequencyType: String(terms.minimumActive.unit),
        }
      : {}),
    ...(terms.dividendsForInactive == null
      ? {}
      : { allowDividendCalculationForInactiveClients: String(terms.dividendsForInactive) }),
    ...(terms.charges.length
      ? { charges: terms.charges.map((c) => ({ chargeId: c.id, amount: c.amount })) }
      : {}),
  };
}
function normalize(e: unknown): ShareApplicationError {
  if (e instanceof ShareApplicationError) return e;
  if (e instanceof AuthenticationError || e instanceof ShareError || e instanceof AccountsError) {
    if (e.code === "expired" || e.code === "denied" || e.code === "malformed")
      return new ShareApplicationError(e.code);
  }
  return new ShareApplicationError("unavailable");
}
/** Keep this adapter for the session lifetime: closing the screen never unlocks an uncertain POST. */
export function createShareApplicationClient(session: CustomerSession) {
  const clients = [...session.identity.clients];
  const accounts = createAccountsClient(session);
  const shares = createShareClient(session);
  const products = new Map<number, ShareProduct[]>();
  const templates = new WeakSet<ShareTerms>();
  const attempts = new Map<number, ShareAttempt>();
  const expectedProducts = new Map<number, number>();
  function authorize(clientId: number) {
    if (!positiveId(clientId) || !clients.includes(clientId)) fail("denied");
  }
  async function readTemplate(clientId: number, productId?: number, signal?: AbortSignal) {
    authorize(clientId);
    try {
      if (signal?.aborted) return fail("unavailable");
      const r = await session.request("shareaccounts/template", {
        method: "GET",
        query: { clientId, ...(productId == null ? {} : { productId }) },
        signal,
      });
      if (signal?.aborted) return fail("unavailable");
      if (!r.ok)
        return fail(r.status === 401 ? "expired" : r.status === 403 ? "denied" : "unavailable");
      return r.data;
    } catch (e) {
      throw normalize(e);
    }
  }
  async function savings(clientId: number, signal?: AbortSignal) {
    authorize(clientId);
    try {
      const groups = await accounts.listSavings(signal);
      const group = groups.find((g) => g.clientId === clientId);
      if (!group) return fail();
      return group.accounts;
    } catch (e) {
      throw normalize(e);
    }
  }
  async function readBack(clientId: number, resourceId: number): Promise<ShareApplicationResult> {
    // Reuse the existing ownership/status parser. Read the purchase quantity independently of holdings.
    const r = await session.request(`shareaccounts/${resourceId}`, { method: "GET" });
    if (!r.ok)
      return fail(r.status === 401 ? "expired" : r.status === 403 ? "denied" : "unavailable");
    const account = parseShare(r.data, clientId, resourceId);
    if (account.productId !== expectedProducts.get(clientId)) return fail();
    let requested: number | undefined;
    if (record(r.data) && Array.isArray(r.data.purchasedShares)) {
      const purchases = r.data.purchasedShares.filter(
        (p) => record(p) && record(p.type) && p.type.id === 500,
      );
      // A new account has one initial subscription; do not sum later purchases or charge payments.
      if (purchases.length === 1 && record(purchases[0]))
        requested = integer(purchases[0].numberOfShares);
    }
    return { resourceId, account, requested };
  }
  return {
    attempt(clientId: number) {
      authorize(clientId);
      return attempts.get(clientId);
    },
    async loadProducts(clientId: number, signal?: AbortSignal) {
      const list = parseProducts(await readTemplate(clientId, undefined, signal), clientId);
      products.set(clientId, list);
      return list;
    },
    async loadTerms(clientId: number, productId: number, signal?: AbortSignal) {
      authorize(clientId);
      if (!positiveId(productId) || !products.get(clientId)?.some((p) => p.id === productId))
        return fail("denied");
      const terms = parseTerms(
        await readTemplate(clientId, productId, signal),
        clientId,
        productId,
      );
      templates.add(terms);
      return terms;
    },
    savings,
    async submit(terms: ShareTerms, values: ShareValues): Promise<ShareApplicationResult> {
      authorize(terms.clientId);
      if (!templates.has(terms)) return fail("denied");
      if (attempts.has(terms.clientId)) return fail("blocked");
      // Lock synchronously, before even the preflight reads, to stop double clicks/callers.
      attempts.set(terms.clientId, { phase: "pending" });
      let sent = false;
      try {
        const fresh = parseTerms(
          await readTemplate(terms.clientId, terms.id),
          terms.clientId,
          terms.id,
        );
        if (fresh.fingerprint !== terms.fingerprint) return fail("changed");
        const payload = applicationPayload(fresh, await savings(terms.clientId), values);
        sent = true;
        attempts.set(terms.clientId, { phase: "uncertain" });
        const r = await session.request("shareaccounts", { method: "POST", body: payload });
        if (!r.ok) {
          if ([400, 401, 403, 404, 409, 422].includes(r.status)) {
            sent = false;
            return fail(r.status === 401 ? "expired" : r.status === 403 ? "denied" : "rejected");
          }
          return fail("uncertain");
        }
        if (!record(r.data) || !positiveId(r.data.resourceId)) return fail("uncertain");
        const result: ShareApplicationResult = { resourceId: r.data.resourceId };
        expectedProducts.set(terms.clientId, terms.id);
        attempts.set(terms.clientId, { phase: "confirmed", result });
        try {
          const detail = await readBack(terms.clientId, result.resourceId);
          attempts.set(terms.clientId, { phase: "confirmed", result: detail });
          return detail;
        } catch (e) {
          const error = normalize(e);
          if (error.code === "expired") throw error;
          return result;
        }
      } catch (e) {
        if (!sent) attempts.delete(terms.clientId);
        if (attempts.get(terms.clientId)?.phase === "confirmed") throw normalize(e);
        if (sent) {
          if (e instanceof AuthenticationError && e.code === "expired") return fail("expired");
          return fail("uncertain");
        }
        throw normalize(e);
      }
    },
    async refresh(clientId: number) {
      authorize(clientId);
      try {
        const attempt = attempts.get(clientId);
        if (attempt?.result) {
          const result = await readBack(clientId, attempt.result.resourceId);
          attempts.set(clientId, { phase: "confirmed", result });
          return result;
        }
        // No resource ID: list only. A similar-looking account is not proof of this POST's outcome.
        await shares.list(clientId);
        return undefined;
      } catch (e) {
        throw normalize(e);
      }
    },
  };
}
export type ShareApplicationClient = ReturnType<typeof createShareApplicationClient>;
