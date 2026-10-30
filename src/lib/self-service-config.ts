/**
 * Validation of the public Self Service settings, shared by the browser and by the container start
 * (docker/generate-runtime-config.mjs loads this file with plain Node, from a Dockerfile that
 * copies only this file). It must stay free of imports: anything it imports is not in the image,
 * and Node does not resolve extension-less or directory imports. The loader that reads the JSON
 * lives in self-service-config-loader.ts.
 */
/** Public deployment settings only. Never add credentials or tokens here. */
export interface SelfServiceConfig {
  readonly baseUrl: string;
  readonly tenantId: string;
}

export interface ConfigValidationOptions {
  /** Only Vite development may opt into HTTP on literal loopback hosts. */
  allowLocalHttp?: boolean;
}

export class SelfServiceConfigError extends Error {
  /**
   * The configuration could not be reached (network, timeout, service restarting), as opposed to
   * being wrong. Only this kind is worth asking for again.
   */
  readonly transient: boolean;

  constructor(message: string, transient = false) {
    super(message);
    this.name = "SelfServiceConfigError";
    this.transient = transient;
  }
}

export function validateSelfServiceConfig(
  input: unknown,
  { allowLocalHttp = false }: ConfigValidationOptions = {},
): SelfServiceConfig {
  if (input === null) {
    throw new SelfServiceConfigError(
      "Self Service API configuration is disabled. Set SELF_SERVICE_BASE_URL and SELF_SERVICE_TENANT_ID to configure it.",
    );
  }
  if (!input || typeof input !== "object") {
    throw new SelfServiceConfigError("Self Service configuration is missing.");
  }
  const { baseUrl, tenantId } = input as Record<string, unknown>;
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new SelfServiceConfigError("SELF_SERVICE_BASE_URL is required.");
  }
  const authority = /^https?:\/\/([^/?#]+)\//i.exec(baseUrl)?.[1];
  if (!authority) {
    throw new SelfServiceConfigError(
      "SELF_SERVICE_BASE_URL must be an absolute HTTP(S) URL with an endpoint path.",
    );
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new SelfServiceConfigError("SELF_SERVICE_BASE_URL must be an absolute HTTPS URL.");
  }
  const localHttp =
    allowLocalHttp &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new SelfServiceConfigError(
      "SELF_SERVICE_BASE_URL requires HTTPS; Vite development also permits loopback HTTP.",
    );
  }
  if (url.username || url.password || authority.includes("@")) {
    throw new SelfServiceConfigError("SELF_SERVICE_BASE_URL must not contain credentials.");
  }
  if (baseUrl !== baseUrl.trim() || /[\\\s?#]/.test(baseUrl) || url.search || url.hash) {
    throw new SelfServiceConfigError(
      "SELF_SERVICE_BASE_URL must not contain whitespace, backslashes, a query, or a fragment.",
    );
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  // Require the complete endpoint rather than guessing or appending API prefixes.
  // Reject encoded and dot segments to keep reverse-proxy routing unambiguous.
  const rawPath = baseUrl.replace(/^https?:\/\/[^/]+/i, "").replace(/\/+$/, "");
  if (
    !pathname.endsWith("/v1/self") ||
    pathname.split("/v1/self").length !== 2 ||
    pathname.includes("//") ||
    pathname.includes("%") ||
    /%|(?:^|\/)\.{1,2}(?:\/|$)/.test(rawPath)
  ) {
    throw new SelfServiceConfigError(
      "SELF_SERVICE_BASE_URL must end in exactly one /v1/self, with an optional deployment/API prefix.",
    );
  }
  if (typeof tenantId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(tenantId)) {
    throw new SelfServiceConfigError(
      "SELF_SERVICE_TENANT_ID is required: use 1–100 letters, digits, underscores, or hyphens, starting with a letter or digit.",
    );
  }
  return Object.freeze({ baseUrl: `${url.origin}${pathname}`, tenantId });
}

export function configFromEnvironment(
  env: Record<string, string | undefined>,
  options: ConfigValidationOptions = {},
): SelfServiceConfig | null {
  // Both absent (including Compose's empty strings) preserves standalone demo startup.
  // A partially supplied or invalid pair still fails validation.
  if (!env.SELF_SERVICE_BASE_URL && !env.SELF_SERVICE_TENANT_ID) return null;
  return validateSelfServiceConfig(
    { baseUrl: env.SELF_SERVICE_BASE_URL, tenantId: env.SELF_SERVICE_TENANT_ID },
    options,
  );
}

/** A resource is relative to /v1/self, e.g. "clients/123/accounts". */
export function buildSelfServiceUrl(config: SelfServiceConfig, resource: string): URL {
  if (
    !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(resource) ||
    /(?:^|\/)v1\/self(?:\/|$)/.test(resource)
  ) {
    throw new SelfServiceConfigError(
      "Self Service resources must be relative paths without API prefixes.",
    );
  }
  return new URL(`${config.baseUrl}/${resource}`);
}
