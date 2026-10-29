import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SelfServiceError,
  authorizationHeader,
  clearSession,
  createStepUpChallenge,
  getSelfServiceConfig,
  getSession,
  getStepUpConfig,
  getUserDetails,
  hasSession,
  login,
  logout,
  resendStepUpChallenge,
  selfRequest,
  selfUrl,
  setSession,
  verifyStepUpChallenge,
  type Session,
} from "./index";

const config = {
  baseUrl: "https://bank.example",
  apiPath: "/fineract-provider/api",
  tenantId: "tenant-1",
};
const session: Session = { accessKey: "KEY123", username: "ana", userId: 7, clients: [1] };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeFetch(...responses: Response[]) {
  const queue = [...responses];
  return vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra request");
    return next;
  });
}

/** Awaits a promise that must reject with a SelfServiceError and returns that error. */
async function failure(promise: Promise<unknown>): Promise<SelfServiceError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof SelfServiceError) return error;
    throw error;
  }
  throw new Error("expected the promise to reject");
}

afterEach(() => {
  clearSession();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("config", () => {
  it("is null (demo mode) without a base URL", () => {
    expect(getSelfServiceConfig({})).toBeNull();
    expect(getSelfServiceConfig({ VITE_SELF_SERVICE_BASE_URL: "   " })).toBeNull();
  });

  it("applies defaults and normalises slashes", () => {
    expect(getSelfServiceConfig({ VITE_SELF_SERVICE_BASE_URL: "https://b.example///" })).toEqual({
      baseUrl: "https://b.example",
      apiPath: "/fineract-provider/api",
      tenantId: "default",
    });
    expect(
      getSelfServiceConfig({
        VITE_SELF_SERVICE_BASE_URL: "https://b.example",
        VITE_SELF_SERVICE_ENDPOINT: "api/",
        VITE_SELF_SERVICE_TENANT_ID: " mifos-bank-2 ",
      }),
    ).toEqual({ baseUrl: "https://b.example", apiPath: "/api", tenantId: "mifos-bank-2" });
  });

  it("builds URLs below /v1/self", () => {
    expect(selfUrl(config, "/stepup/config")).toBe(
      "https://bank.example/fineract-provider/api/v1/self/stepup/config",
    );
    expect(selfUrl(config, "authentication")).toBe(
      "https://bank.example/fineract-provider/api/v1/self/authentication",
    );
  });
});

describe("session", () => {
  it("sends the session credential through the single authorizationHeader function", () => {
    expect(authorizationHeader(session)).toBe("Basic KEY123");
  });

  it("lives in memory only", () => {
    setSession(session);
    expect(hasSession()).toBe(true);
    expect(getSession()).toEqual(session);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    clearSession();
    expect(hasSession()).toBe(false);
  });
});

describe("selfRequest", () => {
  it("sends tenant, accept and the session credential, and never cookies", async () => {
    const fetchImpl = fakeFetch(jsonResponse({ ok: true }));
    await selfRequest("/clients", { fetchImpl, config, session });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://bank.example/fineract-provider/api/v1/self/clients");
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Fineract-Platform-TenantId": "tenant-1",
      Authorization: "Basic KEY123",
    });
    expect(init?.credentials).toBe("omit");
    expect(init?.body).toBeUndefined();
  });

  it("uses the stored session by default and none when told so", async () => {
    setSession(session);
    const fetchImpl = fakeFetch(jsonResponse({}), jsonResponse({}));
    await selfRequest("/a", { fetchImpl, config });
    await selfRequest("/b", { fetchImpl, config, session: null });
    expect((fetchImpl.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe(
      "Basic KEY123",
    );
    expect(
      (fetchImpl.mock.calls[1][1]?.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("posts JSON and adds the step-up token header only when given", async () => {
    const fetchImpl = fakeFetch(jsonResponse({}), jsonResponse({}));
    await selfRequest("/accounttransfers", {
      fetchImpl,
      config,
      session,
      method: "POST",
      body: { a: 1 },
      query: { type: "tpt", skip: undefined },
      stepUpToken: "TOK",
    });
    await selfRequest("/accounttransfers", { fetchImpl, config, session, body: { a: 1 } });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      "https://bank.example/fineract-provider/api/v1/self/accounttransfers?type=tpt",
    );
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Step-Up-Token"]).toBe("TOK");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init?.body).toBe('{"a":1}');
    expect(
      (fetchImpl.mock.calls[1][1]?.headers as Record<string, string>)["X-Step-Up-Token"],
    ).toBeUndefined();
  });

  it("maps a Fineract error body to a SelfServiceError with the machine readable code", async () => {
    const fetchImpl = fakeFetch(
      jsonResponse(
        {
          userMessageGlobalisationCode: "error.msg.selfservice.stepup.otp.invalid",
          defaultUserMessage: "The verification code is incorrect.",
          attemptsRemaining: 3,
          internal: "ignored",
        },
        400,
      ),
    );
    const error = await failure(selfRequest("/x", { fetchImpl, config, session }));

    expect(error).toBeInstanceOf(SelfServiceError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("error.msg.selfservice.stepup.otp.invalid");
    expect(error.stepUpCode).toBe("otp.invalid");
    expect(error.details).toEqual({ attemptsRemaining: 3 });
  });

  it("copes with non-JSON error pages", async () => {
    const fetchImpl = fakeFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
    const error = await failure(
      selfRequest("/x", { fetchImpl, config, session, retry: { policy: { retries: 0 } } }),
    );
    expect(error.code).toBe("error.http.502");
    expect(error.stepUpCode).toBeNull();
  });

  it("turns network failures into error.network without leaking the URL or credentials", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed https://bank.example"));
    const error = await failure(
      selfRequest("/x", { fetchImpl, config, session, retry: { env: { sleep: async () => {} } } }),
    );
    expect(error.code).toBe("error.network");
    expect(error.status).toBe(0);
    expect(error.message).not.toContain("bank.example");
    expect(error.message).not.toContain("KEY123");
  });

  it("fails clearly when no backend is configured", async () => {
    const error = await failure(selfRequest("/x", { config: null }));
    expect(error.code).toBe("error.not.configured");
  });
});

describe("login / logout", () => {
  it("stores the session returned by the API and sends no credential header with the login", async () => {
    const fetchImpl = fakeFetch(
      jsonResponse({
        authenticated: true,
        username: "ana",
        userId: 7,
        base64EncodedAuthenticationKey: "SESSIONKEY",
        clients: [4, 5],
      }),
    );

    const result = await login("ana", "secret-pw", { fetchImpl, config });

    expect(result).toEqual({
      accessKey: "SESSIONKEY",
      username: "ana",
      userId: 7,
      clients: [4, 5],
    });
    expect(getSession()).toEqual(result);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://bank.example/fineract-provider/api/v1/self/authentication");
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init?.body).toBe('{"username":"ana","password":"secret-pw"}');
    // the password is not kept anywhere
    expect(JSON.stringify(result)).not.toContain("secret-pw");
  });

  it("does not create a session when the account is not authenticated", async () => {
    const fetchImpl = fakeFetch(jsonResponse({ authenticated: false, username: "ana" }));
    const error = await failure(login("ana", "pw", { fetchImpl, config }));
    expect(error.code).toBe("error.login.failed");
    expect(hasSession()).toBe(false);
  });

  it("does not create a session on bad credentials", async () => {
    const fetchImpl = fakeFetch(jsonResponse({ defaultUserMessage: "Unauthenticated" }, 401));
    const error = await failure(login("ana", "bad", { fetchImpl, config }));
    expect(error).toBeInstanceOf(SelfServiceError);
    expect(error.status).toBe(401);
    expect(hasSession()).toBe(false);
  });

  it("logout forgets the session even if the server call fails", async () => {
    setSession(session);
    const fetchImpl = fakeFetch(jsonResponse({}, 500));
    await logout({ fetchImpl, config });
    expect(hasSession()).toBe(false);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://bank.example/fineract-provider/api/v1/self/authentication/logout",
    );
  });
});

describe("step-up client", () => {
  const challenge = {
    challengeId: 5,
    action: "TPT_TRANSFER",
    channel: "EMAIL",
    maskedDestination: "a***@example.com",
    expiresAt: "2026-10-21T12:05:00",
    attemptsRemaining: 5,
    resendAvailableAt: "2026-10-21T12:01:00",
    resendsRemaining: 3,
  };

  it("calls the four endpoints with the documented bodies", async () => {
    const fetchImpl = fakeFetch(
      jsonResponse({ enabled: true }),
      jsonResponse(challenge, 201),
      jsonResponse({ stepUpToken: "T", action: "TPT_TRANSFER", expiresAt: "x" }),
      jsonResponse(challenge),
    );
    const opts = { fetchImpl, config, session };

    await getStepUpConfig(opts);
    await createStepUpChallenge(
      { action: "TPT_TRANSFER", channel: "EMAIL", payload: { transferAmount: 5 } },
      opts,
    );
    await verifyStepUpChallenge(5, "123456", opts);
    await resendStepUpChallenge(5, opts);

    const calls = fetchImpl.mock.calls.map(([url, init]) => [
      init?.method,
      String(url).replace("https://bank.example/fineract-provider/api/v1/self", ""),
      init?.body,
    ]);
    expect(calls).toEqual([
      ["GET", "/stepup/config", undefined],
      [
        "POST",
        "/stepup/challenges",
        '{"action":"TPT_TRANSFER","channel":"EMAIL","payload":{"transferAmount":5}}',
      ],
      ["POST", "/stepup/challenges/5/verify", '{"otp":"123456"}'],
      ["POST", "/stepup/challenges/5/resend", "{}"],
    ]);
  });
});

describe("user details client", () => {
  it("fetches user details from /userdetails", async () => {
    const details = {
      username: "ana",
      userId: 7,
      officeId: 1,
      officeName: "Head Office",
      roles: [{ id: 1, name: "Admin" }],
      permissions: ["ALL_FUNCTIONS"],
      isSelfServiceUser: true,
      clients: [10],
    };
    const fetchImpl = fakeFetch(jsonResponse(details));
    const result = await getUserDetails({ fetchImpl, config, session });
    expect(result).toEqual(details);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://bank.example/fineract-provider/api/v1/self/userdetails",
    );
    expect(fetchImpl.mock.calls[0][1]?.method).toBe("GET");
  });

  it("returns null when /userdetails responds with 404", async () => {
    const fetchImpl = fakeFetch(jsonResponse({ defaultUserMessage: "Not found" }, 404));
    const result = await getUserDetails({ fetchImpl, config, session });
    expect(result).toBeNull();
  });
});
