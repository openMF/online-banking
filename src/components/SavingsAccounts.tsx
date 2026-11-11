import { useEffect, useRef, useState } from "react";
import { translateWith, useI18n } from "../i18n";
import {
  AccountsError,
  type AccountsClient,
  type ClientSavings,
  type SavingsSummary,
} from "../lib/accounts/client";
import { accountsMessages, savingsStatusLabels } from "../lib/accounts/messages";
import { formatAmount } from "../lib/transfers";

const depositLabels: Partial<Record<SavingsSummary["depositType"], string>> = {
  fixed: "Depósito a plazo fijo",
  recurring: "Depósito recurrente",
  current: "Cuenta corriente",
};

/** The savings accounts of every client linked to this login (US-E04-01). Read only. */
export function SavingsAccounts({
  client,
  onExpired,
  onOpen,
  focusAccount,
  onFocused,
}: {
  client: AccountsClient;
  onExpired: () => void;
  /** Opens the details of a plain savings account (US-E04-02). */
  onOpen?: (account: SavingsSummary) => void;
  /** The account the customer comes back from: its row gets the focus once the list is read. */
  focusAccount?: number;
  onFocused?: () => void;
}) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<ClientSavings[]>();
  const [error, setError] = useState<AccountsError>();
  const [attempt, setAttempt] = useState(0);
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;
  const heading = useRef<HTMLHeadingElement>(null);
  const opens = useRef(new Map<number, HTMLButtonElement>());
  const loading = !groups && !error;
  useEffect(() => {
    setGroups(undefined);
    setError(undefined);
    const controller = new AbortController();
    void client.listSavings(controller.signal).then(
      (next) => {
        if (!controller.signal.aborted) setGroups(next);
      },
      (failure) => {
        if (controller.signal.aborted) return;
        const safe = failure instanceof AccountsError ? failure : new AccountsError("unavailable");
        if (safe.code === "expired") expiredRef.current();
        else setError(safe);
      },
    );
    return () => controller.abort();
  }, [client, attempt]);
  useEffect(() => {
    if (loading || focusAccount == null) return;
    // Unless the customer has already moved on while the list was read.
    if (!document.activeElement || document.activeElement === document.body)
      (opens.current.get(focusAccount) ?? heading.current)?.focus();
    onFocused?.();
  }, [loading, focusAccount, onFocused]);
  const status = (account: SavingsSummary) =>
    savingsStatusLabels[account.status.id]
      ? t(savingsStatusLabels[account.status.id])
      : account.status.value;
  const row = (account: SavingsSummary) => {
    const deposit = depositLabels[account.depositType];
    const places = account.currency.decimalPlaces;
    const product = account.productName ?? t("Cuenta de ahorro");
    return (
      <li className="account-item" key={account.id} data-testid={`savings-account-${account.id}`}>
        <div className="account-item-heading">
          {onOpen && account.depositType === "savings" ? (
            // Fineract reads the details of plain savings accounts only, not of deposit products.
            <button
              type="button"
              className="account-item-open"
              aria-label={translateWith("Ver detalles de {product}, cuenta {number}", {
                product,
                number: account.accountNo,
              })}
              ref={(node) => {
                if (node) opens.current.set(account.id, node);
                else opens.current.delete(account.id);
              }}
              onClick={() => onOpen(account)}
            >
              {product}
            </button>
          ) : (
            <strong>{product}</strong>
          )}
          <span className="account-status">{status(account)}</span>
        </div>
        <p className="account-item-meta">
          {deposit && `${t(deposit)} · `}
          {translateWith("Cuenta {number}", { number: account.accountNo })}
        </p>
        {account.availableBalance !== undefined && (
          <dl className="account-item-balance">
            <dt>{t("Saldo disponible")}</dt>
            <dd>
              {`${formatAmount(account.availableBalance.toFixed(places), places)} ${account.currency.code}`}
            </dd>
          </dl>
        )}
      </li>
    );
  };
  const empty = groups?.every((group) => group.accounts.length === 0);
  return (
    <section
      className="savings-accounts"
      aria-labelledby="savings-accounts-heading"
      aria-busy={loading}
      data-testid="savings-accounts"
    >
      <h2 id="savings-accounts-heading" ref={heading} tabIndex={-1}>
        {t("Mis cuentas de ahorro")}
      </h2>
      <p className="savings-accounts-status" role="status">
        {loading ? t("Consultando tus cuentas de ahorro…") : ""}
      </p>
      {error && (
        <div className="savings-accounts-error">
          <p className="form-error" role="alert">
            {t(accountsMessages[error.code])}
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
      {groups &&
        (empty ? (
          <p className="savings-accounts-empty">{t("Aún no tienes cuentas de ahorro.")}</p>
        ) : groups.length === 1 ? (
          <ul className="account-list">{groups[0].accounts.map(row)}</ul>
        ) : (
          groups.map((group) => (
            <div key={group.clientId} className="savings-accounts-client">
              <h3>{translateWith("Cliente {id}", { id: group.clientId })}</h3>
              {group.accounts.length ? (
                <ul className="account-list">{group.accounts.map(row)}</ul>
              ) : (
                <p className="savings-accounts-empty">{t("Sin cuentas de ahorro.")}</p>
              )}
            </div>
          ))
        ))}
    </section>
  );
}
