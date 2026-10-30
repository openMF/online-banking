import {
  SelfServiceConfigError,
  validateSelfServiceConfig,
  type ConfigValidationOptions,
  type SelfServiceConfig,
} from "./self-service-config.ts";
// Explicit file names: tests/self-service-config.mjs loads this file with plain Node, which resolves
// neither directories nor extension-less paths.
import { trackRequest } from "./network/activity.ts";
import { transientStatus, withRetry, type RetryEnv, type RetryPolicy } from "./network/retry.ts";

/** Shared promise: every consumer waits for the same validated configuration. */
export function createSelfServiceConfigLoader(
  options: ConfigValidationOptions = {},
  fetcher: typeof fetch = fetch,
  pagePath = "/",
  /** Test seam: the retry policy and what it waits with. */
  retry?: { policy?: Partial<RetryPolicy>; env?: Partial<RetryEnv> },
): () => Promise<SelfServiceConfig> {
  let pending: Promise<SelfServiceConfig> | undefined;
  return () => {
    pending ??= (async () => {
      // This application uses root-relative UI assets and has no path-based routes.
      // Do not read another application's root configuration from a nested mount.
      if (pagePath !== "/" && pagePath !== "/index.html") {
        throw new SelfServiceConfigError(
          "Self Service configuration requires this application to be hosted at / (or /index.html). Subpath deployments are unsupported.",
        );
      }
      let response: Response;
      try {
        // A read: repeated when the network fails or the service is restarting.
        response = await trackRequest((handle) =>
          withRetry(
            () =>
              fetcher("/runtime-config.json", {
                cache: "no-store",
                credentials: "omit",
                redirect: "error",
                signal: AbortSignal.timeout(5000),
              }),
            {
              idempotent: true,
              transientError: () => true,
              transientResult: (result) =>
                transientStatus(result.status, result.headers.get("Retry-After")),
              policy: retry?.policy,
              env: retry?.env,
              onRetry: () => handle.retrying(),
            },
          ),
        );
      } catch {
        throw new SelfServiceConfigError(
          "Could not load /runtime-config.json. Check deployment configuration.",
          true,
        );
      }
      if (!response.ok) {
        throw new SelfServiceConfigError(
          `Could not load /runtime-config.json (HTTP ${response.status}). Check SELF_SERVICE_BASE_URL and SELF_SERVICE_TENANT_ID.`,
          response.status >= 500 || response.status === 408 || response.status === 429,
        );
      }
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new SelfServiceConfigError(
          "/runtime-config.json must contain valid configuration JSON.",
        );
      }
      return validateSelfServiceConfig(data, options);
    })().catch((error: unknown) => {
      // A configuration that is wrong stays wrong, so its error is kept. One that could not be
      // reached is forgotten: the next login asks again instead of failing until the page reloads.
      if (error instanceof SelfServiceConfigError && error.transient) pending = undefined;
      throw error;
    });
    return pending;
  };
}
