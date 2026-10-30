import { buildSelfServiceUrl } from "./self-service-config";
import { createSelfServiceConfigLoader } from "./self-service-config-loader";

export type { SelfServiceConfig } from "./self-service-config";

export const getSelfServiceConfig = createSelfServiceConfigLoader(
  { allowLocalHttp: import.meta.env.DEV },
  fetch,
  window.location.pathname,
);

/** Resolves configuration before constructing a URL; performs no banking request. */
export async function selfServiceUrl(resource: string): Promise<URL> {
  return buildSelfServiceUrl(await getSelfServiceConfig(), resource);
}
