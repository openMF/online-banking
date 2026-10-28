import { describe, expect, it, vi } from "vitest";
import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { createHttpActivityApi } from "../activity";
import { createHttpAuthenticatorApi } from "../authenticator";
import { SelfServiceError, selfRequest } from "../selfservice";
import { createHttpStepUpApi } from "../stepup";
import { PasswordError, createHttpPasswordApi, toPasswordError } from "./index";

type Reply = { status?: number; data?: unknown };

/** A logged-in customer whose session answers `replies` in order and remembers every call. */
function fakeCustomer(...replies: (Reply | Error)[]) {
  const calls: { resource: string; options: Parameters<CustomerSession["request"]>[1] }[] = [];
  const customer: CustomerSession = {
    identity: { userId: 7, username: "ana", roles: [], permissions: [], clients: [81] },
    expiresAt: Number.MAX_SAFE_INTEGER,
    request: vi.fn(async (resource, options) => {
      calls.push({ resource, options });
      const next = replies.shift() ?? { status: 200, data: {} };
      if (next instanceof Error) throw next;
      const status = next.status ?? 200;
      return { status, ok: status >= 200 && status < 300, data: "data" in next ? next.data : {} };
    }),
    logout: vi.fn(async () => true),
  };
  return { customer, calls };
}

/** The error a promise rejects with. */
async function rejected<T = SelfServiceError>(promise: Promise<unknown>): Promise<T> {
  try {
    await promise;
  } catch (error) {
    return error as T;
  }
  throw new Error("expected the promise to reject");
}

function body(code: string, extra: Record<string, unknown> = {}, errors?: string[]) {
  return {
    userMessageGlobalisationCode: code,
    defaultUserMessage: "text of the server",
    ...extra,
    ...(errors ? { errors: errors.map((entry) => ({ userMessageGlobalisationCode: entry })) } : {}),
  };
}

// -------------------------------------------------------------------------------------------------
// the customer session as the transport of the typed clients
// -------------------------------------------------------------------------------------------------

describe("selfRequest through the customer session", () => {
  it("sends the resource without the leading slash, the method, the body and the token", async () => {
    const { customer, calls } = fakeCustomer({ data: { ok: 1 } });

    const answer = await selfRequest<{ ok: number }>("/stepup/totp/recovery-codes", {
      customer,
      method: "POST",
      body: {},
      stepUpToken: "ONE-TIME",
    });

    expect(answer).toEqual({ ok: 1 });
    expect(calls[0].resource).toBe("stepup/totp/recovery-codes");
    expect(calls[0].options).toMatchObject({ method: "POST", body: {}, stepUpToken: "ONE-TIME" });
  });

  it("defaults the method like a direct call, and drops undefined query values", async () => {
    const { customer, calls } = fakeCustomer({}, {});

    await selfRequest("/activity", { customer, query: { limit: 20, type: undefined, offset: 0 } });
    await selfRequest("/stepup/challenges", { customer, body: { action: "X" } });

    expect(calls[0].options.method).toBe("GET");
    expect(calls[0].options.query).toEqual({ limit: 20, offset: 0 });
    expect(calls[1].options.method).toBe("POST");
  });

  it("does not need the older session or the build-time configuration", async () => {
    const { customer } = fakeCustomer({ data: { enabled: true } });
    await expect(
      selfRequest("/stepup/config", { customer, config: null, session: null }),
    ).resolves.toEqual({ enabled: true });
  });

  it("turns an error answer into the same SelfServiceError as a direct call", async () => {
    const { customer } = fakeCustomer({
      status: 429,
      data: body("error.msg.selfservice.stepup.locked", { retryAfterSeconds: 900 }),
    });

    const error = await rejected(selfRequest("/stepup/challenges", { customer, body: {} }));

    expect(error).toBeInstanceOf(SelfServiceError);
    expect(error.status).toBe(429);
    expect(error.stepUpCode).toBe("locked");
    expect(error.details.retryAfterSeconds).toBe(900);
  });

  it("keeps the codes of validation errors, never their texts", async () => {
    const { customer } = fakeCustomer({
      status: 400,
      data: body("validation.msg.validation.errors.exist", {}, [
        "validation.msg.x.password.too.short",
      ]),
    });
    const error = await rejected(selfRequest("/user", { customer, method: "PUT", body: {} }));
    expect(error.details.errorCodes).toEqual(["validation.msg.x.password.too.short"]);
    expect(JSON.stringify(error.details)).not.toContain("text of the server");
  });

  it("an ended session is a 401, and any other failure is a network error without details", async () => {
    const { customer } = fakeCustomer(
      new AuthenticationError("expired"),
      new AuthenticationError("network"),
      new AuthenticationError("timeout"),
      new Error("secret transport detail"),
    );

    const ended = await rejected(selfRequest("/user", { customer }));
    expect(ended.status).toBe(401);
    for (let i = 0; i < 3; i += 1) {
      const failed = await rejected(selfRequest("/user", { customer }));
      expect(failed.code).toBe("error.network");
      expect(failed.message).not.toContain("secret");
    }
  });

  it("an empty answer is undefined, like a direct call", async () => {
    const { customer } = fakeCustomer({ data: null });
    await expect(selfRequest("/user", { customer })).resolves.toBeUndefined();
  });
});

describe("the adapters run through the customer session", () => {
  it("step-up", async () => {
    const { customer, calls } = fakeCustomer(
      { data: { enabled: true } },
      { data: { challengeId: 3 } },
    );
    const api = createHttpStepUpApi({ customer });

    await api.getConfig();
    await api.createChallenge({ action: "CHANGE_PASSWORD", channel: "EMAIL" });

    expect(calls.map((c) => c.resource)).toEqual(["stepup/config", "stepup/challenges"]);
    expect(calls[1].options.body).toEqual({ action: "CHANGE_PASSWORD", channel: "EMAIL" });
  });

  it("verify sends a recovery code as such", async () => {
    const { customer, calls } = fakeCustomer({ data: { stepUpToken: "T" } });
    await createHttpStepUpApi({ customer }).verify(5, "ABCDEFGHJK", "recovery");
    expect(calls[0].options.body).toEqual({ recoveryCode: "ABCDEFGHJK" });
  });

  it("activity", async () => {
    const { customer, calls } = fakeCustomer({ data: { totalFilteredRecords: 0, pageItems: [] } });
    await createHttpActivityApi({ customer }).list({ limit: 10, offset: 0 });
    expect(calls[0].resource).toBe("activity");
  });

  it("authenticator, with the step-up token only where it belongs", async () => {
    const { customer, calls } = fakeCustomer({}, {}, {});
    const api = createHttpAuthenticatorApi({ customer });

    await api.getStatus();
    await api.confirm("123456", "GRANT");
    await api.remove("GRANT-2");

    expect(calls.map((c) => c.resource)).toEqual([
      "stepup/totp",
      "stepup/totp/enrollment/confirm",
      "stepup/totp",
    ]);
    expect(calls[0].options.stepUpToken).toBeUndefined();
    expect(calls[1].options.stepUpToken).toBe("GRANT");
    expect(calls[2].options).toMatchObject({ method: "DELETE", stepUpToken: "GRANT-2" });
  });
});

// -------------------------------------------------------------------------------------------------
// the password change
// -------------------------------------------------------------------------------------------------

describe("password change", () => {
  it("is a PUT of the two passwords with the step-up token, and returns nothing", async () => {
    const { customer, calls } = fakeCustomer({ data: { changes: { password: true } } });

    await expect(
      createHttpPasswordApi({ customer }).change("New-pass-1", "New-pass-1", "GRANT"),
    ).resolves.toBeUndefined();

    expect(calls[0].resource).toBe("user");
    expect(calls[0].options).toMatchObject({
      method: "PUT",
      body: { password: "New-pass-1", repeatPassword: "New-pass-1" },
      stepUpToken: "GRANT",
    });
  });

  it("without a step-up token sends none", async () => {
    const { customer, calls } = fakeCustomer({});
    await createHttpPasswordApi({ customer }).change("a", "a");
    expect(calls[0].options.stepUpToken).toBeUndefined();
  });

  it.each([
    [
      "the passwords differ",
      {
        status: 400,
        data: body("validation.msg.validation.errors.exist", {}, [
          "validation.msg.selfservice.user.repeatPassword.do.not.match",
        ]),
      },
      "mismatch",
    ],
    [
      "the policy refuses it",
      { status: 400, data: body("error.msg.password.validation.policy.failed") },
      "policy",
    ],
    [
      "a validation error that is not a mismatch",
      {
        status: 400,
        data: body("validation.msg.validation.errors.exist", {}, [
          "validation.msg.x.password.blank",
        ]),
      },
      "policy",
    ],
    [
      "no verification",
      {
        status: 403,
        data: body("error.msg.selfservice.stepup.required", { action: "CHANGE_PASSWORD" }),
      },
      "stepup",
    ],
    [
      "a used or expired verification",
      { status: 403, data: body("error.msg.selfservice.stepup.invalid") },
      "stepup",
    ],
    [
      "no session for step-up",
      { status: 403, data: body("error.msg.selfservice.stepup.session.required") },
      "session",
    ],
    ["an ended session", { status: 401, data: {} }, "session"],
    ["a server error", { status: 500, data: body("error.http.500") }, "unknown"],
  ] as const)("maps %s to %s", async (_label, reply, expected) => {
    const { customer } = fakeCustomer(reply as Reply);
    const error = await rejected<PasswordError>(
      createHttpPasswordApi({ customer }).change("a", "a", "T"),
    );
    expect(error).toBeInstanceOf(PasswordError);
    expect(error.code).toBe(expected);
  });

  it("maps a network failure, and never carries the password or the server's text", async () => {
    const { customer } = fakeCustomer(new AuthenticationError("network"));
    const error = await rejected<PasswordError>(
      createHttpPasswordApi({ customer }).change("Secret-pass-9", "Secret-pass-9", "T"),
    );
    expect(error.code).toBe("network");
    expect(JSON.stringify(error)).not.toContain("Secret-pass-9");
    expect(error.message).not.toContain("Secret-pass-9");
  });

  it("tells offline, timeout and a restarting service apart", () => {
    const failed = (reason: string) =>
      toPasswordError(new SelfServiceError(0, "error.network", "x", { reason })).code;
    expect(failed("offline")).toBe("offline");
    expect(failed("timeout")).toBe("timeout");
    expect(failed("network")).toBe("network");
    expect(toPasswordError(new SelfServiceError(503, "error.http.503", "x")).code).toBe(
      "unavailable",
    );
    // HTTP 408 is a timeout as well
    expect(toPasswordError(new SelfServiceError(408, "error.http.408", "x")).code).toBe("timeout");
    expect(toPasswordError(new SelfServiceError(500, "error.http.500", "x")).code).toBe("unknown");
  });

  it("toPasswordError keeps its own errors and turns anything else into unknown", () => {
    const own = new PasswordError("policy");
    expect(toPasswordError(own)).toBe(own);
    expect(toPasswordError(new Error("boom")).code).toBe("unknown");
  });
});
