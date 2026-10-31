import { expect, it, vi } from "vitest";
import {
  createAuthenticationClient,
  AuthenticationError,
  type CustomerSession,
} from "../authentication/client";
import {
  createGuarantorClient,
  parseGuarantors,
  selectGuarantor,
  guarantorTypeLabel,
} from "./guarantors";
import { loan, login } from "../../../tests/fixtures/loans";
import { guarantors } from "../../../tests/fixtures/guarantors";

function setup() {
  const request = vi.fn<CustomerSession["request"]>().mockImplementation(async (path) => ({
    status: 200,
    ok: true,
    data: path === "loans/473" ? loan() : guarantors,
  }));
  const session: CustomerSession = {
    identity: login,
    request,
    expiresAt: Date.now() + 900000,
    logout: vi.fn(),
  };
  return { request, client: createGuarantorClient(session) };
}
it("rechecks loan ownership before requesting the exact collection, forwarding cancellation", async () => {
  const s = setup(),
    controller = new AbortController();
  expect(await s.client.list(473, controller.signal)).toHaveLength(2);
  expect(s.request.mock.calls).toEqual([
    ["loans/473", { method: "GET", signal: controller.signal }],
    ["loans/473/guarantors", { method: "GET", signal: controller.signal }],
  ]);
});
it.each([0, -1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "473/../474"])(
  "rejects unsafe ID %s before transport",
  async (id) => {
    const s = setup();
    await expect(s.client.list(id as number)).rejects.toMatchObject({ code: "denied" });
    expect(s.request).not.toHaveBeenCalled();
  },
);
it("rejects a different customer before retrieving any guarantors", async () => {
  const s = setup();
  s.request.mockResolvedValueOnce({ status: 200, ok: true, data: { ...loan(), clientId: 9002 } });
  await expect(s.client.list(473)).rejects.toMatchObject({ code: "denied" });
  expect(s.request).toHaveBeenCalledTimes(1);
});
it.each([
  null,
  [],
  "invalid",
  {},
  { clientId: null },
  { clientId: "9001" },
  { clientId: 0 },
  { clientId: -1 },
  { clientId: 1.5 },
])(
  "classifies invalid loan client data as malformed before retrieving guarantors: %j",
  async (data) => {
    const s = setup();
    s.request.mockResolvedValueOnce({ status: 200, ok: true, data });
    await expect(s.client.list(473)).rejects.toMatchObject({ code: "malformed" });
    expect(s.request).toHaveBeenCalledTimes(1);
  },
);
it("rejects loan ID mismatches", async () => {
  const s = setup();
  s.request.mockResolvedValueOnce({ status: 200, ok: true, data: { ...loan(), id: 474 } });
  await expect(s.client.list(473)).rejects.toMatchObject({ code: "malformed" });
  expect(s.request).toHaveBeenCalledTimes(1);
});
it.each([
  [401, "expired"],
  [403, "denied"],
  [404, "missing"],
  [500, "unavailable"],
] as const)("safely handles %s at either read", async (status, code) => {
  for (const at of [0, 1]) {
    const s = setup();
    if (at) s.request.mockResolvedValueOnce({ status: 200, ok: true, data: loan() });
    s.request.mockResolvedValueOnce({ status, ok: false, data: { developerMessage: "PRIVATE" } });
    await expect(s.client.list(473)).rejects.toMatchObject({ code, message: code });
  }
});
it("normalizes expiry, offline and timeout errors without exposing transport data", async () => {
  for (const [error, code] of [
    [new AuthenticationError("expired"), "expired"],
    [new Error("PRIVATE"), "unavailable"],
  ] as const) {
    const s = setup();
    s.request.mockRejectedValueOnce(error);
    await expect(s.client.list(473)).rejects.toMatchObject({ code, message: code });
  }
});
it("minimizes fields and selects details only within the authorized loan collection", () => {
  const list = parseGuarantors(guarantors, 473);
  expect(list[0]).toEqual({
    id: 71,
    loanId: 473,
    name: "Synthetic Guarantor",
    typeId: 3,
    relationship: "Synthetic relationship",
    active: true,
  });
  expect(JSON.stringify(list)).not.toContain("PRIVATE");
  expect(selectGuarantor(list, 473, 71)).toEqual(list[0]);
  expect(() => selectGuarantor(list, 474, 71)).toThrow("missing");
  expect(() => selectGuarantor(list, 473, 999)).toThrow("missing");
  expect(parseGuarantors([], 473)).toEqual([]);
  expect(parseGuarantors([{ id: 73, loanId: 473 }], 473)[0]).toMatchObject({
    name: undefined,
    typeId: undefined,
    active: undefined,
  });
  expect([1, 2, 3, 4, 999].map(guarantorTypeLabel)).toEqual([
    "Cliente existente",
    "Personal de la institución",
    "Garante externo",
    "Grupo existente",
    "Tipo no disponible",
  ]);
});
it.each([
  null,
  {},
  { guarantors },
  [null],
  [{}],
  [{ ...guarantors[0], id: "71" }],
  [{ ...guarantors[0], loanId: 474 }],
  [{ ...guarantors[0], status: "active" }],
  [{ ...guarantors[0], firstname: {} }],
  [{ ...guarantors[0], guarantorType: {} }],
  [{ ...guarantors[0], clientRelationshipType: {} }],
  [guarantors[0], guarantors[0]],
])("fails closed on malformed collections %#", (data) => {
  expect(() => parseGuarantors(data, 473)).toThrow("malformed");
});
it("uses the pinned tenant/authentication and rejects malformed JSON through the real session", async () => {
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(login)))
    .mockResolvedValueOnce(new Response(JSON.stringify(loan())))
    .mockResolvedValueOnce(new Response("not JSON"));
  const session = await createAuthenticationClient({
    configuration: async () => ({
      baseUrl: "https://synthetic.invalid/api/v1/self",
      tenantId: "synthetic",
    }),
    transport,
  }).login("synthetic", "synthetic");
  await expect(createGuarantorClient(session).list(473)).rejects.toMatchObject({
    code: "malformed",
  });
  expect(String(transport.mock.calls[2][0])).toBe(
    "https://synthetic.invalid/api/v1/self/loans/473/guarantors",
  );
  expect(transport.mock.calls[2][1]?.headers).toMatchObject({
    "Fineract-Platform-TenantId": "synthetic",
    Authorization: `Basic ${login.base64EncodedAuthenticationKey}`,
  });
  await session.logout();
  await expect(createGuarantorClient(session).list(473)).rejects.toMatchObject({ code: "expired" });
});
