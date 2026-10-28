import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  Check,
  Copy,
  Download,
  Info,
  KeyRound,
  ShieldCheck,
  SmartphoneNfc,
  Trash2,
} from "lucide-react";
import { LocalizedTree, translate, translateWith } from "../i18n";
import {
  selectAuthenticatorApi,
  useAuthenticator,
  type AuthenticatorApi,
  type AuthenticatorErrorCode,
} from "../lib/authenticator";
import { PROBLEM_MESSAGES } from "../lib/network";
import { selectStepUpApi, type StepUpApi } from "../lib/stepup";
import { QrCode } from "./QrCode";
import { StepUpPanel } from "./StepUpPanel";

type Props = {
  /** Test seam: defaults to the real API when there is a session, the demo otherwise. */
  api?: AuthenticatorApi;
  /** Test seam: the step-up used before a change. */
  stepUpApi?: StepUpApi;
  /** Called after the server accepted a change, so the history next to it can be read again. */
  onChanged?: () => void;
};

const MESSAGES: Partial<Record<AuthenticatorErrorCode, string>> = {
  "otp.invalid": "El código no coincide. Revisa tu app e inténtalo de nuevo.",
  invalid: "La verificación ya no es válida. Inténtalo de nuevo.",
  required: "La verificación ya no es válida. Inténtalo de nuevo.",
  "totp.already.enrolled": "Ya tienes una app de autenticación vinculada.",
  "session.required": "Tu sesión no permite esta operación. Inicia sesión de nuevo.",
  network: PROBLEM_MESSAGES.network,
  offline: PROBLEM_MESSAGES.offline,
  timeout: PROBLEM_MESSAGES.timeout,
  unavailable: PROBLEM_MESSAGES.unavailable,
};

function errorMessage(code: AuthenticatorErrorCode, minutes: number | null): string {
  if (code === "format")
    return translateWith("Escribe los {length} dígitos del código.", { length: 6 });
  if (code === "locked") {
    return minutes
      ? translateWith("Demasiados intentos incorrectos. Intenta de nuevo en {minutes} min.", {
          minutes,
        })
      : translateWith("Demasiados intentos incorrectos. Intenta de nuevo más tarde.", {});
  }
  return translateWith(
    MESSAGES[code] ?? "No pudimos completar la operación. Inténtalo más tarde.",
    {},
  );
}

/** `ABCD EFGH ...`: easier to type into an app than 32 characters in a row. */
function spaced(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function recoveryText(codes: string[]): string {
  return [translate("Códigos de recuperación"), "", ...codes, ""].join("\n");
}

/**
 * Pair, use and remove an authenticator app (MX-488 follow-up). The screen only shows state: the
 * server decides whether a code is right. The secret and the recovery codes are in memory only
 * while they are on screen, and the section is not shown at all when the tenant has not switched
 * the authenticator on.
 */
export function AuthenticatorSection({ api, stepUpApi, onChanged }: Props) {
  const [backend] = useState<AuthenticatorApi>(() => api ?? selectAuthenticatorApi());
  const [verification] = useState<StepUpApi>(() => stepUpApi ?? selectStepUpApi());
  const auth = useAuthenticator(backend, onChanged);
  const { phase, status, enrollment, error } = auth;
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<"key" | "codes" | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const ids = { title: useId(), code: useId(), error: useId(), saved: useId() };
  const minutes = auth.retryAfterSeconds
    ? Math.max(1, Math.ceil(auth.retryAfterSeconds / 60))
    : null;

  // Move focus to the new step, so keyboard and screen reader users notice that something changed.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (phase !== "loading" && phase !== "hidden") heading.current?.focus();
  }, [phase]);

  // What was typed or copied belongs to one step.
  useEffect(() => {
    setCode("");
    setSaved(false);
    setCopied(null);
  }, [phase]);

  useEffect(() => {
    if (error === "otp.invalid" || error === "format") field.current?.select();
  }, [error]);

  if (phase === "hidden") return null;

  async function copy(text: string, what: "key" | "codes") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      // Not allowed (insecure page, old browser): the text is on screen, the user can select it.
      setCopied(null);
    }
  }

  function download(codes: string[]) {
    try {
      const url = URL.createObjectURL(new Blob([recoveryText(codes)], { type: "text/plain" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "codigos-de-recuperacion.txt";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Nothing to do: the codes are on screen.
    }
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    auth.submitCode(code);
  }

  const failure = error ? (
    <p id={ids.error} className="form-error" role="alert">
      {errorMessage(error, minutes)}
    </p>
  ) : null;

  return (
    <LocalizedTree>
      <section className="authenticator" aria-labelledby={ids.title}>
        <div ref={heading} tabIndex={-1} className="authenticator-head">
          <SmartphoneNfc size={22} aria-hidden="true" />
          <h3 id={ids.title}>App de autenticación</h3>
        </div>
        <p className="authenticator-intro">
          Usa una app como Google Authenticator o Microsoft Authenticator para confirmar tus
          operaciones con un código que solo tú ves, en lugar de recibirlo por SMS o correo.
        </p>
        {backend.mode === "demo" && (
          <p className="authenticator-demo">
            Verificación de demostración: no es información real.
          </p>
        )}

        {phase === "loading" && (
          <p className="authenticator-status" role="status">
            Cargando…
          </p>
        )}

        {phase === "failed" && (
          <div className="authenticator-block">
            {failure ?? (
              <p className="form-error" role="alert">
                No pudimos completar la operación. Inténtalo más tarde.
              </p>
            )}
            <button
              type="button"
              className="button button-outline button-small"
              onClick={auth.reload}
            >
              Reintentar
            </button>
          </div>
        )}

        {phase === "none" && (
          <div className="authenticator-block">
            {auth.notice === "removed" && (
              <p className="inline-notice" role="status">
                <Check size={16} />
                Quitamos tu app de autenticación. Ya puedes recibir códigos por correo o SMS.
              </p>
            )}
            <p className="authenticator-state">No has vinculado una app de autenticación.</p>
            {failure}
            <button
              type="button"
              className="button button-primary"
              disabled={auth.busy}
              onClick={auth.start}
            >
              Vincular una app de autenticación
              <SmartphoneNfc size={17} />
            </button>
          </div>
        )}

        {phase === "secret" && enrollment && (
          <div className="authenticator-block">
            <ol className="authenticator-steps">
              <li>Abre tu app de autenticación y escanea este código QR.</li>
            </ol>
            <QrCode
              value={enrollment.otpauthUri}
              label={translate("Código QR para tu app de autenticación")}
            />
            <p className="authenticator-state">
              ¿No puedes escanearlo? Escribe esta clave en tu app:
            </p>
            <p className="secret-key">
              <code aria-label={translate("Clave de tu app de autenticación")}>
                {spaced(enrollment.secret)}
              </code>
            </p>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => void copy(enrollment.secret, "key")}
            >
              <Copy size={15} />
              Copiar clave
            </button>
            {copied === "key" && (
              <p className="stepup-meta" role="status">
                Clave copiada.
              </p>
            )}
            <p className="authenticator-warning" role="note">
              <Info size={15} />
              Esta clave solo se muestra ahora y equivale a tu app. No la compartas con nadie.
            </p>
            <div className="authenticator-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={auth.continueToVerify}
              >
                Ya la agregué
                <Check size={17} />
              </button>
              <button type="button" className="back-link centered" onClick={auth.cancel}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {phase === "verify" && (
          <div className="authenticator-block">
            <p className="authenticator-state">
              {auth.intent === "pair"
                ? "Antes de vincular tu app, confirma que eres tú."
                : auth.intent === "codes"
                  ? "Antes de generar códigos nuevos, confirma que eres tú."
                  : "Antes de quitar tu app, confirma que eres tú."}
            </p>
            {failure}
            <StepUpPanel
              key={auth.verifyRound}
              api={verification}
              action="MANAGE_AUTHENTICATOR"
              submitLabel={
                auth.intent === "pair"
                  ? "Continuar"
                  : auth.intent === "codes"
                    ? "Generar códigos nuevos"
                    : "Quitar app de autenticación"
              }
              onVerified={(token) => auth.verified(token)}
              onNotRequired={() => auth.verified(null)}
              onBack={auth.cancel}
              backLabel="Cancelar"
            />
          </div>
        )}

        {phase === "code" && (
          <form className="authenticator-block form-stack" onSubmit={submitCode} noValidate>
            <p className="authenticator-state">
              Escribe el código de 6 dígitos que muestra tu app para terminar la vinculación.
            </p>
            <label htmlFor={ids.code}>Código de tu app de autenticación</label>
            <input
              id={ids.code}
              ref={field}
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              required
              disabled={auth.busy}
              value={code}
              aria-invalid={error === "otp.invalid" || error === "format" ? true : undefined}
              aria-describedby={error ? ids.error : undefined}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
            {backend.demoHint && (
              <p className="demo-code">
                <Info size={15} />
                Tu código de prueba es <strong>{backend.demoHint}</strong>
              </p>
            )}
            {auth.attemptsRemaining !== null && error === "otp.invalid" && (
              <p className="stepup-meta" aria-live="polite">
                {auth.attemptsRemaining === 1
                  ? translateWith("Te queda {count} intento.", { count: auth.attemptsRemaining })
                  : translateWith("Te quedan {count} intentos.", { count: auth.attemptsRemaining })}
              </p>
            )}
            {failure}
            <button className="button button-primary" type="submit" disabled={auth.busy}>
              Vincular app de autenticación
              <Check size={17} />
            </button>
            <button type="button" className="back-link centered" onClick={auth.cancel}>
              Cancelar
            </button>
          </form>
        )}

        {phase === "recovery" && (
          <div className="authenticator-block">
            {auth.notice === "codes" ? (
              <p className="inline-notice" role="status">
                <Check size={16} />
                Generamos códigos nuevos. Los anteriores ya no sirven.
              </p>
            ) : (
              <p className="inline-notice" role="status">
                <Check size={16} />
                Tu app de autenticación quedó vinculada.
              </p>
            )}
            <h4>Guarda tus códigos de recuperación</h4>
            <p className="authenticator-state">
              Si pierdes tu teléfono, cada uno de estos códigos te deja verificar tu identidad una
              sola vez. Guárdalos en un lugar seguro: no volveremos a mostrarlos.
            </p>
            <ul className="recovery-codes" aria-label={translate("Códigos de recuperación")}>
              {auth.recoveryCodes.map((item) => (
                <li key={item}>
                  <code>{item}</code>
                </li>
              ))}
            </ul>
            <div className="authenticator-actions row">
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => void copy(auth.recoveryCodes.join("\n"), "codes")}
              >
                <Copy size={15} />
                Copiar códigos
              </button>
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => download(auth.recoveryCodes)}
              >
                <Download size={15} />
                Descargar (.txt)
              </button>
            </div>
            {copied === "codes" && (
              <p className="stepup-meta" role="status">
                Códigos copiados.
              </p>
            )}
            <label className="check-row" htmlFor={ids.saved}>
              <input
                id={ids.saved}
                type="checkbox"
                checked={saved}
                onChange={(event) => setSaved(event.target.checked)}
              />
              Ya guardé mis códigos en un lugar seguro
            </label>
            <button
              type="button"
              className="button button-primary"
              disabled={!saved}
              onClick={auth.savedCodes}
            >
              Listo
              <Check size={17} />
            </button>
          </div>
        )}

        {phase === "active" && status && (
          <div className="authenticator-block">
            <p className="authenticator-state">
              <ShieldCheck size={17} aria-hidden="true" />
              <strong>Tu app de autenticación está activa.</strong>
            </p>
            {status.exclusive && (
              <p className="authenticator-state">
                Mientras esté activa, verificas tus operaciones con el código de tu app o con un
                código de recuperación. Ya no recibes códigos por SMS ni por correo.
              </p>
            )}
            <p
              className={
                status.recoveryCodesRemaining <= 2 ? "authenticator-warning" : "authenticator-state"
              }
            >
              <KeyRound size={15} aria-hidden="true" />
              {status.recoveryCodesRemaining === 1
                ? translateWith("Te queda {count} código de recuperación.", {
                    count: status.recoveryCodesRemaining,
                  })
                : translateWith("Te quedan {count} códigos de recuperación.", {
                    count: status.recoveryCodesRemaining,
                  })}
            </p>
            {failure}
            <div className="authenticator-actions row">
              <button
                type="button"
                className="button button-outline button-small"
                disabled={auth.busy}
                onClick={() => auth.manage("codes")}
              >
                <KeyRound size={15} />
                Generar códigos de recuperación nuevos
              </button>
              <button
                type="button"
                className="button button-outline button-small"
                disabled={auth.busy}
                onClick={() => auth.manage("remove")}
              >
                <Trash2 size={15} />
                Quitar la app de autenticación
              </button>
            </div>
          </div>
        )}
      </section>
    </LocalizedTree>
  );
}
