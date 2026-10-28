import type { TotpEnrollment, TotpRecoveryCodes, TotpState, TotpStatus } from "../selfservice/totp";

export { StepUpError, toStepUpError, type StepUpErrorCode } from "../stepup/api";
export type { TotpEnrollment, TotpRecoveryCodes, TotpState, TotpStatus };

/**
 * What the screen needs to pair and manage an authenticator app. Two implementations: the real one
 * over the self-service API ({@link createHttpAuthenticatorApi}) and an in-memory one for the
 * offline demo ({@link createDemoAuthenticatorStore}). The screen contains no verification logic:
 * the server (or the demo stand-in) decides if a code is right.
 *
 * Failures are thrown as `StepUpError`, because the server answers with the step-up error codes.
 */
export interface AuthenticatorApi {
  readonly mode: "demo" | "backend";
  /** Demo only: the code of the "app" to show as a hint. Never set for the real backend. */
  readonly demoHint?: string;
  getStatus(): Promise<TotpStatus>;
  /** Creates a pending secret. It is returned once. */
  begin(): Promise<TotpEnrollment>;
  /** `stepUpToken` is the grant of a step-up for `MANAGE_AUTHENTICATOR`, when one was required. */
  confirm(code: string, stepUpToken?: string): Promise<TotpRecoveryCodes>;
  newRecoveryCodes(stepUpToken?: string): Promise<TotpRecoveryCodes>;
  remove(stepUpToken?: string): Promise<void>;
}
