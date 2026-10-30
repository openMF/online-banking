import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthenticationClient } from "../authentication/client";
import { SelfServiceError, selfRequest } from "../selfservice";
import { createSelfServiceConfigLoader } from "../self-service-config-loader";
import { networkSnapshot, resetNetworkActivity } from "./index";

// The retry and the indicator as the typed clients use them: what is repeated, what never is.

const config = { baseUrl: "https://bank.example", apiPath: "/api", tenantId: "t1" };
const session = { accessKey: "KEY", username: "ana", userId: 1, clients: [] };
const noWait = { sleep: vi.fn(async (_ms: number) => undefined), random: () => 0.5 };

afterEach(() => {
  resetNetworkActivity();
  noWait.sleep.mockClear();
  vi.restoreAllMocks();
});

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

/** Answers in order; a `Response` is returned, an `Error` is thrown. The last one repeats. */
function scripted(...steps: (Response | Error | (() => Response))[]) {
  let index = 0;
  return vi.fn(async () => {
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    if (step instanceof Error) throw step;
    return typeof step === "function" ? step() : step.clone();
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

async function failure(promise: Promise<unknown>): Promise<SelfServiceError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof SelfServiceError) return error;
    throw error;
  }
  throw new Error("expected the promise to reject");
}

const read = (fetchImpl: typeof fetch, extra = {}) =>
  selfRequest<{ ok: boolean }>("/stepup/config", {
    fetchImpl,
    config,
    session,
    retry: { env: noWait },
    ...extra,
  });

describe("selfRequest: reads are repeated", () => {
  it("retries a failure in transit and returns the first answer", async () => {
    const fetchImpl = scripted(new TypeError("down"), json({ ok: true }));
    await expect(read(fetchImpl)).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(noWait.sleep).toHaveBeenCalledTimes(1);
  });

  it("retries a service that is restarting (503) and returns the first good answer", async () => {
    const fetchImpl = scripted(json({}, 503), json({}, 502), json({ ok: true }));
    await expect(read(fetchImpl)).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("gives up after the retries, with the kind of problem for the screen", async () => {
    const fetchImpl = scripted(json({ developerMessage: "SECRET_STACK" }, 503));

    const error = await failure(read(fetchImpl));

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(error.status).toBe(503);
    expect(error.problem).toBe("unavailable");
    expect(error.message).not.toContain("SECRET_STACK");
  });

  it("waits for the Retry-After of a 429, and says rateLimited if it stays 429", async () => {
    const fetchImpl = scripted(json({}, 429, { "Retry-After": "2" }), json({ ok: true }));
    await read(fetchImpl);
    expect(noWait.sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(2000);

    const stuck = scripted(json({}, 429, { "Retry-After": "1" }));
    expect((await failure(read(stuck))).problem).toBe("rateLimited");
  });

  it("does not wait minutes for a Retry-After that long: it tells the person to try later", async () => {
    const fetchImpl = scripted(json({}, 429, { "Retry-After": "300" }));
    const error = await failure(read(fetchImpl));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(error.problem).toBe("rateLimited");
  });

  it("never repeats a refusal: 4xx and a plain 500 are answered once", async () => {
    for (const status of [400, 401, 403, 404, 409, 422, 500]) {
      const fetchImpl = scripted(json({}, status));
      await failure(read(fetchImpl));
      expect(fetchImpl, String(status)).toHaveBeenCalledTimes(1);
    }
  });

  it("reads get a shorter time per try than writes", async () => {
    vi.useFakeTimers();
    try {
      const hang = vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("x", "AbortError")),
            );
          }),
      ) as unknown as typeof fetch;
      const pending = failure(
        selfRequest("/x", { fetchImpl: hang, config, session, retry: { policy: { retries: 0 } } }),
      );
      await vi.advanceTimersByTimeAsync(14_999);
      expect(hang).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(2);
      const error = await pending;
      expect(error.details.reason).toBe("timeout");
      expect(error.problem).toBe("timeout");
    } finally {
      vi.useRealTimers();
    }
  });

  it("repeats a read that timed out", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const fetchImpl = vi.fn((_url: unknown, init?: RequestInit) => {
        calls += 1;
        if (calls === 1) {
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("x", "AbortError")),
            );
          });
        }
        return Promise.resolve(json({ ok: true }));
      }) as unknown as typeof fetch;
      const result = selfRequest("/x", { fetchImpl, config, session, retry: { env: noWait } });
      await vi.advanceTimersByTimeAsync(15_001);
      await expect(result).resolves.toEqual({ ok: true });
      expect(calls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("selfRequest: a body that is not read to the end", () => {
  /** A response whose headers arrived but whose body fails to be read. */
  const brokenBody = () =>
    ({
      status: 200,
      ok: true,
      headers: new Headers(),
      text: () => Promise.reject(new TypeError("body stream failed")),
    }) as unknown as Response;

  it("is never a successful empty answer: the read is repeated, then reported as a failure", async () => {
    const fetchImpl = vi.fn(async () => brokenBody()) as unknown as typeof fetch;

    const error = await failure(read(fetchImpl));

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(error.code).toBe("error.network");
    expect(error.problem).toBe("network");
  });

  it("a read whose body fails once is repeated and returns the good answer", async () => {
    const fetchImpl = scripted(brokenBody, json({ ok: true }));
    await expect(read(fetchImpl)).resolves.toEqual({ ok: true });
  });

  it("a timeout that fires while the body is read is a timeout, and the read is repeated", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
        calls += 1;
        if (calls > 1) return json({ ok: true });
        return {
          status: 200,
          ok: true,
          headers: new Headers(),
          // the headers arrived; the body never does, until the time runs out
          text: () =>
            new Promise<string>((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () =>
                reject(new DOMException("x", "AbortError")),
              );
            }),
        } as unknown as Response;
      }) as unknown as typeof fetch;

      const result = read(fetchImpl);
      await vi.advanceTimersByTimeAsync(15_001);

      await expect(result).resolves.toEqual({ ok: true });
      expect(calls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a write whose body is cut is reported, never repeated and never an empty success", async () => {
    const fetchImpl = vi.fn(async () => brokenBody()) as unknown as typeof fetch;
    const error = await failure(
      selfRequest("/x", {
        method: "POST",
        body: {},
        fetchImpl,
        config,
        session,
        retry: { env: noWait },
      }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(error.code).toBe("error.network");
  });

  it("a read cancelled while its body is read is a cancelled request", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => ({
      status: 200,
      ok: true,
      headers: new Headers(),
      text: () =>
        new Promise<string>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("x", "AbortError")),
          );
          controller.abort();
        }),
    })) as unknown as typeof fetch;

    const error = await failure(read(fetchImpl, { signal: controller.signal }));

    expect(error.details.reason).toBe("cancelled");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("selfRequest: writes are never repeated", () => {
  it.each(["POST", "PUT", "DELETE"] as const)(
    "%s that failed in transit is sent once",
    async (method) => {
      const fetchImpl = scripted(new TypeError("down"));

      const error = await failure(
        selfRequest("/x", {
          method,
          body: { a: 1 },
          fetchImpl,
          config,
          session,
          retry: { env: noWait },
        }),
      );

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(error.code).toBe("error.network");
      expect(error.problem).toBe("network");
      expect(noWait.sleep).not.toHaveBeenCalled();
    },
  );

  it.each(["POST", "PUT", "DELETE"] as const)(
    "%s answered 503 is not sent again",
    async (method) => {
      const fetchImpl = scripted(json({}, 503));
      const error = await failure(
        selfRequest("/x", { method, body: {}, fetchImpl, config, session, retry: { env: noWait } }),
      );
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(error.problem).toBe("unavailable");
    },
  );
});

describe("selfRequest: why it failed", () => {
  it("says offline when the device has no connection, and does not wait", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchImpl = scripted(new TypeError("Failed to fetch"));

    const error = await failure(read(fetchImpl));

    expect(error.problem).toBe("offline");
    expect(error.details.reason).toBe("offline");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(noWait.sleep).not.toHaveBeenCalled();
  });

  it("a cancelled request is not repeated and is not blamed on the network", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      controller.abort();
      if (init?.signal?.aborted) throw new DOMException("x", "AbortError");
      return json({});
    }) as unknown as typeof fetch;

    const error = await failure(read(fetchImpl, { signal: controller.signal }));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(error.details.reason).toBe("cancelled");
  });

  it("never leaks the address, the credential or the server text", async () => {
    const error = await failure(
      read(scripted(new TypeError("fetch failed https://bank.example Basic KEY"))),
    );
    expect(JSON.stringify([error.message, error.details])).not.toMatch(/bank\.example|KEY/);
  });

  it.each([
    [0, "network"],
    [401, "unauthorized"],
    [404, "notFound"],
    [422, "invalid"],
    [503, "unavailable"],
    [500, "server"],
  ] as const)("status %i is %s", (status, kind) => {
    expect(new SelfServiceError(status, "x", "y").problem).toBe(kind);
  });
});

describe("the indicator", () => {
  it("counts a request while it is in flight, and a retry while it waits", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchImpl = scripted(new TypeError("down"), () => json({ ok: true }));
    const env = {
      ...noWait,
      sleep: vi.fn(async () => {
        expect(networkSnapshot().retrying).toBe(true);
        await gate;
      }),
    };

    const promise = read(fetchImpl, { retry: { env } });
    await vi.waitFor(() => expect(env.sleep).toHaveBeenCalled());
    expect(networkSnapshot().pending).toBe(1);
    release();
    await promise;

    expect(networkSnapshot()).toMatchObject({ pending: 0, retrying: false });
  });

  it("is back to idle after a failure too", async () => {
    await failure(read(scripted(json({}, 404))));
    expect(networkSnapshot().pending).toBe(0);
  });
});

// -------------------------------------------------------------------------------------------------

describe("the login client", () => {
  const key = btoa("00000000-0000-4000-8000-000000000001");
  const loginBody = {
    authenticated: true,
    username: "u",
    userId: 42,
    base64EncodedAuthenticationKey: key,
    roles: [{ id: 3, name: "Customer" }],
    permissions: ["READ_CLIENT"],
    clients: [81],
    shouldRenewPassword: false,
    isTwoFactorAuthenticationRequired: false,
  };
  const configuration = async () => ({
    baseUrl: "https://bank.invalid/fineract-provider/api/v1/self",
    tenantId: "t",
  });

  function client(transport: typeof fetch) {
    return createAuthenticationClient({ configuration, transport, retry: { env: noWait } });
  }

  it("never repeats the login: a 503 is answered once as an unavailable service", async () => {
    const transport = scripted(json({}, 503));
    await expect(client(transport).login("u", "p")).rejects.toMatchObject({ code: "server" });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("never repeats the login after a failure in transit", async () => {
    const transport = scripted(new TypeError("down"));
    await expect(client(transport).login("u", "p")).rejects.toMatchObject({ code: "network" });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("says offline at the login when the device has no connection", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const transport = scripted(new TypeError("Failed to fetch"));
    await expect(client(transport).login("u", "p")).rejects.toMatchObject({ code: "offline" });
  });

  it("repeats a read of the session, but not a write", async () => {
    const transport = scripted(json(loginBody), new TypeError("down"), json({ templates: [] }));
    const live = await client(transport).login("u", "p");

    await expect(
      live.request("savingsaccounts/template", { method: "GET" }),
    ).resolves.toMatchObject({
      status: 200,
    });
    expect(transport).toHaveBeenCalledTimes(3); // the login, the failed read, the repeated read

    const writes = scripted(json(loginBody), new TypeError("down"));
    const other = await client(writes).login("u", "p");
    await expect(
      other.request("savingsaccounts", { method: "POST", body: {} }),
    ).rejects.toMatchObject({
      code: "network",
    });
    expect(writes).toHaveBeenCalledTimes(2); // the login and ONE try of the write
  });

  it("a read answered 503 and then 200 is returned as the 200", async () => {
    const transport = scripted(json(loginBody), json({}, 503), json({ ok: 1 }));
    const live = await client(transport).login("u", "p");
    await expect(live.request("x", { method: "GET" })).resolves.toMatchObject({
      status: 200,
      ok: true,
    });
  });

  it("a read cancelled while it waits is a cancelled request", async () => {
    const transport = scripted(json(loginBody), new TypeError("down"));
    const controller = new AbortController();
    const env = {
      ...noWait,
      sleep: async () => {
        controller.abort();
        throw new DOMException("x", "AbortError");
      },
    };
    const live = await createAuthenticationClient({
      configuration,
      transport,
      retry: { env },
    }).login("u", "p");

    await expect(
      live.request("x", { method: "GET", signal: controller.signal }),
    ).rejects.toMatchObject({ code: "cancelled" });
  });

  it("logout is a write: it is not repeated", async () => {
    const transport = scripted(json(loginBody), new TypeError("down"));
    const live = await client(transport).login("u", "p");
    await expect(live.logout()).resolves.toBe(false);
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

// -------------------------------------------------------------------------------------------------

describe("the runtime configuration", () => {
  const good = { baseUrl: "https://bank.example/fineract-provider/api/v1/self", tenantId: "t1" };
  const loader = (fetcher: typeof fetch) =>
    createSelfServiceConfigLoader({}, fetcher, "/", { env: noWait });

  it("is read again when the first try fails in transit", async () => {
    const fetcher = scripted(new TypeError("down"), json(good));
    await expect(loader(fetcher)()).resolves.toMatchObject({ tenantId: "t1" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("is read again when the service is restarting", async () => {
    const fetcher = scripted(json({}, 503), json(good));
    await expect(loader(fetcher)()).resolves.toMatchObject({ tenantId: "t1" });
  });

  it("does not stay broken until the page is reloaded after a failure to reach it", async () => {
    const fetcher = scripted(
      new TypeError("down"),
      new TypeError("down"),
      new TypeError("down"),
      json(good),
    );
    const load = loader(fetcher);

    await expect(load()).rejects.toMatchObject({ transient: true });
    expect(fetcher).toHaveBeenCalledTimes(3);

    // the next login asks again and works
    await expect(load()).resolves.toMatchObject({ tenantId: "t1" });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("remembers a configuration that is wrong: asking again would give the same answer", async () => {
    const fetcher = scripted(json({ baseUrl: "not a url", tenantId: "" }));
    const load = loader(fetcher);

    await expect(load()).rejects.toMatchObject({ transient: false });
    await expect(load()).rejects.toMatchObject({ transient: false });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not ask again for a 404: the file is not there", async () => {
    const fetcher = scripted(json({}, 404));
    await expect(loader(fetcher)()).rejects.toMatchObject({ transient: false });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("shares one request between everybody who waits for it", async () => {
    const fetcher = scripted(json(good));
    const load = loader(fetcher);
    await Promise.all([load(), load(), load()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
