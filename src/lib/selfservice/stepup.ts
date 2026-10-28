/**
 * Typed client of the step-up endpoints of selfservice-plugin (`/v1/self/stepup`, MX-488).
 * Contract source of truth: the plugin's OpenAPI / README ("Step-up (OTP) authentication").
 */

import { selfRequest, type RequestOptions } from "./http";

export type StepUpAction =
  | "TPT_TRANSFER"
  | "OWN_TRANSFER"
  | "CONFIRM_TRANSFER"
  | "CHANGE_PASSWORD"
  | "MANAGE_AUTHENTICATOR";
/** `TOTP` is the code of the user's authenticator app: nothing is sent to anyone. */
export type StepUpChannel = "SMS" | "EMAIL" | "TOTP";

export type StepUpConfig = {
  enabled: boolean;
  protectedActions: StepUpAction[];
  /** Channels allowed for the tenant AND available for this user (contact data on file). */
  availableChannels: StepUpChannel[];
  otpLength: number;
  otpTtlSeconds: number;
  maxAttempts: number;
  resendCooldownSeconds: number;
  maxResends: number;
  grantTtlSeconds: number;
  /** `false` when the caller authenticated with user:password instead of a session token. */
  sessionBound: boolean;
};

export type StepUpChallenge = {
  challengeId: number;
  action: StepUpAction;
  channel: StepUpChannel;
  /** e.g. `a***@example.com` or `******0324`; `null` for `TOTP`. The full address is never sent. */
  maskedDestination: string | null;
  /** Tenant local date-time without zone. Use durations from the config for countdowns. */
  expiresAt: string;
  attemptsRemaining: number;
  resendAvailableAt: string;
  resendsRemaining: number;
};

export type StepUpGrant = {
  /** One-time token for the `X-Step-Up-Token` header. Treat as a secret. */
  stepUpToken: string;
  action: StepUpAction;
  expiresAt: string;
};

export type CreateChallengeInput = {
  action: StepUpAction;
  channel: StepUpChannel;
  /**
   * The operation about to be confirmed, with the same field names the protected request uses
   * (e.g. `fromAccountId`, `toAccountId`, `transferAmount`). The returned token only works for
   * exactly this payload. Not needed for `CHANGE_PASSWORD`.
   */
  payload?: Record<string, unknown>;
};

type Options = Pick<RequestOptions, "fetchImpl" | "config" | "signal" | "session">;

export function getStepUpConfig(options: Options = {}): Promise<StepUpConfig> {
  return selfRequest<StepUpConfig>("/stepup/config", options);
}

export function createStepUpChallenge(
  input: CreateChallengeInput,
  options: Options = {},
): Promise<StepUpChallenge> {
  return selfRequest<StepUpChallenge>("/stepup/challenges", {
    ...options,
    method: "POST",
    body: input,
  });
}

/**
 * Verifies a challenge. `code` is the one-time code (the 6 digits of an authenticator app, or the
 * code received by SMS or e-mail); with `kind: "recovery"` it is a recovery code instead, which
 * the server only accepts on a challenge of the authenticator app.
 */
export function verifyStepUpChallenge(
  challengeId: number,
  code: string,
  options: Options & { kind?: "otp" | "recovery" } = {},
): Promise<StepUpGrant> {
  const { kind = "otp", ...rest } = options;
  return selfRequest<StepUpGrant>(
    `/stepup/challenges/${encodeURIComponent(String(challengeId))}/verify`,
    {
      ...rest,
      method: "POST",
      body: kind === "recovery" ? { recoveryCode: code } : { otp: code },
    },
  );
}

export function resendStepUpChallenge(
  challengeId: number,
  options: Options = {},
): Promise<StepUpChallenge> {
  return selfRequest<StepUpChallenge>(
    `/stepup/challenges/${encodeURIComponent(String(challengeId))}/resend`,
    { ...options, method: "POST", body: {} },
  );
}
