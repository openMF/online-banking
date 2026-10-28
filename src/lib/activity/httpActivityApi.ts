import { getActivity } from "../selfservice/activity";
import type { RequestOptions } from "../selfservice/http";
import { toActivityError, type ActivityApi } from "./api";
import { parseActivityPage } from "./parse";

type Seams = Pick<RequestOptions, "fetchImpl" | "config" | "session" | "customer">;

/** The activity history over the real self-service API (`/v1/self/activity`). Needs a session. */
export function createHttpActivityApi(seams: Seams = {}): ActivityApi {
  return {
    mode: "backend",
    async list(query, signal) {
      try {
        return parseActivityPage(await getActivity(query, { ...seams, signal }));
      } catch (error) {
        throw toActivityError(error);
      }
    },
  };
}
