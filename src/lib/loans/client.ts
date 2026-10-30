import {
  AuthenticationError,
  type CustomerSession,
  type CustomerMethod,
} from "../authentication/client";
import { record, positiveId, validDate } from "../savings/client";

export type Failure =
  | "expired"
  | "denied"
  | "unavailable"
  | "malformed"
  | "invalid"
  | "unsupported"
  | "changed"
  | "uncertain"
  | "locked";
export class LoanError extends Error {
  constructor(
    readonly code: Failure,
    readonly fields: string[] = [],
  ) {
    super(code);
    this.name = "LoanError";
  }
}
export interface Option {
  id: number;
  name: string;
}
export interface Field {
  key: string;
  label: string;
  type: "number" | "date" | "select";
  required: boolean;
  value: string;
  min?: number;
  max?: number;
  step?: string;
  options?: { value: string; label: string }[];
  fixed?: boolean;
  hint?: string;
}
export interface Template {
  clientId: number;
  productId: number;
  name: string;
  clientName: string;
  currency: string;
  fields: Field[];
  charges: { chargeId: number; amount: number; dueDate?: string; name: string; basis: string }[];
  fingerprint: string;
}
export interface Loan {
  id: number;
  clientId: number;
  productId: number;
  productName: string;
  accountNo?: string;
  principal: number;
  currency: string;
  status: { code: string; value: string };
  pending: boolean;
  submittedOnDate: string;
  term?: number;
  termUnit?: string;
  raw: Record<string, unknown>;
}
export type Values = Record<string, string>;
const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const numeric = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const malformed = (): never => {
  throw new LoanError("malformed");
};
export function dateFrom(v: unknown): string {
  if (v == null) return "";
  if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isInteger)) return malformed();
  const s = `${String(v[0]).padStart(4, "0")}-${String(v[1]).padStart(2, "0")}-${String(v[2]).padStart(2, "0")}`;
  return validDate(s) ? s : malformed();
}
export function parseOptions(data: unknown): Option[] {
  if (!Array.isArray(data)) return malformed();
  const result = data.map((v) => {
    if (!record(v) || !positiveId(v.id) || !nonempty(v.name)) return malformed();
    return { id: v.id, name: v.name };
  });
  if (new Set(result.map((v) => v.id)).size !== result.length) return malformed();
  return result;
}
const numberFields = [
  ["principal", "principal", "Monto solicitado", "minPrincipal", "maxPrincipal"],
  ["loanTermFrequency", "termFrequency", "Plazo del préstamo", "", ""],
  [
    "numberOfRepayments",
    "numberOfRepayments",
    "Número de pagos",
    "minNumberOfRepayments",
    "maxNumberOfRepayments",
  ],
  ["repaymentEvery", "repaymentEvery", "Intervalo de pago", "", ""],
  [
    "interestRatePerPeriod",
    "interestRatePerPeriod",
    "Interés por período (%)",
    "minInterestRatePerPeriod",
    "maxInterestRatePerPeriod",
  ],
] as const;
const enumFields = [
  [
    "loanTermFrequencyType",
    "termPeriodFrequencyType",
    "termFrequencyTypeOptions",
    "Unidad del plazo",
  ],
  [
    "repaymentFrequencyType",
    "repaymentFrequencyType",
    "repaymentFrequencyTypeOptions",
    "Frecuencia de pago",
  ],
  ["amortizationType", "amortizationType", "amortizationTypeOptions", "Amortización"],
  ["interestType", "interestType", "interestTypeOptions", "Tipo de interés"],
  [
    "interestCalculationPeriodType",
    "interestCalculationPeriodType",
    "interestCalculationPeriodTypeOptions",
    "Cálculo de interés",
  ],
] as const;
function currency(data: unknown): string {
  if (
    !record(data) ||
    !nonempty(data.code) ||
    !/^[A-Z]{3}$/.test(data.code) ||
    !Number.isInteger(data.decimalPlaces) ||
    Number(data.decimalPlaces) < 0 ||
    Number(data.decimalPlaces) > 10
  )
    return malformed();
  return data.code;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (record(value))
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
/** Core LoanAccountData plus LoanProductData. Never infer missing financial defaults. */
export function parseTemplate(
  data: unknown,
  product: unknown,
  clientId: number,
  productId: number,
): Template {
  if (
    !record(data) ||
    !record(product) ||
    data.clientId !== clientId ||
    data.loanProductId !== productId ||
    product.id !== productId ||
    !nonempty(data.loanProductName)
  )
    return malformed();
  if (!parseOptions(data.productOptions).some((v) => v.id === productId))
    throw new LoanError("changed");
  // These require a richer underwriting form. Stop explicitly rather than omit required values.
  if (
    [data, product].some(
      (d) =>
        d.multiDisburseLoan === true ||
        d.useBorrowerCycle === true ||
        d.isLoanProductLinkedToFloatingRate === true ||
        d.isLinkedToFloatingInterestRates === true ||
        d.isInterestRecalculationEnabled === true ||
        d.interestRecalculationEnabled === true ||
        d.isRatesEnabled === true ||
        (d.datatables != null && (!Array.isArray(d.datatables) || d.datatables.length > 0)),
    )
  )
    throw new LoanError("unsupported");
  const code = currency(data.currency);
  const fields: Field[] = [];
  for (const [key, source, label, low, high] of numberFields) {
    const v = data[source];
    if (!numeric(v)) return malformed();
    const integer = key !== "principal" && key !== "interestRatePerPeriod";
    if (integer && !positiveId(v)) return malformed();
    const min = product[low],
      max = product[high];
    if ((min != null && !numeric(min)) || (max != null && !numeric(max))) return malformed();
    const fixed =
      key === "repaymentEvery" &&
      (!record(product.allowAttributeOverrides) ||
        product.allowAttributeOverrides.repaymentEvery !== true);
    const step = integer
      ? "1"
      : key === "principal"
        ? String(10 ** -Number((data.currency as Record<string, unknown>).decimalPlaces))
        : "any";
    fields.push({
      key,
      label,
      type: "number",
      required: true,
      value: String(v),
      fixed,
      min: numeric(min) ? min : integer ? 1 : 0,
      max: numeric(max) ? max : undefined,
      step,
    });
  }
  const overrides = record(product.allowAttributeOverrides) ? product.allowAttributeOverrides : {};
  for (const [key, source, opts, label] of enumFields) {
    const v = data[source];
    if (!record(v) || !Number.isInteger(v.id) || Number(v.id) < 0) return malformed();
    const list = data[opts];
    if (!Array.isArray(list)) return malformed();
    const options = list.map((o) => {
      if (!record(o) || !Number.isInteger(o.id) || Number(o.id) < 0 || !nonempty(o.value))
        return malformed();
      return { value: String(o.id), label: o.value };
    });
    if (!options.some((o) => o.value === String(v.id))) return malformed();
    fields.push({
      key,
      label,
      type: "select",
      required: true,
      value: String(v.id),
      options,
      fixed:
        [
          "amortizationType",
          "interestType",
          "interestCalculationPeriodType",
          "repaymentFrequencyType",
        ].includes(key) && overrides[key] !== true,
    });
  }
  if (!nonempty(data.transactionProcessingStrategyCode)) return malformed();
  fields.push({
    key: "transactionProcessingStrategyCode",
    label: "Estrategia de pagos",
    type: "select",
    required: true,
    value: data.transactionProcessingStrategyCode,
    options: [
      {
        value: data.transactionProcessingStrategyCode,
        label: nonempty(data.transactionProcessingStrategyName)
          ? data.transactionProcessingStrategyName
          : data.transactionProcessingStrategyCode,
      },
    ],
    fixed: true,
  });
  const timeline = record(data.timeline) ? data.timeline : {};
  for (const [key, label, source, required] of [
    ["submittedOnDate", "Fecha de solicitud", timeline.submittedOnDate, true],
    [
      "expectedDisbursementDate",
      "Fecha prevista de desembolso",
      timeline.expectedDisbursementDate,
      true,
    ],
    [
      "repaymentsStartingFromDate",
      "Fecha del primer pago",
      data.expectedFirstRepaymentOnDate,
      false,
    ],
  ] as const)
    fields.push({ key, label, type: "date", required, value: dateFrom(source) });
  if (data.loanPurposeOptions != null) {
    const options = parseOptions(data.loanPurposeOptions);
    if (options.length)
      fields.push({
        key: "loanPurposeId",
        label: "Destino del préstamo",
        type: "select",
        required: false,
        value: "",
        options: options.map((o) => ({ value: String(o.id), label: o.name })),
      });
  }
  if (data.charges != null && !Array.isArray(data.charges)) return malformed();
  const charges = ((data.charges ?? []) as unknown[]).map((v, index) => {
    if (
      !record(v) ||
      !positiveId(v.chargeId) ||
      !numeric(v.amountOrPercentage) ||
      !record(v.chargeTimeType) ||
      !positiveId(v.chargeTimeType.id) ||
      !record(v.chargeCalculationType) ||
      !positiveId(v.chargeCalculationType.id) ||
      !nonempty(v.chargeCalculationType.value)
    )
      return malformed();
    if (![1, 2, 8].includes(v.chargeTimeType.id)) throw new LoanError("unsupported");
    if (v.chargeTimeType.id === 2)
      fields.push({
        key: `chargeDate${index}`,
        label: "Fecha del cargo",
        hint: nonempty(v.name) ? v.name : String(v.chargeId),
        type: "date",
        required: true,
        value: dateFrom(v.dueDate),
      });
    return {
      chargeId: v.chargeId,
      amount: v.amountOrPercentage,
      basis: v.chargeCalculationType.value,
      name: nonempty(v.name) ? v.name : String(v.chargeId),
    };
  });
  return {
    clientId,
    productId,
    name: data.loanProductName,
    clientName: nonempty(data.clientName) ? data.clientName : String(clientId),
    currency: code,
    fields,
    charges,
    fingerprint: stable({ data, product }),
  };
}
export function valuesFor(template: Template, loan?: Loan): Values {
  const result = Object.fromEntries(template.fields.map((f) => [f.key, f.value]));
  if (loan) {
    for (const [key, source] of numberFields)
      if (numeric(loan.raw[source])) result[key] = String(loan.raw[source]);
    for (const [key, source] of enumFields) {
      const v = loan.raw[source];
      if (record(v) && Number.isInteger(v.id)) result[key] = String(v.id);
    }
    const timeline = record(loan.raw.timeline) ? loan.raw.timeline : {};
    result.submittedOnDate = dateFrom(timeline.submittedOnDate);
    result.expectedDisbursementDate = dateFrom(timeline.expectedDisbursementDate);
    result.repaymentsStartingFromDate = dateFrom(loan.raw.expectedFirstRepaymentOnDate);
    if (positiveId(loan.raw.loanPurposeId)) result.loanPurposeId = String(loan.raw.loanPurposeId);
  }
  return result;
}
export function payload(
  template: Template,
  values: Values,
  editing = false,
): Record<string, unknown> {
  const body: Record<string, unknown> = { locale: "en", dateFormat: "yyyy-MM-dd" };
  const invalid: string[] = [];
  for (const field of template.fields) {
    if (editing && (field.key === "submittedOnDate" || field.key.startsWith("chargeDate")))
      continue;
    const v = values[field.key] ?? "";
    if (!v && !field.required) continue;
    if (field.fixed && v !== field.value) invalid.push(field.key);
    if (!v || (field.type === "date" && !validDate(v))) {
      invalid.push(field.key);
      continue;
    }
    if (field.type === "number") {
      const n = Number(v);
      if (
        !numeric(n) ||
        (field.key === "principal" && n <= 0) ||
        (field.min != null && n < field.min) ||
        (field.max != null && n > field.max) ||
        (field.step === "1" && !Number.isSafeInteger(n)) ||
        (field.key === "principal" &&
          Math.abs(n / Number(field.step) - Math.round(n / Number(field.step))) > 0.00001)
      )
        invalid.push(field.key);
      body[field.key] = n;
    } else if (field.type === "select") {
      if (!field.options?.some((o) => o.value === v) || (field.fixed && v !== field.value))
        invalid.push(field.key);
      body[field.key] = field.key === "transactionProcessingStrategyCode" ? v : Number(v);
    } else if (!field.key.startsWith("chargeDate")) body[field.key] = v;
  }
  if (values.expectedDisbursementDate < values.submittedOnDate)
    invalid.push("expectedDisbursementDate");
  if (
    values.repaymentsStartingFromDate &&
    values.repaymentsStartingFromDate < values.expectedDisbursementDate
  )
    invalid.push("repaymentsStartingFromDate");
  if (invalid.length) throw new LoanError("invalid", [...new Set(invalid)]);
  if (!editing) {
    Object.assign(body, {
      clientId: template.clientId,
      productId: template.productId,
      loanType: "individual",
    });
    if (template.charges.length)
      body.charges = template.charges.map((c, i) => ({
        chargeId: c.chargeId,
        amount: c.amount,
        ...(values[`chargeDate${i}`] ? { dueDate: values[`chargeDate${i}`] } : {}),
      }));
  }
  return body;
}
export function parseLoan(data: unknown, clients: readonly number[], id: number): Loan {
  if (
    !record(data) ||
    data.id !== id ||
    !positiveId(data.clientId) ||
    !clients.includes(data.clientId) ||
    !positiveId(data.loanProductId) ||
    !nonempty(data.loanProductName) ||
    !numeric(data.principal) ||
    !record(data.status) ||
    !nonempty(data.status.code) ||
    !nonempty(data.status.value)
  )
    return malformed();
  if (
    !positiveId(data.status.id) ||
    (data.status.code === "loanStatusType.submitted.and.pending.approval" &&
      (data.status.id !== 100 || data.status.pendingApproval !== true)) ||
    (data.status.code === "loanStatusType.withdrawn.by.client" && data.status.id !== 400)
  )
    return malformed();
  const pending =
    data.status.code === "loanStatusType.submitted.and.pending.approval" &&
    data.status.id === 100 &&
    data.status.pendingApproval === true;
  return {
    id,
    clientId: data.clientId,
    productId: data.loanProductId,
    productName: data.loanProductName,
    principal: data.principal,
    currency: currency(data.currency),
    accountNo: nonempty(data.accountNo) ? data.accountNo : undefined,
    status: { code: data.status.code, value: data.status.value },
    pending,
    submittedOnDate: dateFrom(record(data.timeline) ? data.timeline.submittedOnDate : undefined),
    term: positiveId(data.termFrequency) ? data.termFrequency : undefined,
    termUnit:
      record(data.termPeriodFrequencyType) && nonempty(data.termPeriodFrequencyType.value)
        ? data.termPeriodFrequencyType.value
        : undefined,
    raw: data,
  };
}

/** One per customer login. Locks survive closing the UI. Only reads may be retried by CustomerSession. */
export function createLoanClient(session: CustomerSession) {
  let busy = false,
    createBlocked = false;
  let lastId: number | undefined;
  let createdFor: { clientId: number; productId: number } | undefined;
  const blocked = new Set<number>();
  const templates = new Map<string, Template>();
  let products: Option[] = [];
  const authorize = (id: number) => {
    if (!positiveId(id) || !session.identity.clients.includes(id)) throw new LoanError("denied");
  };
  async function request(
    path: string,
    method: CustomerMethod = "GET",
    body?: unknown,
    query?: Record<string, string | number>,
    signal?: AbortSignal,
  ) {
    try {
      const r = await session.request(path, { method, body, query, signal });
      if (r.status === 401) throw new LoanError("expired");
      if (r.status === 403 || r.status === 404) throw new LoanError("denied");
      if (r.status === 409) throw new LoanError("changed");
      if (r.status === 400 || r.status === 422) {
        const fields =
          record(r.data) && Array.isArray(r.data.errors)
            ? r.data.errors.flatMap((e) =>
                record(e) &&
                typeof e.parameterName === "string" &&
                [
                  ...numberFields.map((f) => f[0]),
                  ...enumFields.map((f) => f[0]),
                  "expectedDisbursementDate",
                  "submittedOnDate",
                  "withdrawnOnDate",
                  "loanPurposeId",
                  "charges",
                ].includes(e.parameterName)
                  ? [e.parameterName]
                  : [],
              )
            : [];
        // A structured core validation rejection is known to precede the command. Unknown 4xx stays uncertain.
        if (fields.length) throw new LoanError("invalid", fields);
      }
      if (!r.ok) throw new LoanError(method === "GET" ? "unavailable" : "uncertain");
      return r.data;
    } catch (e) {
      if (e instanceof LoanError) throw e;
      if (e instanceof AuthenticationError && e.code === "expired") throw new LoanError("expired");
      throw new LoanError(method === "GET" ? "unavailable" : "uncertain");
    }
  }
  async function loadProducts(signal?: AbortSignal) {
    products = parseOptions(await request("loanproducts", "GET", undefined, undefined, signal));
    return structuredClone(products);
  }
  async function eligibleProducts(clientId: number, signal?: AbortSignal) {
    authorize(clientId);
    const data = await request(
      "loans/template",
      "GET",
      undefined,
      { templateType: "individual", clientId },
      signal,
    );
    if (!record(data) || data.clientId !== clientId) return malformed();
    return parseOptions(data.productOptions).filter((option) =>
      products.some((p) => p.id === option.id),
    );
  }
  async function loadTemplate(clientId: number, productId: number, signal?: AbortSignal) {
    authorize(clientId);
    if (!products.some((p) => p.id === productId)) throw new LoanError("invalid", ["productId"]);
    const [data, product] = await Promise.all([
      request(
        "loans/template",
        "GET",
        undefined,
        { templateType: "individual", clientId, productId },
        signal,
      ),
      request(`loanproducts/${productId}`, "GET", undefined, undefined, signal),
    ]);
    const template = parseTemplate(data, product, clientId, productId);
    templates.set(`${clientId}:${productId}`, template);
    return structuredClone(template);
  }
  async function details(id: number) {
    if (!positiveId(id)) throw new LoanError("denied");
    const loan = parseLoan(await request(`loans/${id}`), session.identity.clients, id);
    if (
      id === lastId &&
      createdFor &&
      (loan.clientId !== createdFor.clientId || loan.productId !== createdFor.productId)
    )
      return malformed();
    return loan;
  }
  async function list(clientId: number, signal?: AbortSignal) {
    authorize(clientId);
    const data = await request(`clients/${clientId}/accounts`, "GET", undefined, undefined, signal);
    if (!record(data) || (data.loanAccounts != null && !Array.isArray(data.loanAccounts)))
      return malformed();
    return ((data.loanAccounts ?? []) as unknown[]).map((v) => {
      if (!record(v) || !positiveId(v.id) || (v.clientId != null && v.clientId !== clientId))
        return malformed();
      return { id: v.id, name: nonempty(v.productName) ? v.productName : String(v.id) };
    });
  }
  function commandId(data: unknown, expected?: number): number {
    if (!record(data)) throw new LoanError("uncertain");
    const id = data.loanId ?? data.resourceId;
    if (
      !positiveId(id) ||
      (data.resourceId != null && data.resourceId !== id) ||
      (expected != null && id !== expected)
    )
      throw new LoanError("uncertain");
    return id;
  }
  async function mutate(clientId: number, productId: number, values: Values, id?: number) {
    authorize(clientId);
    if (busy || (id ? blocked.has(id) : createBlocked)) throw new LoanError("locked");
    const previous = templates.get(`${clientId}:${productId}`);
    if (!previous) throw new LoanError("invalid");
    const body = payload(previous, values, id !== undefined);
    busy = true;
    let dispatched = false,
      acknowledged = false;
    try {
      if (id) {
        const current = await details(id);
        if (!current.pending || current.clientId !== clientId || current.productId !== productId)
          throw new LoanError("changed");
      }
      const fresh = await loadTemplate(clientId, productId);
      if (fresh.fingerprint !== previous.fingerprint) throw new LoanError("changed");
      dispatched = true;
      if (id) blocked.add(id);
      else createBlocked = true;
      const data = await request(id ? `loans/${id}` : "loans", id ? "PUT" : "POST", body);
      const resourceId = commandId(data, id);
      acknowledged = true;
      if (!id) {
        lastId = resourceId;
        createdFor = { clientId, productId };
      }
      const loan = await details(resourceId);
      if (loan.clientId !== clientId || loan.productId !== productId)
        throw new LoanError("uncertain");
      if (id) blocked.delete(id);
      return loan;
    } catch (e) {
      const error =
        e instanceof LoanError ? e : new LoanError(dispatched ? "uncertain" : "unavailable");
      if (
        dispatched &&
        (acknowledged || !["invalid", "denied", "expired", "changed"].includes(error.code))
      ) {
        if (error.code === "expired") throw error;
        throw new LoanError("uncertain");
      }
      if (id) blocked.delete(id);
      else if (!dispatched || ["invalid", "denied", "expired", "changed"].includes(error.code))
        createBlocked = false;
      throw error;
    } finally {
      busy = false;
    }
  }
  return {
    loadProducts,
    eligibleProducts,
    loadTemplate,
    list,
    details,
    get createBlocked() {
      return createBlocked;
    },
    get lastId() {
      return lastId;
    },
    isBlocked: (id: number) => blocked.has(id),
    submit: (t: Template, values: Values) => mutate(t.clientId, t.productId, values),
    update: (loan: Loan, values: Values) => mutate(loan.clientId, loan.productId, values, loan.id),
    async withdraw(id: number, withdrawnOnDate: string) {
      if (busy || blocked.has(id)) throw new LoanError("locked");
      if (!validDate(withdrawnOnDate)) throw new LoanError("invalid", ["withdrawnOnDate"]);
      busy = true;
      let dispatched = false,
        acknowledged = false;
      try {
        const loan = await details(id);
        if (!loan.pending) throw new LoanError("changed");
        if (withdrawnOnDate < loan.submittedOnDate)
          throw new LoanError("invalid", ["withdrawnOnDate"]);
        blocked.add(id);
        dispatched = true;
        commandId(
          await request(
            `loans/${id}`,
            "POST",
            { withdrawnOnDate, locale: "en", dateFormat: "yyyy-MM-dd" },
            { command: "withdrawnByApplicant" },
          ),
          id,
        );
        acknowledged = true;
        const updated = await details(id);
        if (updated.status.code !== "loanStatusType.withdrawn.by.client")
          throw new LoanError("uncertain");
        blocked.delete(id);
        return updated;
      } catch (e) {
        const error =
          e instanceof LoanError ? e : new LoanError(dispatched ? "uncertain" : "unavailable");
        if (
          dispatched &&
          (acknowledged || !["invalid", "denied", "expired", "changed"].includes(error.code))
        ) {
          if (error.code === "expired") throw error;
          throw new LoanError("uncertain");
        }
        blocked.delete(id);
        throw error;
      } finally {
        busy = false;
      }
    },
  };
}
export type LoanClient = ReturnType<typeof createLoanClient>;
