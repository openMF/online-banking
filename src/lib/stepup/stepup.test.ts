import { afterEach, describe, expect, it, vi } from "vitest";
import { SelfServiceError, clearSession, setSession } from "../selfservice";
import {
  StepUpError,
  canCompleteTransferLocally,
  createDemoStepUpApi,
  createHttpStepUpApi,
  resetDemoStepUpApi,
  selectStepUpApi,
  toStepUpError,
} from "./index";

const config = { baseUrl: "https://bank.example", apiPath: "/api", tenantId: "t1" };
const session = { accessKey: "KEY", username: "ana", userId: 1, clients: [] };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

async function rejection(promise: Promise<unknown>): Promise<StepUpError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof StepUpError) return error;
    throw error;
  }
  throw new Error("expected the promise to reject");
}

afterEach(() => {
  clearSession();
  resetDemoStepUpApi();
});

describe("toStepUpError", () => {
  it("maps step-up error codes and keeps only the useful fields", () => {
    const error = toStepUpError(
      new SelfServiceError(400, "error.msg.selfservice.stepup.otp.invalid", "x", {
        attemptsRemaining: 3,
        action: "TPT_TRANSFER",
      }),
    );
    expect(error.code).toBe("otp.invalid");
    expect(error.attemptsRemaining).toBe(3);
    expect(error.message).not.toContain("TPT_TRANSFER");
  });

  it("reads retry-after for lock-outs", () => {
    const error = toStepUpError(
      new SelfServiceError(429, "error.msg.selfservice.stepup.locked", "x", {
        retryAfterSeconds: 900,
      }),
    );
    expect(error.code).toBe("locked");
    expect(error.retryAfterSeconds).toBe(900);
  });

  it("maps network failures and never leaks unknown server text", () => {
    expect(toStepUpError(new SelfServiceError(0, "error.network", "boom")).code).toBe("network");
    const unknown = toStepUpError(new SelfServiceError(500, "error.http.500", "stack trace…"));
    expect(unknown.code).toBe("unknown");
    expect(unknown.message).not.toContain("stack");
    expect(toStepUpError(new Error("anything")).code).toBe("unknown");
  });
});

describe("http adapter", () => {
  it("returns typed results from the real endpoints", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ stepUpToken: "TOKEN", action: "TPT_TRANSFER", expiresAt: "x" }),
    );
    const api = createHttpStepUpApi({ fetchImpl, config, session });
    expect(api.mode).toBe("backend");
    expect(api.demoHint).toBeUndefined();

    const grant = await api.verify(5, "123456");
    expect(grant.stepUpToken).toBe("TOKEN");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://bank.example/api/v1/self/stepup/challenges/5/verify");
    expect((init.headers as Record<string, string>).Authorization).toBe("Basic KEY");
  });

  it("turns API errors into StepUpError", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          userMessageGlobalisationCode: "error.msg.selfservice.stepup.otp.invalid",
          attemptsRemaining: 2,
        },
        400,
      ),
    );
    const api = createHttpStepUpApi({ fetchImpl, config, session });
    const error = await rejection(api.verify(5, "000000"));
    expect(error.code).toBe("otp.invalid");
    expect(error.attemptsRemaining).toBe(2);
  });

  it("reports an unreachable server as a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("offline"));
    const api = createHttpStepUpApi({ fetchImpl, config, session });
    expect((await rejection(api.getConfig())).code).toBe("network");
  });
});

describe("demo adapter (same rules as the server, but public)", () => {
  function setup() {
    let now = 1_000_000;
    const api = createDemoStepUpApi({ now: () => now, resendCooldownSeconds: 30 });
    return { api, advance: (seconds: number) => (now += seconds * 1000) };
  }
  const input = { action: "TPT_TRANSFER", channel: "EMAIL" } as const;

  it("is clearly marked as demo and exposes the demo code as a hint", () => {
    const { api } = setup();
    expect(api.mode).toBe("demo");
    expect(api.demoHint).toBe("123456");
  });

  it("issues a one-time token for the right code and rejects reuse", async () => {
    const { api } = setup();
    const challenge = await api.createChallenge(input);
    const grant = await api.verify(challenge.challengeId, "123456");
    expect(grant.stepUpToken).toMatch(/^demo-/);
    expect((await rejection(api.verify(challenge.challengeId, "123456"))).code).toBe("invalid");
  });

  it("counts wrong codes and locks after the maximum", async () => {
    const { api } = setup();
    const challenge = await api.createChallenge(input);
    for (let remaining = 4; remaining >= 1; remaining--) {
      const error = await rejection(api.verify(challenge.challengeId, "000000"));
      expect(error.code).toBe("otp.invalid");
      expect(error.attemptsRemaining).toBe(remaining);
    }
    const locked = await rejection(api.verify(challenge.challengeId, "000000"));
    expect(locked.code).toBe("locked");
    expect(locked.retryAfterSeconds).toBeGreaterThan(0);
    // the right code no longer works, and no new challenge can be requested
    expect((await rejection(api.verify(challenge.challengeId, "123456"))).code).toBe("locked");
    expect((await rejection(api.createChallenge(input))).code).toBe("locked");
  });

  it("stops reporting a lock-out once it is over", async () => {
    const { api, advance } = setup();
    const challenge = await api.createChallenge(input);
    for (let attempt = 0; attempt < 5; attempt++) {
      await rejection(api.verify(challenge.challengeId, "000000"));
    }
    expect((await rejection(api.verify(challenge.challengeId, "123456"))).code).toBe("locked");

    advance(901);

    // the 5-minute code is long gone too: the person is sent to "request a new code", not "locked"
    expect((await rejection(api.verify(challenge.challengeId, "123456"))).code).toBe("otp.expired");
    expect((await api.createChallenge(input)).challengeId).toBeGreaterThan(challenge.challengeId);
  });

  it("expires codes", async () => {
    const { api, advance } = setup();
    const challenge = await api.createChallenge(input);
    advance(301);
    expect((await rejection(api.verify(challenge.challengeId, "123456"))).code).toBe("otp.expired");
  });

  it("enforces the resend cooldown and the maximum number of resends", async () => {
    const { api, advance } = setup();
    const challenge = await api.createChallenge(input);

    const tooSoon = await rejection(api.resend(challenge.challengeId));
    expect(tooSoon.code).toBe("resend.cooldown");
    expect(tooSoon.retryAfterSeconds).toBe(30);

    for (let count = 1; count <= 3; count++) {
      advance(31);
      expect((await api.resend(challenge.challengeId)).resendsRemaining).toBe(3 - count);
    }
    advance(31);
    expect((await rejection(api.resend(challenge.challengeId))).code).toBe("resend.limit");
  });

  it("only offers the channels it can use", async () => {
    const { api } = setup();
    expect((await api.getConfig()).availableChannels).toEqual(["EMAIL"]);
    expect((await rejection(api.createChallenge({ ...input, channel: "SMS" }))).code).toBe(
      "channel.unavailable",
    );
  });
});

describe("canCompleteTransferLocally", () => {
  it("is true only for the demo adapter", () => {
    expect(canCompleteTransferLocally(createDemoStepUpApi())).toBe(true);
    expect(canCompleteTransferLocally(createHttpStepUpApi({ config, session }))).toBe(false);
  });
});

describe("selectStepUpApi", () => {
  it("uses the demo without a configured backend, even with a session", () => {
    // A developer's .env.local may configure a backend; this test is about "none configured".
    vi.stubEnv("VITE_SELF_SERVICE_BASE_URL", "");
    setSession(session);
    expect(selectStepUpApi().mode).toBe("demo");
  });

  it("uses the demo with a backend but without a session", () => {
    vi.stubEnv("VITE_SELF_SERVICE_BASE_URL", "https://bank.example");
    expect(selectStepUpApi().mode).toBe("demo");
  });

  it("uses the real API only with both a backend and a session", () => {
    vi.stubEnv("VITE_SELF_SERVICE_BASE_URL", "https://bank.example");
    setSession(session);
    expect(selectStepUpApi().mode).toBe("backend");
  });

  it("shares one demo instance so its state survives re-renders", () => {
    expect(selectStepUpApi()).toBe(selectStepUpApi());
    const first = selectStepUpApi();
    resetDemoStepUpApi();
    expect(selectStepUpApi()).not.toBe(first);
  });
});
