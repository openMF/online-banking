import { getSelfServiceConfig, hasSession } from "../selfservice";
import { createDemoActivityStore, type DemoActivityStore } from "./demoActivityApi";
import { createHttpActivityApi } from "./httpActivityApi";
import type { ActivityApi, ActivityDetails, ActivityOutcome, ActivityType } from "./api";

export * from "./api";
export {
  ACTIVITY_GROUPS,
  ACTIVITY_SOURCE_TEXTS,
  describeActivity,
  formatActivityAmount,
  groupOf,
  type ActivityDescription,
  type ActivityGroup,
} from "./describe";
export { createDemoActivityStore, DEMO_MASKED_IP } from "./demoActivityApi";
export { createHttpActivityApi } from "./httpActivityApi";
export { useActivityFeed, type ActivityFeed, type ActivityFeedPhase } from "./useActivityFeed";

// One demo history for the whole page, so that what the demo user does shows up in it.
let demoStore: DemoActivityStore | null = null;

function demoActivity(): DemoActivityStore {
  demoStore ??= createDemoActivityStore();
  return demoStore;
}

/**
 * The activity history to show right now: the real self-service API when a backend is configured
 * AND the user has a real session, otherwise the in-memory demo.
 */
export function selectActivityApi(): ActivityApi {
  if (getSelfServiceConfig() && hasSession()) return createHttpActivityApi();
  return demoActivity().api;
}

/**
 * Records something the demo user did. It only feeds the demo history: with a real backend the
 * server records these events itself.
 */
export function recordDemoActivity(
  type: ActivityType,
  details?: ActivityDetails,
  outcome?: ActivityOutcome,
): void {
  demoActivity().record(type, details, outcome);
}

/** Ends the demo session: the next one starts again with the demo's older history. */
export function resetDemoActivity(): void {
  demoStore = null;
}
