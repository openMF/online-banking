/**
 * Typed client of the password change of selfservice-plugin (`PUT /v1/self/user`, MX-455).
 * Contract source of truth: the plugin's README ("Step-up (OTP) authentication", CHANGE_PASSWORD).
 */

import { selfRequest, type RequestOptions } from "./http";

type Options = Pick<RequestOptions, "fetchImpl" | "config" | "signal" | "session" | "customer"> & {
  /** One-time token of a step-up for `CHANGE_PASSWORD`, when the server asks for one. */
  stepUpToken?: string;
};

/**
 * Changes the password of the logged-in user. The server checks the request and the password
 * policy first, and only then spends the step-up token, so a refused password costs no code. On
 * success the server ends every session of the user: log in again.
 */
export function changePassword(
  password: string,
  repeatPassword: string,
  options: Options = {},
): Promise<unknown> {
  return selfRequest<unknown>("/user", {
    ...options,
    method: "PUT",
    body: { password, repeatPassword },
  });
}
