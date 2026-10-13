import { useEffect, useRef, useState } from "react";
import { isFramed } from "./login.ts";
import { getConnectorReadiness } from "./readiness.ts";
import {
  READINESS_PROBE_MAX_TOTAL_MS,
  readinessProbeDelayMs,
  readinessProbeExhausted,
} from "./readiness-schedule.ts";
import { CONNECTOR_TOKEN_READY_EVENT } from "./types.ts";

export type ConnectorWaitStatus =
  | "idle"
  | "waiting"
  | "timed_out"
  | "not_embedded";

export const READINESS_PROBE_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    const settle = (value: T | null) => {
      clearTimeout(timer);
      resolve(value);
    };
    promise.then(settle, () => settle(null));
  });
}

async function isConnectorReady(): Promise<boolean> {
  const result = await withTimeout(
    getConnectorReadiness(),
    READINESS_PROBE_TIMEOUT_MS,
  );
  return result?.ready === true;
}

/**
 * While `waiting` is true (a connector call returned `pending`), probes the
 * server for the connector token and calls `refetch` once it is present. The
 * probe is a header check on the app's own server — it never reaches the gate.
 * A `connector-token-ready` bridge event from the Grok preview chrome triggers
 * `refetch` immediately. A top-level page (download/export, local dev, the
 * sandbox's own `npm run preview`) is not framed by any preview, so no token
 * can ever arrive: the hook reports `not_embedded` without probing. Any framed
 * page probes, even when the parent origin cannot be resolved (empty referrer,
 * no `ancestorOrigins`): the token comes through the preview proxy, and the
 * bridge event is only the faster signal.
 */
export function useRefetchWhenConnectorReady(
  waiting: boolean,
  refetch: () => unknown,
): ConnectorWaitStatus {
  const refetchRef = useRef(refetch);
  const [timedOut, setTimedOut] = useState(false);
  const [notEmbedded, setNotEmbedded] = useState(false);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    if (!waiting) return;
    if (!isFramed()) {
      setNotEmbedded(true);
      return () => setNotEmbedded(false);
    }
    let cancelled = false;
    let refetching = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const runRefetch = async () => {
      if (refetching) return;
      refetching = true;
      try {
        await refetchRef.current();
      } catch {
        // The query owns its own error state; a failed refetch must not stop
        // the probe loop.
      } finally {
        refetching = false;
      }
    };
    const schedule = () => {
      timer = setTimeout(probe, readinessProbeDelayMs(attempt));
      attempt += 1;
    };
    const probe = async () => {
      if (cancelled || readinessProbeExhausted(startedAt, Date.now())) return;
      const ready = await isConnectorReady();
      if (cancelled) return;
      if (ready) await runRefetch();
      if (!cancelled) schedule();
    };
    const onTokenReady = () => {
      void runRefetch();
    };
    // Time-based terminal state: a probe that never settles or a refetch that
    // throws cannot leave the UI on "waiting" forever.
    const deadline = setTimeout(() => {
      if (!cancelled) setTimedOut(true);
    }, READINESS_PROBE_MAX_TOTAL_MS);

    window.addEventListener(CONNECTOR_TOKEN_READY_EVENT, onTokenReady);
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(deadline);
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener(CONNECTOR_TOKEN_READY_EVENT, onTokenReady);
      setTimedOut(false);
    };
  }, [waiting]);

  if (!waiting) return "idle";
  if (notEmbedded) return "not_embedded";
  return timedOut ? "timed_out" : "waiting";
}
