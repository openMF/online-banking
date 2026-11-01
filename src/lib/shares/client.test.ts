import { expect, it, vi } from "vitest";
import { createAuthenticationClient } from "../authentication/client";
import { createShareClient, decimal, formatMoney, parseShare, valueAtPrice } from "./client";
import { share, discovery, login, clientId } from "../../../tests/fixtures/shares";
const config = { baseUrl: "https://shares.invalid/api/v1/self", tenantId: "synthetic" };
async function setup(options: { status?: number; data?: unknown } = {}) {
  const transport = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const path = String(url);
    const auth = path.endsWith("authentication");
    return new Response(
      JSON.stringify(
        auth
          ? login
          : path.endsWith("/accounts")
            ? discovery()
            : (options.data ?? share({ id: Number(path.split("/").pop()) })),
      ),
      { status: auth || path.endsWith("/accounts") ? 200 : (options.status ?? 200) },
    );
  });
  const session = await createAuthenticationClient({
    configuration: async () => config,
    transport,
    retry: { policy: { retries: 0 } },
  }).login("synthetic", "synthetic");
  return { client: createShareClient(session), session, transport };
}
it("uses the pinned authenticated tenant and correct read-only routes; enriches summaries", async () => {
  const { client, transport } = await setup();
  const list = await client.list(clientId);
  expect(list).toHaveLength(2);
  expect(list[0]).toMatchObject({ held: 7, pending: 2, value: "71.75" });
  await client.detail(clientId, 476);
  expect(transport.mock.calls.slice(1).map((c) => String(c[0]))).toEqual([
    `${config.baseUrl}/clients/${clientId}/accounts`,
    `${config.baseUrl}/shareaccounts/476`,
    `${config.baseUrl}/shareaccounts/477`,
    `${config.baseUrl}/shareaccounts/476`,
  ]);
  for (const call of transport.mock.calls.slice(1)) {
    expect(call[1]?.method).toBe("GET");
    expect(new Headers(call[1]?.headers).get("Fineract-Platform-TenantId")).toBe("synthetic");
    expect(new Headers(call[1]?.headers).get("Authorization")).toBe(
      `Basic ${login.base64EncodedAuthenticationKey}`,
    );
  }
});
it.each([
  [100, 0],
  [200, 0],
  [300, 7],
  [500, 0],
  [600, 7],
  [999, undefined],
])("maps status %s without confusing pending/approved with issued holdings", (id, held) => {
  expect(parseShare(share({ status: { id }, requestedShares: 999 }), clientId, 476).held).toBe(
    held,
  );
});
it("preserves zero, missing fields and dividends; never invents amounts", () => {
  expect(
    parseShare(share({ summary: { totalApprovedShares: 0 }, dividends: [] }), clientId, 476),
  ).toMatchObject({ held: 0, value: "0.00", dividends: [] });
  const result = parseShare(
    share({ summary: undefined, currentMarketPrice: undefined, dividends: undefined }),
    clientId,
    476,
  );
  expect(result.held).toBeUndefined();
  expect(result.value).toBeUndefined();
  expect(result.dividends).toBeUndefined();
  expect(parseShare(share(), clientId, 476).dividends?.map((d) => d.status)).toEqual([
    "posted",
    "initiated",
  ]);
  expect(
    parseShare(share({ dividends: [{ id: 1, amount: 10, status: { id: 300 } }] }), clientId, 476)
      .dividends?.[0].status,
  ).toBe("unknown");
});
it("uses exact decimal multiplication and currency precision without combining currencies", () => {
  expect(valueAtPrice(3, decimal(0.1))).toBe("0.3");
  expect(valueAtPrice(9007199254740991, "0.123456789")).toBe("1111999897873515.775537899");
  expect(formatMoney("0.3", { code: "MXN", decimalPlaces: 2 }, "en-US")).toBe("0.30 MXN");
  expect(formatMoney("0.123456", { code: "ZZZ", decimalPlaces: 2 }, "en-US")).toBe("0.123456 ZZZ");
  expect(decimal(1234567890123456)).toBeUndefined();
  expect(decimal(1e-21)).toBe("0.000000000000000000001");
  expect(parseShare(share({ currency: undefined }), clientId, 476).value).toBeUndefined();
});
it.each([
  { id: -1 },
  { clientId: clientId + 1 },
  { summary: { totalApprovedShares: -1 } },
  { currency: { code: "MXN", decimalPlaces: -1 } },
  { dividends: {} },
  { dividends: [{ id: 1, postedDate: [2026, 2, 30] }] },
])("rejects malformed or cross-client records %j", (data) => {
  expect(() => parseShare(share(data), clientId, 476)).toThrow();
});
it.each([401, 403, 404, 500])("normalizes detail HTTP %s", async (status) => {
  const { client } = await setup({ status });
  await expect(client.detail(clientId, 476)).rejects.toMatchObject({
    code: { 401: "expired", 403: "denied", 404: "missing", 500: "unavailable" }[status],
  });
});
it("keeps partial summaries but propagates auth failure", async () => {
  expect((await (await setup({ status: 500 })).client.list(clientId))[0].detailUnavailable).toBe(
    true,
  );
  await expect((await setup({ status: 401 })).client.list(clientId)).rejects.toMatchObject({
    code: "expired",
  });
});
it("rejects invalid IDs and unauthorized clients before requests and prevents reads after logout", async () => {
  const { client, transport, session } = await setup();
  for (const id of [0, -1, 1.2, NaN])
    await expect(client.detail(clientId, id)).rejects.toMatchObject({ code: "denied" });
  await expect(client.list(clientId + 100)).rejects.toMatchObject({ code: "denied" });
  expect(transport).toHaveBeenCalledTimes(1);
  await session.logout();
  const calls = transport.mock.calls.length;
  await expect(client.list(clientId)).rejects.toMatchObject({ code: "expired" });
  expect(transport).toHaveBeenCalledTimes(calls);
});
it("supports empty/omitted collections, rejects malformed collections and honors cancellation", async () => {
  const { session, client, transport } = await setup();
  for (const data of [{ shareAccounts: [] }, {}, { loanAccounts: [] }]) {
    transport.mockResolvedValueOnce(new Response(JSON.stringify(data)));
    expect(await client.list(clientId)).toEqual([]);
  }
  transport.mockResolvedValueOnce(new Response('{"shareAccounts":{}}'));
  await expect(client.list(clientId)).rejects.toMatchObject({ code: "malformed" });
  const controller = new AbortController();
  controller.abort();
  await expect(client.list(clientId, controller.signal)).rejects.toMatchObject({
    code: "cancelled",
  });
  const multi = createShareClient({
    ...session,
    identity: { ...session.identity, clients: [clientId, 999] },
  });
  transport.mockResolvedValueOnce(new Response('{"shareAccounts":[]}'));
  await multi.list(999);
  expect(String(transport.mock.calls.at(-1)?.[0])).toContain("clients/999/accounts");
});
it("discards a response when aborted in flight and normalizes network failures", async () => {
  const { client, transport } = await setup();
  const controller = new AbortController();
  let resolve!: (r: Response) => void;
  transport.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const request = client.detail(clientId, 476, controller.signal);
  controller.abort();
  resolve(new Response(JSON.stringify(share())));
  await expect(request).rejects.toMatchObject({ code: "cancelled" });
  transport.mockRejectedValueOnce(new Error("private backend diagnostic"));
  await expect(client.detail(clientId, 476)).rejects.toMatchObject({ message: "unavailable" });
});
it("rejects duplicate discovery IDs and mismatched detail IDs", async () => {
  const { client, transport } = await setup();
  transport.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        shareAccounts: [discovery().shareAccounts[0], discovery().shareAccounts[0]],
      }),
    ),
  );
  await expect(client.list(clientId)).rejects.toMatchObject({ code: "malformed" });
  transport.mockResolvedValueOnce(new Response(JSON.stringify(share({ id: 477 }))));
  await expect(client.detail(clientId, 476)).rejects.toMatchObject({ code: "malformed" });
});

it.each([
  [0, "0"],
  [1e-6, "0.000001"],
  [1e-7, "0.0000001"],
  [1.25e-7, "0.000000125"],
  [1e-21, "0.000000000000000000001"],
  [Number.MIN_VALUE, `0.${"0".repeat(323)}5`],
  [1.23456789012345e-7, "0.000000123456789012345"],
  [1.234567890123456e-7, undefined],
  [1e21, undefined],
  [Number.MAX_VALUE, undefined],
  [-1e-7, undefined],
  [Infinity, undefined],
  [NaN, undefined],
])("expands exponent-form decimals before checking precision: %s", (input, expected) => {
  expect(decimal(input)).toBe(expected);
});
it("keeps small exponent-form prices available through parsing, valuation and display", () => {
  const account = parseShare(share({ currentMarketPrice: 1e-7 }), clientId, 476);
  expect(account.unitPrice).toBe("0.0000001");
  expect(account.value).toBe("0.0000007");
  expect(formatMoney(account.value, account.currency, "en-US")).toBe("0.0000007 MXN");
});
it.each([clientId + 1, null, "wrong-client"])(
  "rejects discovery clientId %s before detail enrichment or summary fallback",
  async (foreignClient) => {
    const { client, transport } = await setup({ status: 500 });
    transport.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          shareAccounts: [{ ...discovery().shareAccounts[0], clientId: foreignClient }],
        }),
      ),
    );
    await expect(client.list(clientId)).rejects.toMatchObject({ code: "malformed" });
    expect(transport).toHaveBeenCalledTimes(2); // Login and discovery only.
  },
);
it.each([true, false])(
  "accepts discovery summaries with matching or omitted clientId (present: %s)",
  async (present) => {
    const { client, transport } = await setup({ status: 500 });
    const summary: Record<string, unknown> = { ...discovery().shareAccounts[0] };
    if (!present) delete summary.clientId;
    transport.mockResolvedValueOnce(new Response(JSON.stringify({ shareAccounts: [summary] })));
    expect(await client.list(clientId)).toMatchObject([{ id: 476, detailUnavailable: true }]);
    expect(transport).toHaveBeenCalledTimes(3);
  },
);
it("continues to require clientId in account details", () => {
  const detail = share();
  const { clientId: _client, ...withoutClient } = detail;
  expect(() => parseShare(withoutClient, clientId, 476)).toThrow();
});
