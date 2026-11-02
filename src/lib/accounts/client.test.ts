import { describe, expect, it, vi } from "vitest";
import { AuthenticationError, type CustomerSession } from "../authentication/client";
import {
  AccountsError,
  createAccountsClient,
  parseSavingsAccount,
  parseSavingsAccounts,
} from "./client";
import { accounts, summary } from "../../../tests/fixtures/accounts";
import { login } from "../../../tests/fixtures/savings";

function setup(clients: number[] = [9001], answer = () => accounts()) {
  const request = vi.fn<CustomerSession["request"]>().mockImplementation(async () => ({
    status: 200,
    ok: true,
    data: answer(),
  }));
  const session: CustomerSession = {
    identity: { ...login, clients },
    expiresAt: Date.now() + 900000,
    logout: vi.fn(),
    request,
  };
  return { request, client: createAccountsClient(session) };
}
const failure = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => error,
  );

describe("SavingsAccountSummaryData adapter", () => {
  it("reads only what the list shows", () => {
    expect(parseSavingsAccount(summary(42, "active", { availableBalance: 1250.5 }))).toEqual({
      id: 42,
      accountNo: "000000042",
      productName: "Synthetic Wallet",
      status: { id: 300, code: "savingsAccountStatusType.active", value: "Active" },
      depositType: "savings",
      currency: { code: "MXN", decimalPlaces: 2 },
      availableBalance: 1250.5,
    });
  });
  it("shows a missing balance as zero only for accounts that were ever active", () => {
    for (const state of ["active", "closed", "matured"] as const)
      expect(parseSavingsAccount(summary(1, state)).availableBalance, state).toBe(0);
    for (const state of ["pending", "approved", "rejected", "withdrawn"] as const)
      expect(
        parseSavingsAccount(summary(1, state, { availableBalance: 5 })),
        state,
      ).not.toHaveProperty("availableBalance");
    expect(
      parseSavingsAccount(summary(1, "active", { availableBalance: -12.75 })).availableBalance,
    ).toBe(-12.75);
  });
  it("names every deposit type and refuses one it does not know", () => {
    expect(parseSavingsAccount(summary(1, "active", {}, "fixed")).depositType).toBe("fixed");
    expect(parseSavingsAccount(summary(1, "active", {}, "recurring")).depositType).toBe(
      "recurring",
    );
    expect(
      parseSavingsAccount(summary(1, "active", { depositType: { id: 400 } })).depositType,
    ).toBe("current");
    for (const id of [0, 999, "constructor", undefined])
      expect(
        () => parseSavingsAccount(summary(1, "active", { depositType: { id } })),
        String(id),
      ).toThrow(new AccountsError("malformed"));
  });
  it("keeps an account without a product name, which the screen labels itself", () => {
    expect(
      parseSavingsAccount(summary(1, "active", { productName: " " })).productName,
    ).toBeUndefined();
  });
  it("refuses a whole answer it cannot verify instead of guessing", () => {
    const broken: Record<string, unknown>[] = [
      { id: undefined },
      { id: 0 },
      { accountNo: undefined },
      { accountNo: " " },
      { status: undefined },
      { status: { id: 300, code: "savingsAccountStatusType.active" } },
      // An id that disagrees with its code would show the wrong label and a balance.
      { status: { id: 300, code: "savingsAccountStatusType.rejected", value: "Active" } },
      { status: { id: 100, code: "savingsAccountStatusType.active", value: "Active" } },
      { currency: undefined },
      { currency: { code: "mxn", decimalPlaces: 2 } },
      { currency: { code: "MXN", decimalPlaces: 2.5 } },
      { availableBalance: "1250.50" },
      { availableBalance: Number.NaN },
    ];
    for (const extra of broken)
      expect(
        () =>
          parseSavingsAccounts({ savingsAccounts: [summary(42), summary(43, "active", extra)] }),
        JSON.stringify(extra),
      ).toThrow(new AccountsError("malformed"));
    expect(() => parseSavingsAccounts([])).toThrow(new AccountsError("malformed"));
    expect(() => parseSavingsAccounts({ savingsAccounts: {} })).toThrow(
      new AccountsError("malformed"),
    );
    expect(() => parseSavingsAccounts({ savingsAccounts: [summary(42), summary(42)] })).toThrow(
      new AccountsError("malformed"),
    );
  });
  it("reads a client without savings, which Fineract sends without the list", () => {
    // What a real instance answers to ?fields=savingsAccounts for such a client: the lists that
    // the field filter does not know stay, and the empty savings list is left out.
    expect(
      parseSavingsAccounts({ groupLoanIndividualMonitoringAccounts: [], guarantorAccounts: [] }),
    ).toEqual([]);
    expect(parseSavingsAccounts({})).toEqual([]);
    expect(parseSavingsAccounts({ savingsAccounts: [] })).toEqual([]);
  });
  it("lists active accounts first, then applications, finished and refused ones, keeping the server order", () => {
    const listed = parseSavingsAccounts({
      savingsAccounts: [
        summary(1, "pending"),
        summary(2, "approved"),
        summary(3, "active"),
        summary(4, "withdrawn"),
        summary(5, "rejected"),
        summary(6, "closed"),
        summary(7, "matured"),
        summary(8, "active", {
          status: { id: 950, code: "savingsAccountStatusType.new", value: "New" },
        }),
        summary(9, "active"),
      ],
    });
    expect(listed.map((account) => account.id)).toEqual([3, 9, 1, 2, 6, 7, 4, 5, 8]);
  });
});

describe("authenticated accounts client", () => {
  it("asks once per linked client for its savings accounts only", async () => {
    const { request, client } = setup([9001, 9002]);
    const signal = new AbortController().signal;
    const groups = await client.listSavings(signal);
    expect(request.mock.calls).toEqual([
      ["clients/9001/accounts", { method: "GET", signal, query: { fields: "savingsAccounts" } }],
      ["clients/9002/accounts", { method: "GET", signal, query: { fields: "savingsAccounts" } }],
    ]);
    expect(groups.map((group) => group.clientId)).toEqual([9001, 9002]);
    expect(groups[0].accounts.map((account) => account.id)).toEqual([42, 43, 57]);
  });
  it("reads a client listed twice by the login only once", async () => {
    const { request, client } = setup([9001, 9002, 9001]);
    const groups = await client.listSavings();
    expect(request.mock.calls.map(([resource]) => resource)).toEqual([
      "clients/9001/accounts",
      "clients/9002/accounts",
    ]);
    expect(groups.map((group) => group.clientId)).toEqual([9001, 9002]);
  });
  it("sends nothing without a linked client, or for an identifier that is not one", async () => {
    const none = setup([]);
    expect(await none.client.listSavings()).toEqual([]);
    expect(none.request).not.toHaveBeenCalled();
    const invalid = setup([9001, 0]);
    expect(await failure(invalid.client.listSavings())).toEqual(new AccountsError("denied"));
    expect(invalid.request).not.toHaveBeenCalled();
  });
  it("maps server answers to safe failures without their private text", async () => {
    for (const [status, code] of [
      [401, "expired"],
      [403, "denied"],
      [404, "denied"],
      [500, "unavailable"],
      [503, "unavailable"],
    ] as const) {
      const { request, client } = setup();
      request.mockResolvedValue({
        status,
        ok: false,
        data: { developerMessage: "SECRET_INTERNAL_STACK" },
      });
      const error = await failure(client.listSavings());
      expect(error, String(status)).toEqual(new AccountsError(code));
      expect(String((error as Error).message)).not.toContain("SECRET");
    }
  });
  it("tells offline apart from an unavailable server and an expired session", async () => {
    for (const [thrown, code] of [
      [new AuthenticationError("offline"), "offline"],
      [new AuthenticationError("expired"), "expired"],
      [new AuthenticationError("network"), "unavailable"],
      [new AuthenticationError("timeout"), "unavailable"],
      [new TypeError("Failed to fetch"), "unavailable"],
    ] as const) {
      const { request, client } = setup();
      request.mockRejectedValue(thrown);
      expect(await failure(client.listSavings()), code).toEqual(new AccountsError(code));
    }
  });
  it("fails the whole list when one client fails, so a partial list never looks complete", async () => {
    const { request, client } = setup([9001, 9002]);
    request.mockImplementation(async (resource) =>
      resource === "clients/9002/accounts"
        ? { status: 503, ok: false, data: {} }
        : { status: 200, ok: true, data: accounts() },
    );
    expect(await failure(client.listSavings())).toEqual(new AccountsError("unavailable"));
  });
});
