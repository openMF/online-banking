import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  ChargeError,
  chargeMessages,
  chargeStatusLabels,
  type LoanCharge,
  type LoanChargesClient,
} from "../lib/loans/charges";

export function LoanCharges({
  client,
  loanId,
  onExpired,
}: {
  client: LoanChargesClient;
  loanId: number;
  onExpired: () => void;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    client: LoanChargesClient;
    loanId: number;
    revision: number;
    list?: LoanCharge[];
    error?: ChargeError;
  }>();
  const expired = useRef(onExpired);
  expired.current = onExpired;
  const entry = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const current =
    state?.client === client && state.loanId === loanId && state.revision === revision
      ? state
      : undefined;
  const loading = open && !current;
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void client.list(loanId, controller.signal).then(
      (list) => {
        if (!controller.signal.aborted) setState({ client, loanId, revision, list });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const safe = error instanceof ChargeError ? error : new ChargeError("unavailable");
        setState({ client, loanId, revision, error: safe });
        if (safe.code === "expired") expired.current();
      },
    );
    return () => controller.abort();
  }, [client, loanId, open, revision]);
  // No totals or currency rounding: show each server value independently, with its code.
  const money = (value: number, currency?: string) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(value)} ${currency ?? t("Moneda no disponible")}`;
  return (
    <section className="loan-charges" aria-label={t("Cargos del préstamo")} aria-busy={loading}>
      <h4 ref={heading} tabIndex={-1}>
        {t("Cargos del préstamo")}
      </h4>
      {!open ? (
        <button
          ref={entry}
          className="button button-outline"
          onClick={() => {
            setState(undefined);
            setOpen(true);
          }}
        >
          {t("Ver cargos del préstamo")}
        </button>
      ) : (
        <>
          {loading && <p role="status">{t("Cargando cargos...")}</p>}
          {current?.error && <p role="alert">{t(chargeMessages[current.error.code])}</p>}
          {current?.list?.length === 0 && (
            <p role="status">{t("Este préstamo no tiene cargos registrados.")}</p>
          )}
          {current?.list && current.list.length > 0 && (
            <ul className="loan-charge-list">
              {current.list.map((charge) => (
                <li key={charge.id}>
                  <h5>{charge.name}</h5>
                  <p>{t(chargeStatusLabels[charge.status])}</p>
                  <dl className="loan-details">
                    <dt>{t("Importe del cargo")}</dt>
                    <dd>
                      {charge.amount == null
                        ? t("Importe no disponible")
                        : money(charge.amount, charge.currency)}
                    </dd>
                    {charge.paidAmount != null && (
                      <>
                        <dt>{t("Importe pagado")}</dt>
                        <dd>{money(charge.paidAmount, charge.currency)}</dd>
                      </>
                    )}
                    {charge.outstanding != null && (
                      <>
                        <dt>{t("Importe pendiente")}</dt>
                        <dd>{money(charge.outstanding, charge.currency)}</dd>
                      </>
                    )}
                    {charge.waivedAmount != null && (
                      <>
                        <dt>{t("Importe condonado")}</dt>
                        <dd>{money(charge.waivedAmount, charge.currency)}</dd>
                      </>
                    )}
                    {charge.writtenOffAmount != null && (
                      <>
                        <dt>{t("Importe castigado")}</dt>
                        <dd>{money(charge.writtenOffAmount, charge.currency)}</dd>
                      </>
                    )}
                    {charge.dueDate && (
                      <>
                        <dt>{t("Fecha de vencimiento del cargo")}</dt>
                        <dd>
                          <time dateTime={charge.dueDate}>
                            {new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
                              new Date(`${charge.dueDate}T00:00:00Z`),
                            )}
                          </time>
                        </dd>
                      </>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          )}
          <div className="loan-actions">
            <button
              className="button button-outline"
              disabled={loading || current?.error?.code === "expired"}
              onClick={() => setRevision((r) => r + 1)}
            >
              {t("Actualizar cargos")}
            </button>
            <button
              className="button button-outline"
              onClick={() => {
                setOpen(false);
                setState(undefined);
                requestAnimationFrame(() => entry.current?.focus());
              }}
            >
              {t("Volver al detalle del préstamo")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
