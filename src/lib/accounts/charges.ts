import { positiveId, record, validDate } from "../savings/client";
import type { SavingsSummary } from "./client";
import { amount, day, malformed, text } from "./parse";

/** Where a charge stands: still owed, settled, or switched off. "none" has nothing to settle yet. */
export type ChargeStatus = "pending" | "partial" | "paid" | "waived" | "inactive" | "none";
export interface SavingsCharge {
  id: number;
  name: string;
  /** When the charge applies (chargeTimeType). */
  when: { id: number; value: string };
  calculation: "flat" | "percent";
  /** The amount due: 0 for a percentage fee that has not been charged yet. */
  amount: number;
  /** Only for a percentage fee. */
  percentage?: number;
  currency: SavingsSummary["currency"];
  paid: number;
  waived: number;
  writtenOff: number;
  outstanding: number;
  /** `yyyy-MM-dd`: the next one, for a recurring fee. */
  dueDate?: string;
  /** The day of the year (annual fee) or of the month (monthly fee) it is charged on. */
  feeOn?: { month: number; day: number };
  /** Every how many months (or weeks) a recurring fee is charged. */
  feeInterval?: number;
  penalty: boolean;
  active: boolean;
  status: ChargeStatus;
}

// ChargeTimeType ids a savings charge can have, and the code Fineract pairs with each.
const chargeTimes: Record<number, string> = {
  2: "specifiedDueDate",
  3: "savingsActivation",
  4: "savingsClosure",
  5: "withdrawalFee",
  6: "annualFee",
  7: "monthlyFee",
  10: "overdraftFee",
  11: "weeklyFee",
  16: "savingsNoActivityFee",
};
// ChargeCalculationType: a flat amount, or a percentage of something.
const calculations: Record<number, string> = {
  1: "flat",
  2: "percent.of.amount",
  3: "percent.of.amount.and.interest",
  4: "percent.of.interest",
  5: "percent.of.disbursement.amount",
};
// What the customer still owes first, switched-off charges last.
const statusRank: Record<ChargeStatus, number> = {
  pending: 0,
  partial: 1,
  paid: 2,
  waived: 2,
  none: 2,
  inactive: 3,
};

/** An amount that cannot be negative. */
function positive(value: unknown): number {
  const result = amount(value);
  return result >= 0 ? result : malformed();
}
function status(charge: Omit<SavingsCharge, "status">): ChargeStatus {
  if (!charge.active) return "inactive";
  if (charge.outstanding > 0) return charge.paid > 0 ? "partial" : "pending";
  if (charge.paid > 0) return "paid";
  if (charge.waived > 0) return "waived";
  return "none";
}
/** A Fineract `[month, day]` as numbers, or undefined when there is none. */
function monthDay(value: unknown): SavingsCharge["feeOn"] {
  if (value == null) return undefined;
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isInteger))
    return malformed();
  const [month, date] = value as number[];
  // A leap year, so 29 February is a real day.
  const check = `2000-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  return validDate(check) ? { month, day: date } : malformed();
}

/** One charge of `accountId`, as Fineract's SavingsAccountChargeData sends it. */
function parseCharge(data: unknown, accountId: number): SavingsCharge {
  if (!record(data) || !positiveId(data.id) || data.accountId !== accountId) return malformed();
  if (!text(data.name)) return malformed();
  const time = data.chargeTimeType;
  if (!record(time) || !positiveId(time.id) || !text(time.code) || !text(time.value))
    return malformed();
  const knownTime = chargeTimes[time.id];
  if (knownTime && time.code !== `chargeTimeType.${knownTime}`) return malformed();
  const calculation = data.chargeCalculationType;
  if (!record(calculation) || !positiveId(calculation.id)) return malformed();
  const knownCalculation = calculations[calculation.id];
  // How the amount reads depends on it, so a calculation this screen does not know is refused.
  if (!knownCalculation || calculation.code !== `chargeCalculationType.${knownCalculation}`)
    return malformed();
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
  if (data.penalty != null && typeof data.penalty !== "boolean") return malformed();
  if (data.isActive != null && typeof data.isActive !== "boolean") return malformed();
  if (data.feeInterval != null && !positiveId(data.feeInterval)) return malformed();
  const percent = calculation.id > 1;
  const charge: Omit<SavingsCharge, "status"> = {
    id: data.id,
    name: data.name.trim(),
    when: { id: time.id, value: time.value },
    calculation: percent ? "percent" : "flat",
    amount: positive(data.amount),
    currency: { code: currency.code, decimalPlaces: currency.decimalPlaces },
    paid: positive(data.amountPaid),
    waived: positive(data.amountWaived),
    writtenOff: positive(data.amountWrittenOff),
    outstanding: positive(data.amountOutstanding),
    dueDate: day(data.dueDate),
    feeOn: monthDay(data.feeOnMonthDay),
    feeInterval: positiveId(data.feeInterval) ? data.feeInterval : undefined,
    penalty: data.penalty === true,
    // Fineract always sends it. Without it, the charge is read as active, as Fineract applies it.
    active: data.isActive !== false,
  };
  if (percent) charge.percentage = positive(data.percentage);
  return { ...charge, status: status(charge) };
}

/** Adapter for `GET /self/savingsaccounts/{id}/charges`. Refuses the whole list on any doubt. */
export function parseSavingsCharges(data: unknown, accountId: number): SavingsCharge[] {
  if (!Array.isArray(data)) return malformed();
  const charges = data.map((item) => parseCharge(item, accountId));
  if (new Set(charges.map((charge) => charge.id)).size !== charges.length) return malformed();
  // A stable sort keeps the server's order inside each group.
  return charges.sort((a, b) => statusRank[a.status] - statusRank[b.status]);
}
