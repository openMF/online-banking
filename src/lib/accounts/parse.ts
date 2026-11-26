import { validDate } from "../savings/client";
import { AccountsError } from "./client";

// Shared by the readers of one savings account: its details and its charges.
export const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
export const malformed = (): never => {
  throw new AccountsError("malformed");
};
export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
// Fineract sends a zero amount as null.
export const amount = (value: unknown): number =>
  value == null ? 0 : finite(value) ? value : malformed();
/** A Fineract `[y, m, d]` date as `yyyy-MM-dd`, or undefined when there is none. */
export function day(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isInteger))
    return malformed();
  const [year, month, date] = value as number[];
  const result = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  return validDate(result) ? result : malformed();
}
