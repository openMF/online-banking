import { getSelfServiceConfig, selfUrl, type SelfServiceConfig } from "./config";
import { authorizationHeader, getSession, type Session } from "./session";

/** Header that carries the one-time step-up token on protected requests. */
export const STEP_UP_HEADER = "X-Step-Up-Token";

const STEP_UP_CODE_PREFIX = "error.msg.selfservice.stepup.";
const DEFAULT_TIMEOUT_MS = 30_000;

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
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Test seam. */
  fetchImpl?: typeof fetch;
  /** Test seam. */
  config?: SelfServiceConfig | null;
};

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
  return new SelfServiceError(status, code, message, details);
}

/**
 * Calls `/v1/self{path}` with the tenant header, the session credential and, when given, the
 * step-up token. Never throws anything but {@link SelfServiceError}.
 */
export async function selfRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    // Do not leak URLs or headers through the message.
    throw new SelfServiceError(0, "error.network", "The server could not be reached");
  } finally {
    clearTimeout(timer);
  }

  const body = parseBody(await response.text().catch(() => ""));
  if (!response.ok) throw toError(response.status, body);
  return body as T;
}
