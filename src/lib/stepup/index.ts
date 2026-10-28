import { recordDemoActivity } from "../activity";
import { demoAuthenticator } from "../authenticator";
import { getSelfServiceConfig, hasSession } from "../selfservice";
import type { StepUpApi } from "./api";
import { createDemoStepUpApi } from "./demoStepUpApi";
import { createHttpStepUpApi } from "./httpStepUpApi";

export * from "./api";
export { createDemoStepUpApi } from "./demoStepUpApi";
export { createHttpStepUpApi } from "./httpStepUpApi";
export {
  TOTP_CODE_LENGTH,
  useStepUpChallenge,
  type StepUpCodeKind,
  type StepUpPhase,
  type UseStepUpChallenge,
  type UseStepUpChallengeInput,
} from "./useStepUpChallenge";

// One demo "server" for the whole page so its state (attempts, lock-out) survives re-renders.
let demoApi: StepUpApi | null = null;

/**
 * The step-up backend to use right now: the real self-service API when a backend is configured
 * AND the user has a real session, otherwise the in-memory demo.
 */
export function selectStepUpApi(): StepUpApi {
  if (getSelfServiceConfig() && hasSession()) return createHttpStepUpApi();
  demoApi ??= createDemoStepUpApi({
    authenticator: demoAuthenticator(),
    // what the demo user does with the verification also shows in the demo activity history
    onEvent: (event, action) =>
      recordDemoActivity(
        event === "ISSUED"
          ? "STEP_UP_REQUESTED"
          : event === "VERIFIED"
            ? "STEP_UP_VERIFIED"
            : "STEP_UP_LOCKED",
        { action },
        event === "LOCKED" ? "FAILURE" : "SUCCESS",
      ),
  });
  return demoApi;
}

/**
 * Whether a verified step-up may finish the transfer inside this page. Only the demo adapter may:
 * with the real API the one-time token must be sent with the protected request
 * (`X-Step-Up-Token`), and this demo has no real accounts to send it for.
 */
export function canCompleteTransferLocally(api: StepUpApi): boolean {
  return api.mode === "demo";
}

/** Test seam: forget the shared demo state. */
export function resetDemoStepUpApi(): void {
  demoApi = null;
}
