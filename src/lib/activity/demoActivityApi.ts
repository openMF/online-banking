import type {
  ActivityApi,
  ActivityDetails,
  ActivityItem,
  ActivityOutcome,
  ActivityPage,
  ActivityQuery,
  ActivityType,
} from "./api";

/** A documentation-range address (192.0.2.0/24), masked the way the server masks it. */
export const DEMO_MASKED_IP = "192.0.x.x";

const MAX_ENTRIES = 200;
const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** `2026-10-23T09:30:05`: the tenant clock without zone, like the server sends it. */
function isoLocal(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export type DemoActivityStore = {
  /** Records something the demo user did. The IP is always the fixed, masked demo address. */
  record(type: ActivityType, details?: ActivityDetails, outcome?: ActivityOutcome): void;
  /** Forgets everything and starts again with the demo's older history. */
  reset(): void;
  api: ActivityApi;
};

type Entry = ActivityItem & { at: number };

/**
 * An in-memory history for the demo. It follows what the user does in the demo (sign-in,
 * transfers, beneficiaries, verification) and starts with a few older entries so that the screen
 * is not empty. Nothing here is real, and nothing leaves the page.
 */
export function createDemoActivityStore(now: () => number = Date.now): DemoActivityStore {
  let entries: Entry[] = [];
  let sequence = 0;

  function add(
    type: ActivityType,
    details: ActivityDetails,
    outcome: ActivityOutcome,
    at: number,
  ): void {
    sequence += 1;
    entries.push({
      id: sequence,
      type,
      outcome,
      occurredAt: isoLocal(at),
      ipAddress: DEMO_MASKED_IP,
      details,
      at,
    });
    if (entries.length > MAX_ENTRIES) {
      entries = [...entries].sort((a, b) => b.at - a.at || b.id - a.id).slice(0, MAX_ENTRIES);
    }
  }

  function seed(): void {
    const t = now();
    add("LOGIN_NEW_DEVICE", {}, "SUCCESS", t - 14 * DAY);
    add("BENEFICIARY_ADDED", { name: "Proveedor de ejemplo" }, "SUCCESS", t - 12 * DAY);
    add("PASSWORD_CHANGED", {}, "SUCCESS", t - 9 * DAY);
    add("LOGIN_FAILED", {}, "FAILURE", t - 2 * DAY - 5 * 60 * 1000);
    add("LOGIN", {}, "SUCCESS", t - 2 * DAY);
  }

  seed();

  const api: ActivityApi = {
    mode: "demo",
    async list(query: ActivityQuery = {}): Promise<ActivityPage> {
      const types = new Set(query.types ?? []);
      const matching = entries
        .filter((entry) => types.size === 0 || types.has(entry.type))
        .sort((a, b) => b.at - a.at || b.id - a.id);
      const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const offset = Math.max(query.offset ?? 0, 0);
      return {
        totalFilteredRecords: matching.length,
        pageItems: matching.slice(offset, offset + limit).map(({ at: _at, ...item }) => item),
      };
    },
  };

  return {
    api,
    record(type, details = {}, outcome = "SUCCESS") {
      add(type, details, outcome, now());
    },
    reset() {
      entries = [];
      sequence = 0;
      seed();
    },
  };
}
