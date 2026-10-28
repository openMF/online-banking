import { recordDemoActivity } from "../activity";
import { getSelfServiceConfig, hasSession } from "../selfservice";
import type { AuthenticatorApi } from "./api";
import {
  createDemoAuthenticatorStore,
  type DemoAuthenticatorEvent,
  type DemoAuthenticatorStore,
} from "./demoAuthenticatorApi";
import { createHttpAuthenticatorApi } from "./httpAuthenticatorApi";

export * from "./api";
export {
  createDemoAuthenticatorStore,
  normalizeRecoveryCode,
  type DemoAuthenticatorEvent,
  type DemoAuthenticatorOptions,
  type DemoAuthenticatorStore,
} from "./demoAuthenticatorApi";
export { createHttpAuthenticatorApi } from "./httpAuthenticatorApi";

const DEMO_ACTIVITY = {
  ENROLLED: "AUTHENTICATOR_ENROLLED",
  REMOVED: "AUTHENTICATOR_REMOVED",
  RECOVERY_CODES_REGENERATED: "RECOVERY_CODES_REGENERATED",
  RECOVERY_CODE_USED: "RECOVERY_CODE_USED",
} as const satisfies Record<DemoAuthenticatorEvent, string>;

// One demo authenticator for the whole page, so that what the demo user pairs is what the
// verification of a transfer later asks for, and shows up in the demo activity history.
let demoStore: DemoAuthenticatorStore | null = null;

export function demoAuthenticator(): DemoAuthenticatorStore {
  demoStore ??= createDemoAuthenticatorStore({
    onEvent: (event) => recordDemoActivity(DEMO_ACTIVITY[event]),
  });
  return demoStore;
}

/**
 * The authenticator to use right now: the real self-service API when a backend is configured AND
 * the user has a real session, otherwise the in-memory demo.
 */
export function selectAuthenticatorApi(): AuthenticatorApi {
  if (getSelfServiceConfig() && hasSession()) return createHttpAuthenticatorApi();
  return demoAuthenticator().api;
}

/** Ends the demo session: the next one starts without an authenticator. */
export function resetDemoAuthenticator(): void {
  demoStore = null;
}
export {
  useAuthenticator,
  type AuthenticatorErrorCode,
  type AuthenticatorIntent,
  type AuthenticatorNotice,
  type AuthenticatorPhase,
  type UseAuthenticator,
} from "./useAuthenticator";
