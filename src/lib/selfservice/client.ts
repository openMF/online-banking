/**
 * Low-level HTTP client for the Mifos Self Service Plugin.
 * Auth: HTTP Basic (username/password) and/or Bearer token after login.
 * Always sends Fineract-Platform-TenantId; optionally X-API-Key.
 */

import { getSelfServiceConfig, selfUrl } from "./config";

export type AuthCredentials = {
  username: string;
  password: string;
};

export type TokenAuth = {
  accessToken: string;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Override auth for this call */
  auth?: AuthCredentials | TokenAuth | null;
  /** Extra headers */
  headers?: Record<string, string>;
  /** AbortSignal */
  signal?: AbortSignal;
};

export class SelfServiceError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "SelfServiceError";
  }
}

let sessionAuth: AuthCredentials | TokenAuth | null = null;

/** Persist credentials/token used for subsequent authenticated calls. */
export function setSessionAuth(auth: AuthCredentials | TokenAuth | null) {
  sessionAuth = auth;
}

export function getSessionAuth() {
  return sessionAuth;
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function authHeaders(auth: AuthCredentials | TokenAuth | null | undefined): Record<string, string> {
  if (!auth) return {};
  if ("accessToken" in auth && auth.accessToken) {
    return { Authorization: `Bearer ${auth.accessToken}` };
  }
  if ("username" in auth && auth.username) {
    const raw = `${auth.username}:${auth.password}`;
    const b64 =
      typeof btoa !== "undefined"
        ? btoa(raw)
        : Buffer.from(raw, "utf8").toString("base64");
    return { Authorization: `Basic ${b64}` };
  }
  return {};
}

/**
 * Perform a request against /v1/self{path}.
 * path examples: "/authentication", "/savingsaccounts/1"
 */
export async function selfRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const cfg = getSelfServiceConfig();
  const method = options.method ?? (options.body ? "POST" : "GET");
  const url = selfUrl(path) + buildQuery(options.query);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Fineract-Platform-TenantId": cfg.tenantId,
    ...authHeaders(options.auth !== undefined ? options.auth : sessionAuth),
    ...options.headers,
  };

  if (cfg.apiKey) {
    headers["X-API-Key"] = cfg.apiKey;
  }

  let body: string | undefined;
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === "string") {
      body = options.body;
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    } else {
      body = JSON.stringify(options.body);
      headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    signal: options.signal,
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const msg =
      (parsed &&
        typeof parsed === "object" &&
        ("defaultUserMessage" in parsed
          ? String((parsed as { defaultUserMessage: string }).defaultUserMessage)
          : "developerMessage" in parsed
            ? String((parsed as { developerMessage: string }).developerMessage)
            : "message" in parsed
              ? String((parsed as { message: string }).message)
              : res.statusText)) ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new SelfServiceError(msg, res.status, parsed);
  }

  return parsed as T;
}
