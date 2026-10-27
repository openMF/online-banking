import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../i18n";
import {
  SavingsError,
  type ApplicationResult,
  type SavingsAccount,
  type SavingsClient,
  type SavingsTemplate,
} from "../lib/savings/client";
import { savingsMessages } from "../lib/savings/messages";

export function SavingsApplication({
  client,
  clients,
  onExpired,
  onClose,
}: {
  client: SavingsClient;
  clients: readonly number[];
  onExpired: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [clientId, setClientId] = useState(clients.length === 1 ? String(clients[0]) : "");
  const [productId, setProductId] = useState("");
  const [template, setTemplate] = useState<SavingsTemplate>();
  const [products, setProducts] = useState<SavingsTemplate["products"]>([]);
  const [date, setDate] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SavingsError>();
  const [result, setResult] = useState<ApplicationResult | undefined>(client.result);
  const [accounts, setAccounts] = useState<SavingsAccount[]>();
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const outcome = useRef<HTMLHeadingElement>(null);
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;
  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (result || (error && client.locked)) outcome.current?.focus();
  }, [result, error, client]);
  function fail(failure: unknown) {
    const safe = failure instanceof SavingsError ? failure : new SavingsError("unavailable");
    if (safe.code === "expired") {
      expiredRef.current();
      return;
    }
    if (mounted.current) {
      setError(safe);
      if (safe.code === "denied") {
        setTemplate(undefined);
        setProducts([]);
        setAccounts(undefined);
      }
      if (safe.code === "changed") {
        setProductId("");
        setTemplate(undefined);
        setReviewed(false);
      }
    }
  }
  useEffect(() => {
    setTemplate(undefined);
    setReviewed(false);
    setError((current) => (current?.code === "changed" ? current : undefined));
    setDate("");
    if (!clientId || client.locked) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void client
      .loadTemplate(Number(clientId), productId ? Number(productId) : undefined, controller.signal)
      .then(
        (next) => {
          if (controller.signal.aborted) return;
          setProducts(next.products);
          setTemplate(next);
          setDate(next.submittedOnDate);
          setLoading(false);
        },
        (failure) => {
          if (!controller.signal.aborted) {
            setLoading(false);
            fail(failure);
          }
        },
      );
    return () => controller.abort();
  }, [client, clientId, productId, reload]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current || client.locked || !template?.productId || !reviewed || !date) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const next = await client.submit(Number(clientId), template.productId, date);
      if (mounted.current) setResult({ ...next });
    } catch (failure) {
      fail(failure);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function recover() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const next = await client.recover();
      if (mounted.current) {
        setAccounts(next);
        if (client.result) setResult({ ...client.result });
      }
    } catch (failure) {
      fail(failure);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const fieldNames: Record<string, string> = {
    productId: "Producto de ahorro",
    clientId: "Cliente autorizado",
    submittedOnDate: "Fecha de solicitud",
    charges: "Cargos del producto",
    datatables: "Información adicional",
  };
  function status(account: SavingsAccount) {
    const labels: Record<string, string> = {
      "savingsAccountStatusType.submitted.and.pending.approval": "Pendiente de aprobación",
      "savingsAccountStatusType.approved": "Aprobada",
      "savingsAccountStatusType.active": "Activa",
      "savingsAccountStatusType.rejected": "Rechazada",
      "savingsAccountStatusType.withdrawn.by.applicant": "Retirada por el solicitante",
      "savingsAccountStatusType.closed": "Cerrada",
    };
    return account.status
      ? t(labels[account.status.code] ?? account.status.value)
      : t("Estado aún no disponible");
  }
  const card = (account: SavingsAccount) => (
    <dl className="savings-summary" key={account.id}>
      <div>
        <dt>{t("Número de cuenta")}</dt>
        <dd>{account.accountNo ?? t("Número de cuenta aún no disponible")}</dd>
      </div>
      <div>
        <dt>{t("Estado de la solicitud")}</dt>
        <dd>{status(account)}</dd>
      </div>
      <div>
        <dt>{t("Producto de ahorro")}</dt>
        <dd>{account.productName ?? template?.productName ?? t("Información no disponible")}</dd>
      </div>
    </dl>
  );
  const submitted = Boolean(result) || (client.locked && !busy);
  return (
    <section className="savings-application" aria-labelledby="savings-heading" aria-busy={busy}>
      <h2 id="savings-heading" ref={heading} tabIndex={-1}>
        {t("Solicitar una cuenta de ahorro")}
      </h2>
      {error && (
        <div role="alert" className="form-error">
          <p>{t(savingsMessages[error.code])}</p>
          {error.fields.length > 0 && (
            <ul>
              {error.fields.map((field) => (
                <li key={field}>{t(fieldNames[field])}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {submitted ? (
        <div>
          <h3 ref={outcome} tabIndex={-1}>
            {t(result ? "Solicitud recibida" : "Resultado sin confirmar")}
          </h3>
          {!result && <p>{t(savingsMessages.uncertain)}</p>}
          {result?.account ? (
            <>
              {card(result.account)}
              {result.account.status?.code ===
                "savingsAccountStatusType.submitted.and.pending.approval" && (
                <p>{t("Tu solicitud espera aprobación. La cuenta todavía no está activa.")}</p>
              )}
              {result.account.status?.code === "savingsAccountStatusType.approved" && (
                <p>
                  {t(
                    "Tu solicitud fue aprobada. La cuenta aún requiere activación por tu institución.",
                  )}
                </p>
              )}
              {result.account.status?.code === "savingsAccountStatusType.active" && (
                <p>{t("Tu institución confirmó que la cuenta está activa.")}</p>
              )}
              {result.account.status?.code === "savingsAccountStatusType.rejected" && (
                <p>
                  {t(
                    "Tu institución rechazó la solicitud. Contáctala para conocer los siguientes pasos.",
                  )}
                </p>
              )}
            </>
          ) : (
            result && (
              <>
                <p>{t("Número de cuenta aún no disponible")}</p>
                <p>{t("Estado aún no disponible")}</p>
                <p>{template?.productName}</p>
                <p>
                  {t(
                    "La solicitud fue recibida, pero faltan datos de confirmación. Consulta de nuevo sin reenviarla.",
                  )}
                </p>
              </>
            )
          )}
          <button className="button button-outline" disabled={busy} onClick={recover}>
            {t("Consultar cuentas sin reenviar")}
          </button>
          {accounts && !result && (
            <div>
              <p>
                {t(
                  "Estas son tus cuentas. Esta consulta no confirma cuál corresponde a la solicitud sin respuesta.",
                )}
              </p>
              {accounts.length ? (
                accounts.map(card)
              ) : (
                <p>
                  {t(
                    "Aún no hay cuentas para mostrar. Contacta a tu institución antes de volver a solicitar.",
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {!clients.length ? (
            <p role="alert">
              {t(
                "Tu institución no ha vinculado un cliente autorizado. Contáctala para continuar.",
              )}
            </p>
          ) : (
            <form className="form-stack" onSubmit={submit}>
              <label>
                {t("Cliente autorizado")}
                <select
                  aria-label={t("Cliente autorizado")}
                  required
                  value={clientId}
                  disabled={busy}
                  onChange={(event) => {
                    setClientId(event.target.value);
                    setProductId("");
                    setProducts([]);
                  }}
                >
                  <option value="">{t("Selecciona un cliente")}</option>
                  {clients.map((id) => (
                    <option value={id} key={id}>
                      {template?.clientId === id ? template.clientName : String(id)}
                    </option>
                  ))}
                </select>
              </label>
              {loading && <p role="status">{t("Consultando productos y condiciones...")}</p>}
              {clientId && !loading && !error && !products.length && (
                <p role="status">
                  {t("No hay productos de ahorro disponibles para este cliente.")}
                </p>
              )}
              {clientId && products.length > 0 && (
                <label>
                  {t("Producto de ahorro")}
                  <select
                    aria-label={t("Producto de ahorro")}
                    required
                    disabled={loading || busy}
                    value={productId}
                    onChange={(event) => {
                      setProductId(event.target.value);
                      setReviewed(false);
                      setError(undefined);
                    }}
                  >
                    <option value="">{t("Selecciona un producto")}</option>
                    {products.map((product) => (
                      <option value={product.id} key={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {template?.productId && !loading && (
                <>
                  <dl className="savings-summary">
                    <div>
                      <dt>{t("Moneda")}</dt>
                      <dd>{template.currency?.code}</dd>
                    </div>
                    <div>
                      <dt>{t("Tasa de interés anual")}</dt>
                      <dd>
                        {new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }).format(
                          template.rate!,
                        )}
                        %
                      </dd>
                    </div>
                    {template.openingBalance != null && (
                      <div>
                        <dt>{t("Depósito mínimo de apertura")}</dt>
                        <dd>
                          {new Intl.NumberFormat(locale, {
                            style: "currency",
                            currency: template.currency!.code,
                            minimumFractionDigits: template.currency!.decimalPlaces,
                            maximumFractionDigits: template.currency!.decimalPlaces,
                          }).format(template.openingBalance)}
                        </dd>
                      </div>
                    )}
                    {template.charges.length > 0 && (
                      <div>
                        <dt>{t("Cargos del producto")}</dt>
                        <dd>
                          {template.chargeTerms
                            .map(
                              (charge) =>
                                `${t(charge.name)}: ${new Intl.NumberFormat(locale, charge.percent ? {} : { style: "currency", currency: template.currency!.code }).format(charge.amount)}${charge.percent ? "%" : ""}`,
                            )
                            .join(" · ")}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <p className="form-note">
                    {t(
                      "Las condiciones provienen de tu institución. Esta solicitud no realiza un depósito.",
                    )}
                  </p>
                  <label>
                    {t("Fecha de solicitud")}
                    <input
                      type="date"
                      required
                      disabled={busy}
                      value={date}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setReviewed(false);
                      }}
                    />
                  </label>
                  <label className="savings-review">
                    <input
                      type="checkbox"
                      required
                      checked={reviewed}
                      disabled={busy}
                      onChange={(event) => setReviewed(event.target.checked)}
                    />
                    {t("Revisé el producto y deseo enviar esta solicitud.")}
                  </label>
                </>
              )}
              <button
                type="submit"
                className="button button-primary"
                disabled={
                  busy ||
                  loading ||
                  !template?.productId ||
                  !date ||
                  !reviewed ||
                  Boolean(error && error.code !== "invalid")
                }
              >
                {t(busy ? "Enviando solicitud..." : "Enviar solicitud de ahorro")}
              </button>
            </form>
          )}
          {error && !busy && (
            <button
              className="button button-outline"
              onClick={() => setReload((value) => value + 1)}
            >
              {t("Volver a consultar productos")}
            </button>
          )}
        </>
      )}
      {busy && (
        <p role="status">
          {t("Verificando el resultado con tu institución. No envíes otra solicitud.")}
        </p>
      )}
      <button className="button button-outline" disabled={busy} onClick={onClose}>
        {t("Volver a mi sesión")}
      </button>
    </section>
  );
}
