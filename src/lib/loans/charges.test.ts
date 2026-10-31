import { expect, it, vi } from "vitest";
import {
  createAuthenticationClient,
  AuthenticationError,
  type CustomerSession,
} from "../authentication/client";
import { createLoanChargesClient, parseLoanCharges } from "./charges";
import { charge, charges } from "../../../tests/fixtures/charges";
import { loan, login } from "../../../tests/fixtures/loans";
const config = { baseUrl: "https://bank.invalid/api/v1/self", tenantId: "synthetic-tenant" };
async function setup(data: unknown = charges(), status = 200) {
  const transport = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const path = String(url);
    return new Response(
      JSON.stringify(
        path.endsWith("authentication") ? login : path.endsWith("/charges") ? data : loan(),
      ),
      { status: path.endsWith("/charges") ? status : 200 },
    );
  });
  const session = await createAuthenticationClient({
    configuration: async () => config,
    transport,
    retry: { policy: { retries: 0 } },
  }).login("synthetic", "synthetic");
  return { transport, session, client: createLoanChargesClient(session) };
}
it("reads the actual array and allowlists values, preserving decimals and optional fields", () => {
  const parsed = parseLoanCharges(charges());
  expect(parsed.map((c) => c.status)).toEqual(["unpaid", "paid", "partial", "waived"]);
  expect(parsed[0]).toMatchObject({
    id: 1,
    name: "Synthetic unpaid fee",
    amount: 100.25,
    outstanding: 100.25,
    currency: "MXN",
    dueDate: "2026-11-05",
  });
  expect(parsed[0]).not.toHaveProperty("chargeId");
  expect(parsed[3].dueDate).toBeUndefined();
  expect(parseLoanCharges([])).toEqual([]);
  expect(parseLoanCharges([{ id: 1, name: "Minimal" }])[0]).toMatchObject({
    status: "unknown",
    amount: undefined,
    outstanding: undefined,
    currency: undefined,
  });
  expect(
    parseLoanCharges([
      charge({ amount: 0.1, currency: { code: "USD" } }),
      charge({ id: 2, amount: 0.2, currency: { code: "JPY" } }),
    ]).map((c) => c.amount),
  ).toEqual([0.1, 0.2]);
});
it.each([
  { paid: true, amountOutstanding: 0, amountPaid: 25 },
  { amountPaid: 200 },
  { paid: undefined },
  { waived: undefined },
  { paid: true, waived: true },
  { amountOutstanding: 0 },
  { paid: true, amountOutstanding: 10 },
  { paid: true, amountOutstanding: 0, amountWrittenOff: 100.25 },
  { waived: true, amountOutstanding: 5 },
  { amountPaid: 5, amountOutstanding: undefined },
])("does not guess status from missing/conflicting data %j", (fields) => {
  expect(parseLoanCharges([charge(fields)])[0].status).toBe("unknown");
});
it.each([
  null,
  {},
  { charges: [] },
  [null],
  [charge(), charge()],
  [charge({ id: "1" })],
  [charge({ name: "" })],
  [charge({ paid: "false" })],
  [charge({ amount: -1 })],
  [charge({ amount: NaN })],
  [charge({ amount: Infinity })],
  [charge({ amount: 1e-21 })],
  [charge({ amount: Number.MAX_SAFE_INTEGER })],
  [charge({ amountOutstanding: "10" })],
  [charge({ currency: { code: "bad currency" } })],
  [charge({ currency: { decimalPlaces: -1 } })],
  [charge({ dueDate: [2026, 2, 30] })],
])("rejects malformed response %j", (data) =>
  expect(() => parseLoanCharges(data)).toThrow("malformed"),
);
it("uses the existing configured tenant, memory credential, numeric route and GET only", async () => {
  const { transport, client } = await setup();
  expect(await client.list(473)).toHaveLength(4);
  const [url, options] = transport.mock.calls[2];
  expect(String(url)).toBe(`${config.baseUrl}/loans/473/charges`);
  expect(options).toMatchObject({
    method: "GET",
    credentials: "omit",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${login.base64EncodedAuthenticationKey}`,
      "Fineract-Platform-TenantId": config.tenantId,
    },
  });
  expect(transport.mock.calls.slice(1).every(([, o]) => o?.method === "GET")).toBe(true);
});
it.each([
  [401, "expired"],
  [403, "denied"],
  [404, "missing"],
  [500, "unavailable"],
])("handles HTTP %s safely", async (status, code) => {
  const { client } = await setup({ developerMessage: "SECRET" }, Number(status));
  await expect(client.list(473)).rejects.toMatchObject({ code, message: code });
});
it("distinguishes empty from malformed responses", async () => {
  expect(await (await setup([])).client.list(473)).toEqual([]);
  await expect((await setup({})).client.list(473)).rejects.toMatchObject({ code: "malformed" });
});
it("rejects invalid identifiers before dispatch", async () => {
  const { client, transport } = await setup();
  for (const id of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1])
    await expect(client.list(id)).rejects.toMatchObject({ code: "denied" });
  expect(transport).toHaveBeenCalledTimes(1);
});
it("blocks unlinked or mismatched loan detail before fetching charges", async () => {
  for (const data of [{ ...loan(), clientId: 999 }, { ...loan(), id: 999 }, {}]) {
    const request = vi
      .fn<CustomerSession["request"]>()
      .mockResolvedValue({ data, ok: true, status: 200 });
    const client = createLoanChargesClient({
      identity: login,
      request,
      expiresAt: Date.now() + 10000,
      logout: vi.fn(),
    });
    await expect(client.list(473)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  }
});
it("handles network failure and cancellation without exposing transport errors", async () => {
  const { session } = await setup();
  for (const error of [new TypeError("SECRET"), new AuthenticationError("cancelled")]) {
    const client = createLoanChargesClient({
      ...session,
      request: vi.fn().mockRejectedValue(error),
    });
    await expect(client.list(473)).rejects.toMatchObject({
      code: error instanceof AuthenticationError ? "cancelled" : "unavailable",
    });
  }
  const controller = new AbortController();
  controller.abort();
  await expect(createLoanChargesClient(session).list(473, controller.signal)).rejects.toMatchObject(
    { code: "cancelled" },
  );
});
it("cannot read without a live session credential after logout", async () => {
  const { client, session, transport } = await setup();
  await session.logout();
  const count = transport.mock.calls.length;
  await expect(client.list(473)).rejects.toMatchObject({ code: "expired" });
  expect(transport).toHaveBeenCalledTimes(count);
});
it("passes cancellation to the real session transport and cancels an in-flight GET", async () => {
  const { client, transport } = await setup();
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  transport.mockImplementationOnce(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
        started();
      }),
  );
  const controller = new AbortController();
  const result = client.list(473, controller.signal);
  await ready;
  controller.abort();
  await expect(result).rejects.toMatchObject({ code: "cancelled" });
  expect(transport).toHaveBeenCalledTimes(2);
});
