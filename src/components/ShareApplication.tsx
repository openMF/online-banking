import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../i18n";
import { formatMoney, valueAtPrice } from "../lib/shares/client";
import type { SavingsSummary } from "../lib/accounts/client";
import {
  ShareApplicationError,
  applicationPayload,
  eligibleSavings,
  priceOn,
  type ApplicationFailure,
  type ShareApplicationClient,
  type ShareApplicationResult,
  type ShareProduct,
  type ShareTerms,
  type ShareValues,
} from "../lib/shares/application";

const messages: Record<ApplicationFailure, string> = {
  expired: "Tu sesión ha caducado. Inicia sesión de nuevo.",
  denied: "No tienes permiso para solicitar acciones con estas cuentas.",
  unavailable: "No pudimos consultar las condiciones de acciones. Vuelve a consultar.",
  malformed: "Las condiciones de acciones no son válidas. Vuelve a consultar.",
  invalid: "Revisa la cantidad entera de acciones, la fecha y la cuenta de ahorro seleccionada.",
  changed:
    "Las condiciones del producto cambiaron. Selecciona de nuevo el producto y revisa las condiciones.",
  rejected:
    "La institución rechazó la solicitud. Consulta las condiciones y la cuenta de ahorro antes de volver a revisar.",
  uncertain:
    "No podemos confirmar el resultado del envío. No vuelvas a solicitarlo; consulta tus cuentas de acciones o contacta a la institución.",
  blocked:
    "Ya existe un envío para este cliente en esta sesión. Consulta tus cuentas de acciones antes de solicitar de nuevo.",
  unsupported:
    "Este producto tiene condiciones que este canal no admite. Contacta a la institución.",
};
const statuses = {
  active: "Activa",
  pending: "Pendiente de aprobación",
  approved: "Aprobada, pendiente de activación",
  rejected: "Rechazada",
  closed: "Cerrada",
  unknown: "Estado no disponible",
};
const periods = ["Días", "Semanas", "Meses", "Años"];
const timing: Record<number, string> = {
  13: "Activación",
  14: "Compra de acciones",
  15: "Rescate de acciones",
};
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function ShareApplication({
  client,
  clientId,
  onExpired,
  onClose,
  onCreated,
}: {
  client: ShareApplicationClient;
  clientId: number;
  onExpired: () => void;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<ShareProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [terms, setTerms] = useState<ShareTerms>();
  const [accounts, setAccounts] = useState<SavingsSummary[]>([]);
  const [values, setValues] = useState<ShareValues>({
    savingsAccountId: "",
    requestedShares: "",
    date: today(),
  });
  const [review, setReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<ShareApplicationError>();
  const [result, setResult] = useState<ShareApplicationResult | undefined>(
    () => client.attempt(clientId)?.result,
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const outcome = useRef<HTMLHeadingElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const pending = useRef(false);
  const callbacks = useRef({ onExpired, onCreated });
  callbacks.current = { onExpired, onCreated };
  const blocked = Boolean(client.attempt(clientId));
  function fail(e: unknown) {
    if (!mounted.current) return;
    const next = e instanceof ShareApplicationError ? e : new ShareApplicationError("unavailable");
    setError(next);
    if (next.code === "expired") callbacks.current.onExpired();
  }
  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);
  useEffect(() => {
    if (result || error) outcome.current?.focus();
  }, [result, error]);
  useEffect(() => {
    if (blocked) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setTerms(undefined);
    setAccounts([]);
    setProducts([]);
    void Promise.all([
      client.loadProducts(clientId, controller.signal),
      client.savings(clientId, controller.signal),
    ]).then(
      ([list, savings]) => {
        if (!controller.signal.aborted) {
          setProducts(list);
          setAccounts(savings);
          setLoading(false);
        }
      },
      (e) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          fail(e);
        }
      },
    );
    return () => controller.abort();
  }, [client, clientId, revision]);
  useEffect(() => {
    setTerms(undefined);
    setReview(false);
    if (!productId || blocked) return;
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void client.loadTerms(clientId, Number(productId), controller.signal).then(
      (next) => {
        if (!controller.signal.aborted) {
          setTerms(next);
          setValues({
            savingsAccountId: "",
            requestedShares: next.nominal && next.nominal > 0 ? String(next.nominal) : "",
            date: today(),
          });
          setLoading(false);
        }
      },
      (e) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          fail(e);
        }
      },
    );
    return () => controller.abort();
  }, [client, clientId, productId, revision]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!terms || pending.current || blocked) return;
    try {
      applicationPayload(terms, accounts, values);
    } catch (e) {
      fail(e);
      return;
    }
    if (!review) {
      setError(undefined);
      setReview(true);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const next = await client.submit(terms, values);
      if (mounted.current) {
        setResult(next);
        setReview(false);
        callbacks.current.onCreated();
      }
    } catch (e) {
      fail(e);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function refresh() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const next = await client.refresh(clientId);
      if (mounted.current) {
        if (next) {
          setResult(next);
          callbacks.current.onCreated();
        } else setError(new ShareApplicationError("uncertain"));
      }
    } catch (e) {
      fail(e);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const eligible = terms ? eligibleSavings(accounts, terms) : [];
  const money = (amount: string | undefined) =>
    formatMoney(amount, terms?.currency, locale) ?? t("Valor no disponible");
  const estimate =
    terms &&
    /^[1-9]\d*$/.test(values.requestedShares) &&
    Number.isSafeInteger(Number(values.requestedShares))
      ? valueAtPrice(Number(values.requestedShares), priceOn(terms, values.date))
      : undefined;
  return (
    <section
      className="savings-application share-application"
      aria-labelledby="share-application-heading"
      aria-busy={loading || busy}
    >
      <h2 id="share-application-heading" ref={heading} tabIndex={-1}>
        {t("Solicitar acciones")}
      </h2>
      <p className="form-note">
        {t(
          "Esta solicitud crea una nueva cuenta de acciones. La institución confirma la aprobación, el pago y la emisión por separado.",
        )}
      </p>
      <p>
        {t("Cliente autorizado")}: {clientId}
      </p>
      {loading && <p role="status">{t("Consultando productos y condiciones...")}</p>}
      {busy && <p role="status">{t("Procesando solicitud...")}</p>}
      {error && (
        <h3 id="share-application-error" role="alert" ref={outcome} tabIndex={-1}>
          {t(messages[error.code])}
        </h3>
      )}
      {blocked && !result && !busy && error?.code !== "uncertain" && (
        <p role="status">{t(messages.uncertain)}</p>
      )}
      {result && (
        <div className="savings-summary" aria-live="polite">
          <h3 ref={outcome} tabIndex={-1}>
            {t("Solicitud de acciones recibida")}
          </h3>
          <dl className="loan-details">
            <dt>{t("ID de solicitud")}</dt>
            <dd>{result.resourceId}</dd>
            {result.account?.accountNo && (
              <>
                <dt>{t("Número de cuenta asignado")}</dt>
                <dd>{result.account.accountNo}</dd>
              </>
            )}
            {result.account?.productName && (
              <>
                <dt>{t("Producto de acciones")}</dt>
                <dd>{result.account.productName}</dd>
              </>
            )}
            <dt>{t("Acciones solicitadas")}</dt>
            <dd>
              {result.requested == null
                ? t("Dato no disponible")
                : new Intl.NumberFormat(locale).format(result.requested)}
            </dd>
            <dt>{t("Estado real de la solicitud")}</dt>
            <dd>
              {result.account ? t(statuses[result.account.status]) : t("Estado no disponible")}
            </dd>
          </dl>
          {!result.account && (
            <p role="status">
              {t(
                "El envío está confirmado, pero todavía no pudimos verificar el detalle y el estado. Consulta de nuevo sin reenviar.",
              )}
            </p>
          )}
          <p>
            {t(
              "Las acciones solicitadas no representan acciones emitidas ni un débito confirmado en tu ahorro.",
            )}
          </p>
        </div>
      )}
      {!blocked && (
        <>
          <label>
            {t("Producto de acciones")}
            <select
              value={productId}
              disabled={loading || busy || review}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">{t("Selecciona una opción")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {!loading && !error && !products.length && (
            <p role="status">{t("No hay productos de acciones disponibles.")}</p>
          )}
          {terms && (
            <form className="form-stack" onSubmit={submit}>
              <h3>{t("Condiciones del producto de acciones")}</h3>
              <p className="form-note">
                {t(
                  "La institución valida la disponibilidad y la elegibilidad al procesar la solicitud.",
                )}
              </p>
              <dl className="loan-details">
                <dt>{t("Moneda")}</dt>
                <dd>{terms.currency.code}</dd>
                <dt>{t("Precio unitario estimado para la fecha")}</dt>
                <dd>{money(priceOn(terms, values.date))}</dd>
                <dt>{t("Mínimo de acciones")}</dt>
                <dd>{terms.minimum ?? t("Dato no disponible")}</dd>
                <dt>{t("Acciones nominales")}</dt>
                <dd>{terms.nominal ?? t("Dato no disponible")}</dd>
                <dt>{t("Máximo de acciones")}</dt>
                <dd>{terms.maximum ?? t("Dato no disponible")}</dd>
                {terms.dividendsForInactive != null && (
                  <>
                    <dt>{t("Dividendos para clientes inactivos")}</dt>
                    <dd>{t(terms.dividendsForInactive ? "Sí" : "No")}</dd>
                  </>
                )}
                {terms.lockin && (
                  <>
                    <dt>{t("Periodo de bloqueo")}</dt>
                    <dd>
                      {terms.lockin.count} {t(periods[terms.lockin.unit])}
                    </dd>
                  </>
                )}
                {terms.minimumActive && (
                  <>
                    <dt>{t("Periodo mínimo activo para dividendos")}</dt>
                    <dd>
                      {terms.minimumActive.count} {t(periods[terms.minimumActive.unit])}
                    </dd>
                  </>
                )}
              </dl>
              <h4>{t("Cargos del producto")}</h4>
              {terms.charges.length ? (
                <ul>
                  {terms.charges.map((c) => (
                    <li key={c.id}>
                      {c.name}: {c.calculation === 1 ? money(c.amount) : `${c.amount}%`} ·{" "}
                      {t(timing[c.timing])}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("El producto no incluye cargos predeterminados.")}</p>
              )}
              <fieldset disabled={busy || review || loading}>
                <legend>{t("Datos de la solicitud de acciones")}</legend>
                <label>
                  {t("Cuenta de ahorro vinculada")}
                  <select
                    required
                    aria-invalid={error?.code === "invalid"}
                    aria-describedby={
                      error?.code === "invalid" ? "share-application-error" : undefined
                    }
                    value={values.savingsAccountId}
                    onChange={(e) => setValues((v) => ({ ...v, savingsAccountId: e.target.value }))}
                  >
                    <option value="">{t("Selecciona una opción")}</option>
                    {eligible.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountNo} · {a.productName} · {a.currency.code}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="form-note">
                  {t(
                    "Selecciona una cuenta de ahorro activa del mismo cliente y moneda. Enviar la solicitud no confirma un débito.",
                  )}
                </p>
                {!eligible.length && (
                  <p role="status">
                    {t("No hay cuentas de ahorro activas elegibles en la moneda del producto.")}
                  </p>
                )}
                <label>
                  {t("Acciones solicitadas")}
                  <input
                    type="number"
                    required
                    step="1"
                    min={Math.max(1, terms.minimum ?? 1)}
                    max={terms.maximum ?? Number.MAX_SAFE_INTEGER}
                    aria-invalid={error?.code === "invalid"}
                    aria-describedby={
                      error?.code === "invalid" ? "share-application-error" : undefined
                    }
                    value={values.requestedShares}
                    onChange={(e) => setValues((v) => ({ ...v, requestedShares: e.target.value }))}
                  />
                </label>
                <label>
                  {t("Fecha de solicitud")}
                  <input
                    type="date"
                    required
                    aria-invalid={error?.code === "invalid"}
                    aria-describedby={
                      error?.code === "invalid" ? "share-application-error" : undefined
                    }
                    value={values.date}
                    onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
                  />
                </label>
              </fieldset>
              <p>
                {t("Importe estimado de suscripción, sin cargos")}: {money(estimate)}
              </p>
              {review && (
                <div
                  className="savings-summary"
                  role="region"
                  aria-label={t("Revisar solicitud de acciones")}
                >
                  <h3 ref={reviewHeading} tabIndex={-1}>
                    {t("Revisar solicitud de acciones")}
                  </h3>
                  <dl className="loan-details">
                    <dt>{t("Cliente autorizado")}</dt>
                    <dd>{clientId}</dd>
                    <dt>{t("Producto de acciones")}</dt>
                    <dd>{terms.name}</dd>
                    <dt>{t("Cuenta de ahorro vinculada")}</dt>
                    <dd>
                      {eligible.find((a) => String(a.id) === values.savingsAccountId)?.accountNo}
                    </dd>
                    <dt>{t("Acciones solicitadas")}</dt>
                    <dd>{values.requestedShares}</dd>
                    <dt>{t("Fecha de solicitud")}</dt>
                    <dd>{values.date}</dd>
                  </dl>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => {
                      setReview(false);
                      heading.current?.focus();
                    }}
                  >
                    {t("Volver a corregir")}
                  </button>
                </div>
              )}
              <button
                type="submit"
                className="button button-primary"
                disabled={busy || loading || !eligible.length}
              >
                {t(
                  busy
                    ? "Procesando solicitud..."
                    : review
                      ? "Confirmar solicitud de acciones"
                      : "Revisar solicitud de acciones",
                )}
              </button>
            </form>
          )}
          <button
            className="button button-outline"
            disabled={busy || loading}
            onClick={() => {
              setProductId("");
              setRevision((r) => r + 1);
            }}
          >
            {t("Volver a consultar productos")}
          </button>
        </>
      )}
      <div className="loan-actions">
        {blocked && (
          <button className="button button-outline" disabled={busy} onClick={() => void refresh()}>
            {t("Consultar estado de acciones")}
          </button>
        )}
        <button className="button button-outline" disabled={busy} onClick={onClose}>
          {t("Volver a cuentas de acciones")}
        </button>
      </div>
    </section>
  );
}
