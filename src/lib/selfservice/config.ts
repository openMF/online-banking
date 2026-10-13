/**
 * Self Service Plugin configuration.
 *
 * All connection details come from environment variables so the same build
 * can point at different Fineract + selfservice-plugin deployments.
 *
 * | Variable                         | Purpose                                      | Example |
 * |----------------------------------|----------------------------------------------|---------|
 * | SELF_SERVICE_BASE_URL            | Origin of Fineract (no trailing slash)       | https://demo.mifos.community |
 * | SELF_SERVICE_ENDPOINT            | API path prefix before /v1/self              | /fineract-provider/api |
 * | SELF_SERVICE_API_KEY             | Optional API key (sent as X-API-Key)         | (empty if unused) |
 * | SELF_SERVICE_TENANT_ID           | Fineract tenant header value                 | default |
 * | VITE_SELF_SERVICE_BASE_URL       | Client-side mirror of BASE_URL (Vite)        | same as above |
 * | VITE_SELF_SERVICE_ENDPOINT       | Client-side mirror of ENDPOINT               | same as above |
 * | VITE_SELF_SERVICE_API_KEY        | Client-side mirror of API_KEY                | same as above |
 * | VITE_SELF_SERVICE_TENANT_ID      | Client-side mirror of TENANT_ID              | default |
 *
 * Resolution order: process.env (server) → import.meta.env (Vite client).
 */

function read(key: string, fallback = ""): string {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return String(process.env[key]).trim();
  }
  try {
    // Vite injects import.meta.env.VITE_* at build time
    const meta = import.meta as unknown as { env?: Record<string, string> };
    const viteKey = key.startsWith("VITE_") ? key : `VITE_${key}`;
    const fromVite = meta.env?.[viteKey] ?? meta.env?.[key];
    if (fromVite) return String(fromVite).trim();
  } catch {
    /* not in Vite context */
  }
  return fallback;
}

export interface SelfServiceConfig {
  /** e.g. https://demo.mifos.community */
  baseUrl: string;
  /** e.g. /fineract-provider/api  (no trailing slash) */
  endpoint: string;
  /** Optional API key header */
  apiKey: string;
  /** Fineract-Platform-TenantId */
  tenantId: string;
  /** Full prefix for /v1/self/... routes */
  selfRoot: string;
}

export function getSelfServiceConfig(): SelfServiceConfig {
  const baseUrl = (
    read("SELF_SERVICE_BASE_URL") ||
    read("VITE_SELF_SERVICE_BASE_URL") ||
    "http://localhost:8080"
  ).replace(/\/$/, "");

  const endpoint = (
    read("SELF_SERVICE_ENDPOINT") ||
    read("VITE_SELF_SERVICE_ENDPOINT") ||
    "/fineract-provider/api"
  ).replace(/\/$/, "");

  const apiKey =
    read("SELF_SERVICE_API_KEY") || read("VITE_SELF_SERVICE_API_KEY") || "";

  const tenantId =
    read("SELF_SERVICE_TENANT_ID") ||
    read("VITE_SELF_SERVICE_TENANT_ID") ||
    "default";

  const selfRoot = `${baseUrl}${endpoint}/v1/self`;

  return { baseUrl, endpoint, apiKey, tenantId, selfRoot };
}

/** Absolute URL for a path under /v1/self (path should start with /). */
export function selfUrl(path: string): string {
  const { selfRoot } = getSelfServiceConfig();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${selfRoot}${p}`;
}
