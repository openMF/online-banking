import { SelfServiceError } from "../selfservice/http";
import type {
  CreateChallengeInput,
  StepUpAction,
  StepUpChallenge,
  StepUpChannel,
  StepUpConfig,
  StepUpGrant,
} from "../selfservice/stepup";

export type {
  CreateChallengeInput,
  StepUpAction,
  StepUpChallenge,
  StepUpChannel,
  StepUpConfig,
  StepUpGrant,
};

/** Reasons a step-up call can fail (suffix of `error.msg.selfservice.stepup.*`, plus two local ones). */
export type StepUpErrorCode =
  | "required"
  | "invalid"
  | "session.required"
  | "otp.invalid"
  | "otp.expired"
  | "disabled"
  | "action.not.protected"
  | "channel.unavailable"
  | "legacy.otp.disabled"
  | "locked"
  | "resend.cooldown"
  | "resend.limit"
  | "resend.unsupported"
  | "rate.limited"
  | "misconfigured"
  | "totp.disabled"
  | "totp.not.enrolled"
  | "totp.enrollment.missing"
  | "totp.already.enrolled"
  | "network"
  | "offline"
  | "timeout"
  | "unavailable"
  | "unknown";

const KNOWN_CODES: ReadonlySet<string> = new Set<StepUpErrorCode>([
  "required",
  "invalid",
  "session.required",
  "otp.invalid",
  "otp.expired",
  "disabled",
  "action.not.protected",
  "channel.unavailable",
  "legacy.otp.disabled",
  "locked",
  "resend.cooldown",
  "resend.limit",
  "resend.unsupported",
  "rate.limited",
  "misconfigured",
  "totp.disabled",
  "totp.not.enrolled",
  "totp.enrollment.missing",
  "totp.already.enrolled",
]);

export class StepUpError extends Error {
  readonly code: StepUpErrorCode;
  /** Present on `otp.invalid`. */
  readonly attemptsRemaining?: number;
  /** Present on `locked`, `resend.cooldown` and `rate.limited`. */
  readonly retryAfterSeconds?: number;

  constructor(
    code: StepUpErrorCode,
    extra: { attemptsRemaining?: number; retryAfterSeconds?: number } = {},
  ) {
    super(`step-up: ${code}`);
    this.name = "StepUpError";
    this.code = code;
    this.attemptsRemaining = extra.attemptsRemaining;
    this.retryAfterSeconds = extra.retryAfterSeconds;
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Maps anything thrown by the API layer to a {@link StepUpError} (never leaks server text). */
export function toStepUpError(error: unknown): StepUpError {
  if (error instanceof StepUpError) return error;
  if (error instanceof SelfServiceError) {
    if (error.code === "error.network") {
      // Offline and a timeout read differently from "could not connect": say which.
      const problem = error.problem;
      return new StepUpError(problem === "offline" || problem === "timeout" ? problem : "network");
    }
    const suffix = error.stepUpCode;
    if (suffix && KNOWN_CODES.has(suffix)) {
      return new StepUpError(suffix as StepUpErrorCode, {
        attemptsRemaining: numberOrUndefined(error.details.attemptsRemaining),
        retryAfterSeconds: numberOrUndefined(error.details.retryAfterSeconds),
      });
    }
    // A service that is down or restarting (502, 503, 504) answers without a step-up code.
    if (error.problem === "unavailable") return new StepUpError("unavailable");
    // HTTP 408 (the server gave up waiting) reads as a timeout, like a request that ran out of time.
    if (error.problem === "timeout") return new StepUpError("timeout");
  }
  return new StepUpError("unknown");
}

/**
 * What the UI needs from a step-up backend. There are two implementations: the real one over the
 * self-service API ({@link createHttpStepUpApi}) and an in-memory one for the offline demo
 * ({@link createDemoStepUpApi}). The UI contains no verification logic of its own.
 */
export interface StepUpApi {
  readonly mode: "demo" | "backend";
  /** Demo only: the code to show as a hint. Never set for the real backend. */
  readonly demoHint?: string;
  /** Demo only: the code of the demo authenticator app, to show as a hint on that channel. */
  readonly demoAppHint?: string;
  getConfig(): Promise<StepUpConfig>;
  createChallenge(input: CreateChallengeInput): Promise<StepUpChallenge>;
  /** `kind: "recovery"` sends a recovery code instead of a one-time code (authenticator app only). */
  verify(challengeId: number, code: string, kind?: "otp" | "recovery"): Promise<StepUpGrant>;
  resend(challengeId: number): Promise<StepUpChallenge>;
}
