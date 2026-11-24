import { Fragment, useEffect, useRef, useState } from "react";
import { translateWith, useI18n } from "../i18n";
import type { ChargeStatus, SavingsCharge } from "../lib/accounts/charges";
import { AccountsError } from "../lib/accounts/client";
import type { SavingsDetailsClient } from "../lib/accounts/details";
import { formatDay, money } from "../lib/accounts/format";
import { chargesMessages } from "../lib/accounts/messages";

const statusLabels: Record<Exclude<ChargeStatus, "none">, string> = {
  pending: "Pendiente",
  partial: "Pagado parcialmente",
  paid: "Pagado",
  waived: "Condonado",
  inactive: "Inactivo",
};
// The label of each ChargeTimeType id a savings charge can have. Recurring ones read apart below.
const whenLabels: Record<number, string> = {
  2: "Fecha específica",
  3: "Al activar la cuenta",
  4: "Al cerrar la cuenta",
  5: "En cada retiro",
  10: "Por sobregiro",
  11: "Cada semana",
  16: "Por inactividad",
};
// Yearly, monthly and weekly fees: Fineract's due date is the next time they are charged.
const recurring = new Set([6, 7, 11]);

/**
 * Reads the charges of an account as soon as its screen opens, alongside the account itself, so
 * a failure here never hides the account. Answers for another account are never kept.
 */
export function useSavingsCharges(
  client: SavingsDetailsClient,
  accountId: number,
  onExpired: () => void,
) {
  const [loaded, setLoaded] = useState<{
    accountId: number;
    attempt: number;
    charges?: SavingsCharge[];
    error?: AccountsError;
  }>();
  const [attempt, setAttempt] = useState(0);
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;
  useEffect(() => {
    const controller = new AbortController();
    void client.charges(accountId, controller.signal).then(
      (charges) => {
        if (!controller.signal.aborted) setLoaded({ accountId, attempt, charges });
      },
      (failure) => {
        if (controller.signal.aborted) return;
        const error = failure instanceof AccountsError ? failure : new AccountsError("unavailable");
        if (error.code === "expired") expiredRef.current();
        else setLoaded({ accountId, attempt, error });
      },
    );
    return () => controller.abort();
  }, [client, accountId, attempt]);
  // Only the answer to the current read: never another account's, nor an earlier attempt's.
  const current =
    loaded?.accountId === accountId && loaded.attempt === attempt ? loaded : undefined;
  return {
    charges: current?.charges,
    error: current?.error,
    retry: () => setAttempt((value) => value + 1),
  };
}

/** The charges of one savings account (US-E04-03). Read only. */
export function SavingsCharges({
  charges,
  error,
  onRetry,
}: {
  charges?: SavingsCharge[];
  error?: AccountsError;
  onRetry: () => void;
}) {
  const { t, locale } = useI18n();
  const loading = !charges && !error;
  const day = (value: string) => <time dateTime={value}>{formatDay(value, locale)}</time>;
  // "15 de enero" / "January 15": a day of the year, without one.
  const dayOfYear = ({ month, day: date }: NonNullable<SavingsCharge["feeOn"]>) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2000, month - 1, date)),
    );
  const when = (charge: SavingsCharge) => {
    const { feeOn, feeInterval } = charge;
    if (charge.when.id === 6)
      return feeOn
        ? translateWith("Cada año, el {date}", { date: dayOfYear(feeOn) })
        : t("Cada año");
    if (charge.when.id === 7) {
      if (feeInterval && feeInterval > 1)
        return feeOn
          ? translateWith("Cada {months} meses, el día {day}", {
              months: feeInterval,
              day: feeOn.day,
            })
          : translateWith("Cada {months} meses", { months: feeInterval });
      return feeOn ? translateWith("Cada mes, el día {day}", { day: feeOn.day }) : t("Cada mes");
    }
    return whenLabels[charge.when.id] ? t(whenLabels[charge.when.id]) : charge.when.value;
  };
  const row = (charge: SavingsCharge) => {
    const amounts: [string, number][] = [
      ["Monto pagado", charge.paid],
      ["Monto condonado", charge.waived],
      ["Monto cancelado", charge.writtenOff],
      ["Monto pendiente", charge.outstanding],
    ];
    return (
      <li className="account-item" key={charge.id} data-testid={`savings-charge-${charge.id}`}>
        <div className="account-item-heading">
          <strong>{charge.name}</strong>
          {charge.status !== "none" && (
            <span className="account-status">{t(statusLabels[charge.status])}</span>
          )}
        </div>
        <p className="account-item-meta">
          {when(charge)}
          {charge.penalty && ` · ${t("Penalización")}`}
        </p>
        <dl className="loan-details">
          {charge.percentage !== undefined && (
            <>
              <dt>{t("Porcentaje")}</dt>
              <dd>
                {new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }).format(
                  charge.percentage,
                )}
                %
              </dd>
            </>
          )}
          {/* A percentage fee has no amount until Fineract works one out. */}
          {(charge.calculation === "flat" || charge.amount > 0) && (
            <>
              <dt>{t("Monto")}</dt>
              <dd>{money(charge.amount, charge.currency)}</dd>
            </>
          )}
          {charge.dueDate && (
            <>
              <dt>{t(recurring.has(charge.when.id) ? "Próximo cobro" : "Fecha de cobro")}</dt>
              <dd>{day(charge.dueDate)}</dd>
            </>
          )}
          {amounts
            .filter(([, value]) => value > 0)
            .map(([label, value]) => (
              <Fragment key={label}>
                <dt>{t(label)}</dt>
                <dd>{money(value, charge.currency)}</dd>
              </Fragment>
            ))}
        </dl>
      </li>
    );
  };
  return (
    <section
      className="savings-charges"
      aria-labelledby="savings-charges-heading"
      aria-busy={loading}
      data-testid="savings-charges"
    >
      <h3 id="savings-charges-heading">{t("Cargos")}</h3>
      <p className="savings-accounts-status" role="status">
        {loading ? t("Consultando los cargos…") : ""}
      </p>
      {error && (
        <div className="savings-accounts-error">
          <p className="form-error" role="alert">
            {t(chargesMessages[error.code])}
          </p>
          {error.code !== "denied" && (
            <button type="button" className="button button-outline button-small" onClick={onRetry}>
              {t("Reintentar")}
            </button>
          )}
        </div>
      )}
      {charges &&
        (charges.length === 0 ? (
          <p className="savings-accounts-empty">{t("Esta cuenta no tiene cargos.")}</p>
        ) : (
          <ul className="account-list">{charges.map(row)}</ul>
        ))}
    </section>
  );
}
