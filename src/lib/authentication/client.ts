import { buildSelfServiceUrl, type SelfServiceConfig } from "../self-service-config";
import { getSelfServiceConfig } from "../self-service";

export type AuthenticationFailure =
  | "invalidCredentials"
  | "pending"
  | "additional"
  | "passwordRenewal"
  | "expired"
  | "network"
  | "server"
  | "timeout"
  | "configuration"
  | "malformed"
  | "denied"
  | "cancelled";

export class AuthenticationError extends Error {
  constructor(public readonly code: AuthenticationFailure) {
    // Never include transport errors, response bodies or credentials.
    super(code);
    this.name = "AuthenticationError";
  }
}

export interface CustomerIdentity {
  readonly userId: number;
  readonly username: string;
  readonly roles: readonly { readonly id: number; readonly name: string }[];
  readonly permissions: readonly string[];
  readonly clients: readonly number[];
}

/** A memory-only capability. No token is exposed to React or the legacy demo client. */
export interface CustomerSession {
  readonly identity: CustomerIdentity;
  /** Local maximum lifetime, independent of the backend's sliding token expiry. */
  readonly expiresAt: number;
  /** Forgets the credential immediately; true means the access-token logout was acknowledged. */
  logout(): Promise<boolean>;
}

const positiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function parseIdentity(data: Record<string, unknown>): CustomerIdentity {
  if (
    !positiveId(data.userId) ||
    !nonempty(data.username) ||
    !Array.isArray(data.permissions) ||
    !data.permissions.every(nonempty) ||
    !Array.isArray(data.roles) ||
    !data.roles.every((role) => object(role) && positiveId(role.id) && nonempty(role.name)) ||
    (data.clients != null && (!Array.isArray(data.clients) || !data.clients.every(positiveId)))
  ) {
    throw new AuthenticationError("malformed");
  }
  return Object.freeze({
    userId: data.userId,
    username: data.username,
    permissions: Object.freeze([...data.permissions]),
    roles: Object.freeze(
      data.roles.map((role) => Object.freeze({ id: role.id as number, name: role.name as string })),
    ),
    clients: Object.freeze([...((data.clients as number[] | null | undefined) ?? [])]),
  });
}

function accessKey(value: unknown): string {
  if (!nonempty(value) || value.length > 2048 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
    throw new AuthenticationError("malformed");
  try {
    // The plugin uses base64(raw access token), not base64(username:password).
    if (!/^[\x21-\x39\x3b-\x7e]+$/.test(atob(value))) throw new Error();
  } catch {
    throw new AuthenticationError("malformed");
  }
  return value;
}

export function createAuthenticationClient({
  configuration = getSelfServiceConfig,
  transport = fetch,
  timeoutMs = 15_000,
  now = Date.now,
}: {
  configuration?: () => Promise<SelfServiceConfig>;
  transport?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
} = {}) {
  async function request(
    config: SelfServiceConfig,
    resource: string,
    body: unknown,
    key?: string,
    signal?: AbortSignal,
  ): Promise<{ status: number; ok: boolean; data: unknown }> {
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    const timer = setTimeout(() => {
      timedOut = true;
      cancel();
    }, timeoutMs);
    try {
      if (controller.signal.aborted) throw new AuthenticationError("cancelled");
      const response = await transport(buildSelfServiceUrl(config, resource), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Fineract-Platform-TenantId": config.tenantId,
          ...(key ? { Authorization: `Basic ${key}` } : {}),
        },
        body: JSON.stringify(body),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (controller.signal.aborted)
        throw new AuthenticationError(timedOut ? "timeout" : "cancelled");
      return { status: response.status, ok: response.ok, data };
    } catch (error) {
      if (controller.signal.aborted)
        throw new AuthenticationError(timedOut ? "timeout" : "cancelled");
      if (error instanceof AuthenticationError) throw error;
      throw new AuthenticationError("network");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
  }

  return {
    async login(
      username: string,
      password: string,
      signal?: AbortSignal,
    ): Promise<CustomerSession> {
      if (!username.trim() || !password.trim()) throw new AuthenticationError("invalidCredentials");
      let config: SelfServiceConfig;
      try {
        config = Object.freeze({ ...(await configuration()) });
      } catch {
        throw new AuthenticationError("configuration");
      }
      const { ok, status, data } = await request(
        config,
        "authentication",
        { username, password },
        undefined,
        signal,
      );
      if (status === 401) throw new AuthenticationError("invalidCredentials");
      // Accept special states only on the documented success/renewal status boundary.
      if (ok || status === 403) {
        if (object(data) && data.shouldRenewPassword === true)
          throw new AuthenticationError("passwordRenewal");
        if (object(data) && data.isTwoFactorAuthenticationRequired === true)
          throw new AuthenticationError("additional");
      }
      if (status === 403) throw new AuthenticationError("denied");
      if (!ok) throw new AuthenticationError("server");
      if (!object(data)) throw new AuthenticationError("malformed");
      if (data.authenticated === false) throw new AuthenticationError("pending");
      if (
        data.authenticated !== true ||
        data.shouldRenewPassword !== false ||
        data.isTwoFactorAuthenticationRequired !== false
      )
        throw new AuthenticationError("malformed");
      const identity = parseIdentity(data);
      let key: string | null = accessKey(data.base64EncodedAuthenticationKey);
      let closing: Promise<boolean> | undefined;
      return Object.freeze({
        identity,
        expiresAt: now() + 15 * 60_000,
        logout() {
          if (closing) return closing;
          const currentKey = key;
          key = null;
          closing = (async () => {
            if (!currentKey) return false;
            try {
              const response = await request(config, "authentication/logout", {}, currentKey);
              return response.ok && object(response.data) && response.data.status === "success";
            } catch {
              return false;
            }
          })();
          return closing;
        },
      });
    },
  };
}

export const customerAuthentication = createAuthenticationClient();
