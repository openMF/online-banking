import { getSelfServiceConfig, hasSession } from "../selfservice";
import type { StepUpApi } from "./api";
import { createDemoStepUpApi } from "./demoStepUpApi";
import { createHttpStepUpApi } from "./httpStepUpApi";

export * from "./api";
export { createDemoStepUpApi } from "./demoStepUpApi";
export { createHttpStepUpApi } from "./httpStepUpApi";
export {
  useStepUpChallenge,
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
  demoApi ??= createDemoStepUpApi();
  return demoApi;
}

/** Test seam: forget the shared demo state. */
export function resetDemoStepUpApi(): void {
  demoApi = null;
}
