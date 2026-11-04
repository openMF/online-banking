import { ShareApplication } from "./ShareApplication";
import type { ShareApplicationClient } from "../lib/shares/application";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  ShareError,
  formatMoney,
  type ShareAccount,
  type ShareClient,
  type Failure,
} from "../lib/shares/client";
const errors: Record<Failure, string> = {
  expired: "Tu sesión ha caducado. Inicia sesión de nuevo.",
  denied: "No tienes permiso para consultar estas acciones.",
  missing: "No se encontró la cuenta de acciones.",
  malformed: "La respuesta de acciones no es válida. Vuelve a consultar.",
  unavailable: "No pudimos cargar las cuentas de acciones. Inténtalo de nuevo.",
  cancelled: "La consulta fue cancelada. Vuelve a consultar.",
};
const statuses: Record<ShareAccount["status"], string> = {
  active: "Activa",
  pending: "Pendiente de aprobación",
  approved: "Aprobada, pendiente de activación",
  rejected: "Rechazada",
  closed: "Cerrada",
  unknown: "Estado no disponible",
};
export function ShareAccounts({
  client,
  application,
  clients,
  onExpired,
  onClose,
}: {
  client: ShareClient;
  application?: ShareApplicationClient;
  clients: readonly number[];
  onExpired: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<number | undefined>(() =>
    clients.length === 1 ? clients[0] : undefined,
  );
  const clientId = selected != null && clients.includes(selected) ? selected : undefined;
  const [applying, setApplying] = useState(false);
  const applyEntry = useRef<HTMLButtonElement>(null);
  const [accountId, setAccountId] = useState<number>();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    client: ShareClient;
    clientId: number;
    accountId?: number;
    revision: number;
    list?: ShareAccount[];
    detail?: ShareAccount;
    error?: ShareError;
  }>();
  const current =
    state?.client === client &&
    state.clientId === clientId &&
    state.accountId === accountId &&
    state.revision === revision
      ? state
      : undefined;
  const loading = clientId != null && !current;
  const heading = useRef<HTMLHeadingElement>(null);
  const lastAccount = useRef<number | undefined>(undefined);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const expired = useRef(onExpired);
  expired.current = onExpired;
  useEffect(() => {
    heading.current?.focus();
  }, [accountId]);
  useEffect(() => {
    if (clientId == null || applying) return;
    const controller = new AbortController();
    const task =
      accountId == null
        ? client.list(clientId, controller.signal)
        : client.detail(clientId, accountId, controller.signal);
    void task.then(
      (result) => {
        if (!controller.signal.aborted)
          setState({
            client,
            clientId,
            accountId,
            revision,
            ...(Array.isArray(result) ? { list: result } : { detail: result }),
          });
      },
      (e: unknown) => {
        if (controller.signal.aborted) return;
        const error = e instanceof ShareError ? e : new ShareError("unavailable");
        setState({ client, clientId, accountId, revision, error });
        if (error.code === "expired") expired.current();
      },
    );
    return () => controller.abort();
  }, [client, clientId, accountId, revision, applying]);
  useEffect(() => {
    if (current?.list && lastAccount.current != null) {
      buttons.current.get(lastAccount.current)?.focus();
      lastAccount.current = undefined;
    }
  }, [current]);
  const unavailable = t("Dato no disponible");
  const money = (v?: string, c?: ShareAccount["currency"]) =>
    formatMoney(v, c, locale) ?? t("Valor no disponible");
  const summary = (a: ShareAccount) => (
    <dl className="loan-details">
      <dt>{t("Número de cuenta")}</dt>
      <dd>{a.accountNo ?? String(a.id)}</dd>
      <dt>{t("Producto de acciones")}</dt>
      <dd>{a.productName ?? (a.productId ? String(a.productId) : unavailable)}</dd>
      <dt>{t("Estado de la cuenta")}</dt>
      <dd>{t(statuses[a.status])}</dd>
      <dt>{t("Acciones en tenencia")}</dt>
      <dd>{a.held == null ? unavailable : new Intl.NumberFormat(locale).format(a.held)}</dd>
      <dt>{t("Acciones aprobadas")}</dt>
      <dd>{a.approved == null ? unavailable : new Intl.NumberFormat(locale).format(a.approved)}</dd>
      <dt>{t("Acciones pendientes de aprobación")}</dt>
      <dd>{a.pending == null ? unavailable : new Intl.NumberFormat(locale).format(a.pending)}</dd>
      <dt>{t("Moneda")}</dt>
      <dd>{a.currency?.code ?? unavailable}</dd>
      <dt>{t("Valor al precio unitario actual")}</dt>
      <dd>{money(a.value, a.currency)}</dd>
    </dl>
  );
  if (applying && application && clientId != null)
    return (
      <ShareApplication
        key={clientId}
        client={application}
        clientId={clientId}
        onExpired={onExpired}
        onCreated={() => setRevision((r) => r + 1)}
        onClose={() => {
          setApplying(false);
          setAccountId(undefined);
          setRevision((r) => r + 1);
          requestAnimationFrame(() => applyEntry.current?.focus());
        }}
      />
    );
  return (
    <section className="share-accounts" aria-labelledby="shares-heading" aria-busy={loading}>
      <h2 id="shares-heading" ref={heading} tabIndex={-1}>
        {t(accountId == null ? "Mis cuentas de acciones" : "Detalle de la cuenta de acciones")}
      </h2>
      <label>
        {t("ID de cliente")}
        <select
          value={clientId ?? ""}
          onChange={(e) => {
            setSelected(e.target.value ? Number(e.target.value) : undefined);
            setAccountId(undefined);
            setState(undefined);
          }}
        >
          <option value="">{t("Selecciona un cliente")}</option>
          {clients.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      {clients.length === 0 && (
        <p role="status">{t("No hay clientes autorizados para consultar acciones.")}</p>
      )}
      {loading && <p role="status">{t("Cargando acciones...")}</p>}
      {current?.error && <p role="alert">{t(errors[current.error.code])}</p>}
      {current?.list?.length === 0 && <p role="status">{t("No tienes cuentas de acciones.")}</p>}
      {current?.list && (
        <ul className="share-list">
          {current.list.map((a) => (
            <li key={a.id}>
              <h3>{a.productName ?? t("Producto de acciones")}</h3>
              {summary(a)}
              {a.detailUnavailable && (
                <p role="status">
                  {t(
                    "Algunos detalles no están disponibles. Abre la cuenta para volver a consultar.",
                  )}
                </p>
              )}
              <button
                className="button button-outline"
                ref={(node) => {
                  if (node) buttons.current.set(a.id, node);
                  else buttons.current.delete(a.id);
                }}
                onClick={() => setAccountId(a.id)}
              >
                {t("Ver cuenta de acciones")} · {a.accountNo ?? a.id}
              </button>
            </li>
          ))}
        </ul>
      )}
      {current?.detail && (
        <>
          {summary(current.detail)}
          <dl className="loan-details">
            <dt>{t("Precio unitario actual")}</dt>
            <dd>{money(current.detail.unitPrice, current.detail.currency)}</dd>
          </dl>
          <p className="form-note">
            {t(
              "Valor calculado con las acciones en tenencia y el precio actual del producto informado por la institución.",
            )}
          </p>
          <h3>{t("Dividendos")}</h3>
          {current.detail.dividends == null ? (
            <p>{t("Información de dividendos no disponible.")}</p>
          ) : current.detail.dividends.length === 0 ? (
            <p>{t("No hay dividendos registrados.")}</p>
          ) : (
            <ul>
              {current.detail.dividends.map((d) => (
                <li key={d.id}>
                  {t(
                    d.status === "posted"
                      ? "Dividendo acreditado"
                      : d.status === "initiated"
                        ? "Dividendo pendiente"
                        : "Estado de dividendo no disponible",
                  )}{" "}
                  · {money(d.amount, current.detail?.currency)}{" "}
                  {d.date && (
                    <time dateTime={d.date}>
                      {new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
                        new Date(`${d.date}T00:00:00Z`),
                      )}
                    </time>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div className="loan-actions">
        {application && (
          <button
            className="button button-primary"
            ref={applyEntry}
            disabled={clientId == null}
            onClick={() => setApplying(true)}
          >
            {t("Solicitar acciones")}
          </button>
        )}
        <button
          className="button button-outline"
          disabled={loading || clientId == null || current?.error?.code === "expired"}
          onClick={() => setRevision((r) => r + 1)}
        >
          {t("Actualizar acciones")}
        </button>
        {accountId != null && (
          <button
            className="button button-outline"
            onClick={() => {
              lastAccount.current = accountId;
              setAccountId(undefined);
            }}
          >
            {t("Volver a cuentas de acciones")}
          </button>
        )}
        <button className="button button-outline" onClick={onClose}>
          {t("Volver al inicio")}
        </button>
      </div>
    </section>
  );
}
