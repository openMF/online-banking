/**
 * The login session of the self-service API.
 *
 * The plugin treats the session token as a bearer-like credential and, for compatibility,
 * currently expects it in the `Authorization` header wrapped as `Basic <token>` (the
 * `base64EncodedAuthenticationKey` of the login response). It is moving to an OIDC compatible
 * model, so the header is built in exactly one place, {@link authorizationHeader}: switching to
 * `Bearer <access token>` later is a change to that function only.
 *
 * Security: the session lives in memory only. It is never written to `localStorage`,
 * `sessionStorage` or a cookie, and never logged.
 */

export type Session = {
  /** Opaque credential returned by login. Treat as a secret. */
  accessKey: string;
  username: string;
  userId: number | null;
  /** Ids of the clients linked to the user. */
  clients: number[];
};

let current: Session | null = null;

export function setSession(session: Session): void {
  current = session;
}

export function getSession(): Session | null {
  return current;
}

export function hasSession(): boolean {
  return current !== null;
}

export function clearSession(): void {
  current = null;
}

/** Value of the `Authorization` header for a session. The single place that knows the scheme. */
export function authorizationHeader(session: Session): string {
  return `Basic ${session.accessKey}`;
}
