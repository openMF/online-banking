/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the Fineract instance running selfservice-plugin. Empty = in-memory demo. */
  readonly VITE_SELF_SERVICE_BASE_URL?: string;
  /** Path before /v1/self. Default: /fineract-provider/api */
  readonly VITE_SELF_SERVICE_ENDPOINT?: string;
  /** Fineract tenant identifier. Default: default */
  readonly VITE_SELF_SERVICE_TENANT_ID?: string;
}
