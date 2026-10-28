/**
 * Typed client of the authenticator-app endpoints of selfservice-plugin (`/v1/self/stepup/totp`,
 * MX-488 follow-up). Contract source of truth: the plugin's README ("Authenticator app (TOTP)").
 *
 * Nothing here is stored: the secret and the recovery codes are returned once, to be shown to the
 * user, and the server never returns them again.
 */

import { selfRequest, type RequestOptions } from "./http";

export type TotpState = "NONE" | "PENDING" | "ACTIVE";

export type TotpStatus = {
  /** `false` when the tenant did not switch the authenticator on (or has no key): hide the section. */
  available: boolean;
  status: TotpState;
  recoveryCodesRemaining: number;
  /** While active, SMS and e-mail codes are not offered. */
  exclusive: boolean;
  /** Tenant local date-time without zone, or `null`. */
  confirmedAt: string | null;
};

/** What an authenticator app needs. Treat `secret` as a password: show it once and drop it. */
export type TotpEnrollment = {
  /** Base32 text of the secret, to type into the app. */
  secret: string;
  /** `otpauth://` URI, to draw as a QR code in the browser (never send it to a third party). */
  otpauthUri: string;
  issuer: string;
  digits: number;
  periodSeconds: number;
};

export type TotpRecoveryCodes = {
  /** Shown once, e.g. `ABCDE-FGHJK`. */
  recoveryCodes: string[];
};

type Options = Pick<RequestOptions, "fetchImpl" | "config" | "signal" | "session">;
type ProtectedOptions = Options & {
  /** One-time token of a step-up for `MANAGE_AUTHENTICATOR`, when the server asks for one. */
  stepUpToken?: string;
};

export function getTotpStatus(options: Options = {}): Promise<TotpStatus> {
  return selfRequest<TotpStatus>("/stepup/totp", options);
}

/** Creates a pending secret (replacing a pending one). Refused while an authenticator is active. */
export function beginTotpEnrollment(options: Options = {}): Promise<TotpEnrollment> {
  return selfRequest<TotpEnrollment>("/stepup/totp/enrollment", {
    ...options,
    method: "POST",
    body: {},
  });
}

/** The code shown by the app proves it holds the secret. Returns the recovery codes. */
export function confirmTotpEnrollment(
  code: string,
  options: ProtectedOptions = {},
): Promise<TotpRecoveryCodes> {
  return selfRequest<TotpRecoveryCodes>("/stepup/totp/enrollment/confirm", {
    ...options,
    method: "POST",
    body: { code },
  });
}

/** A new set of recovery codes; the old ones stop working. */
export function regenerateRecoveryCodes(
  options: ProtectedOptions = {},
): Promise<TotpRecoveryCodes> {
  return selfRequest<TotpRecoveryCodes>("/stepup/totp/recovery-codes", {
    ...options,
    method: "POST",
    body: {},
  });
}

/** Removes the authenticator and its recovery codes. */
export function removeTotp(options: ProtectedOptions = {}): Promise<{ removed: boolean }> {
  return selfRequest<{ removed: boolean }>("/stepup/totp", { ...options, method: "DELETE" });
}
