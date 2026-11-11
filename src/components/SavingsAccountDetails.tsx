import { Fragment, useEffect, useRef, useState, type Ref } from "react";
import { translateWith, useI18n } from "../i18n";
import { AccountsError, type SavingsSummary } from "../lib/accounts/client";
import type {
  Movement,
  MovementDetail,
  SavingsDetails,
  SavingsDetailsClient,
} from "../lib/accounts/details";
import { detailsMessages, movementMessages, savingsStatusLabels } from "../lib/accounts/messages";
import { formatAmount } from "../lib/transfers";

// The label of each SavingsAccountTransactionType id. An id that is not here shows the server's label.
const movementLabels: Record<number, string> = {
  1: "Depósito",
  2: "Retiro",
  3: "Interés acreditado",
  4: "Comisión por retiro",
  5: "Comisión anual",
  6: "Cargo condonado",
  7: "Pago de cargo",
  8: "Pago de dividendos",
  10: "Interés devengado",
  12: "Transferencia iniciada",
  13: "Transferencia aprobada",
  14: "Transferencia retirada",
  15: "Transferencia rechazada",
  16: "Saldo castigado",
  17: "Interés por sobregiro",
  18: "Retención de impuestos",
  19: "Fondos inactivos transferidos",
  20: "Monto retenido",
  21: "Retención liberada",
};
const dateLabels: Record<keyof SavingsDetails["dates"], string> = {
  submitted: "Fecha de solicitud",
  approved: "Fecha de aprobación",
  activated: "Fecha de activación",
  closed: "Fecha de cierre",
};
// "−" is the minus sign (U+2212), not a hyphen: screen readers say "minus".
const signs: Record<Movement["direction"], string> = { in: "+", out: "−", none: "" };
const page = 20;
type Currency = SavingsSummary["currency"];
const money = (value: number, currency: Currency) =>
  `${formatAmount(value.toFixed(currency.decimalPlaces), currency.decimalPlaces)} ${currency.code}`;
const safe = (failure: unknown) =>
  failure instanceof AccountsError ? failure : new AccountsError("unavailable");

/** How a movement reads in the chosen language: its type, signed amount and day. */
function useLabels() {
  const { t, locale } = useI18n();
  return {
    t,
    locale,
    type: (movement: Movement) =>
      movementLabels[movement.type.id] ? t(movementLabels[movement.type.id]) : movement.type.value,
    amount: (movement: Movement, currency: Currency) =>
      `${signs[movement.direction]}${money(movement.amount, currency)}`,
    day: (value: string) => (
      <time dateTime={value}>
        {new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${value}T00:00:00Z`))}
      </time>
    ),
  };
}

/** One savings account of the signed-in customer and its movements (US-E04-02). Read only. */
export function SavingsAccountDetails({
  client,
  account,
  onExpired,
  onClose,
}: {
  client: SavingsDetailsClient;
  /** The row the customer opened. It names the account until the details arrive. */
  account: SavingsSummary;
  onExpired: () => void;
  onClose: () => void;
}) {
  const { t, locale, day } = useLabels();
  /** How many movements the customer asked to see. */
  const [wanted, setWanted] = useState(page);
  const [loaded, setLoaded] = useState<{
    accountId: number;
    listed: number;
    details: SavingsDetails;
  }>();
  const [error, setError] = useState<AccountsError>();
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const toggles = useRef(new Map<number, HTMLButtonElement>());
  const firstNew = useRef<number | undefined>(undefined);
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;
  // Never the details of another account. While more movements are read, the listed ones stay.
  const current = loaded?.accountId === account.id ? loaded : undefined;
  const details = current?.details;
  const listed = current?.listed ?? 0;
  const loading = !details && !error;
  const loadingMore = !!details && listed < wanted;
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    setError(undefined);
    const controller = new AbortController();
    // One more than is listed, to know whether there are more. The plugin has no offset, so
    // "show more" reads the newest ones again.
    void client.details(account.id, wanted + 1, controller.signal).then(
      (next) => {
        if (!controller.signal.aborted)
          setLoaded({ accountId: account.id, listed: wanted, details: next });
      },
      (failure) => {
        if (controller.signal.aborted) return;
        const known = safe(failure);
        if (known.code === "expired") expiredRef.current();
        else {
          setLoaded(undefined);
          setError(known);
        }
      },
    );
    return () => controller.abort();
  }, [client, account.id, attempt, wanted]);
  useEffect(() => {
    // After "show more", the first movement that was not listed before.
    if (firstNew.current == null) return;
    toggles.current.get(firstNew.current)?.focus();
    firstNew.current = undefined;
  }, [listed]);
  const shown = details ?? account;
  const currency = shown.currency;
  const dates = details
    ? (Object.entries(dateLabels) as [keyof SavingsDetails["dates"], string][]).flatMap(
        ([key, label]) => {
          const value = details.dates[key];
          return value ? [[label, value] as const] : [];
        },
      )
    : [];
  return (
    <section
      className="savings-details"
      aria-labelledby="savings-details-heading"
      aria-busy={loading || loadingMore}
      data-testid="savings-account-details"
    >
      <div className="account-item-heading">
        <h2 id="savings-details-heading" ref={heading} tabIndex={-1}>
          {shown.productName ?? t("Cuenta de ahorro")}
        </h2>
        <span className="account-status">
          {savingsStatusLabels[shown.status.id]
            ? t(savingsStatusLabels[shown.status.id])
            : shown.status.value}
        </span>
      </div>
      <p className="account-item-meta">
        {translateWith("Cuenta {number}", { number: shown.accountNo })}
      </p>
      <p className="savings-accounts-status" role="status">
        {loading
          ? t("Consultando tu cuenta…")
          : loadingMore
            ? t("Consultando más movimientos…")
            : ""}
      </p>
      {error && (
        <div className="savings-accounts-error">
          <p className="form-error" role="alert">
            {t(detailsMessages[error.code])}
          </p>
          {error.code !== "denied" && (
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => setAttempt((current) => current + 1)}
            >
              {t("Reintentar")}
            </button>
          )}
        </div>
      )}
      {details && (
        <>
          {details.balances && (
            <dl className="loan-details">
              <dt>{t("Saldo disponible")}</dt>
              <dd>{money(details.balances.available, currency)}</dd>
              {details.balances.onHold > 0 && (
                <>
                  <dt>{t("Saldo contable")}</dt>
                  <dd>{money(details.balances.ledger, currency)}</dd>
                  <dt>{t("Monto retenido")}</dt>
                  <dd>{money(details.balances.onHold, currency)}</dd>
                </>
              )}
            </dl>
          )}
          <h3>{t("Interés")}</h3>
          <dl className="loan-details">
            <dt>{t("Tasa de interés anual")}</dt>
            <dd>
              {new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }).format(
                details.interest.rate,
              )}
              %
            </dd>
            {details.interest.earned !== undefined && (
              <>
                <dt>{t("Interés ganado")}</dt>
                <dd>{money(details.interest.earned, currency)}</dd>
              </>
            )}
            {details.interest.posted !== undefined && (
              <>
                <dt>{t("Interés acreditado")}</dt>
                <dd>{money(details.interest.posted, currency)}</dd>
              </>
            )}
          </dl>
          {dates.length > 0 && (
            <>
              <h3>{t("Fechas")}</h3>
              <dl className="loan-details">
                {dates.map(([label, value]) => (
                  <Fragment key={label}>
                    <dt>{t(label)}</dt>
                    <dd>{day(value)}</dd>
                  </Fragment>
                ))}
              </dl>
            </>
          )}
          <h3>{t("Movimientos")}</h3>
          {/* The plugin leaves some out: reversed ones, and deposits or withdrawals without payment details. */}
          <p className="savings-details-note">
            {t("Algunos movimientos, como los revertidos, pueden no mostrarse aquí.")}
          </p>
          {details.movements.length === 0 ? (
            <p className="savings-accounts-empty">{t("No hay movimientos para mostrar.")}</p>
          ) : (
            <ol className="account-list">
              {details.movements.slice(0, listed).map((movement) => (
                <MovementRow
                  key={movement.id}
                  client={client}
                  accountId={details.id}
                  movement={movement}
                  currency={currency}
                  onExpired={onExpired}
                  toggle={(node) => {
                    if (node) toggles.current.set(movement.id, node);
                    else toggles.current.delete(movement.id);
                  }}
                />
              ))}
            </ol>
          )}
          {details.movements.length > listed && (
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => {
                firstNew.current = details.movements[listed].id;
                setWanted(listed + page);
              }}
            >
              {t("Mostrar más movimientos")}
            </button>
          )}
        </>
      )}
      <div className="loan-actions">
        <button type="button" className="button button-outline" onClick={onClose}>
          {t("Volver a mi sesión")}
        </button>
      </div>
    </section>
  );
}

/** A movement that opens in place, read once from its own endpoint. */
function MovementRow({
  client,
  accountId,
  movement,
  currency,
  onExpired,
  toggle,
}: {
  client: SavingsDetailsClient;
  accountId: number;
  movement: Movement;
  currency: Currency;
  onExpired: () => void;
  toggle: Ref<HTMLButtonElement>;
}) {
  const { t, type, amount, day } = useLabels();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MovementDetail>();
  const [error, setError] = useState<AccountsError>();
  const [attempt, setAttempt] = useState(0);
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;
  useEffect(() => {
    if (!open || detail) return;
    setError(undefined);
    const controller = new AbortController();
    void client.movement(accountId, movement.id, controller.signal).then(
      (next) => {
        if (!controller.signal.aborted) setDetail(next);
      },
      (failure) => {
        if (controller.signal.aborted) return;
        const known = safe(failure);
        if (known.code === "expired") expiredRef.current();
        else setError(known);
      },
    );
    return () => controller.abort();
  }, [client, accountId, movement.id, open, detail, attempt]);
  const panel = `movement-${movement.id}-detail`;
  return (
    <li className="account-item movement-item" data-testid={`movement-${movement.id}`}>
      <button
        type="button"
        className="movement-toggle"
        ref={toggle}
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="movement-heading">
          <span className="movement-type">{type(movement)}</span>
          <span className="movement-amount">{amount(movement, currency)}</span>
        </span>
        <span className="movement-meta">
          {day(movement.date)}
          {movement.runningBalance !== undefined &&
            ` · ${translateWith("Saldo {amount}", { amount: money(movement.runningBalance, currency) })}`}
        </span>
      </button>
      <div id={panel} className="movement-detail" hidden={!open}>
        {open && !detail && !error && (
          <p className="savings-accounts-empty" role="status">
            {t("Consultando el movimiento…")}
          </p>
        )}
        {open && error && (
          <div className="savings-accounts-error">
            <p className="form-error" role="alert">
              {t(movementMessages[error.code])}
            </p>
            {error.code !== "denied" && (
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => setAttempt((current) => current + 1)}
              >
                {t("Reintentar")}
              </button>
            )}
          </div>
        )}
        {open && detail && (
          <>
            <dl className="loan-details">
              <dt>{t("Tipo de movimiento")}</dt>
              <dd>{type(detail)}</dd>
              <dt>{t("Fecha")}</dt>
              <dd>{day(detail.date)}</dd>
              <dt>{t("Monto")}</dt>
              <dd>{amount(detail, currency)}</dd>
              {detail.runningBalance !== undefined && (
                <>
                  <dt>{t("Saldo después del movimiento")}</dt>
                  <dd>{money(detail.runningBalance, currency)}</dd>
                </>
              )}
              {detail.paymentType && (
                <>
                  <dt>{t("Forma de pago")}</dt>
                  <dd>{detail.paymentType}</dd>
                </>
              )}
              {detail.receiptNumber && (
                <>
                  <dt>{t("Número de recibo")}</dt>
                  <dd>{detail.receiptNumber}</dd>
                </>
              )}
              {detail.note && (
                <>
                  <dt>{t("Nota")}</dt>
                  <dd>{detail.note}</dd>
                </>
              )}
            </dl>
            {detail.reversed && <p className="form-note">{t("Este movimiento fue revertido.")}</p>}
          </>
        )}
      </div>
    </li>
  );
}
