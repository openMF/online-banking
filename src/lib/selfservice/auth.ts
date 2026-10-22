import { SelfServiceError, selfRequest, type RequestOptions } from "./http";
import { clearSession, getSession, setSession, type Session } from "./session";

type LoginResponse = {
  authenticated?: boolean;
  username?: string;
  userId?: number;
  base64EncodedAuthenticationKey?: string;
  clients?: number[];
};

/**
 * Logs in with `POST /v1/self/authentication`, stores the session in memory and returns it.
 *
 * The password is only sent in this request body; it is not kept anywhere.
 */
export async function login(
  username: string,
  password: string,
  options: Pick<RequestOptions, "fetchImpl" | "config" | "signal"> = {},
): Promise<Session> {
  const response = await selfRequest<LoginResponse>("/authentication", {
    ...options,
    method: "POST",
    body: { username, password },
    session: null,
  });
  if (!response?.authenticated || !response.base64EncodedAuthenticationKey) {
    // Pending confirmation / disabled accounts answer 200 with authenticated=false.
    throw new SelfServiceError(401, "error.login.failed", "Login was not completed");
  }
  const session: Session = {
    accessKey: response.base64EncodedAuthenticationKey,
    username: response.username ?? username,
    userId: typeof response.userId === "number" ? response.userId : null,
    clients: Array.isArray(response.clients) ? response.clients : [],
  };
  setSession(session);
  return session;
}

/** Ends the session on the server (best effort) and always forgets it locally. */
export async function logout(
  options: Pick<RequestOptions, "fetchImpl" | "config"> = {},
): Promise<void> {
  const session = getSession();
  try {
    if (session)
      await selfRequest("/authentication/logout", { ...options, method: "POST", body: {} });
  } catch {
    // The local session is dropped either way.
  } finally {
    clearSession();
  }
}
