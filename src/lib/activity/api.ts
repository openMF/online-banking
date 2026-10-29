import { SelfServiceError } from "../selfservice/http";
import type {
  ActivityDetails,
  ActivityItem,
  ActivityOutcome,
  ActivityPage,
  ActivityQuery,
  ActivityType,
} from "../selfservice/activity";

export type {
  ActivityDetails,
  ActivityItem,
  ActivityOutcome,
  ActivityPage,
  ActivityQuery,
  ActivityType,
};

/** Why the history could not be read. The screen shows a fixed, translated message per code. */
export type ActivityErrorCode =
  | "network"
  | "offline"
  | "timeout"
  | "unavailable"
  | "rateLimited"
  | "server"
  | "session"
  | "invalid"
  | "unknown";

export class ActivityError extends Error {
  readonly code: ActivityErrorCode;

  constructor(code: ActivityErrorCode) {
    super(`activity: ${code}`);
    this.name = "ActivityError";
    this.code = code;
  }
}

/** Maps anything thrown by the API layer to an {@link ActivityError} (never leaks server text). */
export function toActivityError(error: unknown): ActivityError {
  if (error instanceof ActivityError) return error;
  if (error instanceof SelfServiceError) {
    // The kind of problem decides the words: offline and a restarting service are not the same.
    switch (error.problem) {
      case "offline":
      case "timeout":
      case "network":
      case "unavailable":
      case "rateLimited":
      case "server":
        return new ActivityError(error.problem);
      case "unauthorized":
      case "forbidden":
        return new ActivityError("session");
      case "invalid":
        return new ActivityError("invalid");
    }
  }
  return new ActivityError("unknown");
}

/**
 * Where the activity history comes from: the real self-service API, or the in-memory demo. The
 * screen only knows this interface.
 */
export interface ActivityApi {
  /** `"demo"` = nothing here is real: the screen says so. */
  readonly mode: "demo" | "backend";
  list(query?: ActivityQuery, signal?: AbortSignal): Promise<ActivityPage>;
}
