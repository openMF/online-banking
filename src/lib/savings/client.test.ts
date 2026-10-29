import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { createSavingsClient, parseAccount, parseTemplate, validDate } from "./client";
import { account, clientId, login, productId, template } from "../../../tests/fixtures/savings";

function setup() {
  const request = vi
    .fn<CustomerSession["request"]>()
    .mockImplementation(async (resource, options) => ({
      status: 200,
      ok: true,
      data:
        resource === "savingsaccounts/template"
          ? template(Boolean(options.query?.productId))
          : resource === "savingsaccounts"
            ? { resourceId: 469, savingsId: 469 }
            : account(),
    }));
  const session: CustomerSession = {
    identity: login,
    expiresAt: Date.now() + 900000,
    logout: vi.fn(),
    request,
  };
  return { request, session, client: createSavingsClient(session) };
}
async function ready() {
  const context = setup();
  await context.client.loadTemplate(clientId);
  await context.client.loadTemplate(clientId, productId);
  return context;
}
afterEach(() => vi.useRealTimers());
describe("SavingsAccountData adapter", () => {
  it("reads real product choices and product-specific defaults without fabricating dates", () => {
    expect(parseTemplate(template(), clientId)).toMatchObject({
      products: [{ id: productId, name: "Synthetic Flexible Savings" }],
      submittedOnDate: "",
    });
    expect(parseTemplate(template(true), clientId, productId)).toMatchObject({
      currency: { code: "MXN", decimalPlaces: 2 },
      rate: 3.5,
      openingBalance: 100,
      submittedOnDate: "2026-10-27",
    });
  });
  it("accepts an empty product list", () =>
    expect(parseTemplate({ ...template(), productOptions: [] }, clientId).products).toEqual([]));
  it.each([
    null,
    [],
    {},
    { ...template(), clientId: 9 },
    { ...template(), productOptions: [{}] },
    { ...template(), productOptions: [template().productOptions[0], template().productOptions[0]] },
    { ...template(true), nominalAnnualInterestRate: "3.5" },
    { ...template(true), timeline: { submittedOnDate: [2026, 2, 30] } },
    { ...template(true), currency: { code: "bad", decimalPlaces: 2 } },
  ])("rejects malformed templates %#", (data) => {
    expect(() => parseTemplate(data, clientId)).toThrow();
  });
  it("rejects product substitution and extra datatable requirements", () => {
    expect(() => parseTemplate(template(true), clientId, 99)).toThrow("invalid");
    expect(() =>
      parseTemplate({ ...template(true), datatables: [{}] }, clientId, productId),
    ).toThrow("unsupported");
  });
  it("adapts product charge schedules and rejects missing mandatory dates", () => {
    const charge = {
      chargeId: 19,
      amountOrPercentage: 25,
      chargeTimeType: { id: 6 },
      feeOnMonthDay: [10, 27],
    };
    expect(
      parseTemplate({ ...template(true), charges: [charge] }, clientId, productId).charges,
    ).toEqual([{ chargeId: 19, amount: 25, feeOnMonthDay: "10-27" }]);
    expect(() =>
      parseTemplate(
        { ...template(true), charges: [{ ...charge, feeOnMonthDay: undefined }] },
        clientId,
        productId,
      ),
    ).toThrow("unsupported");
  });
  it.each(["2026-02-30", "", "27/10/2026", "2026-1-1"])(
    "rejects invalid calendar date %s",
    (value) => expect(validDate(value)).toBe(false),
  );
  it.each(["submitted.and.pending.approval", "approved", "active", "rejected"])(
    "preserves backend %s state and actual account number",
    (state) => {
      expect(parseAccount(account(state), clientId, 469, productId)).toMatchObject({
        accountNo: "SYN-00000469",
        status: { code: `savingsAccountStatusType.${state}` },
      });
    },
  );
  it("never substitutes a resource ID for a missing account number or status", () => {
    expect(
      parseAccount({ ...account(), accountNo: undefined, status: undefined }, clientId),
    ).toMatchObject({ id: 469, accountNo: undefined, status: undefined });
  });
  it.each([
    { ...account(), clientId: 9 },
    { ...account(), id: "469" },
    { ...account(), status: {} },
    { ...account(), savingsProductId: 99 },
  ])("rejects malformed or mismatched details %#", (data) =>
    expect(() => parseAccount(data, clientId, 469, productId)).toThrow("malformed"),
  );
});
describe("authenticated savings workflow", () => {
  it("loads both templates with mapped client context, submits the minimal contract, then reads actual details", async () => {
    const { client, request } = await ready();
    expect(request.mock.calls[0]).toEqual([
      "savingsaccounts/template",
      { method: "GET", body: undefined, signal: undefined, query: { clientId } },
    ]);
    const result = await client.submit(clientId, productId, "2026-10-27");
    expect(result.account?.accountNo).toBe("SYN-00000469");
    expect(request.mock.calls[3]).toEqual([
      "savingsaccounts",
      {
        method: "POST",
        body: {
          clientId,
          productId,
          submittedOnDate: "2026-10-27",
          dateFormat: "yyyy-MM-dd",
          locale: "en",
        },
        signal: undefined,
        query: undefined,
      },
    ]);
    expect(request.mock.calls[4][0]).toBe("savingsaccounts/469");
  });
  it("does not request arbitrary client or product identities", async () => {
    const { client, request } = setup();
    await expect(client.loadTemplate(1)).rejects.toMatchObject({ code: "denied" });
    await expect(client.submit(1, productId, "2026-10-27")).rejects.toMatchObject({
      code: "denied",
    });
    await expect(client.loadTemplate(clientId, 99)).rejects.toMatchObject({ code: "invalid" });
    expect(request).not.toHaveBeenCalled();
  });
  it("requires template selection and a valid submission date", async () => {
    const { client, request } = setup();
    await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(client.submit(clientId, productId, "2026-02-30")).rejects.toMatchObject({
      fields: ["submittedOnDate"],
    });
    expect(request).not.toHaveBeenCalled();
  });
  it("holds its duplicate guard across preflight, POST, read-back and subsequent attempts", async () => {
    const { client, request } = await ready();
    const first = client.submit(clientId, productId, "2026-10-27");
    await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
      code: "locked",
    });
    await first;
    await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
      code: "locked",
    });
    expect(request.mock.calls.filter(([, options]) => options.method === "POST")).toHaveLength(1);
  });
  it("revalidates changing product defaults without posting", async () => {
    const { client, request } = await ready();
    request.mockResolvedValueOnce({
      status: 200,
      ok: true,
      data: { ...template(true), nominalAnnualInterestRate: 4 },
    });
    await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
      code: "changed",
    });
    expect(client.locked).toBe(false);
    expect(request.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
  });
  it.each([401, 403, 404])(
    "handles protected HTTP %s without reading someone else's details",
    async (status) => {
      const { client, request } = await ready();
      request.mockResolvedValueOnce({ status, ok: false, data: { secret: "never-display" } });
      await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
        code: status === 401 ? "expired" : "denied",
      });
      expect(request).toHaveBeenCalledTimes(3);
    },
  );
  it("maps backend validation to allowlisted field names without private server text", async () => {
    const { client, request } = await ready();
    request.mockResolvedValueOnce({ status: 200, ok: true, data: template(true) });
    request.mockResolvedValueOnce({
      status: 400,
      ok: false,
      data: {
        developerMessage: "secret",
        errors: [
          { parameterName: "productId", defaultUserMessage: "secret" },
          { parameterName: "secret" },
        ],
      },
    });
    await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
      code: "invalid",
      fields: ["productId"],
      message: "invalid",
    });
    expect(client.locked).toBe(false);
  });
  it.each(["timeout", "network", "500", "malformed"])(
    "treats %s after dispatch as uncertain and recovers only via GET",
    async (scenario) => {
      const { client, request } = await ready();
      request.mockResolvedValueOnce({ status: 200, ok: true, data: template(true) });
      if (scenario === "timeout" || scenario === "network")
        request.mockRejectedValueOnce(new AuthenticationError(scenario));
      else
        request.mockResolvedValueOnce({
          status: scenario === "500" ? 500 : 200,
          ok: scenario !== "500",
          data: { secret: "never-display" },
        });
      await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
        code: "uncertain",
      });
      await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
        code: "locked",
      });
      request.mockResolvedValueOnce({ status: 200, ok: true, data: { savingsAccounts: [] } });
      expect(await client.recover()).toEqual([]);
      expect(request.mock.calls.at(-1)?.[0]).toBe(`clients/${clientId}/accounts`);
      expect(client.result).toBeUndefined();
    },
  );
  it('a read that fails offline says so, and a write never says "try again"', async () => {
    const { client, request } = setup();
    request.mockRejectedValueOnce(new AuthenticationError("offline"));
    await expect(client.loadTemplate(clientId)).rejects.toMatchObject({ code: "offline" });

    request.mockRejectedValueOnce(new AuthenticationError("network"));
    await expect(client.loadTemplate(clientId)).rejects.toMatchObject({ code: "unavailable" });

    const ready2 = await ready();
    ready2.request.mockResolvedValueOnce({ status: 200, ok: true, data: template(true) });
    ready2.request.mockRejectedValueOnce(new AuthenticationError("offline"));
    await expect(ready2.client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
      code: "uncertain",
    });
  });
  it("retains a successful creation when read-back fails and retries only that read", async () => {
    const { client, request } = await ready();
    request.mockResolvedValueOnce({ status: 200, ok: true, data: template(true) });
    request.mockResolvedValueOnce({ status: 200, ok: true, data: { resourceId: 469 } });
    request.mockRejectedValueOnce(new Error("private error"));
    expect(await client.submit(clientId, productId, "2026-10-27")).toEqual({ resourceId: 469 });
    expect((await client.recover())[0].accountNo).toBe("SYN-00000469");
    expect(request.mock.calls.filter(([, options]) => options.method === "POST")).toHaveLength(1);
  });
  it("clears the protected UI on an expired read-back session", async () => {
    const { client, request } = await ready();
    request.mockResolvedValueOnce({ status: 200, ok: true, data: template(true) });
    request.mockResolvedValueOnce({ status: 200, ok: true, data: { resourceId: 469 } });
    request.mockResolvedValueOnce({ status: 401, ok: false, data: null });
    await expect(client.submit(clientId, productId, "2026-10-27")).rejects.toMatchObject({
      code: "expired",
    });
  });
  it("does not log customer information or server error payloads", async () => {
    const spies = ["log", "warn", "error", "info", "debug"].map((method) =>
      vi.spyOn(console, method as "log"),
    );
    const { client } = await ready();
    await client.submit(clientId, productId, "2026-10-27");
    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});

it("preserves product charges in the POST without sending display metadata", async () => {
  const { client, request } = await ready();
  const chargedTemplate = {
    ...template(true),
    charges: [
      {
        chargeId: 19,
        name: "Synthetic annual fee",
        amountOrPercentage: 25,
        chargeTimeType: { id: 6 },
        chargeCalculationType: { id: 1 },
        feeOnMonthDay: [10, 27],
      },
    ],
  };
  request.mockResolvedValueOnce({ status: 200, ok: true, data: chargedTemplate });
  const selected = await client.loadTemplate(clientId, productId);
  expect(selected.chargeTerms).toEqual([
    { name: "Synthetic annual fee", amount: 25, percent: false },
  ]);
  request.mockResolvedValueOnce({ status: 200, ok: true, data: chargedTemplate });
  await client.submit(clientId, productId, "2026-10-27");
  const body = request.mock.calls.find(([, options]) => options.method === "POST")?.[1].body;
  expect(body).toEqual({
    clientId,
    productId,
    submittedOnDate: "2026-10-27",
    locale: "en",
    dateFormat: "yyyy-MM-dd",
    monthDayFormat: "MM-dd",
    charges: [{ chargeId: 19, amount: 25, feeOnMonthDay: "10-27" }],
  });
});
