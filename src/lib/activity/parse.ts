import { ActivityError } from "./api";
import type {
  ActivityDetails,
  ActivityItem,
  ActivityOutcome,
  ActivityPage,
} from "../selfservice/activity";

const DETAIL_KEYS = ["amount", "currency", "toName", "name", "toAccountLast4", "action"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(): never {
  throw new ActivityError("invalid");
}

/** Only the known keys, and only as text: anything else a server sends is dropped. */
function parseDetails(raw: unknown): ActivityDetails {
  if (raw === undefined || raw === null) return {};
  if (!isObject(raw)) return invalid();
  const details: ActivityDetails = {};
  for (const key of DETAIL_KEYS) {
    const value = raw[key];
    if (typeof value === "string") details[key] = value;
  }
  return details;
}

function parseItem(raw: unknown): ActivityItem {
  if (!isObject(raw)) return invalid();
  const { id, type, outcome, occurredAt, ipAddress } = raw;
  if (typeof id !== "number" || !Number.isFinite(id)) return invalid();
  if (typeof type !== "string" || type === "") return invalid();
  if (outcome !== "SUCCESS" && outcome !== "FAILURE") return invalid();
  if (typeof occurredAt !== "string" || occurredAt === "") return invalid();
  if (ipAddress !== undefined && ipAddress !== null && typeof ipAddress !== "string") {
    return invalid();
  }
  return {
    id,
    // An activity type of a newer server is kept: the screen shows it with a neutral title.
    type: type as ActivityItem["type"],
    outcome: outcome as ActivityOutcome,
    occurredAt,
    ipAddress: ipAddress ?? null,
    details: parseDetails(raw.details),
  };
}

/**
 * Checks what the server sent before the screen sees it. `selfRequest` only casts the JSON, so a
 * malformed answer (for example `{}`) would otherwise break the list while it renders. Anything
 * that does not fit throws {@link ActivityError} `invalid`, which the screen shows as a message.
 */
export function parseActivityPage(raw: unknown): ActivityPage {
  if (!isObject(raw)) return invalid();
  const { totalFilteredRecords, pageItems } = raw;
  if (
    typeof totalFilteredRecords !== "number" ||
    !Number.isInteger(totalFilteredRecords) ||
    totalFilteredRecords < 0
  ) {
    return invalid();
  }
  if (!Array.isArray(pageItems)) return invalid();
  return { totalFilteredRecords, pageItems: pageItems.map(parseItem) };
}
