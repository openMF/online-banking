import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { LocalizedTree, translate, translateWith } from "../i18n";
import { PROBLEM_MESSAGES } from "../lib/network";
import type { CustomerSession } from "../lib/authentication/client";
import { createHttpStepUpApi, type StepUpApi } from "../lib/stepup";
import {
  SAVINGS_ACCOUNT,
  createHttpTransfersApi,
  formatAmount,
  parseAmount,
  stepUpPayload,
  transferKey,
  toTransferError,
  type AccountSummary,
  type AmountProblem,
  type TransferAccount,
  type TransferErrorCode,
  type TransferInput,
  type TransferReceipt,
  type TransferTemplate,
  type TransfersApi,
} from "../lib/transfers";
import { StepUpPanel } from "./StepUpPanel";

type Props = {
  api: TransfersApi;
  /** The verification asked for before the transfer (`OWN_TRANSFER`). */
  stepUpApi: StepUpApi;
  /** Back to the home of the customer. */
  onClose: () => void;
  /** The session ended or cannot be used for this step. */
  onExpired: () => void;
  /**
   * What happens to the transfer being sent. It is reported even when this screen was closed
   * meanwhile, so the home can keep the person from sending a transfer that may still be running.
   */
  onSend?: (event: SendEvent) => void;
};

/** The life of one send. `seen`: the receipt was shown to the person. */
export type SendEvent =
  | { kind: "start" }
  | { kind: "done"; reference?: number }
  | { kind: "uncertain" }
  | { kind: "failed" }
  | { kind: "seen" };

type Phase = "loading" | "failed" | "form" | "review" | "verify" | "sending" | "done" | "uncertain";

type Field = "to" | "amount" | "description";

const FAILURES: Partial<Record<TransferErrorCode, string>> = {
  funds:
    "El saldo de la cuenta de origen no alcanza para esta transferencia. Elige otra cuenta o un importe menor. No se movió dinero.",
  limit: "El importe supera el límite permitido para esta transferencia. No se movió dinero.",
  daily: "Esta cuenta alcanzó su límite diario de transferencias. No se movió dinero.",
  accounts:
    "Tu institución no reconoce una de las cuentas. Actualiza tus cuentas e inténtalo de nuevo. No se movió dinero.",
  date: "La fecha de tu dispositivo no coincide con la de tu institución. Revisa la fecha y la hora de tu dispositivo e inténtalo de nuevo. No se movió dinero.",
  same: "La cuenta de origen y la de destino deben ser distintas. No se movió dinero.",
  invalid:
    "Tu institución no aceptó los datos de la transferencia. Revisa el importe y el concepto. No se movió dinero.",
  refused: "Tu institución no autorizó esta transferencia. No se movió dinero.",
  busy: "Hay demasiadas solicitudes. Espera un momento e inténtalo de nuevo. No se movió dinero.",
  stepup: "La verificación ya no es válida. Inténtalo de nuevo.",
  malformed: "No pudimos verificar la respuesta de tu institución. Inténtalo más tarde.",
  network: PROBLEM_MESSAGES.network,
  offline: PROBLEM_MESSAGES.offline,
  timeout: PROBLEM_MESSAGES.timeout,
  unavailable: PROBLEM_MESSAGES.unavailable,
  unknown: "No pudimos completar la transferencia. Inténtalo más tarde.",
};

const UNCERTAIN =
  "No pudimos confirmar el resultado de la transferencia. No la envíes otra vez: revisa el saldo de tu cuenta o consulta a tu institución antes de intentarlo de nuevo.";

/** Text that comes from the server or from the user: shown as is, never run through the catalog. */
function Verbatim({ text }: { text: string }) {
  return <>{text}</>;
}

const keyOf = (account: TransferAccount) => `${account.accountType}:${account.accountId}`;

function accountLabel(account: TransferAccount): string {
  const number = account.accountNo;
  return account.clientName
    ? translateWith("Cuenta de ahorro {number} · {owner}", { number, owner: account.clientName })
    : translateWith("Cuenta de ahorro {number}", { number });
}

function amountProblem(problem: AmountProblem, decimals: number): string {
  switch (problem) {
    case "empty":
      return translate("Escribe el importe de la transferencia.");
    case "format":
      return translate("Escribe el importe solo con números y punto decimal, por ejemplo 1250.50.");
    case "zero":
      return translate("El importe debe ser mayor que cero.");
    case "decimals":
      return decimals === 0
        ? translate("Esta moneda no admite decimales.")
        : translateWith("Esta moneda admite como máximo {places} decimales.", { places: decimals });
  }
}

/**
 * Transfer between the own accounts of the logged-in customer (MX-478, US-E07-01).
 *
 * Steps: form, review, verification (`OWN_TRANSFER`, bound to the five fields of the transfer),
 * send, receipt. The server decides the limits and whether the money is there; this screen shows
 * its answer in plain words.
 *
 * A transfer moves money, so it is sent once and never repeated: one request at a time, and an
 * answer that does not arrive is shown as "uncertain" with no way to send the same transfer again.
 */
export function CustomerTransfer({ api, stepUpApi, onClose, onExpired, onSend }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [template, setTemplate] = useState<TransferTemplate | null>(null);
  const [loadError, setLoadError] = useState<TransferErrorCode | null>(null);
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [amountText, setAmountText] = useState("");
  const [description, setDescription] = useState("");
  const [summaries, setSummaries] = useState<Record<string, AccountSummary>>({});
  const [problem, setProblem] = useState<{ field?: Field; text: string } | null>(null);
  const [failure, setFailure] = useState<TransferErrorCode | null>(null);
  const [receipt, setReceipt] = useState<TransferReceipt | null>(null);
  // A new round every time a verification is asked for, so its panel starts from scratch.
  const [round, setRound] = useState(0);
  // The grant of the verification and what it is for, until it is used. Never in state, so it
  // cannot be rendered.
  const grant = useRef<{ token: string; key: string } | null>(null);
  const working = useRef(false);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const fieldRefs = {
    to: useRef<HTMLSelectElement>(null),
    amount: useRef<HTMLInputElement>(null),
    description: useRef<HTMLInputElement>(null),
  };
  const ids = {
    title: useId(),
    from: useId(),
    to: useId(),
    amount: useId(),
    amountHint: useId(),
    description: useId(),
    error: useId(),
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The accounts of the customer, read again on request. Reading is safe to repeat.
  const [load, setLoad] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPhase("loading");
    setLoadError(null);
    api
      .getTemplate("own", controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setTemplate(loaded);
        // Keep the source the person chose only if it is still one of the accounts.
        setFromKey((current) =>
          loaded.from.some((account) => keyOf(account) === current)
            ? current
            : keyOfFirstSavings(loaded),
        );
        setPhase("form");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const code = toTransferError(error).code;
        if (code === "session") {
          onExpired();
          return;
        }
        setLoadError(code);
        setPhase("failed");
      });
    return () => controller.abort();
    // `onExpired` is the caller's callback: a new function each render must not read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, load]);

  const accounts = useMemo(
    () => (template?.from ?? []).filter((account) => account.accountType === SAVINGS_ACCOUNT),
    [template],
  );
  const destinations = useMemo(
    () =>
      (template?.to ?? []).filter(
        (account) => account.accountType === SAVINGS_ACCOUNT && keyOf(account) !== fromKey,
      ),
    [template, fromKey],
  );
  const from = accounts.find((account) => keyOf(account) === fromKey) ?? null;
  const to = destinations.find((account) => keyOf(account) === toKey) ?? null;
  const summary = fromKey ? summaries[fromKey] : undefined;
  const decimals = summary?.currency?.decimalPlaces ?? 2;
  const currency = summary?.currency?.code;

  // What the source account says about itself (currency, available balance): advice only.
  useEffect(() => {
    if (!from || summaries[fromKey]) return;
    const controller = new AbortController();
    api
      .getSummary(from, controller.signal)
      .then((read) => {
        if (!controller.signal.aborted) setSummaries((all) => ({ ...all, [fromKey]: read }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (toTransferError(error).code === "session") onExpired();
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, from, fromKey]);

  // Focus follows the step.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      heading.current?.focus();
      return;
    }
    if (phase !== "sending" && phase !== "loading") heading.current?.focus();
  }, [phase]);

  function keyOfFirstSavings(loaded: TransferTemplate): string {
    const first = loaded.from.find((account) => account.accountType === SAVINGS_ACCOUNT);
    return first ? keyOf(first) : "";
  }

  function fail(field: Field | undefined, text: string) {
    setProblem({ field, text });
    if (field) fieldRefs[field].current?.focus();
  }

  const parsed = parseAmount(amountText, decimals);
  // What is sent, or null while the form is not valid. The decimals come from the source account
  // and can arrive after the person typed, so this is asked again at every step, never assumed.
  const ready: TransferInput | null =
    from && to && parsed.ok && description.trim()
      ? { from, to, amount: parsed.value, description: description.trim() }
      : null;

  function review(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    setProblem(null);
    if (!from || !to) return fail("to", translate("Selecciona la cuenta de destino."));
    if (!parsed.ok) return fail("amount", amountProblem(parsed.problem, decimals));
    if (!description.trim())
      return fail("description", translate("Escribe un concepto para la transferencia."));
    setPhase("review");
  }

  /** Back to the form with what is wrong, when something the transfer needs stopped being valid. */
  function backToForm() {
    grant.current = null;
    setProblem(
      parsed.ok ? null : { field: "amount", text: amountProblem(parsed.problem, decimals) },
    );
    setPhase("form");
  }

  // The review and the verification are only for a valid transfer.
  const invalidInStep = (phase === "review" || phase === "verify") && ready === null;
  useEffect(() => {
    if (invalidInStep) backToForm();
    // `backToForm` only reads what the flag already depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidInStep]);

  function proceed() {
    if (!ready) return backToForm();
    const current = grant.current;
    if (current && current.key === transferKey(ready)) {
      void send(current.token);
      return;
    }
    grant.current = null;
    setRound((value) => value + 1);
    setPhase("verify");
  }

  async function send(token: string | null) {
    if (working.current) return;
    if (!ready) return backToForm();
    working.current = true;
    setPhase("sending");
    setFailure(null);
    // The caller keeps track of the transfer even when this screen is closed meanwhile.
    onSend?.({ kind: "start" });
    try {
      const done = await api.create("own", ready, token ?? undefined);
      grant.current = null;
      onSend?.({ kind: "done", reference: done.reference });
      if (!mounted.current) return;
      setReceipt(done);
      setPhase("done");
      onSend?.({ kind: "seen" });
    } catch (error) {
      const code = toTransferError(error, true).code;
      onSend?.({ kind: code === "uncertain" ? "uncertain" : "failed" });
      if (!mounted.current) return;
      if (code === "session") {
        onExpired();
        return;
      }
      if (code === "uncertain") {
        // It may have run. Forget everything that could be used to send it again.
        grant.current = null;
        setAmountText("");
        setDescription("");
        setPhase("uncertain");
        return;
      }
      if (code === "stepup") {
        // Used up, expired or for another transfer: ask for the verification again.
        grant.current = null;
        setFailure("stepup");
        setRound((value) => value + 1);
        setPhase("verify");
        return;
      }
      // Nothing moved. The token may still be good for the same transfer: it is kept, and the
      // server says so if it is not.
      setFailure(code);
      setPhase("form");
    } finally {
      working.current = false;
    }
  }

  function again() {
    grant.current = null;
    setReceipt(null);
    setToKey("");
    setAmountText("");
    setDescription("");
    setProblem(null);
    setFailure(null);
    // The balance changed: read it again.
    setSummaries({});
    setPhase("form");
  }

  const failureText = failure && FAILURES[failure] ? translate(FAILURES[failure]!) : null;
  const subtitle: Record<Phase, string> = {
    loading: "Estamos cargando tus cuentas.",
    failed: "No pudimos cargar tus cuentas.",
    form: "Mueve dinero entre tus cuentas de ahorro.",
    review:
      "Revisa los datos. Al confirmar se envía la transferencia y no se puede deshacer. Tu institución puede pedirte antes un código de verificación.",
    verify: "Antes de enviarla, confirma que eres tú.",
    sending: "Enviando tu transferencia…",
    done: "Tu transferencia se realizó.",
    uncertain: "No pudimos confirmar el resultado.",
  };

  const available =
    summary?.available !== undefined
      ? `${formatAmount(String(summary.available), decimals)}${currency ? ` ${currency}` : ""}`
      : null;

  return (
    <LocalizedTree>
      <section className="customer-transfer security-view" aria-labelledby={ids.title}>
        <button type="button" className="back-link" onClick={onClose}>
          <ArrowLeft size={15} aria-hidden="true" />
          Volver al inicio
        </button>
        <div>
          <h2 id={ids.title} ref={heading} tabIndex={-1} className="transfer-title">
            Transferir entre mis cuentas
          </h2>
          <p className="authenticator-intro">{subtitle[phase]}</p>
        </div>

        {phase === "loading" && (
          <p className="authenticator-status" role="status">
            Cargando tus cuentas…
          </p>
        )}

        {phase === "failed" && (
          <div className="authenticator-block">
            <p className="form-error" role="alert">
              {translate(
                loadError === "refused"
                  ? "Tu institución no permite consultar tus cuentas para transferir."
                  : (FAILURES[loadError ?? "unknown"] ?? FAILURES.unknown!),
              )}
            </p>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setLoad((value) => value + 1)}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        {phase === "form" && accounts.length < 2 && (
          <div className="authenticator-block" role="status">
            <p>
              Necesitas al menos dos cuentas de ahorro activas para transferir entre tus cuentas.
            </p>
          </div>
        )}

        {phase === "form" && accounts.length >= 2 && (
          <form className="authenticator-block form-stack" onSubmit={review} noValidate>
            <label htmlFor={ids.from}>Cuenta de origen</label>
            <select
              id={ids.from}
              value={fromKey}
              onChange={(event) => {
                setFromKey(event.target.value);
                // The destination cannot be the source.
                if (toKey === event.target.value) setToKey("");
                setProblem(null);
              }}
            >
              {accounts.map((account) => (
                <option key={keyOf(account)} value={keyOf(account)}>
                  {accountLabel(account)}
                </option>
              ))}
            </select>
            {available && (
              <p className="stepup-meta">
                {translateWith("Disponible: {amount}", { amount: available })}
              </p>
            )}

            <label htmlFor={ids.to}>Cuenta de destino</label>
            <select
              id={ids.to}
              ref={fieldRefs.to}
              value={toKey}
              required
              aria-invalid={problem?.field === "to" ? true : undefined}
              aria-describedby={problem?.field === "to" ? ids.error : undefined}
              onChange={(event) => {
                setToKey(event.target.value);
                setProblem(null);
              }}
            >
              <option value="" disabled>
                Selecciona una cuenta de destino
              </option>
              {destinations.map((account) => (
                <option key={keyOf(account)} value={keyOf(account)}>
                  {accountLabel(account)}
                </option>
              ))}
            </select>

            <label htmlFor={ids.amount}>
              {currency
                ? translateWith("Importe en {currency}", { currency })
                : translate("Importe")}
            </label>
            <input
              id={ids.amount}
              ref={fieldRefs.amount}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={decimals === 0 ? "0" : `0.${"0".repeat(Math.min(decimals, 2))}`}
              value={amountText}
              aria-invalid={problem?.field === "amount" ? true : undefined}
              aria-describedby={[ids.amountHint, problem?.field === "amount" ? ids.error : null]
                .filter(Boolean)
                .join(" ")}
              onChange={(event) => {
                setAmountText(event.target.value);
                setProblem(null);
              }}
            />
            <p id={ids.amountHint} className="stepup-meta">
              {decimals === 0
                ? translate("Escribe solo números, sin decimales.")
                : translate("Escribe solo números y punto decimal, por ejemplo 1250.50.")}
            </p>

            <label htmlFor={ids.description}>Concepto</label>
            <input
              id={ids.description}
              ref={fieldRefs.description}
              type="text"
              autoComplete="off"
              maxLength={100}
              value={description}
              aria-invalid={problem?.field === "description" ? true : undefined}
              aria-describedby={problem?.field === "description" ? ids.error : undefined}
              onChange={(event) => {
                setDescription(event.target.value);
                setProblem(null);
              }}
            />

            {problem && (
              <p id={ids.error} className="form-error" role="alert">
                <Verbatim text={problem.text} />
              </p>
            )}
            {failureText && (
              <p className="form-error" role="alert">
                <Verbatim text={failureText} />
              </p>
            )}
            {failure === "accounts" && (
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  setFailure(null);
                  setToKey("");
                  setSummaries({});
                  setLoad((value) => value + 1);
                }}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Actualizar mis cuentas
              </button>
            )}
            <button className="button button-primary" type="submit">
              Revisar transferencia
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
        )}

        {(phase === "review" || phase === "verify" || phase === "sending") && ready && (
          <div className="authenticator-block">
            <dl className="review-details">
              <div>
                <dt>Desde</dt>
                <dd>
                  <Verbatim text={accountLabel(ready.from)} />
                </dd>
              </div>
              <div>
                <dt>Para</dt>
                <dd>
                  <Verbatim text={accountLabel(ready.to)} />
                </dd>
              </div>
              <div>
                <dt>Importe</dt>
                <dd className="review-total">
                  <Verbatim
                    text={`${parsed.ok ? formatAmount(parsed.value, decimals) : ""}${currency ? ` ${currency}` : ""}`}
                  />
                </dd>
              </div>
              <div>
                <dt>Concepto</dt>
                <dd>
                  <Verbatim text={description.trim()} />
                </dd>
              </div>
            </dl>

            {phase === "review" && (
              <div className="form-stack">
                {failureText && (
                  <p className="form-error" role="alert">
                    <Verbatim text={failureText} />
                  </p>
                )}
                <button className="button button-primary" type="button" onClick={proceed}>
                  Confirmar transferencia
                  <ShieldCheck size={17} aria-hidden="true" />
                </button>
                <button
                  className="back-link centered"
                  type="button"
                  onClick={() => setPhase("form")}
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  Editar datos
                </button>
              </div>
            )}

            {phase === "verify" && (
              <>
                {failureText && (
                  <p className="form-error" role="alert">
                    <Verbatim text={failureText} />
                  </p>
                )}
                <StepUpPanel
                  key={round}
                  api={stepUpApi}
                  action="OWN_TRANSFER"
                  payload={stepUpPayload(ready)}
                  submitLabel="Verificar y enviar"
                  onVerified={(token) => {
                    grant.current = { token, key: transferKey(ready) };
                    void send(token);
                  }}
                  onNotRequired={() => void send(null)}
                  onBack={() => {
                    setFailure(null);
                    setPhase("review");
                  }}
                />
              </>
            )}

            {phase === "sending" && (
              <p className="authenticator-status" role="status">
                Enviando tu transferencia…
              </p>
            )}
          </div>
        )}

        {phase === "done" && receipt && (
          <div className="authenticator-block transfer-receipt" role="status">
            <span className="success-symbol" aria-hidden="true">
              <CheckCheck size={32} />
            </span>
            <h3>Transferencia realizada</h3>
            <strong className="receipt-amount">
              <Verbatim
                text={`${formatAmount(receipt.amount, decimals)}${currency ? ` ${currency}` : ""}`}
              />
            </strong>
            <dl className="review-details">
              <div>
                <dt>Desde</dt>
                <dd>
                  <Verbatim text={accountLabel(receipt.from)} />
                </dd>
              </div>
              <div>
                <dt>Para</dt>
                <dd>
                  <Verbatim text={accountLabel(receipt.to)} />
                </dd>
              </div>
              <div>
                <dt>Concepto</dt>
                <dd>
                  <Verbatim text={receipt.description} />
                </dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>
                  <Verbatim text={receipt.date} />
                </dd>
              </div>
              {receipt.reference !== undefined && (
                <div>
                  <dt>Referencia</dt>
                  <dd>
                    <Verbatim text={String(receipt.reference)} />
                  </dd>
                </div>
              )}
            </dl>
            <button className="button button-primary" type="button" onClick={again}>
              Hacer otra transferencia
            </button>
          </div>
        )}

        {phase === "uncertain" && (
          <div className="authenticator-block">
            <p className="form-error" role="alert">
              {translate(UNCERTAIN)}
            </p>
            <button className="button button-primary" type="button" onClick={onClose}>
              Volver al inicio
            </button>
          </div>
        )}
      </section>
    </LocalizedTree>
  );
}

/**
 * The transfer screen of a logged-in customer. Everything goes through the memory-only session of
 * the login (MX-452): this component never sees the credential, and none of it is demo data.
 */
export function CustomerTransferArea({
  session,
  onClose,
  onExpired,
  onSend,
}: {
  session: CustomerSession;
  onClose: () => void;
  onExpired: () => void;
  onSend?: (event: SendEvent) => void;
}) {
  // One set of clients per login screen, so the screen and its verification share the session.
  const [clients] = useState(() => ({
    transfers: createHttpTransfersApi({ customer: session }),
    stepUp: createHttpStepUpApi({ customer: session }),
  }));
  return (
    <CustomerTransfer
      api={clients.transfers}
      stepUpApi={clients.stepUp}
      onClose={onClose}
      onExpired={onExpired}
      onSend={onSend}
    />
  );
}
