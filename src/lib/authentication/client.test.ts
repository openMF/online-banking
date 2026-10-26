import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthenticationClient } from "./client";

const config = {
  baseUrl: "https://bank.invalid/fineract-provider/api/v1/self",
  tenantId: "synthetic-tenant",
};
const key = btoa("00000000-0000-4000-8000-000000000001");
const success = () => ({
  authenticated: true,
  username: "server-identity",
  userId: 42,
  base64EncodedAuthenticationKey: key,
  refreshToken: "discard-this-refresh-secret",
  roles: [{ id: 3, name: "Customer", description: "unnecessary" }],
  permissions: ["READ_CLIENT"],
  clients: [81],
  shouldRenewPassword: false,
  isTwoFactorAuthenticationRequired: false,
});
function fake(data: unknown = success(), status = 200) {
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(data), { status }));
  const configuration = vi.fn(async () => config);
  return {
    transport,
    configuration,
    client: createAuthenticationClient({ configuration, transport }),
  };
}
afterEach(() => vi.useRealTimers());

describe("customer authentication", () => {
  it("awaits runtime configuration and sends JSON credentials with the configured URL and tenant", async () => {
    let resolve!: (value: typeof config) => void;
    const configuration = vi.fn(
      () =>
        new Promise<typeof config>((done) => {
          resolve = done;
        }),
    );
    const { transport } = fake();
    const login = createAuthenticationClient({ configuration, transport, now: () => 100 }).login(
      "synthetic-user",
      "synthetic-pass",
    );
    expect(transport).not.toHaveBeenCalled();
    resolve(config);
    const session = await login;
    expect(String(transport.mock.calls[0][0])).toBe(`${config.baseUrl}/authentication`);
    expect(transport.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ username: "synthetic-user", password: "synthetic-pass" }),
      headers: {
        "Content-Type": "application/json",
        "Fineract-Platform-TenantId": config.tenantId,
      },
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    expect(transport.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
    expect(session.identity).toEqual({
      username: "server-identity",
      userId: 42,
      roles: [{ id: 3, name: "Customer" }],
      permissions: ["READ_CLIENT"],
      clients: [81],
    });
    expect(session.expiresAt).toBe(900100);
    expect(JSON.stringify(session)).not.toMatch(/discard-this|base64|synthetic-pass|accessKey/);
    expect(Object.isFrozen(session.identity.permissions)).toBe(true);
  });

  it.each([
    [401, "invalidCredentials"],
    [403, "denied"],
    [500, "server"],
    [429, "server"],
  ])("rejects HTTP %s with a safe error", async (status, code) => {
    const { client } = fake(
      { developerMessage: "SECRET stack trace password token" },
      status as number,
    );
    await expect(client.login("user", "pass")).rejects.toMatchObject({ code, message: code });
  });

  it("rejects HTTP 200 authenticated=false even with a token and onboarding identity", async () => {
    const { client } = fake({
      ...success(),
      authenticated: false,
      onboarding: { onboardingComplete: false },
    });
    await expect(client.login("user", "pass")).rejects.toMatchObject({ code: "pending" });
  });

  it.each([
    null,
    {},
    [],
    "success",
    { ...success(), authenticated: "true" },
    { ...success(), userId: null },
    { ...success(), userId: -1 },
    { ...success(), username: "" },
    { ...success(), permissions: [1] },
    { ...success(), permissions: undefined },
    { ...success(), roles: [{}] },
    { ...success(), clients: ["81"] },
    { ...success(), base64EncodedAuthenticationKey: "bad\r\nheader" },
    { ...success(), base64EncodedAuthenticationKey: btoa("username:password") },
    { ...success(), base64EncodedAuthenticationKey: "" },
    { ...success(), shouldRenewPassword: undefined },
    { ...success(), isTwoFactorAuthenticationRequired: undefined },
    { ...success(), isTwoFactorAuthenticationRequired: "false" },
  ])("rejects malformed response %#", async (data) => {
    await expect(fake(data).client.login("user", "pass")).rejects.toMatchObject({
      code: "malformed",
    });
  });

  it.each([200, 403])(
    "blocks password renewal and additional authentication on HTTP %s",
    async (status) => {
      await expect(
        fake({ ...success(), shouldRenewPassword: true }, status).client.login("user", "pass"),
      ).rejects.toMatchObject({ code: "passwordRenewal" });
      await expect(
        fake({ ...success(), isTwoFactorAuthenticationRequired: true }, status).client.login(
          "user",
          "pass",
        ),
      ).rejects.toMatchObject({ code: "additional" });
    },
  );

  it("rejects HTML/invalid JSON instead of granting access", async () => {
    const { client, transport } = fake();
    transport.mockResolvedValue(new Response("<html>private error</html>"));
    await expect(client.login("user", "pass")).rejects.toMatchObject({ code: "malformed" });
  });

  it("maps network failures without exposing their content", async () => {
    const { client, transport } = fake();
    transport.mockRejectedValue(new Error("SECRET offline detail"));
    await expect(client.login("user", "pass")).rejects.toMatchObject({
      code: "network",
      message: "network",
    });
  });

  it("bounds login and logout requests with a timeout", async () => {
    vi.useFakeTimers();
    const { transport, configuration } = fake();
    const client = createAuthenticationClient({ configuration, transport, timeoutMs: 50 });
    const session = await client.login("user", "pass");
    transport.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const assertion = expect(client.login("user", "pass")).rejects.toMatchObject({
      code: "timeout",
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    const logout = session.logout();
    await vi.advanceTimersByTimeAsync(50);
    expect(await logout).toBe(false);
  });

  it("cancels an in-flight login and rejects a pre-aborted submission", async () => {
    const { transport, configuration } = fake();
    transport.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new Error("abort")));
        }),
    );
    const controller = new AbortController();
    const client = createAuthenticationClient({ configuration, transport });
    const result = client.login("user", "pass", controller.signal);
    await vi.waitFor(() => expect(transport).toHaveBeenCalledOnce());
    controller.abort();
    await expect(result).rejects.toMatchObject({ code: "cancelled" });
    await expect(client.login("user", "pass", controller.signal)).rejects.toMatchObject({
      code: "cancelled",
    });
    expect(transport).toHaveBeenCalledOnce();
  });

  it.each(["missing", "disabled", "invalid tenant"])(
    "makes no request if configuration is %s",
    async () => {
      const { transport } = fake();
      const client = createAuthenticationClient({
        configuration: async () => {
          throw new Error("config details");
        },
        transport,
      });
      await expect(client.login("user", "pass")).rejects.toMatchObject({ code: "configuration" });
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it("rejects blank credentials before contacting the backend", async () => {
    const { client, transport } = fake();
    await expect(client.login(" ", "pass")).rejects.toMatchObject({ code: "invalidCredentials" });
    await expect(client.login("user", " ")).rejects.toMatchObject({ code: "invalidCredentials" });
    expect(transport).not.toHaveBeenCalled();
  });

  it("uses the verified Basic token convention for logout and does not retain/refresh tokens", async () => {
    const { client, transport } = fake();
    const session = await client.login("user", "pass");
    transport.mockResolvedValue(new Response(JSON.stringify({ status: "success" })));
    const first = session.logout();
    expect(session.logout()).toBe(first);
    expect(await first).toBe(true);
    expect(String(transport.mock.calls[1][0])).toBe(`${config.baseUrl}/authentication/logout`);
    expect(transport.mock.calls[1][1]).toMatchObject({
      headers: { Authorization: `Basic ${key}`, "Fineract-Platform-TenantId": config.tenantId },
      body: "{}",
    });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("reports unconfirmed server logout on failure", async () => {
    const { client, transport } = fake();
    const session = await client.login("user", "pass");
    transport.mockRejectedValue(new Error("offline"));
    expect(await session.logout()).toBe(false);
    expect(await session.logout()).toBe(false);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("never logs credentials, tokens or backend response bodies", async () => {
    const spies = ["log", "warn", "error", "debug", "info"].map((name) =>
      vi.spyOn(console, name as "log"),
    );
    await fake().client.login("secret-user", "secret-password");
    await expect(
      fake({ developerMessage: "secret-response" }, 500).client.login("user", "pass"),
    ).rejects.toThrow();
    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
