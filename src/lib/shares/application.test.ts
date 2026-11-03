import { expect, it, vi } from "vitest";
import { createAuthenticationClient } from "../authentication/client";
import { parseSavingsAccounts } from "../accounts/client";
import {
  createShareApplicationClient,
  parseProducts,
  parseTerms,
  applicationPayload,
  eligibleSavings,
  requestedCount,
  priceOn,
} from "./application";
import {
  application,
  charge,
  clientId,
  discovery,
  login,
  productId,
  savingsAccount,
  template,
  values,
} from "../../../tests/fixtures/share-application";
const config = { baseUrl: "https://shares.invalid/api/v1/self", tenantId: "synthetic" };
async function setup(
  overrides: {
    post?: () => Promise<Response>;
    detail?: () => Response;
    template?: (selected: boolean) => unknown;
    discovery?: () => unknown;
  } = {},
) {
  const transport = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.split("/self/")[1];
    if (path === "authentication") return Response.json(login);
    if (path === "shareaccounts" && init?.method === "POST")
      return overrides.post ? overrides.post() : Response.json({ resourceId: 477 });
    if (path === "shareaccounts/template")
      return Response.json((overrides.template ?? template)(url.searchParams.has("productId")));
    if (path === `clients/${clientId}/accounts`)
      return Response.json((overrides.discovery ?? discovery)());
    if (path === "shareaccounts/477")
      return overrides.detail ? overrides.detail() : Response.json(application());
    throw new Error("Unexpected synthetic route");
  });
  const session = await createAuthenticationClient({
    configuration: async () => config,
    transport,
    retry: { policy: { retries: 0 } },
  }).login("synthetic", "synthetic");
  const client = createShareApplicationClient(session);
  await client.loadProducts(clientId);
  const terms = await client.loadTerms(clientId, productId);
  const posts = () =>
    transport.mock.calls.filter(
      ([, init]) =>
        init?.method === "POST" &&
        String(transport.mock.calls.find((c) => c[1] === init)?.[0]).endsWith("/shareaccounts"),
    );
  return { client, terms, transport, posts, session };
}
it("loads actual nested product options/defaults through authorized template endpoints", async () => {
  const { transport, client, terms } = await setup();
  expect(transport.mock.calls.slice(1).map((c) => String(c[0]))).toEqual([
    `${config.baseUrl}/shareaccounts/template?clientId=${clientId}`,
    `${config.baseUrl}/shareaccounts/template?clientId=${clientId}&productId=${productId}`,
  ]);
  expect(terms).toMatchObject({
    id: 6,
    minimum: 2,
    nominal: 10,
    maximum: 50,
    lockin: { count: 3, unit: 2 },
    charges: [{ id: 2, amount: "2.35" }],
  });
  for (const [, init] of transport.mock.calls.slice(1)) {
    expect(new Headers(init?.headers).get("Fineract-Platform-TenantId")).toBe("synthetic");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Basic ${login.base64EncodedAuthenticationKey}`,
    );
  }
  const before = transport.mock.calls.length;
  await expect(client.loadProducts(123)).rejects.toMatchObject({ code: "denied" });
  await expect(client.loadTerms(clientId, 999)).rejects.toMatchObject({ code: "denied" });
  await expect(client.savings(123)).rejects.toMatchObject({ code: "denied" });
  expect(transport).toHaveBeenCalledTimes(before);
});
it("allows an empty product list, rejects malformed and cross-client templates", () => {
  expect(parseProducts({ clientId, productOptions: [] }, clientId)).toEqual([]);
  for (const data of [
    null,
    {},
    { clientId },
    { clientId: 2, productOptions: [] },
    { clientId, productOptions: [{ id: 6 }] },
    {
      clientId,
      productOptions: [
        { id: 6, name: "P" },
        { id: 6, name: "Q" },
      ],
    },
  ])
    expect(() => parseProducts(data, clientId)).toThrow();
});
it.each([
  { unitPrice: undefined },
  { currency: undefined },
  { minimumShares: 5.5 },
  { maximumShares: 1 },
  { nominalShares: 100 },
  { marketPrice: [{ fromDate: [2026, 2, 30], shareValue: 1 }] },
  { marketPrice: [{ fromDate: [2026, 1, 1] }] },
  { charges: [charge({ active: false })] },
  { charges: [charge({ currency: { code: "USD" } })] },
  { charges: [charge({ chargeCalculationType: { id: 9 } })] },
  { charges: [charge({ chargeTimeType: { id: 2 } })] },
  { charges: [charge({ amount: 1234567890123456 })] },
  { charges: [charge(), charge()] },
  { minimumActivePeriodForDividendsTypeEnum: { id: 2 } },
  { lockPeriodTypeEnum: undefined },
])("fails closed on missing/invalid or unsupported product data %j", (override) => {
  expect(() => parseTerms(template(true, override), clientId, productId)).toThrow();
});
it("handles optional limits, periods and charges and uses the date's real price schedule", () => {
  const terms = parseTerms(
    template(true, {
      minimumShares: undefined,
      maximumShares: undefined,
      nominalShares: undefined,
      charges: undefined,
      lockinPeriod: undefined,
      minimumActivePeriod: undefined,
    }),
    clientId,
    productId,
  );
  expect(terms.minimum).toBeUndefined();
  expect(terms.charges).toEqual([]);
  expect(priceOn(terms, "2025-12-31")).toBe("0.1");
  expect(priceOn(terms, "2026-01-01")).toBe("10.25");
  const data = applicationPayload(terms, parseSavingsAccounts(discovery()), values);
  expect(data).not.toHaveProperty("charges");
  expect(data).not.toHaveProperty("lockinPeriodFrequency");
});
it.each([false, true])(
  "uses the latest applicable market price regardless of order (reversed: %s)",
  (reversed) => {
    const prices = [
      { fromDate: [2026, 1, 1], shareValue: 10.25 },
      { fromDate: [2025, 6, 1], shareValue: 8.5 },
      { fromDate: [2027, 1, 1], shareValue: 15 },
    ];
    const terms = parseTerms(
      template(true, { marketPrice: reversed ? prices.reverse() : prices }),
      clientId,
      productId,
    );
    expect(priceOn(terms, "2025-05-31")).toBe("0.1");
    expect(priceOn(terms, "2025-06-01")).toBe("8.5");
    expect(priceOn(terms, "2026-01-01")).toBe("10.25");
    expect(priceOn(terms, "2026-11-04")).toBe("10.25");
  },
);
it.each(["0", "-1", "1", "51", "1.5", "1e2", "NaN", "9007199254740992", "", " 10"])(
  "rejects unsupported share count %s",
  (value) => {
    const terms = parseTerms(template(true), clientId, productId);
    expect(() => requestedCount(value, terms)).toThrow();
  },
);
it("only selects active savings deposits in the selected client's currency", async () => {
  const { client, terms } = await setup();
  expect(eligibleSavings(await client.savings(clientId), terms).map((a) => a.id)).toEqual([5]);
  const accounts = parseSavingsAccounts({
    savingsAccounts: [
      savingsAccount({ depositType: { id: 200 } }),
      savingsAccount({ id: 6, depositType: { id: 400 } }),
    ],
  });
  expect(eligibleSavings(accounts, terms)).toEqual([]);
  expect(() => applicationPayload(terms, accounts, values)).toThrow();
  for (const savingsAccountId of ["7", "8", "999", "-5", "5.0"])
    expect(() =>
      applicationPayload(terms, parseSavingsAccounts(discovery()), { ...values, savingsAccountId }),
    ).toThrow();
  expect(() =>
    applicationPayload(terms, parseSavingsAccounts(discovery()), { ...values, date: "2026-02-30" }),
  ).toThrow();
});
it.each([
  { clientId: 123 },
  { clientId: 123, savingsAccounts: [savingsAccount()] },
  { savingsAccounts: [savingsAccount({ clientId: 123 })] },
])("rejects a cross-client discovery response before sending a write", async (mismatch) => {
  const { client, terms, posts } = await setup({ discovery: () => mismatch });
  await expect(client.submit(terms, values)).rejects.toMatchObject({ code: "malformed" });
  expect(posts()).toHaveLength(0);
});
it("posts only verified fields/default charges, uses ISO dates, then reads authorized confirmation", async () => {
  const { client, terms, posts, transport } = await setup();
  const result = await client.submit(terms, values);
  expect(result).toMatchObject({
    resourceId: 477,
    requested: 10,
    account: { accountNo: "SH-477", status: "pending", held: 0 },
  });
  expect(posts()).toHaveLength(1);
  expect(JSON.parse(posts()[0][1]!.body as string)).toEqual({
    clientId,
    productId,
    savingsAccountId: 5,
    requestedShares: 10,
    submittedDate: "2026-11-03",
    applicationDate: "2026-11-03",
    dateFormat: "yyyy-MM-dd",
    locale: "en",
    lockinPeriodFrequency: 3,
    lockinPeriodFrequencyType: "2",
    minimumActivePeriod: 30,
    minimumActivePeriodFrequencyType: "0",
    charges: [{ chargeId: 2, amount: "2.35" }],
  });
  expect(String(transport.mock.calls.at(-1)![0])).toBe(`${config.baseUrl}/shareaccounts/477`);
  expect(client.attempt(clientId)?.phase).toBe("confirmed");
  await expect(client.submit(terms, values)).rejects.toMatchObject({ code: "blocked" });
});
it.each([
  [100, "pending"],
  [200, "approved"],
  [300, "active"],
  [500, "rejected"],
  [999, "unknown"],
])("uses backend status %s without fabricating holdings", async (status, expected) => {
  const { client, terms } = await setup({
    detail: () => Response.json(application(status as number)),
  });
  expect((await client.submit(terms, values)).account?.status).toBe(expected);
});
it("supports percent product charges without applying every charge option or calculating fees", async () => {
  const { client, terms, posts } = await setup({
    template: (selected) =>
      template(selected, {
        charges: [
          charge({ chargeTimeType: { id: 14 }, chargeCalculationType: { id: 2 }, amount: 0.1 }),
        ],
      }),
  });
  await client.submit(terms, values);
  expect(JSON.parse(posts()[0][1]!.body as string).charges).toEqual([
    { chargeId: 2, amount: "0.1" },
  ]);
});
it("rechecks changed product terms and savings state before writing", async () => {
  let changed = false;
  const v = await setup({
    template: (selected) => template(selected, changed ? { unitPrice: 12 } : {}),
  });
  changed = true;
  await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "changed" });
  expect(v.client.attempt(clientId)).toBeUndefined();
  expect(v.posts()).toHaveLength(0);
  const a = await setup({ discovery: () => ({ savingsAccounts: [] }) });
  await expect(a.client.submit(a.terms, values)).rejects.toMatchObject({ code: "invalid" });
  expect(a.posts()).toHaveLength(0);
});
it("locks synchronously during preflight and in-flight POST, including concurrent callers", async () => {
  let release!: (r: Response) => void;
  const v = await setup({
    post: () =>
      new Promise((r) => {
        release = r;
      }),
  });
  const first = v.client.submit(v.terms, values);
  await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "blocked" });
  await vi.waitFor(() => expect(v.posts()).toHaveLength(1));
  await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "blocked" });
  release(Response.json({ resourceId: 477 }));
  await first;
  expect(v.posts()).toHaveLength(1);
});
it.each([400, 401, 403, 404, 409, 422])(
  "handles definitive HTTP %s rejection safely",
  async (status) => {
    const { client, terms, posts } = await setup({
      post: async () => Response.json({ errors: [{ developerMessage: "sensitive" }] }, { status }),
    });
    await expect(client.submit(terms, values)).rejects.toMatchObject({
      code: status === 401 ? "expired" : status === 403 ? "denied" : "rejected",
    });
    expect(client.attempt(clientId)).toBeUndefined();
    expect(posts()).toHaveLength(1);
  },
);
it.each([408, 429, 500, 502, 503])(
  "never retries or unlocks an ambiguous HTTP %s",
  async (status) => {
    const v = await setup({ post: async () => Response.json({}, { status }) });
    await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "uncertain" });
    expect(v.client.attempt(clientId)?.phase).toBe("uncertain");
    await v.client.refresh(clientId);
    await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "blocked" });
    expect(v.posts()).toHaveLength(1);
  },
);
it.each([
  {},
  { resourceId: "477" },
  { resourceId: -1 },
  { resourceId: 1.5 },
  { commandId: 12 },
  null,
])("never claims success for malformed create result %j", async (data) => {
  const v = await setup({ post: async () => Response.json(data) });
  await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "uncertain" });
  expect(v.client.attempt(clientId)?.result).toBeUndefined();
  expect(v.posts()).toHaveLength(1);
});
it("does not retry a lost network response and keeps the outcome blocked across read checks", async () => {
  const v = await setup({
    post: async () => {
      throw new TypeError("Synthetic lost response");
    },
  });
  await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "uncertain" });
  await v.client.refresh(clientId);
  await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "blocked" });
  expect(v.posts()).toHaveLength(1);
});
it("does not retry a timed-out POST", async () => {
  const transport = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
    if (String(url).endsWith("authentication")) return Response.json(login);
    if (String(url).includes("template"))
      return Response.json(template(String(url).includes("productId")));
    if (String(url).includes("/accounts")) return Response.json(discovery());
    return new Promise((_, reject) =>
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("Abort", "AbortError")),
      ),
    );
  });
  const session = await createAuthenticationClient({
    configuration: async () => config,
    transport,
    timeoutMs: 20,
  }).login("x", "x");
  const client = createShareApplicationClient(session);
  await client.loadProducts(clientId);
  const terms = await client.loadTerms(clientId, productId);
  await expect(client.submit(terms, values)).rejects.toMatchObject({ code: "uncertain" });
  expect(transport.mock.calls.filter((c) => String(c[0]).endsWith("/shareaccounts"))).toHaveLength(
    1,
  );
});
it.each([
  () => Response.json({}, { status: 503 }),
  () => Response.json(application(100, { clientId: 999 })),
  () => Response.json(application(100, { id: 999 })),
  () => Response.json(application(100, { productId: 999 })),
])(
  "preserves confirmed submission with unverified read-back, never exposing unrelated details",
  async (detail) => {
    const v = await setup({ detail });
    expect(await v.client.submit(v.terms, values)).toEqual({ resourceId: 477 });
    expect(v.client.attempt(clientId)?.phase).toBe("confirmed");
    await expect(v.client.submit(v.terms, values)).rejects.toMatchObject({ code: "blocked" });
  },
);
it("refreshes a confirmed read-back without sending a second POST", async () => {
  let unavailable = true;
  const v = await setup({
    detail: () =>
      unavailable ? Response.json({}, { status: 503 }) : Response.json(application(200)),
  });
  await v.client.submit(v.terms, values);
  unavailable = false;
  expect(await v.client.refresh(clientId)).toMatchObject({
    account: { status: "approved" },
    requested: 10,
  });
  expect(v.posts()).toHaveLength(1);
});
it("does not substitute held or pending summary shares for a missing original purchase quantity", async () => {
  const v = await setup({
    detail: () => Response.json(application(300, { purchasedShares: undefined })),
  });
  expect((await v.client.submit(v.terms, values)).requested).toBeUndefined();
});

it("preserves the optional product dividend default using the core request's string type", () => {
  const terms = parseTerms(
    template(true, { allowDividendCalculationForInactiveClients: true }),
    clientId,
    productId,
  );
  expect(
    applicationPayload(terms, parseSavingsAccounts(discovery()), values)
      .allowDividendCalculationForInactiveClients,
  ).toBe("true");
});
