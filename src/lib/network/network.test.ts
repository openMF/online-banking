import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RETRY_POLICY,
  PROBLEM_MESSAGES,
  RETRYABLE_PROBLEMS,
  backoffDelay,
  networkSnapshot,
  parseRetryAfter,
  problemOfStatus,
  resetNetworkActivity,
  setOnline,
  subscribeNetwork,
  trackRequest,
  transientStatus,
  withRetry,
  type ProblemKind,
} from "./index";

afterEach(() => {
  resetNetworkActivity();
  vi.restoreAllMocks();
});

/** A retry environment with no real waiting, that remembers every wait. */
function fastEnv(online = true) {
  const waits: number[] = [];
  return {
    waits,
    env: {
      sleep: vi.fn(async (ms: number) => {
        waits.push(ms);
      }),
      random: () => 0.5,
      online: () => online,
    },
  };
}

const transient = (error: unknown) => error instanceof TypeError;

describe("problemOfStatus", () => {
  it.each([
    [400, "invalid"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "notFound"],
    [408, "timeout"],
    [409, "conflict"],
    [422, "invalid"],
    [429, "rateLimited"],
    [500, "server"],
    [501, "server"],
    [502, "unavailable"],
    [503, "unavailable"],
    [504, "unavailable"],
    [418, "unknown"],
  ] as const)("%i is %s", (status, kind) => {
    expect(problemOfStatus(status)).toBe(kind);
  });

  it("has a message for every kind, none of which echoes server text or a status", () => {
    const kinds = Object.keys(PROBLEM_MESSAGES) as ProblemKind[];
    expect(kinds).toHaveLength(12);
    for (const kind of kinds) {
      expect(PROBLEM_MESSAGES[kind].length).toBeGreaterThan(15);
      expect(PROBLEM_MESSAGES[kind]).not.toMatch(/\b[1-5]\d\d\b/);
    }
  });

  it("only offers to try again where the same request can work", () => {
    for (const kind of [
      "offline",
      "timeout",
      "network",
      "rateLimited",
      "unavailable",
      "server",
    ] as const) {
      expect(RETRYABLE_PROBLEMS.has(kind)).toBe(true);
    }
    for (const kind of [
      "unauthorized",
      "forbidden",
      "notFound",
      "invalid",
      "conflict",
      "unknown",
    ] as const) {
      expect(RETRYABLE_PROBLEMS.has(kind)).toBe(false);
    }
  });
});

describe("transientStatus", () => {
  it("retries the statuses of a restarting or busy service, and nothing else", () => {
    for (const status of [408, 429, 502, 503, 504]) expect(transientStatus(status)).not.toBe(false);
    for (const status of [200, 201, 400, 401, 403, 404, 409, 422, 500, 501]) {
      expect(transientStatus(status)).toBe(false);
    }
  });

  it("carries the Retry-After the server sent", () => {
    expect(transientStatus(503, "2")).toEqual({ retryAfterMs: 2000 });
    expect(transientStatus(429)).toEqual({ retryAfterMs: undefined });
  });
});

describe("parseRetryAfter", () => {
  it("reads seconds and HTTP dates, and ignores anything else", () => {
    expect(parseRetryAfter("3")).toBe(3000);
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter("1.5")).toBe(1500);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4_000)).toBe(6000);
    expect(parseRetryAfter(new Date(1_000).toUTCString(), 4_000)).toBe(0);
    expect(parseRetryAfter("soon")).toBeUndefined();
    expect(parseRetryAfter("-3")).toBeUndefined();
    expect(parseRetryAfter("")).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});

describe("backoffDelay", () => {
  it("doubles, is capped, and spreads clients with jitter", () => {
    const policy = DEFAULT_RETRY_POLICY;
    expect(backoffDelay(0, policy, () => 0)).toBe(200);
    expect(backoffDelay(0, policy, () => 1)).toBe(400);
    expect(backoffDelay(1, policy, () => 1)).toBe(800);
    expect(backoffDelay(2, policy, () => 1)).toBe(1600);
    expect(backoffDelay(10, policy, () => 1)).toBe(policy.maxDelayMs);
    expect(backoffDelay(10, policy, () => 0)).toBe(policy.maxDelayMs / 2);
  });
});

describe("withRetry", () => {
  it("returns at once when the first try works, without waiting", async () => {
    const { env, waits } = fastEnv();
    const run = vi.fn(async () => "ok");

    await expect(
      withRetry(run, { idempotent: true, transientError: transient, env }),
    ).resolves.toBe("ok");

    expect(run).toHaveBeenCalledTimes(1);
    expect(waits).toEqual([]);
  });

  it("retries a transient error and returns the first success", async () => {
    const { env, waits } = fastEnv();
    const run = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError("down"))
      .mockResolvedValueOnce("ok");

    await expect(
      withRetry(run, { idempotent: true, transientError: transient, env }),
    ).resolves.toBe("ok");

    expect(run).toHaveBeenCalledTimes(2);
    expect(waits).toHaveLength(1);
  });

  it("gives up after the configured retries and throws the last error", async () => {
    const { env, waits } = fastEnv();
    const run = vi.fn(async () => {
      throw new TypeError("down");
    });

    await expect(
      withRetry(run, { idempotent: true, transientError: transient, env }),
    ).rejects.toThrow("down");

    expect(run).toHaveBeenCalledTimes(1 + DEFAULT_RETRY_POLICY.retries);
    expect(waits).toHaveLength(DEFAULT_RETRY_POLICY.retries);
    // each wait is longer than the one before (random is fixed)
    expect(waits[1]).toBeGreaterThan(waits[0]);
  });

  it("never retries what is not safe to repeat", async () => {
    const { env, waits } = fastEnv();
    const failing = vi.fn(async () => {
      throw new TypeError("down");
    });
    const busy = vi.fn(async () => 503);

    await expect(
      withRetry(failing, { idempotent: false, transientError: transient, env }),
    ).rejects.toThrow();
    await expect(
      withRetry(busy, {
        idempotent: false,
        transientError: transient,
        transientResult: (status) => transientStatus(status),
        env,
      }),
    ).resolves.toBe(503);

    expect(failing).toHaveBeenCalledTimes(1);
    expect(busy).toHaveBeenCalledTimes(1);
    expect(waits).toEqual([]);
  });

  it("does not retry an error that is not transient", async () => {
    const { env } = fastEnv();
    const run = vi.fn(async () => {
      throw new RangeError("a bug, not the network");
    });
    await expect(
      withRetry(run, { idempotent: true, transientError: transient, env }),
    ).rejects.toThrow("bug");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("retries a busy answer and returns the last one when it stays busy", async () => {
    const { env } = fastEnv();
    const run = vi.fn(async () => 503);

    const result = await withRetry(run, {
      idempotent: true,
      transientError: transient,
      transientResult: (status) => transientStatus(status),
      env,
    });

    expect(result).toBe(503);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("waits at least as long as Retry-After, and gives up when it asks for too long", async () => {
    const short = fastEnv();
    const run = vi
      .fn<() => Promise<{ status: number; after: string | null }>>()
      .mockResolvedValueOnce({ status: 429, after: "3" })
      .mockResolvedValueOnce({ status: 200, after: null });
    const result = await withRetry(run, {
      idempotent: true,
      transientError: transient,
      transientResult: (r) => transientStatus(r.status, r.after),
      env: short.env,
    });
    expect(result.status).toBe(200);
    expect(short.waits[0]).toBeGreaterThanOrEqual(3000);

    const long = fastEnv();
    const tooLong = vi.fn(async () => ({ status: 429, after: "120" }));
    const last = await withRetry(tooLong, {
      idempotent: true,
      transientError: transient,
      transientResult: (r) => transientStatus(r.status, r.after),
      env: long.env,
    });
    expect(last.status).toBe(429);
    expect(tooLong).toHaveBeenCalledTimes(1); // the person is told to try later instead of waiting 2 minutes
    expect(long.waits).toEqual([]);
  });

  it("does not wait while the device is offline", async () => {
    const { env, waits } = fastEnv(false);
    const run = vi.fn(async () => {
      throw new TypeError("offline");
    });

    await expect(
      withRetry(run, { idempotent: true, transientError: transient, env }),
    ).rejects.toThrow("offline");

    expect(run).toHaveBeenCalledTimes(1);
    expect(waits).toEqual([]);
  });

  it("tells the caller before each wait", async () => {
    const { env } = fastEnv();
    const onRetry = vi.fn();
    const run = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError("a"))
      .mockRejectedValueOnce(new TypeError("b"))
      .mockResolvedValueOnce("ok");

    await withRetry(run, { idempotent: true, transientError: transient, env, onRetry });

    expect(onRetry.mock.calls.map(([info]) => info.attempt)).toEqual([1, 2]);
  });

  it("stops at once when cancelled, before and during the wait", async () => {
    const before = new AbortController();
    before.abort();
    const run = vi.fn(async () => "ok");
    await expect(
      withRetry(run, { idempotent: true, transientError: transient, signal: before.signal }),
    ).rejects.toBeDefined();
    expect(run).not.toHaveBeenCalled();

    const during = new AbortController();
    const failing = vi.fn(async () => {
      throw new TypeError("down");
    });
    const waiting = withRetry(failing, {
      idempotent: true,
      transientError: transient,
      signal: during.signal,
      policy: { baseDelayMs: 60_000, maxDelayMs: 60_000 },
    });
    await Promise.resolve();
    await Promise.resolve();
    during.abort();
    await expect(waiting).rejects.toBeDefined();
    expect(failing).toHaveBeenCalledTimes(1);
  });

  it("really waits with the browser timers by default", async () => {
    vi.useFakeTimers();
    try {
      const run = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new TypeError("down"))
        .mockResolvedValueOnce("ok");
      const result = withRetry(run, {
        idempotent: true,
        transientError: transient,
        env: { random: () => 0 },
      });
      await vi.advanceTimersByTimeAsync(199);
      expect(run).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(2);
      await expect(result).resolves.toBe("ok");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("network activity", () => {
  it("counts a request while it runs and forgets it when it ends, with its result untouched", async () => {
    let release!: (value: string) => void;
    const seen: number[] = [];
    const stop = subscribeNetwork(() => seen.push(networkSnapshot().pending));

    const promise = trackRequest(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    expect(networkSnapshot().pending).toBe(1);
    release("done");

    await expect(promise).resolves.toBe("done");
    expect(networkSnapshot().pending).toBe(0);
    expect(seen).toEqual([1, 0]);
    stop();
  });

  it("counts requests that fail, and passes the error on unchanged", async () => {
    const error = new Error("boom");
    await expect(trackRequest(() => Promise.reject(error))).rejects.toBe(error);
    expect(networkSnapshot().pending).toBe(0);
  });

  it("says a request is trying again until it ends", async () => {
    let handle!: { retrying(): void };
    let finish!: () => void;
    const promise = trackRequest(
      (h) =>
        new Promise<void>((resolve) => {
          handle = h;
          finish = resolve;
        }),
    );
    expect(networkSnapshot().retrying).toBe(false);

    handle.retrying();
    handle.retrying(); // twice from the same request counts once
    expect(networkSnapshot().retrying).toBe(true);

    finish();
    await promise;
    expect(networkSnapshot().retrying).toBe(false);
  });

  it("only tells about being offline when it matters to a request", async () => {
    setOnline(false);
    expect(networkSnapshot().offline).toBe(false); // nothing was asked: no reason to say anything

    await trackRequest(() => Promise.reject(new Error("down"))).catch(() => undefined);
    expect(networkSnapshot().offline).toBe(true);

    setOnline(true);
    expect(networkSnapshot().offline).toBe(false);
  });

  it("does not notify when nothing changed", () => {
    const listener = vi.fn();
    const stop = subscribeNetwork(listener);
    setOnline(true);
    setOnline(true);
    expect(listener).not.toHaveBeenCalled();
    stop();
  });

  it("reacts to the browser online and offline events", async () => {
    window.dispatchEvent(new Event("offline"));
    await trackRequest(() => Promise.reject(new Error("down"))).catch(() => undefined);
    expect(networkSnapshot().offline).toBe(true);
    window.dispatchEvent(new Event("online"));
    expect(networkSnapshot().offline).toBe(false);
  });
});
