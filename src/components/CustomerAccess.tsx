import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { Brand } from "./ui";
import { LocaleToggle, translateWith, useI18n } from "../i18n";
import { getSelfServiceConfig } from "../lib/self-service";
import {
  AuthenticationError,
  customerAuthentication,
  type CustomerSession,
} from "../lib/authentication/client";
import { authenticationMessages } from "../lib/authentication/messages";
import { Login } from "./Access";
import { CustomerSecurity } from "./CustomerSecurity";
import { CustomerTransferArea, type SendEvent } from "./CustomerTransfer";
import { LoanApplication } from "./LoanApplication";
import { createLoanClient } from "../lib/loans/client";
import { SavingsApplication } from "./SavingsApplication";
import { createSavingsClient } from "../lib/savings/client";
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
  onEnd: (
    expired: boolean,
    revocation: Promise<boolean>,
    reason?: "passwordChanged",
  ) => void;
}) {
  const { t } = useI18n();
  const ended = useRef(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanClient] = useState(() => createLoanClient(session));
  const loanEntry = useRef<HTMLButtonElement>(null);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const securityEntry = useRef<HTMLButtonElement>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const transferEntry = useRef<HTMLButtonElement>(null);
  // The transfer being sent, kept here (not in its screen) so that closing the screen cannot make
  // the person send it again: a transfer that is running or whose result is unknown blocks the next.
  const [transfer, setTransfer] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "uncertain" } | { kind: "done"; reference?: number }
  >({ kind: "idle" });
  function onSend(event: SendEvent) {
    setTransfer((current) => {
      switch (event.kind) {
        case "start":
          return { kind: "sending" };
        case "done":
          return { kind: "done", reference: event.reference };
        case "uncertain":
          return { kind: "uncertain" };
        case "failed":
          return { kind: "idle" };
        case "seen":
          return current.kind === "done" ? { kind: "idle" } : current;
      }
    });
  }
  const transferBlocked = transfer.kind === "sending" || transfer.kind === "uncertain";
  const [savingsClient] = useState(() => createSavingsClient(session));
  const savingsEntry = useRef<HTMLButtonElement>(null);
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
        <dl className="customer-profile-summary" data-testid="customer-profile">
          {session.identity.officeName && (
            <>
              <dt>{t("Oficina")}</dt>
              <dd data-testid="customer-office">{session.identity.officeName}</dd>
            </>
          )}
          {session.identity.roles.length > 0 && (
            <>
              <dt>{t("Roles")}</dt>
              <dd data-testid="customer-roles">
                {session.identity.roles.map((r) => r.name).join(", ")}
              </dd>
            </>
          )}
          {session.identity.clients.length > 0 && (
            <>
              <dt>{t("ID de cliente")}</dt>
              <dd data-testid="customer-client-id">
                {session.identity.clients.join(", ")}
              </dd>
            </>
          )}
        </dl>
      </div>
      <div className="demo-notice" role="status">
        <LockKeyhole size={18} aria-hidden="true" />
        <p>
          {t(
            "Las consultas de saldos y movimientos aún no están integradas. No se muestran datos de demostración en esta sesión.",
          )}
        </p>
      </div>
      {securityOpen ? (
        <CustomerSecurity
          session={session}
          onClose={() => {
            setSecurityOpen(false);
            requestAnimationFrame(() => securityEntry.current?.focus());
          }}
          onPasswordChanged={() => {
            if (ended.current) return;
            ended.current = true;
            // The server already ended every session; the logout only forgets the local credential.
            onEnd(false, session.logout(), "passwordChanged");
          }}
          onExpired={() => {
            if (ended.current) return;
            ended.current = true;
            onEnd(true, session.logout());
          }}
        />
      ) : loanOpen ? (
        <LoanApplication
          client={loanClient}
          clients={session.identity.clients}
          onExpired={() => {
            if (ended.current) return;
            ended.current = true;
            onEnd(true, session.logout());
          }}
          onClose={() => {
            setLoanOpen(false);
            requestAnimationFrame(() => loanEntry.current?.focus());
          }}
        />
      ) : savingsOpen ? (
        <SavingsApplication
          client={savingsClient}
          clients={session.identity.clients}
          onExpired={() => {
            if (ended.current) return;
            ended.current = true;
            onEnd(true, session.logout());
          }}
          onClose={() => {
            setSavingsOpen(false);
            requestAnimationFrame(() => savingsEntry.current?.focus());
          }}
        />
      ) : transferOpen ? (
        <CustomerTransferArea
          session={session}
          onSend={onSend}
          onExpired={() => {
            if (ended.current) return;
            ended.current = true;
            onEnd(true, session.logout());
          }}
          onClose={() => {
            setTransferOpen(false);
            requestAnimationFrame(() => transferEntry.current?.focus());
          }}
        />
      ) : (
        <>
          <button
            ref={transferEntry}
            className="button button-primary"
            disabled={transferBlocked}
            onClick={() => {
              // A receipt that was never seen is told on the home: opening the screen clears it.
              setTransfer((current) => (current.kind === "done" ? { kind: "idle" } : current));
              setTransferOpen(true);
            }}
          >
            {t("Transferir entre mis cuentas")}
          </button>
          {transfer.kind !== "idle" && (
            <p className="form-note" role="status" data-testid="transfer-track">
              {transfer.kind === "sending"
                ? t("Hay una transferencia en curso. Espera su resultado antes de hacer otra.")
                : transfer.kind === "uncertain"
                  ? t(
                      "No pudimos confirmar tu última transferencia. Revisa el saldo de tu cuenta o consulta a tu institución antes de hacer otra.",
                    )
                  : transfer.reference !== undefined
                    ? translateWith("Tu última transferencia se realizó. Referencia: {reference}.", {
                        reference: transfer.reference,
                      })
                    : t("Tu última transferencia se realizó.")}
            </p>
          )}
          <button
            ref={loanEntry}
            className="button button-primary"
            onClick={() => setLoanOpen(true)}
          >
            {t("Solicitar un préstamo")}
          </button>
          <button
            ref={savingsEntry}
            className="button button-primary"
            onClick={() => setSavingsOpen(true)}
          >
            {t("Solicitar una cuenta de ahorro")}
          </button>
          <button
            ref={securityEntry}
            className="button button-outline"
            onClick={() => setSecurityOpen(true)}
          >
            {t("Seguridad de tu cuenta")}
          </button>
        </>
      )}
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
