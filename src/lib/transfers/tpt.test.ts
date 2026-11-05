import { createAuthenticationClient } from "../authentication/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHttpTransfersApi,
  parseTemplate,
  toTransferError,
  type TransferAccount,
} from "./index";
import { SelfServiceError } from "../selfservice/http";

const from: TransferAccount = {
  accountId: 101,
  accountNo: "SOURCE-101",
  accountType: 2,
  clientId: 81,
  officeId: 1,
  clientName: "Sender",
};
const to: TransferAccount = {
  accountId: 902,
  accountNo: "DEST-00902",
  accountType: 2,
  clientId: 99,
  officeId: 3,
  clientName: "Recipient",
};
const raw = (account: TransferAccount) => ({
  ...account,
  accountType: { id: account.accountType },
});
const template = { fromAccountOptions: [raw(from)], toAccountOptions: [raw(to)] };
const input = { from, to, amount: "1250.50", description: "Invoice" };
const config = { baseUrl: "https://bank.invalid", apiPath: "/api", tenantId: "tenant-synthetic" };
const session = { accessKey: "SYNTHETIC-SESSION", username: "sender", userId: 7, clients: [81] };
function setup(
  answer: unknown = { resourceId: 444, savingsId: 101 },
  status = 200,
  loaded: unknown = template,
) {
  const fetchImpl = vi.fn<typeof fetch>(
    async (_url, options) =>
      new Response(JSON.stringify(options?.method === "POST" ? answer : loaded), {
        status: options?.method === "POST" ? status : 200,
      }),
  );
  return {
    fetchImpl,
    api: createHttpTransfersApi({
      config,
      session,
      fetchImpl,
      now: () => new Date(2026, 10, 5, 12),
    }),
  };
}
afterEach(() => vi.restoreAllMocks());

describe("TPT authenticated contract", () => {
  it("retrieves registered destinations, then sends exact metadata and amount once with tenant, session and grant", async () => {
    const { api, fetchImpl } = setup();
    expect(await api.getTemplate("tpt")).toEqual({ from: [from], to: [to] });
    const receipt = await api.create("tpt", input, "SYNTHETIC-GRANT");
    expect(receipt).toMatchObject({ reference: 444, amount: "1250.50", date: "2026-11-05", to });
    const posts = fetchImpl.mock.calls.filter(([, options]) => options?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toBe("https://bank.invalid/api/v1/self/accounttransfers?type=tpt");
    expect(posts[0][1]?.headers).toMatchObject({
      Authorization: "Basic SYNTHETIC-SESSION",
      "Fineract-Platform-TenantId": "tenant-synthetic",
      "X-Step-Up-Token": "SYNTHETIC-GRANT",
    });
    expect(JSON.parse(posts[0][1]!.body as string)).toEqual({
      fromOfficeId: 1,
      fromClientId: 81,
      fromAccountId: 101,
      fromAccountType: 2,
      toOfficeId: 3,
      toClientId: 99,
      toAccountId: 902,
      toAccountType: 2,
      transferDate: "2026-11-05",
      transferAmount: "1250.50",
      transferDescription: "Invoice",
      dateFormat: "yyyy-MM-dd",
      locale: "en",
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://bank.invalid/api/v1/self/accounttransfers/template?type=tpt",
    );
  });
  it.each([
    ["removed beneficiary", { ...template, toAccountOptions: [] }],
    [
      "modified beneficiary mapping",
      { ...template, toAccountOptions: [raw({ ...to, clientId: 8 })] },
    ],
    [
      "renamed recipient",
      { ...template, toAccountOptions: [raw({ ...to, clientName: "Changed" })] },
    ],
    ["removed source", { ...template, fromAccountOptions: [] }],
  ])("refuses %s before the financial POST", async (_name, loaded) => {
    const { api, fetchImpl } = setup(undefined, 200, loaded);
    await expect(api.create("tpt", input)).rejects.toMatchObject({ code: "accounts" });
    expect(fetchImpl.mock.calls.every(([, options]) => options?.method === "GET")).toBe(true);
  });
  it.each(["accountId", "clientId", "officeId", "accountType"] as const)(
    "refuses injected destination %s",
    async (field) => {
      const { api, fetchImpl } = setup();
      await expect(
        api.create("tpt", { ...input, to: { ...to, [field]: 123 } }),
      ).rejects.toMatchObject({ code: "accounts" });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    null,
    {},
    { ...template, toAccountOptions: [raw(to), raw(to)] },
    { ...template, toAccountOptions: [raw({ ...to, clientName: undefined })] },
    { ...template, toAccountOptions: [{ ...raw(to), accountId: "902" }] },
  ])("rejects malformed or ambiguous template %#", (loaded) => {
    expect(() => parseTemplate(loaded, "tpt")).toThrow();
  });
  it("accepts an empty beneficiary list without inserting demo destinations", () => {
    expect(parseTemplate({ ...template, toAccountOptions: [] }, "tpt").to).toEqual([]);
  });
  it.each([401, 403])(
    "propagates template authorization failure %s without a POST",
    async (status) => {
      const fetchImpl = vi.fn<typeof fetch>(async () => new Response("{}", { status }));
      await expect(
        createHttpTransfersApi({ config, session, fetchImpl }).create("tpt", input),
      ).rejects.toMatchObject({ code: status === 401 ? "session" : "refused" });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );
});

describe("TPT limits are decided by the backend", () => {
  // These are synthetic API answers, not an implementation or live test of checkForLimits().
  it.each([
    ["below limit", "99.99"],
    ["equal to limit", "100.00"],
    ["limit disabled", "1000000.00"],
  ])("accepts backend confirmation when %s", async (_scenario, amount) => {
    const { api } = setup();
    expect((await api.create("tpt", { ...input, amount })).reference).toBe(444);
  });
  it.each([
    ["error.msg.beneficiary.transfer.amount.limit.for.beneficiary.exceeded", "beneficiary"],
    [
      "error.msg.beneficiary.daily.tpt.transfer.limit.for.fromaccountid.101.fromaccounttype.2.exceeded",
      "daily",
    ],
    ["validation.msg.accounttransfer.invalid.to.account.details", "accounts"],
    ["validation.msg.accounttransfer.invalid.from.account.details", "accounts"],
    ["validation.msg.transferapproval.approvalId.dual.approval.required", "approval"],
    ["error.msg.selfservice.stepup.required", "stepup"],
    ["error.msg.selfservice.stepup.invalid", "stepup"],
    ["error.msg.savingsaccount.transaction.insufficient.account.balance", "funds"],
    ["unrecognized.limit.error", "uncertain"],
    ["error.msg.insufficient.internal.metadata", "uncertain"],
  ])("handles nested %s at submission without retrying", async (code, expected) => {
    const { api, fetchImpl } = setup(
      {
        userMessageGlobalisationCode: "validation.msg.domain.rule.violation",
        errors: [{ userMessageGlobalisationCode: code }],
      },
      403,
    );
    await expect(api.create("tpt", input)).rejects.toMatchObject({ code: expected });
    expect(fetchImpl.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(
      1,
    );
  });
});

describe("TPT outcomes", () => {
  it.each([408, 500, 502, 503, 504])("never retries a financial HTTP %s", async (status) => {
    const { api, fetchImpl } = setup({}, status);
    await expect(api.create("tpt", input)).rejects.toMatchObject({ code: "uncertain" });
    expect(fetchImpl.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(
      1,
    );
  });
  it.each([
    {},
    null,
    { resourceId: "44" },
    { resourceId: 44, savingsId: 9 },
    { resourceId: 44, rollbackTransaction: true },
    { resourceId: 44, rollbackTransaction: "true" },
    { resourceId: 44, status: "PENDING_APPROVAL" },
    { resourceId: 44, error: "failed" },
    { resourceId: 44, approvalId: 7 },
    { resourceId: 44, errors: { code: "failed" } },
    { resourceId: 44, pendingApproval: "true" },
  ])("never confirms an untrustworthy 2xx answer %#", async (answer) => {
    const { api } = setup(answer);
    await expect(api.create("tpt", input)).rejects.toMatchObject({ code: "uncertain" });
  });
  it.each([
    new TypeError("connection dropped"),
    new DOMException("Timed out", "TimeoutError"),
    new Error("unexpected after dispatch"),
  ])("is uncertain after a thrown dispatch error %#", async (error) => {
    const { api, fetchImpl } = setup();
    fetchImpl.mockImplementation(async (_url, options) => {
      if (options?.method === "POST") throw error;
      return new Response(JSON.stringify(template));
    });
    await expect(api.create("tpt", input)).rejects.toMatchObject({ code: "uncertain" });
    expect(fetchImpl.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(
      1,
    );
  });
  it("treats an unexpected thrown write error conservatively for both transfer kinds", () => {
    for (const kind of ["own", "tpt"] as const)
      expect(toTransferError(new Error("boom"), true, kind).code).toBe("uncertain");
    expect(
      toTransferError(new SelfServiceError(403, "unknown.limit", "private"), true, "tpt").code,
    ).toBe("uncertain");
  });
});

it("retains uncertainty when the actual CustomerSession expires after a successful financial response", async () => {
  let tick = 100;
  const transport = vi.fn<typeof fetch>(async (url, options) => {
    if (String(url).endsWith("/authentication"))
      return new Response(
        JSON.stringify({
          authenticated: true,
          username: "sender",
          userId: 7,
          base64EncodedAuthenticationKey: btoa("00000000-0000-4000-8000-000000000001"),
          roles: [],
          permissions: [],
          clients: [81],
          shouldRenewPassword: false,
          isTwoFactorAuthenticationRequired: false,
        }),
      );
    if (options?.method === "GET") return new Response(JSON.stringify(template));
    tick = 900101;
    return new Response(JSON.stringify({ resourceId: 444, savingsId: 101 }));
  });
  const customer = await createAuthenticationClient({
    configuration: async () => ({
      baseUrl: "https://bank.invalid/api/v1/self",
      tenantId: "synthetic",
    }),
    transport,
    now: () => tick,
  }).login("sender", "synthetic-pass");
  await expect(createHttpTransfersApi({ customer }).create("tpt", input)).rejects.toMatchObject({
    code: "uncertain",
  });
  expect(
    transport.mock.calls.filter(
      ([url, options]) => String(url).includes("accounttransfers?") && options?.method === "POST",
    ),
  ).toHaveLength(1);
});

it("ends the session on an actual HTTP 401 transfer refusal", async () => {
  const { api } = setup({}, 401);
  await expect(api.create("tpt", input)).rejects.toMatchObject({ code: "session" });
});
