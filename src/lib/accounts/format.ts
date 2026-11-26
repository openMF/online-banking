import { formatAmount } from "../transfers";
import type { SavingsSummary } from "./client";

/** `1,250.50 MXN`, with the currency's own decimals. */
export const money = (value: number, currency: SavingsSummary["currency"]) =>
  `${formatAmount(value.toFixed(currency.decimalPlaces), currency.decimalPlaces)} ${currency.code}`;
/** A `yyyy-MM-dd` day as "2 nov 2026" or "Nov 2, 2026", in UTC so it is the same everywhere. */
export const formatDay = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
