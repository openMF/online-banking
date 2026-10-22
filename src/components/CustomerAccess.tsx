import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { Brand } from "./ui";
import { LocaleToggle, useI18n } from "../i18n";
import { getSelfServiceConfig } from "../lib/self-service";
import {
  AuthenticationError,
  customerAuthentication,
  type CustomerSession,
} from "../lib/authentication/client";
import { authenticationMessages } from "../lib/authentication/messages";
import { Login } from "./Access";
import type { Segment } from "../lib/demo";

/** Configuration chooses an explicit customer login; demo remains a separate opt-in. */
export function CustomerAccess({
  onAuthenticated,
  ...demoProps
}: {
  onAuthenticated: (session: CustomerSession) => void;
  initialSegment: Segment;
  onLogin: (segment: Segment) => void;
  onRegister: () => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"loading" | "customer" | "demo" | "unavailable">("loading");
  useEffect(() => {
    let active = true;
    void getSelfServiceConfig().then(
      () => {
        if (active) setMode("customer");
      },
      () => {
        if (active) setMode("unavailable");
      },
    );
    return () => {
      active = false;
    };
  }, []);
  if (mode === "loading") return <p role="status">{t("Preparando acceso...")}</p>;
  return (
    <>
      {mode === "customer" ? (
        <>
          <CustomerLogin onAuthenticated={onAuthenticated} />
          <button className="button button-outline" onClick={() => setMode("demo")}>
            {t("Explorar demostración con datos ficticios")}
          </button>
        </>
      ) : (
        <>
          {mode === "unavailable" && (
            <p role="status" className="form-note">
              {t(authenticationMessages.configuration)}
            </p>
          )}
          <Login {...demoProps} />
          {mode === "demo" && (
            <button className="button button-outline" onClick={() => setMode("customer")}>
              {t("Volver al acceso de clientes")}
            </button>
          )}
        </>
      )}
    </>
  );
}

export function CustomerLogin({
  onAuthenticated,
}: {
  onAuthenticated: (session: CustomerSession) => void;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (!username.trim() || !password.trim()) {
      setError("Ingresa tu usuario y contraseña.");
      setState("error");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setState("submitting");
    setError("");
    const submittedPassword = password;
    setPassword("");
    try {
      const session = await customerAuthentication.login(
        username,
        submittedPassword,
        controller.signal,
      );
      if (controller.signal.aborted) {
        void session.logout();
        return;
      }
      onAuthenticated(session);
    } catch (failure) {
      if (!controller.signal.aborted) {
        setState("error");
        setError(
          authenticationMessages[failure instanceof AuthenticationError ? failure.code : "server"],
        );
      }
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }
  const busy = state === "submitting";
  return (
    <div className="access-content">
      <Brand compact />
      <div className="modal-heading">
        <p className="eyebrow">{t("ACCESO DE CLIENTES")}</p>
        <h3>{t("Inicia sesión con tu institución.")}</h3>
        <p>{t("Acceso mediante Self Service. Usa el usuario asignado por tu institución.")}</p>
      </div>
      <form className="form-stack" onSubmit={submit} aria-busy={busy}>
        <label>
          {t("Usuario")}
          <input
            name="username"
            autoComplete="username"
            required
            disabled={busy}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            aria-invalid={state === "error"}
            aria-describedby={error ? "customer-login-error" : undefined}
          />
        </label>
        <label>
          {t("Contraseña")}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={state === "error"}
            aria-describedby={error ? "customer-login-error" : undefined}
          />
        </label>
        {error && (
          <p id="customer-login-error" className="form-error" role="alert">
            {t(error)}
          </p>
        )}
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy && <LoaderCircle className="spin" size={18} aria-hidden="true" />}
          {t(busy ? "Verificando acceso..." : "Iniciar sesión")}
        </button>
        <span role="status" className="sr-only">
          {busy ? t("Verificando acceso...") : ""}
        </span>
      </form>
      <p className="form-note">
        {t("La demostración utiliza datos ficticios y tiene un acceso separado.")}
      </p>
    </div>
  );
}

export function CustomerHome({
  session,
  onEnd,
}: {
  session: CustomerSession;
  onEnd: (expired: boolean, revocation: Promise<boolean>) => void;
}) {
  const { t } = useI18n();
  const ended = useRef(false);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    let lastActivity = Date.now();
    const activity = () => {
      check();
      if (!ended.current) lastActivity = Date.now();
    };
    const end = () => {
      if (ended.current) return;
      ended.current = true;
      endRef.current(true, session.logout());
    };
    const check = () => {
      if (Date.now() >= session.expiresAt || Date.now() - lastActivity >= 10 * 60_000) end();
    };
    const interval = setInterval(check, 1000);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [session]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <main className="access-content customer-home" aria-labelledby="customer-heading">
      <div className="customer-home-header">
        <Brand compact />
        <LocaleToggle />
      </div>
      <div className="modal-heading">
        <p className="eyebrow">{t("ACCESO DE CLIENTES")}</p>
        <h1 id="customer-heading" ref={heading} tabIndex={-1}>
          {t("Acceso verificado")}
        </h1>
        <p>{t("Usuario verificado por tu institución:")}</p>
        <p data-testid="customer-username">{session.identity.username}</p>
      </div>
      <div className="demo-notice" role="status">
        <LockKeyhole size={18} aria-hidden="true" />
        <p>
          {t(
            "Las cuentas y operaciones aún no están integradas. No se muestran saldos ni movimientos de demostración en esta sesión.",
          )}
        </p>
      </div>
      <p className="form-note">
        {t(
          "La sesión se conserva solo en esta página y termina al recargar, tras 10 minutos de inactividad o después de 15 minutos.",
        )}
      </p>
      <button
        className="button button-primary"
        onClick={() => {
          if (ended.current) return;
          ended.current = true;
          onEnd(false, session.logout());
        }}
      >
        {t("Cerrar sesión")}
      </button>
    </main>
  );
}
