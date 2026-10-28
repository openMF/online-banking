import { useCallback, useEffect, useRef, useState } from "react";
import {
  toStepUpError,
  type AuthenticatorApi,
  type StepUpErrorCode,
  type TotpEnrollment,
  type TotpStatus,
} from "./api";

/** What the user is doing with the authenticator app. */
export type AuthenticatorIntent = "pair" | "codes" | "remove";

export type AuthenticatorPhase =
  /** Reading the status. */
  | "loading"
  /** The tenant did not switch the authenticator on: the screen shows nothing. */
  | "hidden"
  /** The status could not be read. */
  | "failed"
  /** No authenticator. */
  | "none"
  /** The secret is on screen (QR and text), to be added to the app. */
  | "secret"
  /** The step-up of `MANAGE_AUTHENTICATOR` (pairing, new recovery codes, removal). */
  | "verify"
  /** The app is paired on the phone: the user types its first code. */
  | "code"
  /** The recovery codes are on screen, once. */
  | "recovery"
  /** An authenticator is active. */
  | "active";

export type AuthenticatorNotice = "removed" | "codes" | null;

export type AuthenticatorErrorCode = StepUpErrorCode | "format";

export type UseAuthenticator = {
  phase: AuthenticatorPhase;
  status: TotpStatus | null;
  /** Only while pairing: the secret in memory. Dropped as soon as pairing ends. */
  enrollment: TotpEnrollment | null;
  /** Only while they are on screen. */
  recoveryCodes: string[];
  /** Changes every time a verification is asked for, so its panel starts from scratch. */
  verifyRound: number;
  intent: AuthenticatorIntent;
  /** A call is running: the buttons wait. */
  busy: boolean;
  error: AuthenticatorErrorCode | null;
  attemptsRemaining: number | null;
  retryAfterSeconds: number | null;
  notice: AuthenticatorNotice;
  /** Starts pairing: asks the server for a secret. */
  start: () => void;
  /** The secret was added to the app: on to the verification. */
  continueToVerify: () => void;
  /** The step-up passed. `token` is `null` when the server does not ask for one. */
  verified: (token: string | null) => void;
  /** The user typed the first code of the app. */
  submitCode: (code: string) => void;
  /** The user saved the recovery codes. */
  savedCodes: () => void;
  /** New recovery codes, or removal: both need a step-up first. */
  manage: (intent: "codes" | "remove") => void;
  /** Back out of whatever is open. */
  cancel: () => void;
  reload: () => void;
};

/**
 * Drives the pairing and the management of the authenticator app against an {@link
 * AuthenticatorApi}. No code is checked here: the server (or the demo stand-in) is the authority.
 * The secret and the recovery codes live in memory only while they are on screen.
 */
export function useAuthenticator(
  api: AuthenticatorApi,
  /** Called after the server accepted a change (paired, new recovery codes, removed). */
  onChanged?: () => void,
): UseAuthenticator {
  const [phase, setPhase] = useState<AuthenticatorPhase>("loading");
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [intent, setIntent] = useState<AuthenticatorIntent>("pair");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthenticatorErrorCode | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [notice, setNotice] = useState<AuthenticatorNotice>(null);
  const [verifyRound, setVerifyRound] = useState(0);

  const mounted = useRef(true);
  const working = useRef(false);
  // The grant of the step-up. It is used once and never kept in state, so it cannot be rendered.
  const token = useRef<string | null>(null);
  const latest = useRef({ api, status, intent, onChanged });
  latest.current = { api, status, intent, onChanged };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Asks for a verification: a new round, so a panel that already finished does not stay on. */
  const askVerification = useCallback(() => {
    setVerifyRound((round) => round + 1);
    setPhase("verify");
  }, []);

  const clearSecrets = useCallback(() => {
    setEnrollment(null);
    setRecoveryCodes([]);
    token.current = null;
  }, []);

  const resting = useCallback((next: TotpStatus) => {
    setStatus(next);
    setPhase(!next.available ? "hidden" : next.status === "ACTIVE" ? "active" : "none");
  }, []);

  const load = useCallback(() => {
    setPhase("loading");
    setError(null);
    latest.current.api
      .getStatus()
      .then((next) => {
        if (mounted.current) resting(next);
      })
      .catch((failure) => {
        if (!mounted.current) return;
        const code = toStepUpError(failure).code;
        // Not offered (or step-up off): same as "hidden", not an error for the user.
        if (code === "totp.disabled" || code === "disabled") setPhase("hidden");
        else {
          setError(code);
          setPhase("failed");
        }
      });
  }, [resting]);

  useEffect(() => {
    load();
  }, [load]);

  /** Runs one call with the busy flag; a second click while it runs is ignored. */
  const run = useCallback(
    async (call: () => Promise<void>, onError?: (code: StepUpErrorCode) => boolean) => {
      if (working.current) return;
      working.current = true;
      setBusy(true);
      setError(null);
      setAttemptsRemaining(null);
      setRetryAfterSeconds(null);
      try {
        await call();
      } catch (failure) {
        if (!mounted.current) return;
        const problem = toStepUpError(failure);
        if (onError?.(problem.code)) return;
        setError(problem.code);
        if (typeof problem.attemptsRemaining === "number") {
          setAttemptsRemaining(problem.attemptsRemaining);
        }
        if (typeof problem.retryAfterSeconds === "number") {
          setRetryAfterSeconds(problem.retryAfterSeconds);
        }
      } finally {
        working.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    [],
  );

  const start = useCallback(() => {
    setNotice(null);
    setIntent("pair");
    void run(async () => {
      const created = await latest.current.api.begin();
      if (!mounted.current) return;
      setEnrollment(created);
      setPhase("secret");
    });
  }, [run]);

  const continueToVerify = useCallback(() => {
    setError(null);
    askVerification();
  }, [askVerification]);

  const finishCodes = useCallback((codes: string[]) => {
    setRecoveryCodes(codes);
    setEnrollment(null);
    token.current = null;
    setPhase("recovery");
  }, []);

  const verified = useCallback(
    (grant: string | null) => {
      token.current = grant;
      setError(null);
      const { intent: current, api: backend } = latest.current;
      if (current === "pair") {
        setPhase("code");
        return;
      }
      // New recovery codes or removal: the step-up was the last thing needed.
      void run(
        async () => {
          if (current === "codes") {
            const result = await backend.newRecoveryCodes(grant ?? undefined);
            latest.current.onChanged?.();
            if (!mounted.current) return;
            setNotice("codes");
            finishCodes(result.recoveryCodes);
          } else {
            await backend.remove(grant ?? undefined);
            latest.current.onChanged?.();
            if (!mounted.current) return;
            token.current = null;
            clearSecrets();
            setNotice("removed");
            load();
          }
        },
        (code) => {
          // The grant ran out or was refused: ask for the verification again.
          if (code === "invalid" || code === "required") {
            token.current = null;
            setError(code);
            askVerification();
            return true;
          }
          return false;
        },
      );
    },
    [askVerification, clearSecrets, finishCodes, load, run],
  );

  const submitCode = useCallback(
    (typed: string) => {
      const code = typed.trim();
      if (!/^\d{6}$/.test(code)) {
        setError("format");
        return;
      }
      void run(
        async () => {
          const grant = token.current ?? undefined;
          const result = await latest.current.api.confirm(code, grant);
          latest.current.onChanged?.();
          if (!mounted.current) return;
          setNotice(null);
          finishCodes(result.recoveryCodes);
        },
        (failure) => {
          // The grant ran out or was refused: back to the verification, the secret is kept.
          if (failure === "invalid" || failure === "required") {
            token.current = null;
            setError(failure);
            askVerification();
            return true;
          }
          // Someone paired in another tab, or the pairing was cancelled: start from the status.
          if (failure === "totp.already.enrolled" || failure === "totp.enrollment.missing") {
            clearSecrets();
            load();
            return true;
          }
          return false;
        },
      );
    },
    [askVerification, clearSecrets, finishCodes, load, run],
  );

  const savedCodes = useCallback(() => {
    clearSecrets();
    load();
  }, [clearSecrets, load]);

  const manage = useCallback(
    (next: "codes" | "remove") => {
      token.current = null;
      setNotice(null);
      setError(null);
      setIntent(next);
      askVerification();
    },
    [askVerification],
  );

  const cancel = useCallback(() => {
    const wasPairing =
      latest.current.intent === "pair" && latest.current.status?.status !== "ACTIVE";
    clearSecrets();
    setError(null);
    // A pairing that was never confirmed is cancelled on the server too, so nothing stays pending.
    if (wasPairing) {
      void latest.current.api
        .remove()
        .catch(() => undefined)
        .finally(() => {
          if (mounted.current) load();
        });
      return;
    }
    load();
  }, [clearSecrets, load]);

  return {
    phase,
    status,
    enrollment,
    recoveryCodes,
    verifyRound,
    intent,
    busy,
    error,
    attemptsRemaining,
    retryAfterSeconds,
    notice,
    start,
    continueToVerify,
    verified,
    submitCode,
    savedCodes,
    manage,
    cancel,
    reload: load,
  };
}
