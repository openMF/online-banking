import { expect, it, vi } from "vitest";
import { createAuthenticationClient, type CustomerSession } from "../authentication/client";
import { createLoanClient, parseLoan, parseTemplate, payload, valuesFor } from "./client";
import {
  clientId,
  productId,
  login,
  products,
  product,
  template,
  loan,
  createBody,
} from "../../../tests/fixtures/loans";
function setup() {
  let current = loan();
  const request = vi.fn<CustomerSession["request"]>().mockImplementation(async (path, options) => ({
    status: 200,
    ok: true,
    data:
      path === "loanproducts"
        ? products
        : path.startsWith("loanproducts/")
          ? product(Number(path.split("/")[1]))
          : path === "loans/template"
            ? template(Number(options.query?.productId))
            : path === "loans" || options.method !== "GET"
              ? { resourceId: 473, loanId: 473 }
              : path.startsWith("clients/")
                ? { loanAccounts: [{ id: 473, productName: "Synthetic Loan" }] }
                : current,
  }));
  const session: CustomerSession = {
    identity: login,
    expiresAt: Date.now() + 900000,
    request,
    logout: vi.fn(),
  };
  return {
    client: createLoanClient(session),
    request,
    setCurrent: (v: ReturnType<typeof loan>) => {
      current = v;
    },
  };
}
async function ready(s = setup()) {
  await s.client.loadProducts();
  const t = await s.client.loadTemplate(clientId, productId);
  return { ...s, t, v: valuesFor(t) };
}
const writes = (s: ReturnType<typeof setup>) =>
  s.request.mock.calls.filter(([, o]) => o.method !== "GET");
it("loads exact product/template routes, client mapping and supplementary constraints", async () => {
  const s = await ready();
  expect(s.request).toHaveBeenCalledWith(
    "loans/template",
    expect.objectContaining({
      method: "GET",
      query: { templateType: "individual", clientId, productId },
    }),
  );
  expect(s.request).toHaveBeenCalledWith(
    `loanproducts/${productId}`,
    expect.objectContaining({ method: "GET" }),
  );
  expect(s.t.fields.find((f) => f.key === "principal")).toMatchObject({
    value: "1000",
    min: 100,
    max: 10000,
  });
  const alternative = await s.client.loadTemplate(clientId, 28);
  expect(valuesFor(alternative).principal).toBe("2000");
});
it("posts the exact create DTO once, reads actual pending status and remembers the resource", async () => {
  const s = await ready();
  const result = await s.client.submit(s.t, s.v);
  expect(writes(s)).toEqual([
    ["loans", expect.objectContaining({ method: "POST", body: createBody })],
  ]);
  expect(result.pending).toBe(true);
  expect(s.client.lastId).toBe(473);
  await expect(s.client.submit(s.t, s.v)).rejects.toMatchObject({ code: "locked" });
});
it("does not fabricate pending status when the server returns approved", async () => {
  const s = await ready();
  s.setCurrent(loan("approved"));
  const result = await s.client.submit(s.t, s.v);
  expect(result.pending).toBe(false);
  expect(result.status.value).toBe("Approved");
});
it("uses PUT without customer, product, submission date or charge replacement", async () => {
  const s = await ready();
  await s.client.update(await s.client.details(473), { ...s.v, principal: "1500" });
  const {
    clientId: ignoredClient,
    productId: ignoredProduct,
    submittedOnDate: ignoredDate,
    loanType: ignoredType,
    ...expected
  } = createBody;
  expect(writes(s)[0]).toEqual([
    "loans/473",
    expect.objectContaining({ method: "PUT", body: { ...expected, principal: 1500 } }),
  ]);
  expect(s.client.isBlocked(473)).toBe(false);
});
it("withdraws with the verified command POST and required date/locale then reads withdrawn state", async () => {
  const s = await ready();
  s.request.mockImplementation(async (path, options) => {
    if (options.method === "POST") {
      s.setCurrent(loan("withdrawn.by.client"));
      return { status: 200, ok: true, data: { resourceId: 473 } };
    }
    return {
      status: 200,
      ok: true,
      data: path === "loans/473" ? loan(writes(s).length ? "withdrawn.by.client" : undefined) : {},
    };
  });
  expect((await s.client.withdraw(473, "2026-10-30")).status.code).toBe(
    "loanStatusType.withdrawn.by.client",
  );
  expect(writes(s)[0]).toEqual([
    "loans/473",
    expect.objectContaining({
      method: "POST",
      query: { command: "withdrawnByApplicant" },
      body: { withdrawnOnDate: "2026-10-30", dateFormat: "yyyy-MM-dd", locale: "en" },
    }),
  ]);
});
for (const operation of ["create", "update", "withdraw"] as const) {
  it(`${operation} is locked during concurrent dispatch and permanently after lost response`, async () => {
    const s = await ready();
    const current = await s.client.details(473);
    let reject!: (reason: Error) => void;
    const normal = s.request.getMockImplementation()!;
    s.request.mockImplementation((path, o) =>
      o.method === "GET"
        ? normal(path, o)
        : new Promise((_, r) => {
            reject = r;
          }),
    );
    const send = () =>
      operation === "create"
        ? s.client.submit(s.t, s.v)
        : operation === "update"
          ? s.client.update(current, s.v)
          : s.client.withdraw(473, "2026-10-30");
    const pending = send();
    await vi.waitFor(() => expect(writes(s)).toHaveLength(1));
    await expect(send()).rejects.toMatchObject({ code: "locked" });
    reject(new Error("SECRET transport"));
    await expect(pending).rejects.toMatchObject({ code: "uncertain" });
    await expect(send()).rejects.toMatchObject({ code: "locked" });
    expect(writes(s)).toHaveLength(1);
  });
}
for (const state of ["approved", "withdrawn.by.client", "active", "rejected"]) {
  it(`rejects pending-only corrections/withdrawal for ${state}`, async () => {
    const s = await ready();
    const original = await s.client.details(473);
    s.setCurrent(loan(state));
    await expect(s.client.update(original, s.v)).rejects.toMatchObject({ code: "changed" });
    await expect(s.client.withdraw(473, "2026-10-30")).rejects.toMatchObject({ code: "changed" });
    expect(writes(s)).toHaveLength(0);
  });
}
it("rejects arbitrary clients before any request and cross-customer details before display", async () => {
  const s = await ready();
  const count = s.request.mock.calls.length;
  await expect(s.client.loadTemplate(999, productId)).rejects.toMatchObject({ code: "denied" });
  expect(s.request.mock.calls.length).toBe(count);
  expect(() => parseLoan({ ...loan(), clientId: 999 }, [clientId], 473)).toThrow();
});
it("rejects malformed templates, missing defaults and unknown extra requirements", () => {
  for (const bad of [
    {},
    { ...template(), interestType: undefined },
    { ...template(), principal: "1000" },
    { ...template(), productOptions: [{}] },
  ])
    expect(() => parseTemplate(bad, product(), clientId, productId)).toThrow();
  for (const extra of [
    { datatables: [{}] },
    { interestRecalculationEnabled: true },
    { multiDisburseLoan: true },
    { useBorrowerCycle: true },
  ])
    expect(() =>
      parseTemplate({ ...template(), ...extra }, product(), clientId, productId),
    ).toThrow(expect.objectContaining({ code: "unsupported" }));
});
it("validates bounds, precision, dates, options and fixed product attributes", async () => {
  const s = await ready();
  for (const v of [
    { principal: "0" },
    { principal: "10001" },
    { principal: "100.001" },
    { numberOfRepayments: "1.5" },
    { expectedDisbursementDate: "2026-02-30" },
    { expectedDisbursementDate: "2026-10-01" },
    { interestType: "999" },
  ] as Record<string, string>[])
    expect(() => payload(s.t, { ...s.v, ...v } as Record<string, string>)).toThrow(
      expect.objectContaining({ code: "invalid" }),
    );
  expect(writes(s)).toHaveLength(0);
});
it("carries configured product charges without inventing optional charges", () => {
  const t = parseTemplate(
    {
      ...template(),
      charges: [
        {
          chargeId: 5,
          amountOrPercentage: 2,
          chargeTimeType: { id: 2 },
          chargeCalculationType: { id: 1, value: "Flat" },
          name: "Synthetic fee",
        },
      ],
    },
    product(),
    clientId,
    productId,
  );
  expect(() => payload(t, valuesFor(t))).toThrow();
  expect(payload(t, { ...valuesFor(t), chargeDate0: "2026-11-05" }).charges).toEqual([
    { chargeId: 5, amount: 2, dueDate: "2026-11-05" },
  ]);
});
for (const status of [400, 422, 409, 403, 401, 500]) {
  it(`handles mutation HTTP ${status} without leaking backend text`, async () => {
    const s = await ready(),
      normal = s.request.getMockImplementation()!;
    s.request.mockImplementation((path, o) =>
      o.method === "GET"
        ? normal(path, o)
        : Promise.resolve({
            ok: false,
            status,
            data: {
              developerMessage: "SECRET",
              ...(status === 422 ? { errors: [{ parameterName: "principal" }] } : {}),
            },
          }),
    );
    await expect(s.client.submit(s.t, s.v)).rejects.toMatchObject({
      code:
        (
          { 401: "expired", 403: "denied", 409: "changed", 422: "invalid" } as Record<
            number,
            string
          >
        )[status] ?? "uncertain",
    });
    expect(writes(s)).toHaveLength(1);
  });
}
for (const operation of ["create", "update", "withdraw"] as const) {
  it(`${operation} keeps malformed successful acknowledgments and failed readbacks uncertain`, async () => {
    const s = await ready(),
      current = await s.client.details(473),
      normal = s.request.getMockImplementation()!;
    s.request.mockImplementation((path, o) =>
      o.method === "GET" ? normal(path, o) : Promise.resolve({ ok: true, status: 200, data: {} }),
    );
    await expect(
      operation === "create"
        ? s.client.submit(s.t, s.v)
        : operation === "update"
          ? s.client.update(current, s.v)
          : s.client.withdraw(473, "2026-10-30"),
    ).rejects.toMatchObject({ code: "uncertain" });
    expect(operation === "create" ? s.client.createBlocked : s.client.isBlocked(473)).toBe(true);
  });
}
it("keeps a successful write locked when its readback is denied; discovery never proves creation", async () => {
  const s = await ready(),
    normal = s.request.getMockImplementation()!;
  s.request.mockImplementation((p, o) =>
    p === "loans/473" ? Promise.resolve({ status: 404, ok: false, data: {} }) : normal(p, o),
  );
  await expect(s.client.submit(s.t, s.v)).rejects.toMatchObject({ code: "uncertain" });
  expect(s.client.createBlocked).toBe(true);
  expect(s.client.lastId).toBe(473);
  await s.client.list(clientId);
  expect(s.client.createBlocked).toBe(true);
});
it("pins the tenant and credential through the real customer session for all loan requests", async () => {
  const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const u = new URL(String(url));
    const path = u.pathname.split("/self/")[1];
    const data =
      path === "authentication"
        ? login
        : path === "loanproducts"
          ? products
          : path === `loanproducts/${productId}`
            ? product()
            : path === "loans/template"
              ? template()
              : path === "loans"
                ? { resourceId: 473 }
                : loan();
    return new Response(JSON.stringify(data), { status: 200 });
  });
  const session = await createAuthenticationClient({
    configuration: async () => ({
      baseUrl: "https://bank.invalid/fineract-provider/api/v1/self",
      tenantId: "synthetic-tenant",
    }),
    transport: fetchImpl,
  }).login("synthetic", "not-real");
  const client = createLoanClient(session);
  await client.loadProducts();
  const t = await client.loadTemplate(clientId, productId);
  await client.submit(t, valuesFor(t));
  for (const [, init] of fetchImpl.mock.calls.slice(1))
    expect(init?.headers).toMatchObject({
      Authorization: `Basic ${login.base64EncodedAuthenticationKey}`,
      "Fineract-Platform-TenantId": "synthetic-tenant",
    });
});

it("intersects eligible client template products with the real product list", async () => {
  const s = await ready();
  s.request.mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: { clientId, productOptions: [products[1], { id: 99, name: "Not discoverable" }] },
  });
  expect(await s.client.eligibleProducts(clientId)).toEqual([products[1]]);
  expect(s.request).toHaveBeenLastCalledWith(
    "loans/template",
    expect.objectContaining({ query: { templateType: "individual", clientId } }),
  );
});
it("does not dispatch when reviewed product defaults change", async () => {
  const s = await ready(),
    normal = s.request.getMockImplementation()!;
  s.request.mockImplementation((path, o) =>
    path === "loans/template"
      ? Promise.resolve({
          ok: true,
          status: 200,
          data: { ...template(), interestRatePerPeriod: 2 },
        })
      : normal(path, o),
  );
  await expect(s.client.submit(s.t, s.v)).rejects.toMatchObject({ code: "changed" });
  expect(writes(s)).toHaveLength(0);
  expect(s.client.createBlocked).toBe(false);
});
it("rejects contradictory or incomplete backend status metadata", () => {
  for (const status of [
    { code: "loanStatusType.submitted.and.pending.approval", value: "Pending" },
    { ...loan().status, id: 200 },
    { ...loan().status, pendingApproval: false },
  ])
    expect(() => parseLoan({ ...loan(), status }, [clientId], 473)).toThrow();
});

it("never treats a valid withdrawal acknowledgment with still-pending details as completed", async () => {
  const s = await ready();
  await expect(s.client.withdraw(473, "2026-10-30")).rejects.toMatchObject({ code: "uncertain" });
  await s.client.details(473);
  expect(s.client.isBlocked(473)).toBe(true);
  await expect(s.client.withdraw(473, "2026-10-30")).rejects.toMatchObject({ code: "locked" });
  expect(writes(s)).toHaveLength(1);
});
it("retains the submitted client/product binding during later recovery reads", async () => {
  const s = await ready();
  s.setCurrent({ ...loan(), loanProductId: 28 });
  await expect(s.client.submit(s.t, s.v)).rejects.toMatchObject({ code: "uncertain" });
  await expect(s.client.details(473)).rejects.toMatchObject({ code: "malformed" });
  expect(s.client.createBlocked).toBe(true);
});
for (const operation of ["update", "withdraw"] as const)
  it(`expires the session on ${operation} denial without automatic retry`, async () => {
    const s = await ready(),
      current = await s.client.details(473),
      normal = s.request.getMockImplementation()!;
    s.request.mockImplementation((path, o) =>
      o.method === "GET" ? normal(path, o) : Promise.resolve({ ok: false, status: 401, data: {} }),
    );
    await expect(
      operation === "update" ? s.client.update(current, s.v) : s.client.withdraw(473, "2026-10-30"),
    ).rejects.toMatchObject({ code: "expired" });
    expect(writes(s)).toHaveLength(1);
  });
