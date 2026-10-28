import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  toStepUpError,
  type StepUpAction,
  type StepUpApi,
  type StepUpChallenge,
  type StepUpChannel,
  type StepUpConfig,
  type StepUpErrorCode,
} from "./api";

export type StepUpPhase =
  /** Reading the tenant configuration. */
  | "loading"
  /** More than one channel is possible: the user chooses. */
  | "channel"
  /** Asking the server to send a code. */
  | "starting"
  /** A code was sent; waiting for the user. */
  | "code"
  | "verifying"
  /** Verified; `onVerified` was called. */
  | "done"
  /** Too many wrong codes / too many codes requested. */
  | "locked"
  /** The code or challenge is no longer valid; the user can start again. */
  | "expired"
  /** Step-up cannot be used (no channel, no session, server not reachable…). */
  | "unavailable"
  /** The server does not require step-up for this action. `onNotRequired` was called. */
  | "not-required";

export type StepUpNotice = "resent" | null;

/** What the user typed: the code of the challenge, or a recovery code of the authenticator app. */
export type StepUpCodeKind = "otp" | "recovery";

/** The digits of a code of an authenticator app: fixed by the standard, not by the tenant. */
export const TOTP_CODE_LENGTH = 6;

/** A recovery code is 10 letters and digits; dashes and spaces are only for reading. */
export function normalizeRecoveryCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export type UseStepUpChallengeInput = {
  api: StepUpApi;
  action: StepUpAction;
  /** The operation being confirmed; the token is bound to exactly this payload. */
  payload?: Record<string, unknown>;
  onVerified: (stepUpToken: string) => void;
  onNotRequired?: () => void;
};

export type UseStepUpChallenge = {
  phase: StepUpPhase;
  config: StepUpConfig | null;
  channels: StepUpChannel[];
  challenge: StepUpChallenge | null;
  /** Increments every time a new code was issued (first code, resend, restart). */
  codeVersion: number;
  attemptsRemaining: number | null;
  /** Last error to show, or null. */
  errorCode: StepUpErrorCode | "format" | null;
  notice: StepUpNotice;
  /** Seconds until a new code may be requested. */
  resendCooldownLeft: number;
  /** Seconds until the current code expires. */
  expiresIn: number;
  /** For `locked`: seconds to wait, when the server said so. */
  retryAfterSeconds: number | null;
  canResend: boolean;
  /** Digits the user has to type: 6 for an authenticator app, the tenant's length otherwise. */
  codeLength: number;
  selectChannel: (channel: StepUpChannel) => void;
  submit: (code: string, kind?: StepUpCodeKind) => void;
  resend: () => void;
  restart: () => void;
};

/**
 * Drives one step-up verification (config → channel → code → token) against a {@link StepUpApi}.
 *
 * The component using it only renders state. No code is ever checked here: the server (or the demo
 * adapter standing in for it) is the only authority.
 */
export function useStepUpChallenge({
  api,
  action,
  payload,
  onVerified,
  onNotRequired,
}: UseStepUpChallengeInput): UseStepUpChallenge {
  const [phase, setPhase] = useState<StepUpPhase>("loading");
  const [config, setConfig] = useState<StepUpConfig | null>(null);
  const [challenge, setChallenge] = useState<StepUpChallenge | null>(null);
  const [errorCode, setErrorCode] = useState<UseStepUpChallenge["errorCode"]>(null);
  const [notice, setNotice] = useState<StepUpNotice>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [resendCooldownLeft, setResendCooldownLeft] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [resendsLeft, setResendsLeft] = useState(0);
  const [codeVersion, setCodeVersion] = useState(0);

  // Latest values for async callbacks (avoids stale closures and effect re-runs).
  const latest = useRef({ api, action, payload, onVerified, onNotRequired, config, challenge });
  latest.current = { api, action, payload, onVerified, onNotRequired, config, challenge };
  const mounted = useRef(false);
  const busy = useRef(false);
  const initialised = useRef(false);
  const verified = useRef(false);

  const channels = useMemo<StepUpChannel[]>(() => config?.availableChannels ?? [], [config]);

  const applyChallenge = useCallback((next: StepUpChallenge, cfg: StepUpConfig) => {
    setChallenge(next);
    setCodeVersion((value) => value + 1);
    setAttemptsRemaining(next.attemptsRemaining);
    setResendsLeft(next.resendsRemaining);
    setResendCooldownLeft(cfg.resendCooldownSeconds);
    setExpiresIn(cfg.otpTtlSeconds);
  }, []);

  const fail = useCallback((error: unknown, from: "start" | "verify" | "resend") => {
    const failure = toStepUpError(error);
    setNotice(null);
    switch (failure.code) {
      case "otp.invalid":
        setErrorCode("otp.invalid");
        if (typeof failure.attemptsRemaining === "number")
          setAttemptsRemaining(failure.attemptsRemaining);
        setPhase("code");
        return;
      case "locked":
      case "rate.limited":
        setErrorCode(failure.code);
        setRetryAfterSeconds(failure.retryAfterSeconds ?? null);
        setPhase("locked");
        return;
      case "otp.expired":
      case "invalid":
        setErrorCode(failure.code);
        setPhase("expired");
        return;
      case "resend.limit":
        // The current code is still valid: only further resends are over.
        setErrorCode("resend.limit");
        setResendsLeft(0);
        setPhase("code");
        return;
      case "resend.cooldown":
        setErrorCode("resend.cooldown");
        setResendCooldownLeft(failure.retryAfterSeconds ?? 1);
        setPhase("code");
        return;
      case "network":
        // Keep what the user typed and let them retry the same action.
        setErrorCode("network");
        setPhase(from === "start" ? "unavailable" : "code");
        return;
      default:
        setErrorCode(failure.code);
        setPhase("unavailable");
    }
  }, []);

  const start = useCallback(
    async (channel: StepUpChannel) => {
      const {
        api: current,
        action: currentAction,
        payload: currentPayload,
        config: cfg,
      } = latest.current;
      if (!cfg || busy.current) return;
      busy.current = true;
      setErrorCode(null);
      setNotice(null);
      setPhase("starting");
      try {
        const created = await current.createChallenge({
          action: currentAction,
          channel,
          payload: currentPayload,
        });
        if (!mounted.current) return;
        applyChallenge(created, cfg);
        setPhase("code");
      } catch (error) {
        if (mounted.current) fail(error, "start");
      } finally {
        busy.current = false;
      }
    },
    [applyChallenge, fail],
  );

  // 1. Read the configuration once and decide what to do.
  useEffect(() => {
    mounted.current = true;
    if (!initialised.current) {
      initialised.current = true;
      const { api: current, action: currentAction } = latest.current;
      current
        .getConfig()
        .then((cfg) => {
          if (!mounted.current) return;
          setConfig(cfg);
          latest.current.config = cfg;
          if (!cfg.enabled || !cfg.protectedActions.includes(currentAction)) {
            setPhase("not-required");
            latest.current.onNotRequired?.();
            return;
          }
          if (!cfg.sessionBound || cfg.availableChannels.length === 0) {
            setErrorCode(cfg.sessionBound ? "channel.unavailable" : "session.required");
            setPhase("unavailable");
            return;
          }
          if (cfg.availableChannels.length === 1) {
            void start(cfg.availableChannels[0]);
          } else {
            setPhase("channel");
          }
        })
        .catch((error) => {
          if (mounted.current) fail(error, "start");
        });
    }
    return () => {
      mounted.current = false;
    };
  }, [fail, start]);

  // 2. One-second ticker for the cooldown and the expiry while a code is pending.
  useEffect(() => {
    if (phase !== "code" && phase !== "verifying") return;
    const timer = window.setInterval(() => {
      setResendCooldownLeft((value) => (value > 0 ? value - 1 : 0));
      setExpiresIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "code" && challenge && expiresIn === 0) {
      setErrorCode("otp.expired");
      setPhase("expired");
    }
  }, [phase, challenge, expiresIn]);

  const submit = useCallback(
    (typed: string, kind: StepUpCodeKind = "otp") => {
      const { api: current, onVerified: done, challenge: active, config: cfg } = latest.current;
      if (!active || !cfg || busy.current || phase !== "code") return;
      // A recovery code only exists for the authenticator app: anywhere else it is a format error.
      const isRecovery = kind === "recovery" && active.channel === "TOTP";
      const length = active.channel === "TOTP" ? TOTP_CODE_LENGTH : cfg.otpLength;
      const code = isRecovery ? normalizeRecoveryCode(typed) : typed.trim();
      const wellFormed = isRecovery
        ? /^[A-Z0-9]{10}$/.test(code)
        : new RegExp(`^\\d{${length}}$`).test(code);
      if ((kind === "recovery" && !isRecovery) || !wellFormed) {
        setErrorCode("format");
        return;
      }
      busy.current = true;
      setErrorCode(null);
      setNotice(null);
      setPhase("verifying");
      (isRecovery
        ? current.verify(active.challengeId, code, "recovery")
        : current.verify(active.challengeId, code)
      )
        .then((grant) => {
          if (!mounted.current || verified.current) return;
          verified.current = true;
          setPhase("done");
          done(grant.stepUpToken);
        })
        .catch((error) => {
          if (mounted.current) fail(error, "verify");
        })
        .finally(() => {
          busy.current = false;
        });
    },
    [fail, phase],
  );

  const resend = useCallback(() => {
    const { api: current, challenge: active, config: cfg } = latest.current;
    if (!active || !cfg || busy.current || phase !== "code" || resendCooldownLeft > 0) return;
    busy.current = true;
    setErrorCode(null);
    current
      .resend(active.challengeId)
      .then((next) => {
        if (!mounted.current) return;
        applyChallenge(next, cfg);
        setNotice("resent");
      })
      .catch((error) => {
        if (mounted.current) fail(error, "resend");
      })
      .finally(() => {
        busy.current = false;
      });
  }, [applyChallenge, fail, phase, resendCooldownLeft]);

  const restart = useCallback(() => {
    const cfg = latest.current.config;
    if (!cfg) return;
    setChallenge(null);
    setErrorCode(null);
    setNotice(null);
    setRetryAfterSeconds(null);
    if (cfg.availableChannels.length === 1) void start(cfg.availableChannels[0]);
    else setPhase("channel");
  }, [start]);

  return {
    phase,
    config,
    channels,
    challenge,
    codeVersion,
    attemptsRemaining,
    errorCode,
    notice,
    resendCooldownLeft,
    expiresIn,
    retryAfterSeconds,
    canResend: phase === "code" && resendCooldownLeft === 0 && resendsLeft > 0,
    codeLength: challenge?.channel === "TOTP" ? TOTP_CODE_LENGTH : (config?.otpLength ?? 6),
    selectChannel: (channel) => void start(channel),
    submit,
    resend,
    restart,
  };
}
