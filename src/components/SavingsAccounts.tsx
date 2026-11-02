import { useEffect, useRef, useState } from "react";
import { translateWith, useI18n } from "../i18n";
import {
  AccountsError,
  type AccountsClient,
  type ClientSavings,
  type SavingsSummary,
} from "../lib/accounts/client";
import { accountsMessages } from "../lib/accounts/messages";
import { formatAmount } from "../lib/transfers";

const statusLabels: Record<number, string> = {
  100: "Pendiente de aprobación",
  200: "Aprobada",
  300: "Activa",
  303: "Transferencia en curso",
  304: "Transferencia en espera",
  400: "Retirada por el solicitante",
  500: "Rechazada",
  600: "Cerrada",
  700: "Cerrada anticipadamente",
  800: "Vencida",
};
const depositLabels: Partial<Record<SavingsSummary["depositType"], string>> = {
  fixed: "Depósito a plazo fijo",
  recurring: "Depósito recurrente",
  current: "Cuenta corriente",
};

/** The savings accounts of every client linked to this login (US-E04-01). Read only. */
export function SavingsAccounts({
  client,
  onExpired,
}: {
  client: AccountsClient;
  onExpired: () => void;
}) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<ClientSavings[]>();
  const [error, setError] = useState<AccountsError>();
  const [attempt, setAttempt] = useState(0);
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;
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
  const status = (account: SavingsSummary) =>
    statusLabels[account.status.id] ? t(statusLabels[account.status.id]) : account.status.value;
  const row = (account: SavingsSummary) => {
    const deposit = depositLabels[account.depositType];
    const places = account.currency.decimalPlaces;
    return (
      <li className="account-item" key={account.id} data-testid={`savings-account-${account.id}`}>
        <div className="account-item-heading">
          <strong>{account.productName ?? t("Cuenta de ahorro")}</strong>
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
      <h2 id="savings-accounts-heading">{t("Mis cuentas de ahorro")}</h2>
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
