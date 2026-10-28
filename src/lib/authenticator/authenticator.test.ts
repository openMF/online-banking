import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, verifyStepUpChallenge } from "../selfservice";
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  getTotpStatus,
  regenerateRecoveryCodes,
  removeTotp,
} from "../selfservice/totp";
import { createDemoStepUpApi, createHttpStepUpApi, StepUpError } from "../stepup";
import {
  createDemoAuthenticatorStore,
  createHttpAuthenticatorApi,
  normalizeRecoveryCode,
  resetDemoAuthenticator,
  selectAuthenticatorApi,
  type DemoAuthenticatorEvent,
} from "./index";

const config = { baseUrl: "https://bank.example", apiPath: "/api", tenantId: "t1" };
const session = { accessKey: "KEY", username: "ana", userId: 1, clients: [] };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

/** A fetch that answers `responses` in order and remembers what was asked. */
function fakeFetch(...responses: Response[]) {
  const calls: Call[] = [];
  const impl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return responses.shift() ?? jsonResponse({}, 500);
  });
  return { impl: impl as unknown as typeof fetch, calls };
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

/** Bytes that differ on every call, so secrets and recovery codes are distinct but repeatable. */
function counting() {
  let counter = 0;
  return (length: number) => {
    counter += 1;
    return Uint8Array.from({ length }, (_, index) => (index * 31 + counter * 17 + 5) % 251);
  };
}

async function activeStore(options: Parameters<typeof createDemoAuthenticatorStore>[0] = {}) {
  const events: DemoAuthenticatorEvent[] = [];
  const store = createDemoAuthenticatorStore({
    random: counting(),
    onEvent: (event) => events.push(event),
    ...options,
  });
  await store.api.begin();
  const { recoveryCodes } = await store.api.confirm(store.appCode);
  events.length = 0;
  return { store, recoveryCodes, events };
}

afterEach(() => {
  clearSession();
  resetDemoAuthenticator();
});

// -------------------------------------------------------------------------------------------------
// the typed client of the endpoints
// -------------------------------------------------------------------------------------------------

describe("authenticator endpoints", () => {
  it("reads the status of the caller", async () => {
    const { impl, calls } = fakeFetch(
      jsonResponse({
        available: true,
        status: "ACTIVE",
        recoveryCodesRemaining: 8,
        exclusive: true,
        confirmedAt: "2026-10-28T12:00:00",
      }),
    );

    const status = await getTotpStatus({ fetchImpl: impl, config, session });

    expect(status.status).toBe("ACTIVE");
    expect(calls[0].url).toMatch(/\/stepup\/totp$/);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].headers.Authorization).toBeDefined();
    expect(calls[0].headers["Fineract-Platform-TenantId"]).toBe("t1");
  });

  it("starts the pairing with a POST and no user id", async () => {
    const { impl, calls } = fakeFetch(
      jsonResponse(
        {
          secret: "JBSWY3DP",
          otpauthUri: "otpauth://totp/x",
          issuer: "Mifos",
          digits: 6,
          periodSeconds: 30,
        },
        201,
      ),
    );

    const enrollment = await beginTotpEnrollment({ fetchImpl: impl, config, session });

    expect(enrollment.secret).toBe("JBSWY3DP");
    expect(calls[0].url).toMatch(/\/stepup\/totp\/enrollment$/);
    expect(calls[0].method).toBe("POST");
    expect(JSON.stringify(calls[0].body)).not.toMatch(/user/i);
  });

  it("confirms with the code and sends the step-up token only when there is one", async () => {
    const { impl, calls } = fakeFetch(
      jsonResponse({ recoveryCodes: ["ABCDE-FGHJK"] }),
      jsonResponse({ recoveryCodes: ["ABCDE-FGHJK"] }),
    );

    await confirmTotpEnrollment("123456", {
      fetchImpl: impl,
      config,
      session,
      stepUpToken: "ONE-TIME-TOKEN",
    });
    await confirmTotpEnrollment("123456", { fetchImpl: impl, config, session });

    expect(calls[0].url).toMatch(/\/stepup\/totp\/enrollment\/confirm$/);
    expect(calls[0].body).toEqual({ code: "123456" });
    expect(calls[0].headers["X-Step-Up-Token"]).toBe("ONE-TIME-TOKEN");
    expect(calls[1].headers["X-Step-Up-Token"]).toBeUndefined();
  });

  it("asks for new recovery codes and for the removal with the step-up token", async () => {
    const { impl, calls } = fakeFetch(
      jsonResponse({ recoveryCodes: ["ABCDE-FGHJK"] }),
      jsonResponse({ removed: true }),
    );

    await regenerateRecoveryCodes({ fetchImpl: impl, config, session, stepUpToken: "T1" });
    await removeTotp({ fetchImpl: impl, config, session, stepUpToken: "T2" });

    expect(calls[0].url).toMatch(/\/stepup\/totp\/recovery-codes$/);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers["X-Step-Up-Token"]).toBe("T1");
    expect(calls[1].url).toMatch(/\/stepup\/totp$/);
    expect(calls[1].method).toBe("DELETE");
    expect(calls[1].headers["X-Step-Up-Token"]).toBe("T2");
  });

  it("sends a recovery code as recoveryCode and a normal code as otp", async () => {
    const { impl, calls } = fakeFetch(
      jsonResponse({ stepUpToken: "T", action: "CHANGE_PASSWORD", expiresAt: "x" }),
      jsonResponse({ stepUpToken: "T", action: "CHANGE_PASSWORD", expiresAt: "x" }),
    );

    await verifyStepUpChallenge(7, "ABCDEFGHJK", {
      fetchImpl: impl,
      config,
      session,
      kind: "recovery",
    });
    await verifyStepUpChallenge(7, "123456", { fetchImpl: impl, config, session });

    expect(calls[0].url).toMatch(/\/stepup\/challenges\/7\/verify$/);
    expect(calls[0].body).toEqual({ recoveryCode: "ABCDEFGHJK" });
    expect(calls[1].body).toEqual({ otp: "123456" });
  });

  it("the step-up adapter passes the kind of code on", async () => {
    const { impl, calls } = fakeFetch(
      jsonResponse({ stepUpToken: "T", action: "CHANGE_PASSWORD", expiresAt: "x" }),
    );
    const api = createHttpStepUpApi({ fetchImpl: impl, config, session });

    await api.verify(3, "ABCDEFGHJK", "recovery");

    expect(calls[0].body).toEqual({ recoveryCode: "ABCDEFGHJK" });
  });
});

describe("http adapter", () => {
  it("is the real backend and has no demo hint", () => {
    const api = createHttpAuthenticatorApi({ fetchImpl: fakeFetch().impl, config, session });
    expect(api.mode).toBe("backend");
    expect(api.demoHint).toBeUndefined();
  });

  it("turns the server's answers into step-up errors, without leaking server text", async () => {
    const { impl } = fakeFetch(
      jsonResponse(
        {
          userMessageGlobalisationCode: "error.msg.selfservice.stepup.totp.already.enrolled",
          defaultUserMessage: "internal text",
        },
        409,
      ),
      jsonResponse(
        {
          userMessageGlobalisationCode: "error.msg.selfservice.stepup.locked",
          retryAfterSeconds: 900,
        },
        429,
      ),
      jsonResponse(
        {
          userMessageGlobalisationCode: "error.msg.selfservice.stepup.otp.invalid",
          attemptsRemaining: 4,
        },
        400,
      ),
      jsonResponse(
        { userMessageGlobalisationCode: "error.http.500", defaultUserMessage: "stack" },
        500,
      ),
    );
    const api = createHttpAuthenticatorApi({ fetchImpl: impl, config, session });

    const enrolled = await rejection(api.begin());
    const locked = await rejection(api.confirm("123456"));
    const invalid = await rejection(api.confirm("000000"));
    const unknown = await rejection(api.getStatus());

    expect(enrolled.code).toBe("totp.already.enrolled");
    expect(enrolled.message).not.toContain("internal");
    expect(locked.code).toBe("locked");
    expect(locked.retryAfterSeconds).toBe(900);
    expect(invalid.code).toBe("otp.invalid");
    expect(invalid.attemptsRemaining).toBe(4);
    expect(unknown.code).toBe("unknown");
    expect(unknown.message).not.toContain("stack");
  });

  it("reports a network failure", async () => {
    const failing = vi.fn(async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    const api = createHttpAuthenticatorApi({ fetchImpl: failing, config, session });
    expect((await rejection(api.getStatus())).code).toBe("network");
  });

  it("removes without returning anything", async () => {
    const { impl } = fakeFetch(jsonResponse({ removed: true }));
    const api = createHttpAuthenticatorApi({ fetchImpl: impl, config, session });
    await expect(api.remove("T")).resolves.toBeUndefined();
  });
});

describe("selectAuthenticatorApi", () => {
  it("uses the demo without a session", () => {
    expect(selectAuthenticatorApi().mode).toBe("demo");
  });

  it("keeps one demo authenticator for the whole page", () => {
    expect(selectAuthenticatorApi()).toBe(selectAuthenticatorApi());
  });
});

// -------------------------------------------------------------------------------------------------
// the demo stand-in
// -------------------------------------------------------------------------------------------------

describe("demo authenticator", () => {
  it("starts with nothing and says it is a demo", async () => {
    const store = createDemoAuthenticatorStore();
    expect(store.api.mode).toBe("demo");
    expect(store.api.demoHint).toBe(store.appCode);
    expect(await store.api.getStatus()).toEqual({
      available: true,
      status: "NONE",
      recoveryCodesRemaining: 0,
      exclusive: true,
      confirmedAt: null,
    });
    expect(store.isActive()).toBe(false);
  });

  it("pairing: a secret as text and as an otpauth URI, pending until a code of the app is given", async () => {
    const store = createDemoAuthenticatorStore({ random: counting() });

    const enrollment = await store.api.begin();

    expect(enrollment.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(enrollment.otpauthUri).toContain(`secret=${enrollment.secret}`);
    expect(enrollment.otpauthUri.startsWith("otpauth://totp/")).toBe(true);
    expect(enrollment.digits).toBe(6);
    expect(enrollment.periodSeconds).toBe(30);
    expect((await store.api.getStatus()).status).toBe("PENDING");
    expect(store.isActive()).toBe(false);
  });

  it("a confirm without a pairing, or with a wrong code, does not activate it", async () => {
    const store = createDemoAuthenticatorStore({ random: counting() });
    expect((await rejection(store.api.confirm(store.appCode))).code).toBe(
      "totp.enrollment.missing",
    );

    await store.api.begin();
    const wrong = await rejection(store.api.confirm("000000"));
    expect(wrong.code).toBe("otp.invalid");
    expect(wrong.attemptsRemaining).toBe(4);
    expect(store.isActive()).toBe(false);
  });

  it("five wrong codes lock it, and then even the right code is refused", async () => {
    let now = 1_000_000;
    const store = createDemoAuthenticatorStore({ random: counting(), now: () => now });
    await store.api.begin();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect((await rejection(store.api.confirm("000000"))).code).toBe("otp.invalid");
    }

    const locked = await rejection(store.api.confirm("000000"));
    expect(locked.code).toBe("locked");
    expect(locked.retryAfterSeconds).toBe(900);

    const still = await rejection(store.api.confirm(store.appCode));
    expect(still.code).toBe("locked");
    expect(store.lockedSeconds()).toBeGreaterThan(0);

    now += 901_000;
    expect(store.lockedSeconds()).toBe(0);
    await expect(store.api.confirm(store.appCode)).resolves.toBeDefined();
  });

  it("the right code activates it and hands out ten recovery codes once", async () => {
    const { store, recoveryCodes, events } = await activeStore();

    expect(store.isActive()).toBe(true);
    expect(recoveryCodes).toHaveLength(10);
    expect(new Set(recoveryCodes).size).toBe(10);
    recoveryCodes.forEach((code) => expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/));
    const status = await store.api.getStatus();
    expect(status.status).toBe("ACTIVE");
    expect(status.recoveryCodesRemaining).toBe(10);
    expect(status.confirmedAt).not.toBeNull();
    expect(events).toEqual([]); // cleared after setup: ENROLLED was emitted while pairing
  });

  it("pairing publishes ENROLLED", async () => {
    const events: DemoAuthenticatorEvent[] = [];
    const store = createDemoAuthenticatorStore({
      random: counting(),
      onEvent: (e) => events.push(e),
    });
    await store.api.begin();
    await store.api.confirm(store.appCode);
    expect(events).toEqual(["ENROLLED"]);
  });

  it("a second pairing is refused while one is active, and a confirm after that too", async () => {
    const { store } = await activeStore();
    expect((await rejection(store.api.begin())).code).toBe("totp.already.enrolled");
    expect((await rejection(store.api.confirm(store.appCode))).code).toBe("totp.already.enrolled");
  });

  it("a pending pairing can be started again and replaces the secret", async () => {
    const store = createDemoAuthenticatorStore({ random: counting() });
    const first = await store.api.begin();
    const second = await store.api.begin();
    expect(second.secret).not.toBe(first.secret);
  });

  it("the code of the app is checked, and wrong ones count towards the lock-out", async () => {
    const { store } = await activeStore();
    expect(store.checkAppCode(store.appCode)).toBe("ok");
    expect(store.checkAppCode("000000")).toBe("wrong");
    for (let attempt = 0; attempt < 3; attempt += 1) store.checkAppCode("000000");
    expect(store.checkAppCode("000000")).toBe("locked");
    expect(store.checkAppCode(store.appCode)).toBe("locked");
  });

  it("a recovery code works once, in any spelling", async () => {
    const { store, recoveryCodes, events } = await activeStore();
    const [first, second] = recoveryCodes;

    expect(store.useRecoveryCode(first.toLowerCase())).toBe(true);
    expect(store.useRecoveryCode(first)).toBe(false);
    expect(store.useRecoveryCode(second.replace("-", " "))).toBe(true);
    expect(events).toEqual(["RECOVERY_CODE_USED", "RECOVERY_CODE_USED"]);
    expect((await store.api.getStatus()).recoveryCodesRemaining).toBe(8);
  });

  it("an unknown recovery code is refused and counted", async () => {
    const { store } = await activeStore();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(store.useRecoveryCode("ZZZZZ-ZZZZZ")).toBe(false);
    }
    expect(store.lockedSeconds()).toBeGreaterThan(0);
  });

  it("new recovery codes replace the old ones", async () => {
    const { store, recoveryCodes, events } = await activeStore();

    const fresh = await store.api.newRecoveryCodes();

    expect(fresh.recoveryCodes).toHaveLength(10);
    expect(fresh.recoveryCodes).not.toContain(recoveryCodes[0]);
    expect(store.useRecoveryCode(recoveryCodes[0])).toBe(false);
    expect(store.useRecoveryCode(fresh.recoveryCodes[0])).toBe(true);
    expect(events[0]).toBe("RECOVERY_CODES_REGENERATED");
  });

  it("new recovery codes need an active authenticator", async () => {
    const store = createDemoAuthenticatorStore({ random: counting() });
    expect((await rejection(store.api.newRecoveryCodes())).code).toBe("totp.not.enrolled");
  });

  it("removing it forgets the recovery codes and publishes REMOVED", async () => {
    const { store, recoveryCodes, events } = await activeStore();

    await store.api.remove();

    expect(store.isActive()).toBe(false);
    expect((await store.api.getStatus()).status).toBe("NONE");
    expect(store.useRecoveryCode(recoveryCodes[0])).toBe(false);
    expect(events).toEqual(["REMOVED"]);
  });

  it("cancelling a pairing that was never confirmed leaves no trace in the history", async () => {
    const events: DemoAuthenticatorEvent[] = [];
    const store = createDemoAuthenticatorStore({
      random: counting(),
      onEvent: (e) => events.push(e),
    });
    await store.api.begin();
    await store.api.remove();
    expect(events).toEqual([]);
    expect((await rejection(store.api.remove())).code).toBe("totp.not.enrolled");
  });
});

describe("normalizeRecoveryCode", () => {
  it("ignores case, dashes and spaces", () => {
    expect(normalizeRecoveryCode(" abcde-fghjk ")).toBe("ABCDEFGHJK");
    expect(normalizeRecoveryCode("ABCDE FGHJK")).toBe("ABCDEFGHJK");
  });
});

// -------------------------------------------------------------------------------------------------
// the demo step-up with an authenticator
// -------------------------------------------------------------------------------------------------

describe("demo step-up with the authenticator", () => {
  it("offers only the e-mail code until an authenticator is active", async () => {
    const store = createDemoAuthenticatorStore({ random: counting() });
    const stepUp = createDemoStepUpApi({ authenticator: store });

    expect((await stepUp.getConfig()).availableChannels).toEqual(["EMAIL"]);
    expect((await stepUp.getConfig()).protectedActions).toContain("MANAGE_AUTHENTICATOR");
    expect(stepUp.demoAppHint).toBe(store.appCode);
  });

  it("offers only the authenticator once one is active (SIM-swap protection)", async () => {
    const { store } = await activeStore();
    const stepUp = createDemoStepUpApi({ authenticator: store });

    expect((await stepUp.getConfig()).availableChannels).toEqual(["TOTP"]);
    const refused = await rejection(
      stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "EMAIL" }),
    );
    expect(refused.code).toBe("channel.unavailable");
  });

  it("a TOTP challenge has no destination and cannot be resent", async () => {
    const { store } = await activeStore();
    const stepUp = createDemoStepUpApi({ authenticator: store });

    const challenge = await stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "TOTP" });

    expect(challenge.channel).toBe("TOTP");
    expect(challenge.maskedDestination).toBeNull();
    expect(challenge.resendsRemaining).toBe(0);
    expect((await rejection(stepUp.resend(challenge.challengeId))).code).toBe("resend.unsupported");
  });

  it("the code of the app gives the token, a wrong one does not", async () => {
    const { store } = await activeStore();
    const stepUp = createDemoStepUpApi({ authenticator: store });
    const challenge = await stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "TOTP" });

    const wrong = await rejection(stepUp.verify(challenge.challengeId, "000000"));
    expect(wrong.code).toBe("otp.invalid");

    const grant = await stepUp.verify(challenge.challengeId, store.appCode);
    expect(grant.stepUpToken).toMatch(/^demo-/);
    expect(grant.action).toBe("CHANGE_PASSWORD");
  });

  it("an e-mail code is not accepted on the authenticator challenge", async () => {
    const { store } = await activeStore();
    const stepUp = createDemoStepUpApi({ authenticator: store, code: "246810" });
    const challenge = await stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "TOTP" });
    expect((await rejection(stepUp.verify(challenge.challengeId, "246810"))).code).toBe(
      "otp.invalid",
    );
  });

  it("a recovery code works once on the authenticator challenge", async () => {
    const { store, recoveryCodes } = await activeStore();
    const stepUp = createDemoStepUpApi({ authenticator: store });

    const first = await stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "TOTP" });
    const grant = await stepUp.verify(first.challengeId, recoveryCodes[0], "recovery");
    expect(grant.stepUpToken).toMatch(/^demo-/);

    const second = await stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "TOTP" });
    const reused = await rejection(stepUp.verify(second.challengeId, recoveryCodes[0], "recovery"));
    expect(reused.code).toBe("otp.invalid");
  });

  it("a recovery code is not accepted instead of the e-mail code", async () => {
    const store = createDemoAuthenticatorStore({ random: counting() });
    const stepUp = createDemoStepUpApi({ authenticator: store });
    const challenge = await stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "EMAIL" });
    const refused = await rejection(stepUp.verify(challenge.challengeId, "ABCDEFGHJK", "recovery"));
    expect(refused.code).toBe("otp.invalid");
  });

  it("when the authenticator locks, the verification is locked and no new challenge opens", async () => {
    const { store } = await activeStore();
    const stepUp = createDemoStepUpApi({ authenticator: store });
    const challenge = await stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "TOTP" });

    let last: StepUpError | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      last = await rejection(stepUp.verify(challenge.challengeId, "000000"));
    }
    expect(last?.code).toBe("locked");

    expect((await rejection(stepUp.verify(challenge.challengeId, store.appCode))).code).toBe(
      "locked",
    );
    expect(
      (await rejection(stepUp.createChallenge({ action: "CHANGE_PASSWORD", channel: "TOTP" })))
        .code,
    ).toBe("locked");
  });

  it("without an authenticator the e-mail flow is exactly as before", async () => {
    const stepUp = createDemoStepUpApi({ code: "123456" });
    expect((await stepUp.getConfig()).availableChannels).toEqual(["EMAIL"]);
    const challenge = await stepUp.createChallenge({ action: "TPT_TRANSFER", channel: "EMAIL" });
    expect(challenge.maskedDestination).not.toBeNull();
    expect((await stepUp.verify(challenge.challengeId, "123456")).stepUpToken).toMatch(/^demo-/);
  });
});
