import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Info, Mail, MessageSquareText, RotateCcw } from "lucide-react";
import { LocalizedTree, translateWith } from "../i18n";
import {
  useStepUpChallenge,
  type StepUpAction,
  type StepUpApi,
  type StepUpChannel,
  type StepUpErrorCode,
} from "../lib/stepup";

type Props = {
  api: StepUpApi;
  action: StepUpAction;
  /** The operation being confirmed; the token only works for exactly this payload. */
  payload?: Record<string, unknown>;
  /** Label of the confirm button (a Spanish source string, translated by the catalog). */
  submitLabel: string;
  onVerified: (stepUpToken: string) => void;
  /** The server does not require step-up for this action: carry on without a token. */
  onNotRequired?: () => void;
  onBack: () => void;
};

function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const MESSAGES: Partial<Record<StepUpErrorCode, string>> = {
  "otp.invalid": "El código no coincide. Revisa el código e inténtalo de nuevo.",
  "rate.limited": "Pediste demasiados códigos. Intenta de nuevo en unos minutos.",
  "otp.expired": "Este código ya no es válido. Pide uno nuevo.",
  invalid: "Este código ya no es válido. Pide uno nuevo.",
  "resend.cooldown": "Espera un momento antes de pedir otro código.",
  "resend.limit": "Ya no puedes reenviar el código. Usa el último que recibiste.",
  "channel.unavailable":
    "No hay un medio disponible para enviarte el código. Contacta a tu institución.",
  "session.required": "Tu sesión no permite esta verificación. Inicia sesión de nuevo.",
  network: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
};

function errorMessage(
  code: StepUpErrorCode | "format",
  values: { length: number; minutes: number | null },
): string {
  if (code === "format") {
    return translateWith("Escribe los {length} dígitos del código.", { length: values.length });
  }
  if (code === "locked") {
    return values.minutes
      ? translateWith("Demasiados intentos incorrectos. Intenta de nuevo en {minutes} min.", {
          minutes: values.minutes,
        })
      : translateWith("Demasiados intentos incorrectos. Intenta de nuevo más tarde.", {});
  }
  return translateWith(
    MESSAGES[code] ?? "No pudimos completar la verificación. Inténtalo más tarde.",
    {},
  );
}

/**
 * Inline step-up verification: asks the server for a one-time code, shows where it was sent and
 * collects it. It contains no verification logic: the {@link StepUpApi} (the server, or the demo
 * stand-in) decides, and on success `onVerified` receives the one-time token.
 */
export function StepUpPanel({
  api,
  action,
  payload,
  submitLabel,
  onVerified,
  onNotRequired,
  onBack,
}: Props) {
  const state = useStepUpChallenge({ api, action, payload, onVerified, onNotRequired });
  const { phase, config, challenge, errorCode } = state;
  const [otp, setOtp] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const ids = { code: useId(), info: useId(), attempts: useId(), error: useId() };
  const otpLength = config?.otpLength ?? 6;
  const minutes = state.retryAfterSeconds
    ? Math.max(1, Math.ceil(state.retryAfterSeconds / 60))
    : null;

  // Move focus to the code field when it appears and after a wrong code.
  useEffect(() => {
    if (phase === "code") {
      input.current?.focus();
      if (errorCode === "otp.invalid" || errorCode === "format") input.current?.select();
    }
  }, [phase, errorCode, challenge?.challengeId]);

  // A new code (resend / restart) clears what was typed.
  useEffect(() => {
    setOtp("");
  }, [state.codeVersion]);

  function submit(event: FormEvent) {
    event.preventDefault();
    state.submit(otp);
  }

  const back = (
    <button type="button" className="back-link centered" onClick={onBack}>
      <ArrowLeft size={15} />
      Volver al resumen
    </button>
  );

  if (phase === "loading" || phase === "starting" || phase === "not-required" || phase === "done") {
    return (
      <LocalizedTree>
        <div className="stepup-panel">
          <p className="stepup-status" role="status">
            {phase === "loading"
              ? "Preparando la verificación…"
              : phase === "starting"
                ? "Enviando tu código…"
                : "Verificación completada."}
          </p>
        </div>
      </LocalizedTree>
    );
  }

  if (phase === "channel") {
    const labels: Record<StepUpChannel, { text: string; icon: typeof Mail }> = {
      SMS: { text: "Recibir por mensaje de texto (SMS)", icon: MessageSquareText },
      EMAIL: { text: "Recibir por correo electrónico", icon: Mail },
    };
    return (
      <LocalizedTree>
        <div className="stepup-panel">
          <div role="group" aria-label="¿Cómo quieres recibir tu código?" className="form-stack">
            {state.channels.map((channel) => {
              const Icon = labels[channel].icon;
              return (
                <button
                  key={channel}
                  type="button"
                  className="button button-outline"
                  onClick={() => state.selectChannel(channel)}
                >
                  <Icon size={17} />
                  {labels[channel].text}
                </button>
              );
            })}
          </div>
          {back}
        </div>
      </LocalizedTree>
    );
  }

  if (phase === "locked" || phase === "expired" || phase === "unavailable") {
    return (
      <LocalizedTree>
        <div className="stepup-panel form-stack">
          <p className="form-error" role="alert">
            {errorMessage(errorCode ?? (phase === "unavailable" ? "unknown" : "otp.expired"), {
              length: otpLength,
              minutes,
            })}
          </p>
          {phase === "expired" && (
            <button type="button" className="button button-primary" onClick={state.restart}>
              <RotateCcw size={16} />
              Pedir un código nuevo
            </button>
          )}
          {back}
        </div>
      </LocalizedTree>
    );
  }

  // phase === "code" | "verifying"
  const busy = phase === "verifying";
  const destination = challenge?.maskedDestination ?? "";
  const sentMessage =
    challenge?.channel === "SMS"
      ? translateWith("Enviamos un código de {length} dígitos por SMS a {destination}.", {
          length: otpLength,
          destination,
        })
      : translateWith("Enviamos un código de {length} dígitos por correo a {destination}.", {
          length: otpLength,
          destination,
        });
  const attempts = state.attemptsRemaining;
  const attemptsMessage =
    attempts === null
      ? ""
      : attempts === 1
        ? translateWith("Te queda {count} intento.", { count: attempts })
        : translateWith("Te quedan {count} intentos.", { count: attempts });
  const describedBy = [ids.info, ids.attempts, errorCode ? ids.error : null]
    .filter(Boolean)
    .join(" ");

  return (
    <LocalizedTree>
      <form onSubmit={submit} className="form-stack stepup-panel" noValidate>
        <p id={ids.info} className="stepup-info">
          {sentMessage}
        </p>
        <label htmlFor={ids.code}>
          {api.mode === "demo" ? "Código de verificación demo" : "Código de verificación"}
        </label>
        <input
          id={ids.code}
          ref={input}
          className="otp-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`[0-9]{${otpLength}}`}
          maxLength={otpLength}
          required
          disabled={busy}
          value={otp}
          aria-invalid={errorCode === "otp.invalid" || errorCode === "format" ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
          placeholder={"0".repeat(otpLength)}
        />
        {api.demoHint && (
          <p className="demo-code">
            <Info size={15} />
            Tu código de prueba es <strong>{api.demoHint}</strong>
          </p>
        )}
        <p id={ids.attempts} className="stepup-meta" aria-live="polite">
          {attemptsMessage}
        </p>
        <p
          className="stepup-meta"
          role="timer"
          aria-label={translateWith("El código vence en {time}.", { time: clock(state.expiresIn) })}
        >
          {translateWith("El código vence en {time}.", { time: clock(state.expiresIn) })}
        </p>
        {errorCode && (
          <p id={ids.error} className="form-error" role="alert">
            {errorMessage(errorCode, { length: otpLength, minutes })}
          </p>
        )}
        {state.notice === "resent" && !errorCode && (
          <p className="stepup-meta" role="status">
            Te enviamos un código nuevo.
          </p>
        )}
        <button className="button button-primary" type="submit" disabled={busy}>
          {submitLabel}
          <Check size={17} />
        </button>
        <button
          type="button"
          className="subtle-link stepup-resend"
          onClick={state.resend}
          disabled={busy || !state.canResend}
        >
          <RotateCcw size={14} />
          {state.resendCooldownLeft > 0
            ? translateWith("Reenviar código en {seconds} s", { seconds: state.resendCooldownLeft })
            : translateWith("Reenviar código", {})}
        </button>
        {back}
      </form>
    </LocalizedTree>
  );
}
