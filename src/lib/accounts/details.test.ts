import { describe, expect, it, vi } from "vitest";
import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { AccountsError } from "./client";
import { createSavingsDetailsClient, parseMovementDetail, parseSavingsDetails } from "./details";
import { details, movement, movements } from "../../../tests/fixtures/savingsDetails";
import { login } from "../../../tests/fixtures/savings";

function setup(clients: number[] = [9001], answer: () => unknown = () => details()) {
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
  return { request, client: createSavingsDetailsClient(session) };
}
const failure = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => error,
  );
const malformed = new AccountsError("malformed");

describe("SavingsAccountData adapter", () => {
  it("reads only what the details screen shows", () => {
    expect(parseSavingsDetails(details(), 42, [9001])).toEqual({
      id: 42,
      accountNo: "000000042",
      clientId: 9001,
      productName: "Synthetic Wallet",
      status: { id: 300, code: "savingsAccountStatusType.active", value: "Active" },
      currency: { code: "MXN", decimalPlaces: 2 },
      balances: { available: 1250.5, ledger: 1250.5, onHold: 0 },
      interest: { rate: 4.5, earned: 0.62, posted: 0.5 },
      dates: {
        submitted: "2026-10-01",
        approved: "2026-10-02",
        activated: "2026-10-03",
        closed: undefined,
      },
      movements: [
        {
          id: 103,
          date: "2026-11-02",
          type: { id: 2, value: "Withdrawal" },
          direction: "out",
          amount: 250,
          runningBalance: 1250.5,
        },
        {
          id: 102,
          date: "2026-10-31",
          type: { id: 3, value: "Interest Posting" },
          direction: "in",
          amount: 0.5,
          runningBalance: 1500.5,
        },
        {
          id: 101,
          date: "2026-10-15",
          type: { id: 1, value: "Deposit" },
          direction: "in",
          amount: 1500,
          runningBalance: 1500,
        },
      ],
    });
  });
  it("shows an application with its dates, but without balances, earned interest or movements", () => {
    const read = parseSavingsDetails(details(42, "pending"), 42, [9001]);
    expect(read.status.id).toBe(100);
    expect(read).not.toHaveProperty("balances");
    expect(read.interest).toEqual({ rate: 4.5 });
    expect(read.dates).toEqual({ submitted: "2026-10-01" });
    expect(read.movements).toEqual([]);
  });
  it("keeps money on hold apart from the available balance", () => {
    const read = parseSavingsDetails(
      details(42, "active", {
        onHoldFunds: 100,
        savingsAmountOnHold: 50,
        summary: { accountBalance: 1250.5, availableBalance: 1100.5 },
      }),
      42,
      [9001],
    );
    expect(read.balances).toEqual({ available: 1100.5, ledger: 1250.5, onHold: 150 });
  });
  it("reads amounts Fineract leaves out as zero", () => {
    const read = parseSavingsDetails(
      details(42, "active", { nominalAnnualInterestRate: null, summary: {} }),
      42,
      [9001],
    );
    expect(read.balances).toEqual({ available: 0, ledger: 0, onHold: 0 });
    expect(read.interest).toEqual({ rate: 0, earned: 0, posted: 0 });
    expect(
      parseSavingsDetails(details(42, "active", { summary: undefined }), 42, [9001]).balances,
    ).toEqual({ available: 0, ledger: 0, onHold: 0 });
  });
  it("refuses another account, an account of another client, or a product this screen does not show", () => {
    // Without movements, whose own account would give it away first.
    expect(() => parseSavingsDetails(details(43, "pending"), 42, [9001])).toThrow(malformed);
    expect(() => parseSavingsDetails(details(), 42, [9002])).toThrow(malformed);
    expect(() =>
      parseSavingsDetails(details(42, "active", { clientId: undefined }), 42, [9001]),
    ).toThrow(malformed);
    expect(() =>
      parseSavingsDetails(
        details(42, "active", {
          depositType: { id: 200, code: "depositAccountType.fixedDeposit" },
        }),
        42,
        [9001],
      ),
    ).toThrow(malformed);
  });
  it("refuses a whole answer it cannot verify instead of guessing", () => {
    const broken: Record<string, unknown>[] = [
      { accountNo: " " },
      { status: { id: 300, code: "savingsAccountStatusType.rejected", value: "Active" } },
      { currency: { code: "mxn", decimalPlaces: 2 } },
      { summary: [] },
      { summary: { availableBalance: "1250.50" } },
      { summary: { accountBalance: Number.NaN } },
      { summary: { totalInterestPosted: "0.5" } },
      { timeline: "2026-10-01" },
      { timeline: { submittedOnDate: [2026, 2, 30] } },
      { timeline: { activatedOnDate: "2026-10-03" } },
      { nominalAnnualInterestRate: "4.5" },
      { nominalAnnualInterestRate: -1 },
      { onHoldFunds: -100 },
      { transactions: {} },
    ];
    for (const extra of broken)
      expect(
        () => parseSavingsDetails(details(42, "active", extra), 42, [9001]),
        JSON.stringify(extra),
      ).toThrow(malformed);
    expect(() => parseSavingsDetails([], 42, [9001])).toThrow(malformed);
  });
});

describe("movements", () => {
  const read = (transactions: unknown[]) =>
    parseSavingsDetails(details(42, "active", { transactions }), 42, [9001]).movements;
  it("gives each movement its direction, and shows a type it does not know without one", () => {
    const directions = read([
      movement(1, "deposit"),
      movement(2, "withdrawal"),
      movement(3, "interestPosting"),
      movement(4, "payCharge"),
      movement(5, "onHold"),
      movement(6, "deposit", {
        transactionType: { id: 99, code: "savingsAccountTransactionType.new", value: "New" },
      }),
    ]).map((row) => [row.id, row.direction, row.type.value]);
    expect(directions).toEqual([
      [1, "in", "Deposit"],
      [2, "out", "Withdrawal"],
      [3, "in", "Interest Posting"],
      [4, "out", "Pay Charge"],
      [5, "out", "Amount on hold"],
      [6, "none", "New"],
    ]);
  });
  it("lists the newest first, keeps the server order within a day, and leaves out reversed ones", () => {
    const listed = read([
      movement(1, "deposit", { date: [2026, 10, 1] }),
      movement(3, "deposit", { date: [2026, 11, 2] }),
      movement(2, "deposit", { date: [2026, 11, 2] }),
      movement(4, "deposit", { date: [2026, 11, 3], reversed: true }),
    ]);
    expect(listed.map((row) => row.id)).toEqual([3, 2, 1]);
  });
  it("keeps a movement without a running balance", () => {
    const [row] = read([movement(1, "deposit", { runningBalance: null })]);
    expect(row.id).toBe(1);
    expect(row.runningBalance).toBeUndefined();
  });
  it("refuses a list it cannot verify instead of guessing", () => {
    const broken: unknown[][] = [
      [movement(1), movement(1)],
      [movement(1, "deposit", {}, 43)],
      [movement(1, "deposit", { id: 0 })],
      [movement(1, "deposit", { transactionType: undefined })],
      // An id that disagrees with its code would show the wrong label and sign.
      [
        movement(1, "deposit", {
          transactionType: {
            id: 1,
            code: "savingsAccountTransactionType.withdrawal",
            value: "Withdrawal",
          },
        }),
      ],
      [movement(1, "deposit", { date: undefined })],
      [movement(1, "deposit", { date: [2026, 13, 1] })],
      [movement(1, "deposit", { amount: undefined })],
      [movement(1, "deposit", { amount: "100" })],
      [movement(1, "deposit", { amount: -100 })],
      [movement(1, "deposit", { runningBalance: "100" })],
      [movement(1, "deposit", { reversed: "false" })],
      [null],
    ];
    for (const rows of broken) expect(() => read(rows), JSON.stringify(rows)).toThrow(malformed);
  });
});

describe("SavingsAccountTransactionData adapter", () => {
  it("reads how the money moved", () => {
    expect(parseMovementDetail(movements()[0], 42, 103)).toEqual({
      id: 103,
      date: "2026-11-02",
      type: { id: 2, value: "Withdrawal" },
      direction: "out",
      amount: 250,
      runningBalance: 1250.5,
      paymentType: "Synthetic cash",
      receiptNumber: "SYN-103",
      note: "Synthetic note",
      reversed: false,
    });
    // A charge has no payment details, and a blank note is no note.
    const charge = parseMovementDetail(movement(7, "payCharge", { note: " " }), 42, 7);
    expect(charge.direction).toBe("out");
    expect(charge.paymentType).toBeUndefined();
    expect(charge.receiptNumber).toBeUndefined();
    expect(charge.note).toBeUndefined();
    expect(parseMovementDetail(movement(7, "deposit", { reversed: true }), 42, 7).reversed).toBe(
      true,
    );
  });
  it("refuses another movement, a movement of another account, or details it cannot verify", () => {
    for (const [data, account, id] of [
      [movement(7), 42, 8],
      [movement(7, "deposit", {}, 43), 42, 7],
      [movement(7, "deposit", { accountId: undefined }), 42, 7],
      [movement(7, "deposit", { paymentDetailData: "cash" }), 42, 7],
      [movement(7, "deposit", { paymentDetailData: { paymentType: "cash" } }), 42, 7],
      [movement(7, "deposit", { amount: "100" }), 42, 7],
    ] as const)
      expect(() => parseMovementDetail(data, account, id), JSON.stringify(data)).toThrow(malformed);
  });
});

describe("authenticated savings details client", () => {
  it("asks for the account with its movements, and for one movement by its own path", async () => {
    const { request, client } = setup([9002, 9001]);
    const signal = new AbortController().signal;
    expect((await client.details(42, signal)).movements).toHaveLength(3);
    request.mockResolvedValueOnce({ status: 200, ok: true, data: movements()[0] });
    expect((await client.movement(42, 103, signal)).receiptNumber).toBe("SYN-103");
    expect(request.mock.calls).toEqual([
      ["savingsaccounts/42", { method: "GET", signal, query: { associations: "transactions" } }],
      ["savingsaccounts/42/transactions/103", { method: "GET", signal, query: undefined }],
    ]);
  });
  it("refuses an account of a client this login is not linked to", async () => {
    const { client } = setup([9002]);
    expect(await failure(client.details(42))).toEqual(malformed);
  });
  it("sends nothing for an identifier that is not one", async () => {
    const { request, client } = setup();
    for (const task of [
      client.details(0),
      client.details(Number.NaN),
      client.movement(42, 0),
      client.movement(-1, 103),
    ])
      expect(await failure(task)).toEqual(new AccountsError("denied"));
    expect(request).not.toHaveBeenCalled();
  });
  it("maps server answers and lost connections to safe failures", async () => {
    for (const [answer, code] of [
      [{ status: 401, ok: false, data: {} }, "expired"],
      [{ status: 404, ok: false, data: { developerMessage: "SECRET_INTERNAL_STACK" } }, "denied"],
      [
        { status: 500, ok: false, data: { developerMessage: "SECRET_INTERNAL_STACK" } },
        "unavailable",
      ],
      [new AuthenticationError("offline"), "offline"],
      [new AuthenticationError("expired"), "expired"],
    ] as const) {
      for (const read of ["details", "movement"] as const) {
        const { request, client } = setup();
        if (answer instanceof Error) request.mockRejectedValue(answer);
        else request.mockResolvedValue(answer);
        const error = await failure(
          read === "details" ? client.details(42) : client.movement(42, 103),
        );
        expect(error, `${read} ${code}`).toEqual(new AccountsError(code));
        expect(String((error as Error).message)).not.toContain("SECRET");
      }
    }
  });
});
