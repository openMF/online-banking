import { AuthenticationError, type CustomerSession } from "../authentication/client";

export type SavingsFailure =
  | "expired"
  | "denied"
  | "unavailable"
  | "malformed"
  | "invalid"
  | "changed"
  | "unsupported"
  | "uncertain"
  | "locked";
export class SavingsError extends Error {
  constructor(
    readonly code: SavingsFailure,
    readonly fields: readonly string[] = [],
  ) {
    super(code);
    this.name = "SavingsError";
  }
}
export interface Product {
  id: number;
  name: string;
}
export interface Charge {
  chargeId: number;
  amount: number;
  dueAsOfDate?: string;
  feeOnMonthDay?: string;
  feeInterval?: number;
}
export interface SavingsTemplate {
  clientId: number;
  clientName: string;
  products: Product[];
  productId?: number;
  productName?: string;
  currency?: { code: string; decimalPlaces: number };
  rate?: number;
  openingBalance?: number;
  submittedOnDate: string;
  charges: Charge[];
  chargeTerms: { name: string; amount: number; percent: boolean }[];
  /** Snapshot includes terms beyond those displayed, so changed defaults require a new review. */
  fingerprint: string;
}
export interface SavingsAccount {
  id: number;
  accountNo?: string;
  status?: { code: string; value: string };
  productName?: string;
}
export interface ApplicationResult {
  resourceId?: number;
  account?: SavingsAccount;
}
export const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export const positiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const amount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function apiDate(value: unknown): string {
  if (value == null) return "";
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isInteger))
    throw new SavingsError("malformed");
  const result = `${String(value[0]).padStart(4, "0")}-${String(value[1]).padStart(2, "0")}-${String(value[2]).padStart(2, "0")}`;
  if (!validDate(result)) throw new SavingsError("malformed");
  return result;
}
function chargesFrom(value: unknown): Charge[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new SavingsError("malformed");
  return value.map((item): Charge => {
    if (!record(item) || !positiveId(item.chargeId) || !amount(item.amountOrPercentage))
      throw new SavingsError("malformed");
    const charge: Charge = { chargeId: item.chargeId, amount: item.amountOrPercentage };
    if (item.dueDate != null) charge.dueAsOfDate = apiDate(item.dueDate);
    if (item.feeOnMonthDay != null) {
      if (!Array.isArray(item.feeOnMonthDay) || item.feeOnMonthDay.length !== 2)
        throw new SavingsError("malformed");
      const date = apiDate([2000, ...item.feeOnMonthDay]);
      charge.feeOnMonthDay = date.slice(5);
    }
    if (item.feeInterval != null) {
      if (!positiveId(item.feeInterval) || item.feeInterval > 12)
        throw new SavingsError("malformed");
      charge.feeInterval = item.feeInterval;
    }
    // Specified-date (2), annual (6), and monthly (7) charges need explicit dates.
    // Do not invent missing schedule fields or silently drop required product charges.
    if (!record(item.chargeTimeType) || !positiveId(item.chargeTimeType.id))
      throw new SavingsError("malformed");
    if (![2, 3, 4, 5, 6, 7, 10, 16].includes(item.chargeTimeType.id))
      throw new SavingsError("unsupported");
    if (
      (item.chargeTimeType.id === 2 && !charge.dueAsOfDate) ||
      (item.chargeTimeType.id === 6 && !charge.feeOnMonthDay) ||
      (item.chargeTimeType.id === 7 && (!charge.feeOnMonthDay || !charge.feeInterval))
    )
      throw new SavingsError("unsupported");
    return charge;
  });
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (record(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
/** Adapter for core SavingsAccountData, returned unchanged by the self-service resource. */
export function parseTemplate(
  data: unknown,
  clientId: number,
  productId?: number,
): SavingsTemplate {
  if (!record(data) || data.clientId !== clientId || !Array.isArray(data.productOptions))
    throw new SavingsError("malformed");
  const products = data.productOptions.map((product): Product => {
    if (!record(product) || !positiveId(product.id) || !text(product.name))
      throw new SavingsError("malformed");
    return { id: product.id, name: product.name };
  });
  if (new Set(products.map((p) => p.id)).size !== products.length)
    throw new SavingsError("malformed");
  if (
    productId !== undefined &&
    (data.savingsProductId !== productId || !products.some((p) => p.id === productId))
  )
    throw new SavingsError("invalid", ["productId"]);
  if (data.datatables != null && (!Array.isArray(data.datatables) || data.datatables.length > 0))
    throw new SavingsError("unsupported");
  let currency: SavingsTemplate["currency"];
  if (data.currency != null) {
    if (
      !record(data.currency) ||
      !text(data.currency.code) ||
      !/^[A-Z]{3}$/.test(data.currency.code) ||
      typeof data.currency.decimalPlaces !== "number" ||
      !Number.isInteger(data.currency.decimalPlaces) ||
      data.currency.decimalPlaces < 0 ||
      data.currency.decimalPlaces > 20
    )
      throw new SavingsError("malformed");
    currency = { code: data.currency.code, decimalPlaces: data.currency.decimalPlaces };
  }
  for (const key of ["nominalAnnualInterestRate", "minRequiredOpeningBalance"]) {
    if (data[key] != null && !amount(data[key])) throw new SavingsError("malformed");
  }
  if (productId !== undefined && (!currency || !amount(data.nominalAnnualInterestRate)))
    throw new SavingsError("malformed");
  return {
    clientId,
    clientName: text(data.clientName) ? data.clientName : String(clientId),
    products,
    productId,
    productName: products.find((p) => p.id === productId)?.name,
    currency,
    rate: data.nominalAnnualInterestRate as number | undefined,
    openingBalance: data.minRequiredOpeningBalance as number | undefined,
    submittedOnDate: apiDate(
      record(data.timeline) ? data.timeline.submittedOnDate : data.submittedOnDate,
    ),
    charges: chargesFrom(data.charges),
    chargeTerms: (Array.isArray(data.charges) ? data.charges : []).map((item) => ({
      name: text(item.name) ? item.name : "Cargo del producto",
      amount: item.amountOrPercentage,
      percent: record(item.chargeCalculationType) && item.chargeCalculationType.id !== 1,
    })),
    fingerprint: stable(data),
  };
}
export function parseAccount(
  data: unknown,
  clientId: number,
  expectedId?: number,
  productId?: number,
): SavingsAccount {
  if (
    !record(data) ||
    !positiveId(data.id) ||
    data.clientId !== clientId ||
    (expectedId !== undefined && data.id !== expectedId) ||
    (productId !== undefined && data.savingsProductId !== productId)
  )
    throw new SavingsError("malformed");
  if (data.accountNo != null && !text(data.accountNo)) throw new SavingsError("malformed");
  let status: SavingsAccount["status"];
  if (data.status != null) {
    if (!record(data.status) || !text(data.status.code) || !text(data.status.value))
      throw new SavingsError("malformed");
    status = { code: data.status.code, value: data.status.value };
  }
  return {
    id: data.id,
    accountNo: data.accountNo as string | undefined,
    status,
    productName: text(data.savingsProductName) ? data.savingsProductName : undefined,
  };
}
const validationFields = new Set([
  "productId",
  "clientId",
  "submittedOnDate",
  "charges",
  "datatables",
]);

/** One instance per login, retained even when its form is closed. POST is never retried. */
export function createSavingsClient(session: CustomerSession) {
  let locked = false;
  let attemptedClient: number | undefined;
  let attemptedProduct: number | undefined;
  let result: ApplicationResult | undefined;
  const templates = new Map<string, SavingsTemplate>();
  function authorize(clientId: number) {
    if (!positiveId(clientId) || !session.identity.clients.includes(clientId))
      throw new SavingsError("denied");
  }
  async function request(
    resource: string,
    method: "GET" | "POST" = "GET",
    body?: unknown,
    signal?: AbortSignal,
    query?: Record<string, string | number>,
  ) {
    try {
      const response = await session.request(resource, { method, body, signal, query });
      if (response.status === 401) throw new SavingsError("expired");
      if (response.status === 403 || response.status === 404) throw new SavingsError("denied");
      if (response.status === 400 || response.status === 422) {
        const fields =
          record(response.data) && Array.isArray(response.data.errors)
            ? response.data.errors.flatMap((error) =>
                record(error) &&
                typeof error.parameterName === "string" &&
                validationFields.has(error.parameterName)
                  ? [error.parameterName]
                  : [],
              )
            : [];
        throw new SavingsError("invalid", [...new Set(fields)]);
      }
      if (!response.ok) throw new SavingsError(method === "POST" ? "uncertain" : "unavailable");
      return response.data;
    } catch (error) {
      if (error instanceof SavingsError) throw error;
      if (error instanceof AuthenticationError && error.code === "expired")
        throw new SavingsError("expired");
      throw new SavingsError(method === "POST" ? "uncertain" : "unavailable");
    }
  }
  async function loadTemplate(clientId: number, productId?: number, signal?: AbortSignal) {
    authorize(clientId);
    if (
      productId !== undefined &&
      (!positiveId(productId) ||
        !templates.get(String(clientId))?.products.some((p) => p.id === productId))
    )
      throw new SavingsError("invalid", ["productId"]);
    const query: Record<string, string | number> = { clientId };
    if (productId !== undefined) query.productId = productId;
    const template = parseTemplate(
      await request("savingsaccounts/template", "GET", undefined, signal, query),
      clientId,
      productId,
    );
    templates.set(`${clientId}:${productId ?? ""}`, template);
    if (productId === undefined) templates.set(String(clientId), template);
    // Return a copy: form edits cannot alter the cached API snapshot.
    return structuredClone(template);
  }
  async function readBack(resourceId: number) {
    return parseAccount(
      await request(`savingsaccounts/${resourceId}`),
      attemptedClient!,
      resourceId,
      attemptedProduct,
    );
  }
  return {
    loadTemplate,
    get locked() {
      return locked;
    },
    get result() {
      return result;
    },
    async submit(
      clientId: number,
      productId: number,
      submittedOnDate: string,
    ): Promise<ApplicationResult> {
      authorize(clientId);
      if (locked) throw new SavingsError("locked");
      if (!validDate(submittedOnDate)) throw new SavingsError("invalid", ["submittedOnDate"]);
      const previous = templates.get(`${clientId}:${productId}`);
      if (!previous) throw new SavingsError("invalid", ["productId"]);
      locked = true;
      let posted = false;
      try {
        const fresh = await loadTemplate(clientId, productId);
        if (fresh.fingerprint !== previous.fingerprint) throw new SavingsError("changed");
        const body = {
          clientId,
          productId,
          submittedOnDate,
          dateFormat: "yyyy-MM-dd",
          locale: "en",
          ...(fresh.charges.length
            ? {
                charges: fresh.charges,
                ...(fresh.charges.some((charge) => charge.feeOnMonthDay)
                  ? { monthDayFormat: "MM-dd" }
                  : {}),
              }
            : {}),
        };
        attemptedClient = clientId;
        attemptedProduct = productId;
        posted = true;
        const data = await request("savingsaccounts", "POST", body);
        const id = record(data)
          ? positiveId(data.savingsId)
            ? data.savingsId
            : data.resourceId
          : undefined;
        if (
          !positiveId(id) ||
          (record(data) && positiveId(data.resourceId) && data.resourceId !== id)
        )
          throw new SavingsError("uncertain");
        result = { resourceId: id };
        try {
          result.account = await readBack(id);
        } catch (error) {
          if (error instanceof SavingsError && error.code === "expired") throw error;
        }
        return result;
      } catch (error) {
        const failure =
          error instanceof SavingsError
            ? error
            : new SavingsError(posted ? "uncertain" : "unavailable");
        if (!posted || ["invalid", "denied", "expired"].includes(failure.code)) locked = false;
        throw failure;
      }
    },
    /** Read only. A successful POST can only refresh its own known resource. */
    async recover(): Promise<SavingsAccount[]> {
      if (!locked || !attemptedClient) throw new SavingsError("locked");
      authorize(attemptedClient);
      if (result?.resourceId) {
        result.account = await readBack(result.resourceId);
        return [result.account];
      }
      const data = await request(`clients/${attemptedClient}/accounts`);
      if (!record(data) || (data.savingsAccounts != null && !Array.isArray(data.savingsAccounts)))
        throw new SavingsError("malformed");
      // Discovery is deliberately not treated as proof that the uncertain POST succeeded.
      const accounts = (data.savingsAccounts ?? []) as unknown[];
      return accounts
        .map((account) => {
          if (!record(account) || !positiveId(account.id)) throw new SavingsError("malformed");
          return account;
        })
        .map((account) => ({
          id: account.id as number,
          accountNo: text(account.accountNo) ? account.accountNo : undefined,
          status:
            record(account.status) && text(account.status.code) && text(account.status.value)
              ? { code: account.status.code, value: account.status.value }
              : undefined,
          productName: text(account.productName) ? account.productName : undefined,
        }));
    },
  };
}
export type SavingsClient = ReturnType<typeof createSavingsClient>;
