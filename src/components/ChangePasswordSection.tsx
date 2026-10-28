import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { LocalizedTree, translate } from "../i18n";
import { toPasswordError, type PasswordApi, type PasswordErrorCode } from "../lib/password";
import type { StepUpApi } from "../lib/stepup";
import { StepUpPanel } from "./StepUpPanel";

type Props = {
  api: PasswordApi;
  /** The verification asked for before the change (`CHANGE_PASSWORD`). */
  stepUpApi: StepUpApi;
  /** The password was changed. The server ended every session: the caller goes to the login. */
  onChanged: () => void;
  /** The session ended or cannot be used for this step. */
  onExpired: () => void;
};

type Phase = "form" | "verify" | "saving";

const MESSAGES: Record<PasswordErrorCode | "empty", string> = {
  empty: "Escribe la nueva contraseña dos veces.",
  mismatch: "Las contraseñas no coinciden.",
  policy:
    "Tu institución no aceptó esa contraseña. Usa una más larga, con letras, números y símbolos, y que no hayas usado antes.",
  stepup: "La verificación ya no es válida. Inténtalo de nuevo.",
  session: "Tu sesión terminó. Inicia sesión de nuevo.",
  network: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  unknown: "No pudimos cambiar tu contraseña. Inténtalo más tarde.",
};

/**
 * Change the password of the logged-in customer (MX-455, US-E01-03). The server decides the
 * password policy and its answer is shown; the verification (`CHANGE_PASSWORD`) comes first and its
 * one-time token is used for the one `PUT /user`. The server checks the request before it spends
 * the token, so a refused password costs no code and the user can correct it without a new one.
 *
 * The password lives in this form only; it is never logged, stored or put in an error, and the
 * fields are emptied as soon as the change is done.
 */
export function ChangePasswordSection({ api, stepUpApi, onChanged, onExpired }: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [visible, setVisible] = useState(false);
  // A new round every time a verification is asked for, so its panel starts from scratch even when
  // React batches the steps in between (an answer that comes back at once).
  const [round, setRound] = useState(0);
  const [error, setError] = useState<PasswordErrorCode | "empty" | null>(null);
  // The grant of the verification, until it is used: never in state, so it cannot be rendered.
  const grant = useRef<string | null>(null);
  const working = useRef(false);
  const mounted = useRef(true);
  const first = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const ids = { title: useId(), password: useId(), repeat: useId(), error: useId(), hint: useId() };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Focus follows the step; after an error the first field is selected again.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (phase === "verify") heading.current?.focus();
    if (phase === "form") first.current?.focus();
  }, [phase]);

  async function save(token: string | null) {
    if (working.current) return;
    working.current = true;
    setPhase("saving");
    setError(null);
    try {
      await api.change(password, repeat, token ?? undefined);
      grant.current = null;
      setPassword("");
      setRepeat("");
      if (mounted.current) onChanged();
    } catch (failure) {
      if (!mounted.current) return;
      const code = toPasswordError(failure).code;
      if (code === "session") {
        onExpired();
        return;
      }
      if (code === "stepup") {
        // Used up or expired: ask for the verification again, the typed passwords are kept.
        grant.current = null;
        setError("stepup");
        setRound((value) => value + 1);
        setPhase("verify");
        return;
      }
      // A refused password or a failure to reach the server: the token was not spent, so the
      // user can correct it (or retry) and send it again with the same grant.
      setError(code);
      setPhase("form");
    } finally {
      working.current = false;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!password || !repeat) {
      setError("empty");
      return;
    }
    if (password !== repeat) {
      setError("mismatch");
      return;
    }
    setError(null);
    if (grant.current) {
      void save(grant.current);
      return;
    }
    setRound((value) => value + 1);
    setPhase("verify");
  }

  const failure = error ? (
    <p id={ids.error} className="form-error" role="alert">
      {translate(MESSAGES[error])}
    </p>
  ) : null;

  return (
    <LocalizedTree>
      <section className="change-password" aria-labelledby={ids.title}>
        <div ref={heading} tabIndex={-1} className="authenticator-head">
          <KeyRound size={22} aria-hidden="true" />
          <h3 id={ids.title}>Cambiar contraseña</h3>
        </div>
        <p className="authenticator-intro">
          Al cambiarla, cerramos todas tus sesiones y tendrás que iniciar sesión de nuevo.
        </p>

        {phase === "verify" && (
          <div className="authenticator-block">
            <p className="authenticator-state">Antes de cambiarla, confirma que eres tú.</p>
            {failure}
            <StepUpPanel
              key={round}
              api={stepUpApi}
              action="CHANGE_PASSWORD"
              submitLabel="Cambiar contraseña"
              onVerified={(token) => {
                grant.current = token;
                void save(token);
              }}
              onNotRequired={() => void save(null)}
              onBack={() => {
                setError(null);
                setPhase("form");
              }}
              backLabel="Volver al formulario"
            />
          </div>
        )}

        {phase === "saving" && (
          <p className="authenticator-status" role="status">
            Cambiando tu contraseña…
          </p>
        )}

        {phase === "form" && (
          <form className="authenticator-block form-stack" onSubmit={submit} noValidate>
            <label htmlFor={ids.password}>Nueva contraseña</label>
            <input
              id={ids.password}
              ref={first}
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              aria-invalid={error === "policy" || error === "empty" ? true : undefined}
              aria-describedby={[ids.hint, error ? ids.error : null].filter(Boolean).join(" ")}
              onChange={(event) => setPassword(event.target.value)}
            />
            <label htmlFor={ids.repeat}>Repite la nueva contraseña</label>
            <input
              id={ids.repeat}
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              required
              value={repeat}
              aria-invalid={error === "mismatch" ? true : undefined}
              aria-describedby={error ? ids.error : undefined}
              onChange={(event) => setRepeat(event.target.value)}
            />
            <p id={ids.hint} className="stepup-meta">
              Tu institución define las reglas de la contraseña y revisa la nueva antes de
              cambiarla.
            </p>
            <button
              type="button"
              className="subtle-link"
              aria-pressed={visible}
              onClick={() => setVisible((value) => !value)}
            >
              {visible ? (
                <EyeOff size={14} aria-hidden="true" />
              ) : (
                <Eye size={14} aria-hidden="true" />
              )}
              {visible ? "Ocultar contraseñas" : "Mostrar contraseñas"}
            </button>
            {failure}
            <button className="button button-primary" type="submit">
              Continuar
              <Check size={17} />
            </button>
          </form>
        )}
      </section>
    </LocalizedTree>
  );
}
