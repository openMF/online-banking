/**
 * Connection settings of the Mifos self-service API (selfservice-plugin).
 *
 * Only `VITE_*` variables reach the browser. They are public by design: never put a secret in
 * them. When no base URL is configured the app has no backend and runs as the in-memory demo.
 */

export type SelfServiceConfig = {
  /** Origin of the Fineract instance, without trailing slash. */
  baseUrl: string;
  /** Path prefix before `/v1/self`, e.g. `/fineract-provider/api`. */
  apiPath: string;
  /** Value of the `Fineract-Platform-TenantId` header. */
  tenantId: string;
};

type Env = Record<string, string | undefined>;

const DEFAULT_API_PATH = "/fineract-provider/api";
const DEFAULT_TENANT = "default";

function trimSlashes(value: string, side: "end" | "both"): string {
  const withoutEnd = value.replace(/\/+$/, "");
  return side === "both" ? withoutEnd.replace(/^\/+/, "") : withoutEnd;
}

/** The backend settings, or `null` when no backend is configured (demo mode). */
export function getSelfServiceConfig(env: Env = import.meta.env): SelfServiceConfig | null {
  const baseUrl = (env.VITE_SELF_SERVICE_BASE_URL ?? "").trim();
  if (!baseUrl) return null;
  const apiPath = (env.VITE_SELF_SERVICE_ENDPOINT ?? "").trim() || DEFAULT_API_PATH;
  return {
    baseUrl: trimSlashes(baseUrl, "end"),
    apiPath: `/${trimSlashes(apiPath, "both")}`,
    tenantId: (env.VITE_SELF_SERVICE_TENANT_ID ?? "").trim() || DEFAULT_TENANT,
  };
}

/** Absolute URL of a path below `/v1/self`, e.g. `selfUrl(cfg, "/stepup/config")`. */
export function selfUrl(config: SelfServiceConfig, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${config.baseUrl}${config.apiPath}/v1/self${clean}`;
}
