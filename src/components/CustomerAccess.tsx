import { createShareApplicationClient } from "../lib/shares/application";
import { ShareAccounts } from "./ShareAccounts";
import { createShareClient } from "../lib/shares/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { LoaderCircle } from "lucide-react";
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
import { createGuarantorClient } from "../lib/loans/guarantors";
import { createLoanChargesClient } from "../lib/loans/charges";
import { createLoanClient } from "../lib/loans/client";
import { SavingsAccounts } from "./SavingsAccounts";
import { SavingsAccountDetails } from "./SavingsAccountDetails";
import { createAccountsClient, type SavingsSummary } from "../lib/accounts/client";
import { createSavingsDetailsClient } from "../lib/accounts/details";
import { SavingsApplication } from "./SavingsApplication";
import { createSavingsClient } from "../lib/savings/client";
import { SurveyParticipation } from "./SurveyParticipation";
import { createSurveyClient } from "../lib/surveys/client";
import { PersonalReports } from "./PersonalReports";
import type { Segment } from "../lib/demo";
import { ProductCatalogue } from "./ProductCatalogue";

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
          authenticationMessages[
            failure instanceof AuthenticationError ? failure.code : "server"
          ],
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
  inactivityTimeoutMinutes: initialTimeout,
  onEnd,
}: {
  session: CustomerSession;
  inactivityTimeoutMinutes?: number;
  onEnd: (
    expired: boolean,
    revocation: Promise<boolean>,
    reason?: "passwordChanged" | "inactivity" | "expired",
  ) => void;
}) {
  const { t } = useI18n();
  const ended = useRef(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const catalogueEntry = useRef<HTMLButtonElement>(null);

  const [timeoutMinutes, setTimeoutMinutes] = useState(initialTimeout ?? 10);

  useEffect(() => {
    if (initialTimeout !== undefined) {
      setTimeoutMinutes(initialTimeout);
      return;
    }

    let active = true;

    void getSelfServiceConfig().then(
      (cfg) => {
        if (active && cfg.inactivityTimeoutMinutes !== undefined) {
          setTimeoutMinutes(cfg.inactivityTimeoutMinutes);
        }
      },
      () => {},
    );

    return () => {
      active = false;
    };
  }, [initialTimeout]);

  const [sharesOpen, setSharesOpen] = useState(false);
  const shareClient = useMemo(() => createShareClient(session), [session]);
  const shareApplication = useMemo(() => createShareApplicationClient(session), [session]);
  const sharesEntry = useRef<HTMLButtonElement>(null);

  const [loanOpen, setLoanOpen] = useState(false);
  const [loanClient] = useState(() => createLoanClient(session));
  const [guarantorClient] = useState(() => createGuarantorClient(session));
  const [chargesClient] = useState(() => createLoanChargesClient(session));
  const loanEntry = useRef<HTMLButtonElement>(null);

  const [accountsClient] = useState(() => createAccountsClient(session));
  const [detailsClient] = useState(() => createSavingsDetailsClient(session));
  const [savingsAccount, setSavingsAccount] = useState<SavingsSummary>();
  const [savingsReturn, setSavingsReturn] = useState<number>();

  const [savingsOpen, setSavingsOpen] = useState(false);
  const [savingsClient] = useState(() => createSavingsClient(session));
  const savingsEntry = useRef<HTMLButtonElement>(null);

  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyClient] = useState(() => createSurveyClient(session));
  const surveyEntry = useRef<HTMLButtonElement>(null);

  const [securityOpen, setSecurityOpen] = useState(false);
  const securityEntry = useRef<HTMLButtonElement>(null);

  const [reportsOpen, setReportsOpen] = useState(false);
  const reportsEntry = useRef<HTMLButtonElement>(null);

  const [transferOpen, setTransferOpen] = useState<"own" | "tpt" | null>(null);
  const beneficiaryTransferEntry = useRef<HTMLButtonElement>(null);
  const transferEntry = useRef<HTMLButtonElement>(null);

  // Keep transfer state here so closing the screen cannot allow a duplicate transfer.
  const [transfer, setTransfer] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "uncertain" }
    | { kind: "done"; reference?: number }
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

  const transferBlocked =
    transfer.kind === "sending" || transfer.kind === "uncertain";

  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  const handleExpired = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    endRef.current(true, session.logout());
  }, [session]);

  useEffect(() => {
    let lastActivity = Date.now();

    const activity = () => {
      check();
      if (!ended.current) lastActivity = Date.now();
    };

    const end = (reason?: "inactivity" | "expired") => {
      if (ended.current) return;
      ended.current = true;
      endRef.current(true, session.logout(), reason);
    };

    const check = () => {
      if (Date.now() >= session.expiresAt) {
        end("expired");
      } else if (Date.now() - lastActivity >= timeoutMinutes * 60_000) {
        end("inactivity");
      }
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
  }, [session, timeoutMinutes]);

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

      {savingsAccount ? (
        <SavingsAccountDetails
          key={savingsAccount.id}
          client={detailsClient}
          account={savingsAccount}
          onExpired={handleExpired}
          onClose={() => {
            setSavingsReturn(savingsAccount.id);
            setSavingsAccount(undefined);
          }}
        />
      ) : catalogueOpen ? (
        <ProductCatalogue
          session={session}
          onExpired={handleExpired}
          onClose={() => {
            setCatalogueOpen(false);
            requestAnimationFrame(() => catalogueEntry.current?.focus());
          }}
        />
      ) : sharesOpen ? (
        <ShareAccounts
          client={shareClient}
          application={shareApplication}
          clients={session.identity.clients}
          onExpired={() => {
            if (ended.current) return;
            ended.current = true;
            onEnd(true, session.logout());
          }}
          onClose={() => {
            setSharesOpen(false);
            requestAnimationFrame(() => sharesEntry.current?.focus());
          }}
        />
      ) : securityOpen ? (
        <CustomerSecurity
          session={session}
          onClose={() => {
            setSecurityOpen(false);
            requestAnimationFrame(() => securityEntry.current?.focus());
          }}
          onPasswordChanged={() => {
            if (ended.current) return;
            ended.current = true;
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
          chargesClient={chargesClient}
          client={loanClient}
          guarantors={guarantorClient}
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
      ) : surveyOpen ? (
        <SurveyParticipation
          client={surveyClient}
          clients={session.identity.clients}
          onExpired={() => {
            if (ended.current) return;
            ended.current = true;
            onEnd(true, session.logout());
          }}
          onClose={() => {
            setSurveyOpen(false);
            requestAnimationFrame(() => surveyEntry.current?.focus());
          }}
        />
      ) : reportsOpen ? (
        <PersonalReports
          session={session}
          onExpired={() => {
            if (ended.current) return;
            ended.current = true;
            onEnd(true, session.logout());
          }}
          onClose={() => {
            setReportsOpen(false);
            requestAnimationFrame(() => reportsEntry.current?.focus());
          }}
        />
      ) : transferOpen ? (
        <CustomerTransferArea
          session={session}
          kind={transferOpen}
          onSend={onSend}
          onExpired={() => {
            if (ended.current) return;
            ended.current = true;
            onEnd(true, session.logout());
          }}
          onClose={() => {
            setTransferOpen(null);
            requestAnimationFrame(() =>
              (transferOpen === "tpt"
                ? beneficiaryTransferEntry
                : transferEntry
              ).current?.focus(),
            );
          }}
        />
      ) : (
        <>
          <SavingsAccounts
            client={accountsClient}
            onExpired={() => {
              if (ended.current) return;
              ended.current = true;
              onEnd(true, session.logout());
            }}
            onOpen={setSavingsAccount}
            focusAccount={savingsReturn}
            onFocused={() => setSavingsReturn(undefined)}
          />

          <div className="customer-transfer-actions">
            <button
              ref={transferEntry}
              className="button button-primary"
              disabled={transferBlocked}
              onClick={() => {
                setTransfer((current) =>
                  current.kind === "done" ? { kind: "idle" } : current,
                );
                setTransferOpen("own");
              }}
            >
              {t("Transferir entre mis cuentas")}
            </button>

            <button
              ref={beneficiaryTransferEntry}
              className="button button-primary"
              disabled={transferBlocked}
              onClick={() => {
                setTransfer((current) =>
                  current.kind === "done" ? { kind: "idle" } : current,
                );
                setTransferOpen("tpt");
              }}
            >
              {t("Transferir a un beneficiario")}
            </button>
          </div>

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
            ref={catalogueEntry}
            className="button button-primary"
            onClick={() => setCatalogueOpen(true)}
          >
            {t("Productos disponibles")}
          </button>

          <button
            ref={sharesEntry}
            className="button button-primary"
            onClick={() => setSharesOpen(true)}
          >
            {t("Mis cuentas de acciones")}
          </button>

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
            ref={surveyEntry}
            className="button button-primary"
            onClick={() => setSurveyOpen(true)}
          >
            {t("Participar en encuestas")}
          </button>

          <button
            ref={reportsEntry}
            className="button button-primary"
            onClick={() => setReportsOpen(true)}
          >
            {t("Informes personales")}
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
        {translateWith(
          "La sesión se conserva solo en esta página y termina al recargar, tras {minutes} minutos de inactividad o después de 15 minutos.",
          { minutes: timeoutMinutes },
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