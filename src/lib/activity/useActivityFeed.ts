import { useCallback, useEffect, useRef, useState } from "react";
import {
  toActivityError,
  type ActivityApi,
  type ActivityErrorCode,
  type ActivityItem,
} from "./api";
import type { ActivityType } from "../selfservice/activity";

export const PAGE_SIZE = 20;

export type ActivityFeedPhase = "loading" | "ready" | "loading-more" | "error";

export type ActivityFeed = {
  phase: ActivityFeedPhase;
  items: ActivityItem[];
  /** How many entries match the filter on the server (more than `items.length` = there is more). */
  total: number;
  hasMore: boolean;
  errorCode: ActivityErrorCode | null;
  loadMore: () => void;
  retry: () => void;
};

/**
 * Loads the activity history page by page for the given type filter. Changing the filter starts
 * again from the first page; an answer that arrives after the filter changed (or the screen was
 * left) is ignored.
 */
export function useActivityFeed(api: ActivityApi, types: readonly ActivityType[]): ActivityFeed {
  const [phase, setPhase] = useState<ActivityFeedPhase>("loading");
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [errorCode, setErrorCode] = useState<ActivityErrorCode | null>(null);
  const request = useRef(0);
  const key = types.join(",");

  const load = useCallback(
    async (offset: number) => {
      const mine = ++request.current;
      setPhase(offset === 0 ? "loading" : "loading-more");
      setErrorCode(null);
      try {
        const page = await api.list({
          limit: PAGE_SIZE,
          offset,
          types: key ? (key.split(",") as ActivityType[]) : [],
        });
        if (mine !== request.current) return;
        setItems((current) => (offset === 0 ? page.pageItems : [...current, ...page.pageItems]));
        setTotal(page.totalFilteredRecords);
        setPhase("ready");
      } catch (error) {
        if (mine !== request.current) return;
        setErrorCode(toActivityError(error).code);
        setPhase("error");
      }
    },
    [api, key],
  );

  useEffect(() => {
    setItems([]);
    setTotal(0);
    void load(0);
    return () => {
      request.current += 1; // forget a pending answer
    };
  }, [load]);

  const hasMore = items.length < total;

  return {
    phase,
    items,
    total,
    hasMore,
    errorCode,
    loadMore: () => {
      if (phase === "ready" && hasMore) void load(items.length);
    },
    retry: () => void load(phase === "error" && items.length > 0 ? items.length : 0),
  };
}
