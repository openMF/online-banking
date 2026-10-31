import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../i18n";
import {
  LoanError,
  payload,
  valuesFor,
  type Loan,
  type LoanClient,
  type Option,
  type Template,
  type Values,
} from "../lib/loans/client";
import { loanMessages, statusLabel } from "../lib/loans/messages";
import type { GuarantorClient } from "../lib/loans/guarantors";
import { LoanGuarantors } from "./LoanGuarantors";

export function LoanApplication({
  client,
  guarantors,
  clients,
  onExpired,
  onClose,
}: {
  client: LoanClient;
  guarantors?: GuarantorClient;
  clients: readonly number[];
  onExpired: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [clientId, setClientId] = useState(clients.length === 1 ? String(clients[0]) : "");
  const [products, setProducts] = useState<Option[]>([]);
  const [accounts, setAccounts] = useState<Option[]>([]);
  const [productId, setProductId] = useState("");
  const [template, setTemplate] = useState<Template>();
  const [values, setValues] = useState<Values>({});
  const [loan, setLoan] = useState<Loan>();
  const [editing, setEditing] = useState(false);
  const [review, setReview] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawnOnDate, setWithdrawnOnDate] = useState("");
  const [error, setError] = useState<LoanError>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false),
    mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null),
    outcome = useRef<HTMLHeadingElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    withdrawButton = useRef<HTMLButtonElement>(null);
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;
  function fail(e: unknown) {
    const safe = e instanceof LoanError ? e : new LoanError("unavailable");
    if (safe.code === "expired") {
      expiredRef.current();
      return;
    }
    if (!mounted.current) return;
    setError(safe);
    setReview(false);
    if (["denied", "malformed"].includes(safe.code)) {
      setLoan(undefined);
      setTemplate(undefined);
      setAccounts([]);
      setProducts([]);
    }
    if (safe.code === "changed") {
      setEditing(false);
      setTemplate(undefined);
    }
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
    if (loan || error) outcome.current?.focus();
  }, [loan, error]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setTemplate(undefined);
    setProductId("");
    setAccounts([]);
    setLoan(undefined);
    setEditing(false);
    setReview(false);
    void (async () => {
      try {
        const options = await client.loadProducts(controller.signal);
        if (controller.signal.aborted) return;
        setProducts(options);
        if (clientId) {
          const eligible = await client.eligibleProducts(Number(clientId), controller.signal);
          if (controller.signal.aborted) return;
          setProducts(eligible);
          const list = await client.list(Number(clientId), controller.signal);
          if (controller.signal.aborted) return;
          setAccounts(list);
        }
        if (client.lastId) {
          const current = await client.details(client.lastId);
          if (!controller.signal.aborted) setLoan(current);
        }
      } catch (e) {
        if (!controller.signal.aborted) fail(e);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [client, clientId, revision]);
  useEffect(() => {
    if (loan) return;
    setTemplate(undefined);
    setReview(false);
    if (!clientId || !productId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void client.loadTemplate(Number(clientId), Number(productId), controller.signal).then(
      (next) => {
        if (!controller.signal.aborted) {
          setTemplate(next);
          setValues(valuesFor(next));
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
  }, [client, clientId, productId, loan]);
  useEffect(() => {
    if (confirmWithdraw) {
      dialog.current?.showModal();
      cancel.current?.focus();
    } else if (dialog.current?.open) {
      dialog.current.close();
      withdrawButton.current?.focus();
    }
  }, [confirmWithdraw]);
  async function run(task: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await task();
    } catch (e) {
      fail(e);
      if (e instanceof LoanError && e.code === "changed" && loan) {
        try {
          const current = await client.details(loan.id);
          if (mounted.current) setLoan(current);
        } catch (refreshError) {
          fail(refreshError);
        }
      }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function refresh() {
    await run(async () => {
      if (loan) {
        const next = await client.details(loan.id);
        if (mounted.current) {
          setLoan(next);
          setEditing(false);
          setTemplate(undefined);
        }
      } else if (client.lastId) {
        const next = await client.details(client.lastId);
        if (mounted.current) setLoan(next);
      }
      if (clientId) {
        const list = await client.list(Number(clientId));
        if (mounted.current) setAccounts(list);
      }
    });
  }
  async function open(id: number) {
    await run(async () => {
      const next = await client.details(id);
      if (mounted.current) {
        setLoan(next);
        setEditing(false);
        setTemplate(undefined);
        setReview(false);
      }
    });
  }
  async function edit() {
    if (!loan) return;
    await run(async () => {
      const current = await client.details(loan.id);
      if (mounted.current) setLoan(current);
      if (!current.pending) throw new LoanError("changed");
      const next = await client.loadTemplate(current.clientId, current.productId);
      if (mounted.current) {
        setTemplate(next);
        setValues(valuesFor(next, current));
        setEditing(true);
        setReview(false);
      }
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!template || pending.current) return;
    try {
      payload(template, values, editing);
    } catch (e) {
      fail(e);
      return;
    }
    if (!review) {
      setReview(true);
      return;
    }
    await run(async () => {
      const next =
        editing && loan ? await client.update(loan, values) : await client.submit(template, values);
      if (mounted.current) {
        setLoan(next);
        setEditing(false);
        setTemplate(undefined);
        setReview(false);
      }
    });
  }
  const writeBlocked = loan ? client.isBlocked(loan.id) : client.createBlocked;
  const fields =
    template?.fields.filter(
      (f) => !editing || (f.key !== "submittedOnDate" && !f.key.startsWith("chargeDate")),
    ) ?? [];
  return (
    <section
      className="savings-application loan-application"
      aria-labelledby="loan-heading"
      aria-busy={busy || loading}
    >
      <h2 id="loan-heading" tabIndex={-1} ref={heading}>
        {t("Solicitudes de préstamo")}
      </h2>
      <p className="form-note">
        {t("La institución decide la aprobación. Esta solicitud no desembolsa fondos.")}
      </p>
      {loading && <p role="status">{t("Consultando productos y condiciones...")}</p>}
      {error && (
        <div role="alert">
          <h3 ref={outcome} tabIndex={-1}>
            {t(loanMessages[error.code])}
          </h3>
          {error.fields.length > 0 && (
            <p>
              {error.fields
                .map((key) =>
                  t(
                    template?.fields.find((f) => f.key === key)?.label ??
                      (key === "withdrawnOnDate" ? "Fecha de retiro" : "Condiciones del préstamo"),
                  ),
                )
                .join(", ")}
            </p>
          )}
        </div>
      )}
      {writeBlocked && !loan && (
        <p role="status">
          {t(
            "La solicitud anterior está enviada o sin confirmar. No vuelvas a enviarla; consulta las solicitudes.",
          )}
        </p>
      )}
      <label>
        {t("Cliente autorizado")}
        <select
          value={clientId}
          disabled={busy || loading || Boolean(loan)}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">{t("Selecciona una opción")}</option>
          {clients.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      {!clients.length && (
        <p role="status">{t("No hay clientes autorizados para solicitar un préstamo.")}</p>
      )}
      {accounts.length > 0 && (
        <div className="loan-list">
          <h3>{t("Mis solicitudes y préstamos")}</h3>
          {accounts.map((a) => (
            <button
              key={a.id}
              className="button button-outline"
              disabled={busy || loading}
              onClick={() => void open(a.id)}
            >
              {a.name} · {t("ID de solicitud")}: {a.id}
            </button>
          ))}
        </div>
      )}
      {loan && (
        <div className="savings-summary" aria-live="polite">
          <h3 ref={outcome} tabIndex={-1}>
            {t("Detalle de la solicitud")}
          </h3>
          <dl className="loan-details">
            <dt>{t("ID de solicitud")}</dt>
            <dd>{loan.id}</dd>
            {loan.accountNo && (
              <>
                <dt>{t("Número de cuenta asignado")}</dt>
                <dd>{loan.accountNo}</dd>
              </>
            )}
            <dt>{t("Producto de préstamo")}</dt>
            <dd>{loan.productName}</dd>
            <dt>{t("Monto solicitado")}</dt>
            <dd>
              {loan.principal} {loan.currency}
            </dd>
            {loan.term && (
              <>
                <dt>{t("Plazo del préstamo")}</dt>
                <dd>
                  {loan.term} {loan.termUnit}
                </dd>
              </>
            )}
            <dt>{t("Estado real de la solicitud")}</dt>
            <dd>{t(statusLabel(loan.status.code, loan.status.value))}</dd>
            {loan.submittedOnDate && (
              <>
                <dt>{t("Fecha de solicitud")}</dt>
                <dd>{loan.submittedOnDate}</dd>
              </>
            )}
          </dl>
          {guarantors && (
            <LoanGuarantors
              key={loan.id}
              client={guarantors}
              loanId={loan.id}
              onExpired={onExpired}
            />
          )}
          {loan.pending && (
            <p>{t("Tu institución debe revisar y aprobar la solicitud antes del desembolso.")}</p>
          )}
          {client.isBlocked(loan.id) && <p role="status">{t(loanMessages.uncertain)}</p>}
          {loan.pending && !editing && !client.isBlocked(loan.id) && (
            <div className="loan-actions">
              <button className="button button-outline" disabled={busy} onClick={() => void edit()}>
                {t("Corregir solicitud")}
              </button>
              <button
                ref={withdrawButton}
                className="button button-outline"
                disabled={busy}
                onClick={() => {
                  setWithdrawnOnDate("");
                  setConfirmWithdraw(true);
                }}
              >
                {t("Retirar solicitud")}
              </button>
            </div>
          )}
        </div>
      )}
      {!loan && !writeBlocked && (
        <label>
          {t("Producto de préstamo")}
          <select
            required
            disabled={!clientId || busy || loading}
            value={productId}
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
      )}
      {!loading && clientId && !products.length && !error && (
        <p role="status">{t("No hay productos de préstamo disponibles.")}</p>
      )}
      {template && (!loan || editing) && !writeBlocked && (
        <form className="form-stack" onSubmit={submit}>
          <p>
            {template.clientName} · {template.name} · {template.currency}
          </p>
          <fieldset disabled={busy || review}>
            <legend>{t("Condiciones del préstamo")}</legend>
            {fields.map((f) => (
              <label key={f.key}>
                {t(f.label)} {f.hint && <span>{f.hint}</span>}
                {f.type === "select" ? (
                  <select
                    value={values[f.key] ?? ""}
                    required={f.required}
                    disabled={f.fixed}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [f.key]: e.target.value }));
                      setError(undefined);
                    }}
                    aria-invalid={error?.fields.includes(f.key)}
                    aria-describedby={error?.fields.includes(f.key) ? "loan-validation" : undefined}
                  >
                    <option value="">{t("Selecciona una opción")}</option>
                    {f.options?.map((o) => (
                      <option value={o.value} key={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    disabled={f.fixed}
                    value={values[f.key] ?? ""}
                    required={f.required}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [f.key]: e.target.value }));
                      setError(undefined);
                    }}
                    aria-invalid={error?.fields.includes(f.key)}
                    aria-describedby={error?.fields.includes(f.key) ? "loan-validation" : undefined}
                  />
                )}
              </label>
            ))}
          </fieldset>
          <p id="loan-validation" className="form-note">
            {t(
              "Los importes y condiciones provienen del producto. El calendario definitivo lo confirma la institución.",
            )}
          </p>
          {!editing && template.charges.length > 0 && (
            <div>
              <h4>{t("Cargos del producto")}</h4>
              {template.charges.map((c, i) => (
                <p key={i}>
                  {c.name}: {c.amount} · {c.basis}
                </p>
              ))}
            </div>
          )}
          {review && (
            <div
              className="savings-summary"
              role="region"
              aria-label={t("Revisar solicitud de préstamo")}
            >
              <h3 ref={reviewHeading} tabIndex={-1}>
                {t("Revisar solicitud de préstamo")}
              </h3>
              <dl>
                {fields
                  .filter((f) => values[f.key])
                  .map((f) => (
                    <div key={f.key}>
                      <dt>{t(f.label)}</dt>
                      <dd>
                        {f.options?.find((o) => o.value === values[f.key])?.label ?? values[f.key]}
                      </dd>
                    </div>
                  ))}
              </dl>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setReview(false)}
              >
                {t("Volver a corregir")}
              </button>
            </div>
          )}
          <button type="submit" className="button button-primary" disabled={busy || loading}>
            {t(
              busy
                ? "Procesando solicitud..."
                : review
                  ? editing
                    ? "Confirmar corrección"
                    : "Confirmar solicitud de préstamo"
                  : "Revisar solicitud de préstamo",
            )}
          </button>
          {editing && (
            <button
              type="button"
              className="button button-outline"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setTemplate(undefined);
              }}
            >
              {t("Cancelar")}
            </button>
          )}
        </form>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="withdraw-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setConfirmWithdraw(false);
        }}
      >
        <h3 id="withdraw-title">{t("Retirar solicitud")}</h3>
        <p>
          {t(
            "El retiro termina la solicitud y conserva el historial bancario. Confirma que deseas retirarla.",
          )}
        </p>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!loan || pending.current) return;
            void run(async () => {
              const next = await client.withdraw(loan.id, withdrawnOnDate);
              if (mounted.current) setLoan(next);
            }).finally(() => {
              if (mounted.current) setConfirmWithdraw(false);
            });
          }}
        >
          <label>
            {t("Fecha de retiro")}
            <input
              type="date"
              required
              min={loan?.submittedOnDate}
              disabled={busy}
              value={withdrawnOnDate}
              onChange={(e) => setWithdrawnOnDate(e.target.value)}
            />
          </label>
          <button
            ref={cancel}
            type="button"
            className="button button-outline"
            disabled={busy}
            onClick={() => setConfirmWithdraw(false)}
          >
            {t("Cancelar")}
          </button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {t("Confirmar retiro")}
          </button>
        </form>
      </dialog>
      <div className="loan-actions">
        <button
          className="button button-outline"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          {t("Consultar solicitudes")}
        </button>
        {!loan && !writeBlocked && (
          <button
            className="button button-outline"
            disabled={busy || loading}
            onClick={() => setRevision((v) => v + 1)}
          >
            {t("Volver a consultar productos")}
          </button>
        )}
        <button className="button button-outline" disabled={busy} onClick={onClose}>
          {t("Volver al inicio")}
        </button>
      </div>
    </section>
  );
}
