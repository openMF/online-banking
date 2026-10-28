import { AuthenticationError, type CustomerSession } from "../authentication/client";
import {
  problemOfStatus,
  trackRequest,
  transientStatus,
  withRetry,
  type ProblemKind,
  type RetryEnv,
  type RetryPolicy,
} from "../network";
import { getSelfServiceConfig, selfUrl, type SelfServiceConfig } from "./config";
import { authorizationHeader, getSession, type Session } from "./session";

/** Header that carries the one-time step-up token on protected requests. */
export const STEP_UP_HEADER = "X-Step-Up-Token";

const STEP_UP_CODE_PREFIX = "error.msg.selfservice.stepup.";
const DEFAULT_TIMEOUT_MS = 30_000;
/** A read is repeated when it fails in transit, so it gets less time per attempt. */
const READ_TIMEOUT_MS = 15_000;

/**
 * An error answered by the API (or a failure to reach it).
 *
 * `code` is the machine readable `userMessageGlobalisationCode` of the Fineract error body (or
 * `error.http.<status>` / `error.network`). The message is for developers: never show it to the
 * user, map the code to a translated text instead.
 */
export class SelfServiceError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "SelfServiceError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * What kind of problem this is, in the terms every screen words the same way: a failure to reach
   * the server (offline, timeout, other) or the kind of the HTTP status.
   */
  get problem(): ProblemKind {
    if (this.status === 0) {
      const reason = this.details.reason;
      return reason === "offline" || reason === "timeout" ? reason : "network";
    }
    return problemOfStatus(this.status);
  }

  /** The step-up error suffix (`required`, `otp.invalid`, `locked`, …) or `null`. */
  get stepUpCode(): string | null {
    return this.code.startsWith(STEP_UP_CODE_PREFIX)
      ? this.code.slice(STEP_UP_CODE_PREFIX.length)
      : null;
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Defaults to the current session. Pass `null` for unauthenticated calls such as login. */
  session?: Session | null;
  /** One-time step-up token for a protected operation. */
  stepUpToken?: string;
  /**
   * The logged-in customer (MX-452). When it is given, the call goes through its memory-only
   * session: this module never sees the credential, the tenant or the URL of the login, and
   * `session` and `config` are not used.
   */
  customer?: CustomerSession;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Test seam: the retry policy and what it waits with. */
  retry?: { policy?: Partial<RetryPolicy>; env?: Partial<RetryEnv> };
  /** Test seam. */
  fetchImpl?: typeof fetch;
  /** Test seam. */
  config?: SelfServiceConfig | null;
};

type Answer = { status: number; ok: boolean; text: string; retryAfter: string | null };

/** The request did not get an answer. `reason` tells why, and whether trying again can help. */
class TransportFailure extends Error {
  constructor(readonly reason: "cancelled" | "timeout" | "offline" | "network") {
    super(reason);
    this.name = "TransportFailure";
  }
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toError(status: number, body: unknown): SelfServiceError {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code =
    typeof record.userMessageGlobalisationCode === "string"
      ? record.userMessageGlobalisationCode
      : `error.http.${status}`;
  const message =
    typeof record.defaultUserMessage === "string" ? record.defaultUserMessage : `HTTP ${status}`;
  const details: Record<string, unknown> = {};
  for (const key of ["action", "attemptsRemaining", "retryAfterSeconds"]) {
    if (key in record) details[key] = record[key];
  }
  // The codes of the field errors of a validation answer (never their texts or their values).
  if (Array.isArray(record.errors)) {
    details.errorCodes = record.errors
      .map((entry) =>
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>).userMessageGlobalisationCode
          : undefined,
      )
      .filter((entry): entry is string => typeof entry === "string");
  }
  return new SelfServiceError(status, code, message, details);
}

/** A call made through the session of the logged-in customer. Same errors as a direct call. */
async function viaCustomer<T>(path: string, options: RequestOptions): Promise<T> {
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) query[key] = value;
  }
  let response;
  try {
    response = await options.customer!.request(path.replace(/^\/+/, ""), {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      body: options.body,
      query,
      signal: options.signal,
      stepUpToken: options.stepUpToken,
    });
  } catch (error) {
    if (error instanceof AuthenticationError && error.code === "expired") {
      throw new SelfServiceError(401, "error.http.401", "The session ended");
    }
    // Network, timeout, cancelled, malformed: the same words as a direct call, nothing leaked.
    throw new SelfServiceError(0, "error.network", "The server could not be reached");
  }
  if (!response.ok) throw toError(response.status, response.data);
  return (response.data ?? undefined) as T;
}

/**
 * Calls `/v1/self{path}` with the tenant header, the session credential and, when given, the
 * step-up token. Never throws anything but {@link SelfServiceError}.
 */
export async function selfRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (options.customer) return viaCustomer<T>(path, options);
  const config = options.config === undefined ? getSelfServiceConfig() : options.config;
  if (!config) {
    throw new SelfServiceError(0, "error.not.configured", "No self-service backend is configured");
  }
  const session = options.session === undefined ? getSession() : options.session;

  const query = Object.entries(options.query ?? {})
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  const url = selfUrl(config, path) + (query ? `?${query}` : "");

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Fineract-Platform-TenantId": config.tenantId,
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (session) headers.Authorization = authorizationHeader(session);
  if (options.stepUpToken) headers[STEP_UP_HEADER] = options.stepUpToken;

  const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
  // Only a read is repeated. A write that failed in transit may have run on the server.
  const idempotent = method === "GET";
  const timeoutMs = options.timeoutMs ?? (idempotent ? READ_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  /** One try. A failure to reach the server is a {@link TransportFailure}, an answer is returned. */
  async function attempt(): Promise<Answer> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
      const response = await (options.fetchImpl ?? fetch)(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
      });
      const text = await response.text().catch(() => "");
      return {
        status: response.status,
        ok: response.ok,
        text,
        retryAfter: response.headers?.get("Retry-After") ?? null,
      };
    } catch {
      throw new TransportFailure(
        options.signal?.aborted
          ? "cancelled"
          : timedOut
            ? "timeout"
            : isOffline()
              ? "offline"
              : "network",
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }

  let answer: Answer;
  try {
    answer = await trackRequest((handle) =>
      withRetry(attempt, {
        idempotent,
        transientError: (error) =>
          error instanceof TransportFailure && error.reason !== "cancelled",
        transientResult: (result) => transientStatus(result.status, result.retryAfter),
        signal: options.signal,
        policy: options.retry?.policy,
        env: options.retry?.env,
        onRetry: () => handle.retrying(),
      }),
    );
  } catch (error) {
    if (error instanceof TransportFailure) {
      // Do not leak URLs or headers through the message.
      throw new SelfServiceError(0, "error.network", "The server could not be reached", {
        reason: error.reason,
      });
    }
    // The caller cancelled while waiting to try again.
    throw new SelfServiceError(0, "error.network", "The server could not be reached", {
      reason: "cancelled",
    });
  }

  const body = parseBody(answer.text);
  if (!answer.ok) throw toError(answer.status, body);
  return body as T;
}
