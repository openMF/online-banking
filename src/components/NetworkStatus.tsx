import { useEffect, useState, useSyncExternalStore } from "react";
import { CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "../i18n";
import { PROBLEM_MESSAGES, networkSnapshot, subscribeNetwork } from "../lib/network";

/** A request that ends sooner than this never shows the indicator, so quick calls do not flicker. */
const SHOW_AFTER_MS = 400;

/**
 * The one indicator of what the network is doing (US-E12-04): loading, trying again, offline.
 * Every typed client reports to the same store, so no screen has to remember to show it. It is a
 * polite live region: a screen reader hears the change once, without taking the focus. It has no
 * `role="status"` on purpose: it is always on the page, and the screens that have a status of their
 * own (a toast, a notice) must stay the only ones with that role.
 */
export function NetworkStatus({ inDialog = false }: { inDialog?: boolean }) {
  const { t } = useI18n();
  const state = useSyncExternalStore(subscribeNetwork, networkSnapshot, networkSnapshot);
  const busy = state.pending > 0;
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  // What to say, most important first. A retry is shown at once: the person should know why it is slow.
  let kind: "offline" | "retrying" | "loading" | null = null;
  if (state.offline) kind = "offline";
  else if (state.retrying) kind = "retrying";
  else if (busy && slow) kind = "loading";

  return (
    <div
      className={`network-status-region${inDialog ? " in-dialog" : ""}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {kind && (
        <p className={`network-status ${kind}`} data-kind={kind}>
          {kind === "offline" ? (
            <CloudOff size={16} aria-hidden="true" />
          ) : kind === "retrying" ? (
            <RefreshCw size={16} aria-hidden="true" />
          ) : (
            <Loader2 size={16} aria-hidden="true" className="spin" />
          )}
          {t(
            kind === "offline"
              ? PROBLEM_MESSAGES.offline
              : kind === "retrying"
                ? "La conexión es lenta. Estamos reintentando…"
                : "Cargando…",
          )}
        </p>
      )}
    </div>
  );
}
