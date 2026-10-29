/**
 * Typed client of the password change of selfservice-plugin (`PUT /v1/self/user`, MX-455).
 * Contract source of truth: the plugin's README ("Step-up (OTP) authentication", CHANGE_PASSWORD).
 */

import { SelfServiceError, selfRequest, type RequestOptions } from "./http";

type Options = Pick<RequestOptions, "fetchImpl" | "config" | "signal" | "session" | "customer"> & {
  /** One-time token of a step-up for `CHANGE_PASSWORD`, when the server asks for one. */
  stepUpToken?: string;
};

export type UserDetails = {
  username: string;
  userId: number;
  officeId: number;
  officeName: string;
  staffId?: number;
  staffDisplayName?: string;
  organisationalRole?: { id: number; code: string; value: string };
  roles: { id: number; name: string; description?: string }[];
  permissions: string[];
  isSelfServiceUser: boolean;
  clients: number[];
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

/**
 * Fetches user details from `GET /v1/self/userdetails`.
 * Returns null if the endpoint is unavailable (e.g., 404 when OAuth is not enabled).
 */
export async function getUserDetails(
  options: Pick<RequestOptions, "fetchImpl" | "config" | "signal" | "session" | "customer"> = {},
): Promise<UserDetails | null> {
  try {
    return await selfRequest<UserDetails>("/userdetails", {
      ...options,
      method: "GET",
    });
  } catch (error) {
    if (error instanceof SelfServiceError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
