import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import enCatalog from "../../i18n/locales/en-US.json";
import esCatalog from "../../i18n/locales/es-MX.json";
import { SelfServiceError, clearSession, setSession } from "../selfservice";
import { ACTIVITY_TYPES, getActivity, type ActivityItem } from "../selfservice/activity";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_SOURCE_TEXTS,
  ActivityError,
  DEMO_MASKED_IP,
  createDemoActivityStore,
  createHttpActivityApi,
  describeActivity,
  formatActivityAmount,
  groupOf,
  parseActivityPage,
  recordDemoActivity,
  resetDemoActivity,
  selectActivityApi,
  toActivityError,
  useActivityFeed,
  type ActivityApi,
  type ActivityPage,
} from "./index";

const config = { baseUrl: "https://bank.example", apiPath: "/api", tenantId: "t1" };
const session = { accessKey: "KEY", username: "ana", userId: 1, clients: [] };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function item(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 1,
    type: "LOGIN",
    outcome: "SUCCESS",
    occurredAt: "2026-10-23T09:30:05",
    ipAddress: "203.0.x.x",
    details: {},
    ...overrides,
  };
}

afterEach(() => {
  clearSession();
  resetDemoActivity();
});

describe("activity client", () => {
  it("asks for the page, the offset and the types, with the session and the tenant", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ totalFilteredRecords: 0, pageItems: [] }));

    await getActivity(
      { limit: 10, offset: 20, types: ["LOGIN", "TRANSFER_CONFIRMED"] },
      { fetchImpl, config, session },
    );

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://bank.example/api/v1/self/activity?limit=10&offset=20&type=LOGIN%2CTRANSFER_CONFIRMED",
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Basic KEY");
    expect(headers["Fineract-Platform-TenantId"]).toBe("t1");
    expect(init.method ?? "GET").toBe("GET");
  });

  it("sends nothing but what was asked: no type means all, and never a user id", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ totalFilteredRecords: 0, pageItems: [] }));

    await getActivity({}, { fetchImpl, config, session });
    await getActivity({ types: [] }, { fetchImpl, config, session });

    for (const call of fetchImpl.mock.calls) {
      const url = (call as unknown as [string])[0];
      expect(url).toBe("https://bank.example/api/v1/self/activity");
      expect(url).not.toMatch(/user/i);
    }
  });

  it("knows every type the plugin can send", () => {
    expect(ACTIVITY_TYPES).toHaveLength(22);
    expect(new Set(ACTIVITY_TYPES).size).toBe(22);
  });
});

describe("http adapter", () => {
  it("returns the page of the server", async () => {
    const page: ActivityPage = { totalFilteredRecords: 1, pageItems: [item()] };
    const api = createHttpActivityApi({
      fetchImpl: vi.fn(async () => jsonResponse(page)),
      config,
      session,
    });

    expect(api.mode).toBe("backend");
    expect(await api.list({ limit: 5 })).toEqual(page);
  });

  it.each([
    [401, "session"],
    [403, "session"],
    [400, "invalid"],
    [500, "server"],
  ])("maps HTTP %i to %s without leaking the server text", async (status, code) => {
    const api = createHttpActivityApi({
      fetchImpl: vi.fn(async () =>
        jsonResponse({ defaultUserMessage: "stack trace SELECT *" }, status),
      ),
      config,
      session,
    });

    const error = await api.list().catch((e) => e);
    expect(error).toBeInstanceOf(ActivityError);
    expect(error.code).toBe(code);
    expect(error.message).not.toContain("SELECT");
  });

  it.each([
    ["an empty object", {}],
    ["a missing page", { totalFilteredRecords: 1 }],
    ["a page that is not a list", { totalFilteredRecords: 1, pageItems: "x" }],
    ["a negative total", { totalFilteredRecords: -1, pageItems: [] }],
    ["null", null],
    ["a list", []],
    [
      "an item without an id",
      { totalFilteredRecords: 1, pageItems: [{ ...item(), id: undefined }] },
    ],
    [
      "an item with an odd outcome",
      { totalFilteredRecords: 1, pageItems: [{ ...item(), outcome: "MAYBE" }] },
    ],
    [
      "an item without a time",
      { totalFilteredRecords: 1, pageItems: [{ ...item(), occurredAt: 5 }] },
    ],
    [
      "details that are not an object",
      { totalFilteredRecords: 1, pageItems: [{ ...item(), details: "x" }] },
    ],
    ["an item that is not an object", { totalFilteredRecords: 1, pageItems: [null] }],
  ])("refuses a successful answer with %s, before it reaches the screen", async (_label, body) => {
    const api = createHttpActivityApi({
      fetchImpl: vi.fn(async () => jsonResponse(body)),
      config,
      session,
    });

    const error = await api.list().catch((e) => e);

    expect(error).toBeInstanceOf(ActivityError);
    expect(error.code).toBe("invalid");
  });

  it("keeps an activity type of a newer server, fills in missing details and drops what it does not know", () => {
    const page = parseActivityPage({
      totalFilteredRecords: 2,
      pageItems: [
        { id: 2, type: "SOMETHING_NEW", outcome: "SUCCESS", occurredAt: "2026-10-23T10:00:00" },
        {
          ...item({ id: 1 }),
          details: { amount: "5.00", toName: "Luz", secret: "x", currency: 5, nested: { a: 1 } },
        },
      ],
    });

    expect(page.pageItems[0]).toMatchObject({
      type: "SOMETHING_NEW",
      ipAddress: null,
      details: {},
    });
    expect(page.pageItems[1].details).toEqual({ amount: "5.00", toName: "Luz" });
  });

  it("reports an unreachable server as a network error", async () => {
    const api = createHttpActivityApi({
      fetchImpl: vi.fn().mockRejectedValue(new TypeError("offline")),
      config,
      session,
    });

    expect(((await api.list().catch((e) => e)) as ActivityError).code).toBe("network");
  });

  it("words each kind of problem its own way, and never the text of the server", () => {
    const of = (status: number, reason?: string) =>
      toActivityError(
        new SelfServiceError(
          status,
          status === 0 ? "error.network" : `error.http.${status}`,
          "SECRET",
          {
            reason,
          },
        ),
      ).code;
    expect(of(0, "offline")).toBe("offline");
    expect(of(0, "timeout")).toBe("timeout");
    expect(of(0, "network")).toBe("network");
    expect(of(503)).toBe("unavailable");
    expect(of(502)).toBe("unavailable");
    expect(of(429)).toBe("rateLimited");
    expect(of(500)).toBe("server");
    expect(of(401)).toBe("session");
    expect(of(403)).toBe("session");
    expect(of(400)).toBe("invalid");
    expect(of(418)).toBe("unknown");
    expect(toActivityError(new SelfServiceError(503, "x", "SECRET")).message).not.toContain(
      "SECRET",
    );
  });

  it("maps anything else to unknown", () => {
    expect(toActivityError(new Error("x")).code).toBe("unknown");
    expect(toActivityError(new SelfServiceError(0, "error.network", "x")).code).toBe("network");
  });
});

describe("demo history", () => {
  const fixedNow = () => new Date("2026-10-23T12:00:00").getTime();

  it("starts with older entries so the screen is not empty, newest first, in the demo's masked IP", async () => {
    const page = await createDemoActivityStore(fixedNow).api.list();

    expect(page.totalFilteredRecords).toBe(5);
    const times = page.pageItems.map((entry) => entry.occurredAt);
    expect([...times].sort().reverse()).toEqual(times);
    expect(new Set(page.pageItems.map((entry) => entry.ipAddress))).toEqual(
      new Set([DEMO_MASKED_IP]),
    );
    expect(page.pageItems.some((entry) => entry.outcome === "FAILURE")).toBe(true);
  });

  it("shows what the demo user does, on top", async () => {
    const store = createDemoActivityStore(fixedNow);

    store.record("TRANSFER_CONFIRMED", { amount: "12.50", currency: "MXN", toName: "Ana" });

    const first = (await store.api.list()).pageItems[0];
    expect(first.type).toBe("TRANSFER_CONFIRMED");
    expect(first.details.amount).toBe("12.50");
    expect(first.occurredAt).toBe("2026-10-23T12:00:00");
  });

  it("filters by type and pages without overlap", async () => {
    const store = createDemoActivityStore(fixedNow);
    for (let i = 0; i < 25; i += 1) store.record("LOGIN");

    const logins = await store.api.list({ types: ["LOGIN"], limit: 10, offset: 0 });
    const more = await store.api.list({ types: ["LOGIN"], limit: 10, offset: 10 });

    expect(logins.totalFilteredRecords).toBe(26);
    expect(logins.pageItems.every((entry) => entry.type === "LOGIN")).toBe(true);
    const ids = [...logins.pageItems, ...more.pageItems].map((entry) => entry.id);
    expect(new Set(ids).size).toBe(20);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });

  it("caps the page size, and treats a bad offset or limit as the nearest valid one", async () => {
    const store = createDemoActivityStore(fixedNow);
    for (let i = 0; i < 150; i += 1) store.record("LOGIN");

    expect((await store.api.list({ limit: 100000 })).pageItems).toHaveLength(100);
    expect((await store.api.list({ limit: 0 })).pageItems).toHaveLength(1);
    expect((await store.api.list({ offset: -5, limit: 2 })).pageItems).toHaveLength(2);
  });

  it("keeps a bounded history", async () => {
    const store = createDemoActivityStore(fixedNow);
    for (let i = 0; i < 400; i += 1) store.record("LOGIN");

    expect((await store.api.list({ limit: 1 })).totalFilteredRecords).toBe(200);
  });

  it("forgets everything on reset and starts again", async () => {
    const store = createDemoActivityStore(fixedNow);
    store.record("LOGOUT");

    store.reset();

    const page = await store.api.list();
    expect(page.totalFilteredRecords).toBe(5);
    expect(page.pageItems.some((entry) => entry.type === "LOGOUT")).toBe(false);
  });

  it("never stores a full IP address", async () => {
    const page = await createDemoActivityStore(fixedNow).api.list();
    for (const entry of page.pageItems) expect(entry.ipAddress).toMatch(/^\d+\.\d+\.x\.x$/);
  });
});

describe("selectActivityApi", () => {
  it("uses the demo without a configured backend, even with a session", () => {
    vi.stubEnv("VITE_SELF_SERVICE_BASE_URL", "");
    setSession(session);
    expect(selectActivityApi().mode).toBe("demo");
  });

  it("uses the demo with a backend but without a session", () => {
    vi.stubEnv("VITE_SELF_SERVICE_BASE_URL", "https://bank.example");
    expect(selectActivityApi().mode).toBe("demo");
  });

  it("uses the server only with both a backend and a session", () => {
    vi.stubEnv("VITE_SELF_SERVICE_BASE_URL", "https://bank.example");
    setSession(session);
    expect(selectActivityApi().mode).toBe("backend");
  });

  it("shares one demo history, so recorded actions show up, and a new session starts clean", async () => {
    vi.stubEnv("VITE_SELF_SERVICE_BASE_URL", "");
    recordDemoActivity("BENEFICIARY_ADDED", { name: "Luz" });
    expect((await selectActivityApi().list()).pageItems[0].type).toBe("BENEFICIARY_ADDED");

    resetDemoActivity();

    expect((await selectActivityApi().list()).pageItems[0].type).not.toBe("BENEFICIARY_ADDED");
  });
});

describe("description of an activity", () => {
  it("every type belongs to exactly one filter group", () => {
    const grouped = Object.values(ACTIVITY_GROUPS).flat();
    expect([...grouped].sort()).toEqual([...ACTIVITY_TYPES].sort());
    for (const type of ACTIVITY_TYPES) expect(ACTIVITY_GROUPS[groupOf(type)]).toContain(type);
  });

  it("has a title in both languages for every type, with no placeholder left over", () => {
    for (const type of ACTIVITY_TYPES) {
      const entry = item({
        type,
        details: { name: "Luz", amount: "5", toName: "Luz", action: "TPT_TRANSFER" },
      });
      for (const locale of ["es-MX", "en-US"] as const) {
        const { title } = describeActivity(entry, locale);
        expect(title, `${type} ${locale}`).not.toMatch(/\{\w+\}/);
        expect(title.length).toBeGreaterThan(3);
      }
      expect(describeActivity(entry, "en-US").title, type).not.toBe(
        describeActivity(entry, "es-MX").title,
      );
    }
  });

  it("every Spanish text of the history is in both catalogs, and translated", () => {
    expect(ACTIVITY_SOURCE_TEXTS.length).toBeGreaterThanOrEqual(28);
    for (const text of ACTIVITY_SOURCE_TEXTS) {
      expect(esCatalog.messages, text).toHaveProperty([text], text);
      const english = (enCatalog.messages as Record<string, string>)[text];
      expect(english, text).toBeTruthy();
      expect(english, text).not.toBe(text);
    }
  });

  it("a transfer shows the amount, the destination and the last digits", () => {
    const entry = item({
      type: "TRANSFER_CONFIRMED",
      details: { amount: "1250.50", currency: "MXN", toName: "Luz Pérez", toAccountLast4: "0042" },
    });

    const spanish = describeActivity(entry, "es-MX");
    expect(spanish.title).toContain("$1,250.50");
    expect(spanish.title).toContain("Luz Pérez");
    expect(spanish.extra).toBe("Cuenta destino terminada en 0042");
    expect(describeActivity(entry, "en-US").title).toMatch(
      /Transfer of .*1,250\.50.* to Luz Pérez confirmed/,
    );
  });

  it("an amount without a currency is still shown, as a plain number", () => {
    expect(formatActivityAmount("12.5", undefined, "en-US")).toBe("12.50");
    expect(formatActivityAmount("12.5", "not-a-code", "en-US")).toBe("12.50");
    expect(formatActivityAmount("abc", "USD", "en-US")).toBe("abc");
  });

  it("says what a verification was for", () => {
    const entry = item({ type: "STEP_UP_VERIFIED", details: { action: "CHANGE_PASSWORD" } });

    expect(describeActivity(entry, "es-MX").extra).toBe("Para: Cambio de contraseña");
    expect(describeActivity(entry, "en-US").extra).toBe("For: Password change");
  });

  it("an unknown protected action is not shown", () => {
    const entry = item({ type: "STEP_UP_VERIFIED", details: { action: "SOMETHING_NEW" } });
    expect(describeActivity(entry, "es-MX").extra).toBeNull();
  });

  it("flags what is worth a second look", () => {
    expect(describeActivity(item({ type: "LOGIN" }), "es-MX").warning).toBe(false);
    expect(
      describeActivity(item({ type: "LOGIN_FAILED", outcome: "FAILURE" }), "es-MX").warning,
    ).toBe(true);
    expect(describeActivity(item({ type: "LOGIN_NEW_DEVICE" }), "es-MX").warning).toBe(true);
    expect(
      describeActivity(item({ type: "STEP_UP_LOCKED", outcome: "FAILURE" }), "es-MX").warning,
    ).toBe(true);
  });

  it("describes the authenticator app, and flags what the user did not do or must look at twice", () => {
    const titles = {
      AUTHENTICATOR_ENROLLED: "Vinculaste una app de autenticación",
      AUTHENTICATOR_REMOVED: "Quitaste tu app de autenticación",
      AUTHENTICATOR_RESET: "Tu institución quitó tu app de autenticación",
      AUTHENTICATOR_LOCKED: "App de autenticación bloqueada por demasiados intentos",
      RECOVERY_CODES_REGENERATED: "Generaste códigos de recuperación nuevos",
      RECOVERY_CODE_USED: "Usaste un código de recuperación",
    } as const;
    for (const [type, title] of Object.entries(titles)) {
      expect(describeActivity(item({ type: type as never }), "es-MX").title).toBe(title);
    }
    // what the user did on purpose is quiet; a staff reset, a lock-out and the emergency way in are not
    expect(describeActivity(item({ type: "AUTHENTICATOR_ENROLLED" }), "es-MX").warning).toBe(false);
    expect(describeActivity(item({ type: "AUTHENTICATOR_REMOVED" }), "es-MX").warning).toBe(false);
    expect(describeActivity(item({ type: "RECOVERY_CODES_REGENERATED" }), "es-MX").warning).toBe(
      false,
    );
    expect(describeActivity(item({ type: "AUTHENTICATOR_RESET" }), "es-MX").warning).toBe(true);
    expect(describeActivity(item({ type: "RECOVERY_CODE_USED" }), "es-MX").warning).toBe(true);
    expect(
      describeActivity(item({ type: "AUTHENTICATOR_LOCKED", outcome: "FAILURE" }), "es-MX").warning,
    ).toBe(true);
  });

  it("names the authenticator change when a verification was for it", () => {
    const entry = item({ type: "STEP_UP_VERIFIED", details: { action: "MANAGE_AUTHENTICATOR" } });
    expect(describeActivity(entry, "es-MX").extra).toBe("Para: Cambio de la app de autenticación");
    expect(describeActivity(entry, "en-US").extra).toBe("For: Authenticator app change");
  });

  it("the history filter groups the new types where a user would look for them", () => {
    expect(ACTIVITY_GROUPS.account).toContain("AUTHENTICATOR_ENROLLED");
    expect(ACTIVITY_GROUPS.account).toContain("RECOVERY_CODES_REGENERATED");
    expect(ACTIVITY_GROUPS.verification).toContain("AUTHENTICATOR_LOCKED");
    expect(ACTIVITY_GROUPS.verification).toContain("RECOVERY_CODE_USED");
  });

  it("an activity type from a newer server still gets a neutral title", () => {
    const entry = item({ type: "SOMETHING_NEW" as never });
    expect(describeActivity(entry, "es-MX").title).toBe("Actividad en tu cuenta");
  });
});

describe("useActivityFeed", () => {
  function fakeApi(pages: ActivityPage[]): ActivityApi & { list: ReturnType<typeof vi.fn> } {
    let call = 0;
    return {
      mode: "backend",
      list: vi.fn(async () => pages[Math.min(call++, pages.length - 1)]),
    };
  }

  const first: ActivityPage = {
    totalFilteredRecords: 3,
    pageItems: [item({ id: 3 }), item({ id: 2 })],
  };
  const second: ActivityPage = { totalFilteredRecords: 3, pageItems: [item({ id: 1 })] };

  it("loads the first page, then appends the next one", async () => {
    const api = fakeApi([first, second]);
    const { result } = renderHook(() => useActivityFeed(api, []));

    expect(result.current.phase).toBe("loading");
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.items.map((entry) => entry.id)).toEqual([3, 2]);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(3));

    expect(result.current.hasMore).toBe(false);
    expect(api.list).toHaveBeenLastCalledWith({ limit: 20, offset: 2, types: [] });
  });

  it("starts again from the first page when the filter changes", async () => {
    const api = fakeApi([first, second]);
    const { result, rerender } = renderHook(({ types }) => useActivityFeed(api, types), {
      initialProps: { types: [] as ("LOGIN" | "LOGOUT")[] },
    });
    await waitFor(() => expect(result.current.phase).toBe("ready"));

    rerender({ types: ["LOGIN"] });

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(api.list).toHaveBeenLastCalledWith({ limit: 20, offset: 0, types: ["LOGIN"] });
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.items.map((entry) => entry.id)).toEqual([1]);
  });

  it("ignores an answer that arrives after the filter changed", async () => {
    let resolveSlow: (page: ActivityPage) => void = () => {};
    const api: ActivityApi = {
      mode: "backend",
      list: vi
        .fn()
        .mockImplementationOnce(
          () => new Promise<ActivityPage>((resolve) => (resolveSlow = resolve)),
        )
        .mockResolvedValue(second),
    };
    const { result, rerender } = renderHook(({ types }) => useActivityFeed(api, types), {
      initialProps: { types: [] as "LOGIN"[] },
    });

    rerender({ types: ["LOGIN"] });
    await waitFor(() => expect(result.current.items.map((entry) => entry.id)).toEqual([1]));
    await act(async () => resolveSlow(first));

    expect(result.current.items.map((entry) => entry.id)).toEqual([1]);
  });

  it("reports an error with its code, and retry loads again", async () => {
    const api: ActivityApi = {
      mode: "backend",
      list: vi.fn().mockRejectedValueOnce(new ActivityError("network")).mockResolvedValue(first),
    };
    const { result } = renderHook(() => useActivityFeed(api, []));

    await waitFor(() => expect(result.current.phase).toBe("error"));
    expect(result.current.errorCode).toBe("network");

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.errorCode).toBeNull();
    expect(result.current.items).toHaveLength(2);
  });

  it("never hands out raw server errors", async () => {
    const api: ActivityApi = {
      mode: "backend",
      list: vi.fn().mockRejectedValue(new Error("SELECT *")),
    };
    const { result } = renderHook(() => useActivityFeed(api, []));

    await waitFor(() => expect(result.current.phase).toBe("error"));
    expect(result.current.errorCode).toBe("unknown");
  });

  it("does not load more while a page is loading or when there is nothing more", async () => {
    const api = fakeApi([{ totalFilteredRecords: 1, pageItems: [item()] }]);
    const { result } = renderHook(() => useActivityFeed(api, []));
    await waitFor(() => expect(result.current.phase).toBe("ready"));

    act(() => result.current.loadMore());

    expect(api.list).toHaveBeenCalledTimes(1);
  });
});
