/**
 * Typed client of the activity history endpoint of selfservice-plugin (`GET /v1/self/activity`,
 * MX-491 / US-E12-05). Contract source of truth: the plugin's README ("Activity history").
 */

import { selfRequest, type RequestOptions } from "./http";

/** What the user did. Only a code: the screen translates it, nothing localized is stored. */
export const ACTIVITY_TYPES = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGIN_NEW_DEVICE",
  "LOGOUT",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "TRANSFER_CONFIRMED",
  "BENEFICIARY_ADDED",
  "BENEFICIARY_UPDATED",
  "BENEFICIARY_DELETED",
  "PROFILE_IMAGE_CHANGED",
  "PROFILE_IMAGE_REMOVED",
  "SINPE_SUBSCRIPTION_CHANGED",
  "STEP_UP_REQUESTED",
  "STEP_UP_VERIFIED",
  "STEP_UP_LOCKED",
  "AUTHENTICATOR_ENROLLED",
  "AUTHENTICATOR_REMOVED",
  "AUTHENTICATOR_RESET",
  "AUTHENTICATOR_LOCKED",
  "RECOVERY_CODES_REGENERATED",
  "RECOVERY_CODE_USED",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type ActivityOutcome = "SUCCESS" | "FAILURE";

/** Whitelisted facts about an activity. Every field is optional: show only what is there. */
export type ActivityDetails = {
  /** Decimal string such as `"1250.50"`. */
  amount?: string;
  /** ISO 4217 code. Absent when the server did not know it. */
  currency?: string;
  /** Destination (transfer) or beneficiary name. */
  toName?: string;
  name?: string;
  /** Last four digits of the destination account. Never the whole number. */
  toAccountLast4?: string;
  /** SINPE subscription: `created`, `updated` or `deleted`. */
  action?: string;
};

export type ActivityItem = {
  id: number;
  type: ActivityType;
  outcome: ActivityOutcome;
  /** Tenant local date-time without zone, e.g. `2026-10-23T09:30:05`. */
  occurredAt: string;
  /** Already masked by the server (`203.0.x.x`), or `null`. */
  ipAddress: string | null;
  details: ActivityDetails;
};

export type ActivityPage = {
  totalFilteredRecords: number;
  pageItems: ActivityItem[];
};

export type ActivityQuery = {
  limit?: number;
  offset?: number;
  /** Empty or missing means all types. */
  types?: ActivityType[];
};

type Options = Pick<RequestOptions, "fetchImpl" | "config" | "signal" | "session" | "customer">;

/** The activity of the logged-in user, newest first. There is no way to ask for another user. */
export function getActivity(
  query: ActivityQuery = {},
  options: Options = {},
): Promise<ActivityPage> {
  return selfRequest<ActivityPage>("/activity", {
    ...options,
    query: {
      limit: query.limit,
      offset: query.offset,
      type: query.types && query.types.length > 0 ? query.types.join(",") : undefined,
    },
  });
}
