import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { SelfServiceError } from "../selfservice/http";
import answers from "./fineract-answers.json";
import {
  TransferError,
  createHttpTransfersApi,
  formatAmount,
  parseAmount,
  parseSummary,
  parseTemplate,
  stepUpPayload,
  toTransferError,
  todayIso,
  transferKey,
  type TransferAccount,
} from "./index";

type Reply = { status?: number; data?: unknown };

/** A logged-in customer whose session answers `replies` in order and remembers every call. */
function fakeCustomer(...replies: (Reply | Error)[]) {
  const calls: { resource: string; options: Parameters<CustomerSession["request"]>[1] }[] = [];
  const customer: CustomerSession = {
    identity: { userId: 7, username: "ana", roles: [], permissions: [], clients: [81] },
    expiresAt: Number.MAX_SAFE_INTEGER,
    request: vi.fn(async (resource, options) => {
      calls.push({ resource, options });
      const next = replies.shift() ?? { status: 200, data: {} };
      if (next instanceof Error) throw next;
      const status = next.status ?? 200;
      return { status, ok: status >= 200 && status < 300, data: "data" in next ? next.data : {} };
    }),
    logout: vi.fn(async () => true),
  };
  return { customer, calls };
}

async function rejected(promise: Promise<unknown>): Promise<TransferError> {
  try {
    await promise;
  } catch (error) {
    return error as TransferError;
  }
  throw new Error("expected the promise to reject");
}

const apiError = (status: number, code: string, extra: string[] = []) =>
  new SelfServiceError(status, code, "text of the server", { errorCodes: extra });

const savings = (id: number, extra: Partial<TransferAccount> = {}): TransferAccount => ({
  accountId: id,
  accountNo: `0000${id}`,
  accountType: 2,
  clientId: 81,
  officeId: 1,
  clientName: "Ana Pérez",
  officeName: "Head Office",
  ...extra,
});

const rawAccount = (account: TransferAccount) => ({
  accountId: account.accountId,
  accountNo: account.accountNo,
  accountType: { id: account.accountType, code: "x", value: "x" },
  clientId: account.clientId,
  clientName: account.clientName,
  officeId: account.officeId,
  officeName: account.officeName,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseAmount", () => {
  it.each([
    ["10", "10.00"],
    ["10.5", "10.50"],
    ["10.50", "10.50"],
    ["0.01", "0.01"],
    ["007.5", "7.50"],
    ["1250.50", "1250.50"],
    ["1,250.50", "1250.50"],
    ["1,250", "1250.00"],
    ["12,345,678.9", "12345678.90"],
    ["  25  ", "25.00"],
    ["999999999999", "999999999999.00"],
  ])("reads %s as %s", (typed, value) => {
    expect(parseAmount(typed)).toEqual({ ok: true, value });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["abc", "format"],
    ["1,5", "format"], // a decimal comma: asked, never guessed
    ["1,50", "format"],
    ["12,34", "format"],
    ["1.250,50", "format"],
    ["1 250", "format"],
    ["$10", "format"],
    ["-5", "format"],
    ["+5", "format"],
    ["1e3", "format"],
    [".5", "format"],
    ["5.", "format"],
    ["10.5.0", "format"],
    ["1,2345", "format"],
    ["1234567890123", "format"], // 13 whole digits
    ["0", "zero"],
    ["0.00", "zero"],
    ["000", "zero"],
    ["10.555", "decimals"],
  ])("refuses %j as %s", (typed, problem) => {
    expect(parseAmount(typed)).toEqual({ ok: false, problem });
  });

  it("follows the decimals of the currency", () => {
    expect(parseAmount("10", 0)).toEqual({ ok: true, value: "10" });
    expect(parseAmount("10.5", 0)).toEqual({ ok: false, problem: "decimals" });
    expect(parseAmount("0", 0)).toEqual({ ok: false, problem: "zero" });
    // two places at least, more only when typed and the currency has them
    expect(parseAmount("1.5", 3)).toEqual({ ok: true, value: "1.50" });
    expect(parseAmount("1.234", 3)).toEqual({ ok: true, value: "1.234" });
    expect(parseAmount("1.2345", 3)).toEqual({ ok: false, problem: "decimals" });
    expect(parseAmount("10", 4)).toEqual({ ok: true, value: "10.00" });
    expect(parseAmount("10.1234", 4)).toEqual({ ok: true, value: "10.1234" });
    expect(parseAmount("10.12345", 4)).toEqual({ ok: false, problem: "decimals" });
  });
});

describe("formatAmount and todayIso", () => {
  it("groups thousands and keeps the places", () => {
    expect(formatAmount("1250.5")).toBe("1,250.50");
    expect(formatAmount("12345678.90")).toBe("12,345,678.90");
    expect(formatAmount("5")).toBe("5.00");
    expect(formatAmount("1250", 0)).toBe("1,250");
    expect(formatAmount("10.1234", 4)).toBe("10.1234");
    expect(formatAmount("989.5", 4)).toBe("989.50");
  });

  it("writes the local day with two digits", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayIso(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });
});

describe("parseTemplate", () => {
  it("reads the accounts of both lists", () => {
    const template = parseTemplate({
      fromAccountOptions: [rawAccount(savings(1)), rawAccount(savings(2))],
      toAccountOptions: [rawAccount(savings(2, { clientName: undefined }))],
    });
    expect(template.from.map((a) => a.accountId)).toEqual([1, 2]);
    expect(template.to[0]).toMatchObject({ accountId: 2, accountNo: "00002", accountType: 2 });
    expect(template.to[0].clientName).toBeUndefined();
  });

  it.each([
    ["not an object", null],
    ["a list", []],
    ["no lists", {}],
    ["a list that is not a list", { fromAccountOptions: {}, toAccountOptions: [] }],
    ["one list missing", { fromAccountOptions: [] }],
  ])("refuses %s", (_name, data) => {
    expect(() => parseTemplate(data)).toThrow(TransferError);
  });

  it.each([
    ["an id that is not positive", { accountId: 0 }],
    ["an id as text", { accountId: "5" }],
    ["no account number", { accountNo: "" }],
    ["no account type", { accountType: undefined }],
    ["an account type that is not an id", { accountType: { id: "2" } }],
    ["no client", { clientId: undefined }],
    ["no office", { officeId: null }],
  ])("refuses an account with %s", (_name, change) => {
    const bad = { ...rawAccount(savings(1)), ...change };
    expect(() => parseTemplate({ fromAccountOptions: [bad], toAccountOptions: [] })).toThrow(
      expect.objectContaining({ code: "malformed" }),
    );
  });

  it("refuses the same account twice in one list", () => {
    const one = rawAccount(savings(1));
    expect(() => parseTemplate({ fromAccountOptions: [one, one], toAccountOptions: [] })).toThrow(
      expect.objectContaining({ code: "malformed" }),
    );
  });
});

describe("parseSummary", () => {
  it("reads the currency and the available balance", () => {
    expect(
      parseSummary({
        currency: { code: "USD", decimalPlaces: 2, name: "US Dollar" },
        summary: { accountBalance: 120, availableBalance: 99.5 },
      }),
    ).toEqual({ currency: { code: "USD", decimalPlaces: 2 }, available: 99.5 });
  });

  it("keeps what is good and drops what is not, without failing", () => {
    expect(parseSummary(null)).toEqual({});
    expect(parseSummary({ currency: { code: "usd", decimalPlaces: 2 } })).toEqual({});
    expect(parseSummary({ currency: { code: "USD", decimalPlaces: 7 } })).toEqual({});
    expect(parseSummary({ currency: { code: "USD", decimalPlaces: 6 } })).toEqual({
      currency: { code: "USD", decimalPlaces: 6 },
    });
    expect(parseSummary({ currency: { code: "USD", decimalPlaces: 0 } })).toEqual({
      currency: { code: "USD", decimalPlaces: 0 },
    });
    expect(parseSummary({ summary: { availableBalance: "12" } })).toEqual({});
    expect(parseSummary({ summary: { availableBalance: 12 } })).toEqual({ available: 12 });
  });
});

describe("the step-up payload", () => {
  const from = savings(1);
  const to = savings(2, { clientId: 82, officeId: 3 });

  it("has exactly the five fields the server binds a token to, and the amount as text", () => {
    expect(stepUpPayload({ from, to, amount: "10.50" })).toEqual({
      fromAccountId: 1,
      fromAccountType: 2,
      toAccountId: 2,
      toAccountType: 2,
      transferAmount: "10.50",
    });
  });

  it("changes the key with anything the token is bound to", () => {
    const base = transferKey({ from, to, amount: "10.50" });
    expect(transferKey({ from, to, amount: "10.50" })).toBe(base);
    expect(transferKey({ from, to, amount: "10.51" })).not.toBe(base);
    expect(transferKey({ from: savings(3), to, amount: "10.50" })).not.toBe(base);
    expect(transferKey({ from, to: savings(3), amount: "10.50" })).not.toBe(base);
    expect(transferKey({ from: { ...from, accountType: 1 }, to, amount: "10.50" })).not.toBe(base);
  });
});

describe("toTransferError", () => {
  it.each<[string, SelfServiceError, boolean, string]>([
    ["a session that ended", apiError(401, "error.http.401"), false, "session"],
    ["a session that ended on a write", apiError(401, "error.http.401"), true, "session"],
    ["no step-up token", apiError(403, "error.msg.selfservice.stepup.required"), true, "stepup"],
    ["a used token", apiError(403, "error.msg.selfservice.stepup.invalid"), true, "stepup"],
    [
      "a token of another session",
      apiError(403, "error.msg.selfservice.stepup.session.required"),
      true,
      "session",
    ],
    [
      "not enough money",
      apiError(403, "error.msg.savingsaccount.transaction.insufficient.account.balance"),
      true,
      "funds",
    ],
    [
      "the limit of a beneficiary",
      apiError(403, "error.msg.beneficiary.transfer.amount.limit.for.beneficiary.exceeded"),
      true,
      "limit",
    ],
    [
      "the daily limit",
      apiError(403, "error.msg.beneficiary.daily.tpt.transfer.limit.for.fromaccountid.1"),
      true,
      "daily",
    ],
    [
      "an account that is not the user's",
      apiError(400, "validation.msg.validation.errors.exist", [
        "validation.msg.accounttransfer.invalid.from.account.details",
      ]),
      true,
      "accounts",
    ],
    [
      "the same account twice",
      apiError(400, "validation.msg.validation.errors.exist", [
        "validation.msg.accounttransfer.same.from.to.account.details",
      ]),
      true,
      "same",
    ],
    [
      "data the server refuses",
      apiError(400, "validation.msg.validation.errors.exist", [
        "validation.msg.x.amount.not.positive",
      ]),
      true,
      "invalid",
    ],
    ["an unknown refusal", apiError(403, "error.msg.something.else"), true, "refused"],
    ["an unknown 404", apiError(404, "error.msg.x"), true, "refused"],
    ["a busy server", apiError(429, "error.http.429"), true, "busy"],
    [
      "a date in the future",
      apiError(400, "validation.msg.validation.errors.exist", [
        "error.msg.savingsaccount.transaction.in.the.future",
      ]),
      true,
      "date",
    ],
    ["a server error on a write", apiError(500, "error.http.500"), true, "uncertain"],
    ["a bad gateway on a write", apiError(502, "error.http.502"), true, "uncertain"],
    ["a gateway timeout on a write", apiError(504, "error.http.504"), true, "uncertain"],
    ["a request timeout on a write", apiError(408, "error.http.408"), true, "uncertain"],
    ["no answer on a write", apiError(0, "error.network"), true, "uncertain"],
    ["a server error on a read", apiError(503, "error.http.503"), false, "unavailable"],
    ["no answer on a read", apiError(0, "error.network"), false, "network"],
    ["a refusal on a read", apiError(403, "error.http.403"), false, "refused"],
  ])("%s", (_name, error, write, code) => {
    expect(toTransferError(error, write).code).toBe(code);
  });

  it("knows offline and timeout on a read, and keeps a TransferError", () => {
    const offline = new SelfServiceError(0, "error.network", "x", { reason: "offline" });
    const timeout = new SelfServiceError(0, "error.network", "x", { reason: "timeout" });
    expect(toTransferError(offline).code).toBe("offline");
    expect(toTransferError(timeout).code).toBe("timeout");
    const own = new TransferError("funds");
    expect(toTransferError(own, true)).toBe(own);
    expect(toTransferError(new Error("boom")).code).toBe("unknown");
  });

  it("never puts the text of the server, an account or an amount in the message", () => {
    const error = toTransferError(apiError(403, "error.msg.x"), true);
    expect(error.message).toBe("transfer: refused");
  });
});

describe("the http api", () => {
  const from = savings(1);
  const to = savings(2, { clientId: 82, officeId: 3 });
  const input = { from, to, amount: "10.50", description: "Renta" };
  const now = () => new Date(2026, 9, 30, 12, 0);

  it("reads the template of an own transfer and of a beneficiary transfer", async () => {
    const { customer, calls } = fakeCustomer(
      { data: { fromAccountOptions: [rawAccount(from)], toAccountOptions: [rawAccount(to)] } },
      { data: { fromAccountOptions: [rawAccount(from)], toAccountOptions: [] } },
    );
    const api = createHttpTransfersApi({ customer });

    const own = await api.getTemplate("own");
    expect(own.to[0].accountId).toBe(2);
    await api.getTemplate("tpt");

    expect(calls[0].resource).toBe("accounttransfers/template");
    expect(calls[0].options.method).toBe("GET");
    expect(calls[0].options.query).toEqual({});
    expect(calls[1].options.query).toEqual({ type: "tpt" });
  });

  it("says malformed when the template is not a template", async () => {
    const { customer } = fakeCustomer({ data: { fromAccountOptions: "x" } });
    const error = await rejected(createHttpTransfersApi({ customer }).getTemplate("own"));
    expect(error.code).toBe("malformed");
  });

  it("maps a failed read", async () => {
    const { customer } = fakeCustomer({ status: 503, data: {} });
    const error = await rejected(createHttpTransfersApi({ customer }).getTemplate("own"));
    expect(error.code).toBe("unavailable");
  });

  it("sends the transfer with every field the server needs, the amount as text and the token", async () => {
    const { customer, calls } = fakeCustomer({ data: { resourceId: 55, savingsId: 1 } });
    const receipt = await createHttpTransfersApi({ customer, now }).create(
      "own",
      input,
      "ONE-TIME",
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].resource).toBe("accounttransfers");
    expect(calls[0].options).toMatchObject({
      method: "POST",
      query: {},
      stepUpToken: "ONE-TIME",
      body: {
        fromOfficeId: 1,
        fromClientId: 81,
        fromAccountId: 1,
        fromAccountType: 2,
        toOfficeId: 3,
        toClientId: 82,
        toAccountId: 2,
        toAccountType: 2,
        transferDate: "2026-10-30",
        transferAmount: "10.50",
        transferDescription: "Renta",
        dateFormat: "yyyy-MM-dd",
        locale: "en",
      },
    });
    expect(Object.keys(calls[0].options.body as object)).toHaveLength(13);
    expect(receipt).toEqual({
      reference: 55,
      from,
      to,
      amount: "10.50",
      description: "Renta",
      date: "2026-10-30",
    });
  });

  it("goes to the beneficiary path for a transfer to a third party", async () => {
    const { customer, calls } = fakeCustomer({ data: { resourceId: 9 } });
    await createHttpTransfersApi({ customer, now }).create("tpt", input);
    expect(calls[0].options.query).toEqual({ type: "tpt" });
    expect(calls[0].options.stepUpToken).toBeUndefined();
  });

  it.each([
    ["an empty object", {}],
    ["null", null],
    ["no body at all", undefined],
    ["text", "ok"],
    ["a list", [{ resourceId: 5 }]],
    ["a reference that is not a number", { resourceId: "55", savingsId: 1 }],
    ["a reference of zero", { resourceId: 0, savingsId: 1 }],
    ["a negative reference", { resourceId: -4, savingsId: 1 }],
    ["a fractional reference", { resourceId: 5.5, savingsId: 1 }],
    ["the savings account of another transfer", { resourceId: 55, savingsId: 9 }],
    ["a rolled back transaction", { resourceId: 55, savingsId: 1, rollbackTransaction: true }],
  ])("is uncertain, not done, when the server answers 2xx with %s", async (_label, data) => {
    const { customer, calls } = fakeCustomer({ data }, { data: { resourceId: 1 } });
    const error = await rejected(createHttpTransfersApi({ customer, now }).create("own", input));
    expect(error.code).toBe("uncertain");
    expect(calls).toHaveLength(1); // and it is not sent again
  });

  it("is done when the answer confirms the transfer, with or without the optional parts", async () => {
    const api = (data: unknown) =>
      createHttpTransfersApi({ customer: fakeCustomer({ data }).customer, now });
    expect((await api({ resourceId: 55 }).create("own", input)).reference).toBe(55);
    expect(
      (
        await api({ resourceId: 56, savingsId: 1, changes: {}, rollbackTransaction: false }).create(
          "own",
          input,
        )
      ).reference,
    ).toBe(56);
  });

  it.each([500, 502, 503, 504, 408])(
    "never sends again after a %s, and says it is uncertain",
    async (status) => {
      const { customer, calls } = fakeCustomer({ status, data: {} }, { data: { resourceId: 1 } });
      const error = await rejected(createHttpTransfersApi({ customer, now }).create("own", input));
      expect(error.code).toBe("uncertain");
      expect(calls).toHaveLength(1);
    },
  );

  it("is uncertain when the session got no answer (it may have run)", async () => {
    const { customer, calls } = fakeCustomer(new AuthenticationError("server"));
    const error = await rejected(createHttpTransfersApi({ customer, now }).create("own", input));
    expect(error.code).toBe("uncertain");
    expect(calls).toHaveLength(1);
  });

  it("sends nothing when the browser is offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { customer, calls } = fakeCustomer({ data: {} });
    const error = await rejected(createHttpTransfersApi({ customer, now }).create("own", input));
    expect(error.code).toBe("offline");
    expect(calls).toHaveLength(0);
  });

  it("tells a definitive refusal from an uncertain one", async () => {
    const { customer } = fakeCustomer({
      status: 403,
      data: {
        userMessageGlobalisationCode:
          "error.msg.savingsaccount.transaction.insufficient.account.balance",
      },
    });
    const error = await rejected(createHttpTransfersApi({ customer, now }).create("own", input));
    expect(error.code).toBe("funds");
  });

  it("asks for the verification again when the token is refused", async () => {
    const { customer } = fakeCustomer({
      status: 403,
      data: { userMessageGlobalisationCode: "error.msg.selfservice.stepup.required" },
    });
    const error = await rejected(createHttpTransfersApi({ customer, now }).create("own", input));
    expect(error.code).toBe("stepup");
  });

  it("ends the screen when the session ended", async () => {
    const { customer } = fakeCustomer(new AuthenticationError("expired"));
    const error = await rejected(createHttpTransfersApi({ customer, now }).create("own", input));
    expect(error.code).toBe("session");
  });

  describe("the summary of an account", () => {
    it("reads currency and available balance of a savings account", async () => {
      const { customer, calls } = fakeCustomer({
        data: { currency: { code: "USD", decimalPlaces: 2 }, summary: { availableBalance: 80 } },
      });
      const summary = await createHttpTransfersApi({ customer }).getSummary(from);
      expect(summary).toEqual({ currency: { code: "USD", decimalPlaces: 2 }, available: 80 });
      expect(calls[0].resource).toBe("savingsaccounts/1");
    });

    it("does not ask for a loan", async () => {
      const { customer, calls } = fakeCustomer({ data: {} });
      expect(
        await createHttpTransfersApi({ customer }).getSummary({ ...from, accountType: 1 }),
      ).toEqual({});
      expect(calls).toHaveLength(0);
    });

    it("is only advice: a failure gives nothing, a session that ended still ends", async () => {
      const failing = fakeCustomer({ status: 500, data: {} });
      expect(await createHttpTransfersApi({ customer: failing.customer }).getSummary(from)).toEqual(
        {},
      );
      const ended = fakeCustomer({ status: 401, data: {} });
      const error = await rejected(
        createHttpTransfersApi({ customer: ended.customer }).getSummary(from),
      );
      expect(error.code).toBe("session");
    });
  });
});

// Answers captured on 2026-10-30 from a real Fineract with the plugin (synthetic data), so the
// parsers and the mapping are checked against what the server says, not against what we imagine.
describe("the answers of a real Fineract", () => {
  const now = () => new Date(2026, 9, 30, 12, 0);

  it("reads the template of the plugin", async () => {
    const { customer } = fakeCustomer({ data: answers.template });
    const template = await createHttpTransfersApi({ customer }).getTemplate("own");
    expect(template.from.map((a) => [a.accountId, a.accountNo, a.accountType])).toEqual([
      [1, "000000001", 2],
      [2, "000000002", 2],
    ]);
    expect(template.to).toHaveLength(2);
    expect(template.from[0]).toMatchObject({ clientId: 1, officeId: 1, officeName: "Head Office" });
  });

  it("reads the currency and the available balance of a savings account", async () => {
    const { customer } = fakeCustomer({ data: answers.summary });
    const summary = await createHttpTransfersApi({ customer }).getSummary(savings(1));
    expect(summary).toEqual({ currency: { code: "USD", decimalPlaces: 4 }, available: 989.5 });
  });

  it("takes the id of the transfer as the reference", async () => {
    const { customer } = fakeCustomer({ data: answers.ok });
    const receipt = await createHttpTransfersApi({ customer, now }).create("own", {
      from: savings(1),
      to: savings(2),
      amount: "10.50",
      description: "x",
    });
    expect(receipt.reference).toBe(1);
  });

  it.each([
    ["not enough money (403)", 403, answers.funds, "funds"],
    ["the same account (400)", 400, answers.same, "same"],
    ["a date in the future (400)", 400, answers.future, "date"],
  ])("tells %s", async (_name, status, data, code) => {
    const { customer } = fakeCustomer({ status, data });
    const error = await rejected(
      createHttpTransfersApi({ customer, now }).create("own", {
        from: savings(1),
        to: savings(2),
        amount: "10.50",
        description: "x",
      }),
    );
    expect(error.code).toBe(code);
  });
});
