/**
 * What the network layer is doing right now, for the one indicator of the app: how many requests
 * are in flight, whether one is trying again, and whether the device is offline after a failure.
 *
 * Every typed client goes through {@link trackRequest}, so a screen cannot forget to show that
 * something is loading. The store holds counters only: no URL, no body, no header.
 */

export interface NetworkSnapshot {
  /** Requests in flight (a request that is waiting to retry still counts). */
  readonly pending: number;
  /** At least one in-flight request is waiting to try again. */
  readonly retrying: boolean;
  /** The device is offline AND a request failed or is waiting: the app has something to tell. */
  readonly offline: boolean;
}

type Listener = () => void;

let pending = 0;
let retrying = 0;
let online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
let failedOffline = false;
let snapshot: NetworkSnapshot = compute();
const listeners = new Set<Listener>();

function compute(): NetworkSnapshot {
  return {
    pending,
    retrying: retrying > 0,
    offline: !online && (failedOffline || pending > 0),
  };
}

function changed() {
  const next = compute();
  if (
    next.pending === snapshot.pending &&
    next.retrying === snapshot.retrying &&
    next.offline === snapshot.offline
  ) {
    return;
  }
  snapshot = next;
  for (const listener of [...listeners]) listener();
}

export function subscribeNetwork(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function networkSnapshot(): NetworkSnapshot {
  return snapshot;
}

/** The handle a tracked request uses to say that it is waiting to try again. */
export interface RequestHandle {
  retrying(): void;
}

/** Runs `run` and counts it as in flight until it settles. Never changes its result or its error. */
export async function trackRequest<T>(run: (handle: RequestHandle) => Promise<T>): Promise<T> {
  let marked = false;
  pending += 1;
  changed();
  try {
    return await run({
      retrying() {
        if (marked) return;
        marked = true;
        retrying += 1;
        changed();
      },
    });
  } catch (error) {
    if (!online) failedOffline = true;
    throw error;
  } finally {
    pending -= 1;
    if (marked) retrying -= 1;
    changed();
  }
}

/** The browser tells that the connection came back or went away. */
export function setOnline(value: boolean): void {
  online = value;
  if (value) failedOffline = false;
  changed();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));
}

/** Test seam: forget everything. */
export function resetNetworkActivity(): void {
  pending = 0;
  retrying = 0;
  failedOffline = false;
  online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  snapshot = compute();
  for (const listener of [...listeners]) listener();
}
