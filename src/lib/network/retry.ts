/**
 * Retry of transient failures, with exponential backoff and jitter.
 *
 * The rule that matters: **only a request that is safe to repeat is ever retried** (`idempotent`,
 * in practice a GET). A POST, PUT or DELETE that failed in transit may have run on the server, and
 * running it twice could move money twice: the user is told it is uncertain, nothing is resent.
 */

export interface RetryPolicy {
  /** Extra attempts after the first one. */
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** A `Retry-After` longer than this is not waited for: the person is told to try later. */
  maxRetryAfterMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  retries: 2,
  baseDelayMs: 400,
  maxDelayMs: 4_000,
  maxRetryAfterMs: 8_000,
};

/** What can differ between tests and the browser. */
export interface RetryEnv {
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  random(): number;
  online(): boolean;
}

function abortError(signal?: AbortSignal): unknown {
  return signal?.reason ?? new DOMException("Aborted", "AbortError");
}

export const browserRetryEnv: RetryEnv = {
  sleep(ms, signal) {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(abortError(signal));
      const onAbort = () => {
        clearTimeout(timer);
        reject(abortError(signal));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  },
  random: () => Math.random(),
  online: () => (typeof navigator === "undefined" ? true : navigator.onLine !== false),
};

/** `false` = not transient. Otherwise it is, optionally with the delay the server asked for. */
export type Transient = false | { retryAfterMs?: number };

export interface RetryOptions<T> {
  /** Safe to repeat. When `false` the operation runs exactly once. */
  idempotent: boolean;
  /** An error that is worth another try (the network failed, the server did not answer in time). */
  transientError(error: unknown): boolean;
  /** An answer that is worth another try (502, 503, 504, 429). The last one is returned as is. */
  transientResult?(result: T): Transient;
  policy?: Partial<RetryPolicy>;
  /** Cancelling stops the waiting and the retrying at once. */
  signal?: AbortSignal;
  env?: Partial<RetryEnv>;
  /** Called before each wait, so a screen can say that it is trying again. */
  onRetry?(info: { attempt: number; delayMs: number }): void;
}

/** Delay before retry number `attempt` (0 = the first retry): equal jitter, so clients spread out. */
export function backoffDelay(attempt: number, policy: RetryPolicy, random: () => number): number {
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** attempt);
  return Math.round(ceiling / 2 + (random() * ceiling) / 2);
}

export async function withRetry<T>(
  run: (attempt: number) => Promise<T>,
  options: RetryOptions<T>,
): Promise<T> {
  const policy = { ...DEFAULT_RETRY_POLICY, ...options.policy };
  const env = { ...browserRetryEnv, ...options.env };
  const retries = options.idempotent ? policy.retries : 0;

  for (let attempt = 0; ; attempt += 1) {
    if (options.signal?.aborted) throw abortError(options.signal);
    let result: T | undefined;
    let failure: { error: unknown } | undefined;
    let verdict: Transient = false;
    try {
      result = await run(attempt);
      verdict = options.transientResult?.(result) ?? false;
      if (!verdict) return result;
    } catch (error) {
      if (!options.transientError(error)) throw error;
      failure = { error };
    }

    // Out of attempts, or no point trying while the device is offline: give back what we have.
    const giveUp = () => {
      if (failure) throw failure.error;
      return result as T;
    };
    if (attempt >= retries || !env.online()) return giveUp();

    let delay = backoffDelay(attempt, policy, env.random);
    if (verdict && verdict.retryAfterMs !== undefined) {
      if (verdict.retryAfterMs > policy.maxRetryAfterMs) return giveUp();
      delay = Math.max(delay, verdict.retryAfterMs);
    }
    options.onRetry?.({ attempt: attempt + 1, delayMs: delay });
    await env.sleep(delay, options.signal);
  }
}

/** The statuses that are worth another try: the service is restarting, or asked us to slow down. */
export function transientStatus(status: number, retryAfter?: string | null): Transient {
  if (status === 502 || status === 503 || status === 504 || status === 408 || status === 429) {
    return { retryAfterMs: parseRetryAfter(retryAfter) };
  }
  return false;
}

/** `Retry-After` is a number of seconds or an HTTP date. Anything else is ignored. */
export function parseRetryAfter(
  value: string | null | undefined,
  now = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  // A date has letters (a day and a month name); a number the server got wrong is not a date.
  if (!/[a-z]/i.test(value)) return undefined;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}
