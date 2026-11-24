import { describe, expect, it, vi } from "vitest";
import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { parseSavingsCharges } from "./charges";
import { AccountsError } from "./client";
import { createSavingsDetailsClient } from "./details";
import {
  percentOfAmount,
  savingsCharge,
  savingsCharges,
} from "../../../tests/fixtures/savingsCharges";
import { login } from "../../../tests/fixtures/savings";

function setup(answer: () => unknown = () => savingsCharges()) {
  const request = vi.fn<CustomerSession["request"]>().mockImplementation(async () => ({
    status: 200,
    ok: true,
    data: answer(),
  }));
  const session: CustomerSession = {
    identity: { ...login, clients: [9001] },
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
const one = (data: unknown) => parseSavingsCharges([data], 42)[0];

describe("SavingsAccountChargeData adapter", () => {
  it("reads only what the screen shows", () => {
    expect(one(savingsCharges()[1])).toEqual({
      id: 2,
      name: "Synthetic annual fee",
      when: { id: 6, value: "Annual Fee" },
      calculation: "flat",
      amount: 100,
      currency: { code: "MXN", decimalPlaces: 2 },
      paid: 0,
      waived: 0,
      writtenOff: 0,
      outstanding: 100,
      dueDate: "2027-01-15",
      feeOn: { month: 1, day: 15 },
      feeInterval: undefined,
      penalty: false,
      active: true,
      status: "pending",
    });
  });
  it("names where each charge stands, a switched-off one first of all", () => {
    expect(
      Object.fromEntries(parseSavingsCharges(savingsCharges(), 42).map((c) => [c.id, c.status])),
    ).toEqual({ 1: "none", 2: "pending", 3: "none", 4: "partial", 5: "waived", 6: "inactive" });
    // Paid and partly waived is paid; owed but switched off is inactive.
    expect(
      one(
        savingsCharge(7, "specifiedDueDate", {
          amountPaid: 20,
          amountWaived: 5,
          amountOutstanding: 0,
        }),
      ).status,
    ).toBe("paid");
    expect(one(savingsCharge(8, "specifiedDueDate", { isActive: false })).status).toBe("inactive");
  });
  it("gives no status to fees charged at each withdrawal or overdraft, even with something owed", () => {
    for (const time of ["withdrawalFee", "overdraftFee"] as const) {
      for (const amounts of [
        { amountPaid: 0, amountOutstanding: 12 },
        { amountPaid: 30, amountOutstanding: 12 },
        { amountPaid: 30, amountOutstanding: 0 },
      ]) {
        const charge = one(savingsCharge(20, time, amounts));
        expect(charge.status, `${time} ${JSON.stringify(amounts)}`).toBe("none");
        // The amounts themselves are kept.
        expect(charge).toMatchObject({
          paid: amounts.amountPaid,
          outstanding: amounts.amountOutstanding,
        });
      }
      // Switched off is still said.
      expect(one(savingsCharge(21, time, { isActive: false })).status).toBe("inactive");
    }
  });
  it("lists what is still owed first and switched-off charges last, keeping the server order", () => {
    expect(parseSavingsCharges(savingsCharges(), 42).map((charge) => charge.id)).toEqual([
      2, 4, 1, 3, 5, 6,
    ]);
  });
  it("reads amounts Fineract leaves out as zero", () => {
    const charge = one(
      savingsCharge(9, "withdrawalFee", {
        amount: null,
        amountPaid: null,
        amountWaived: undefined,
        amountWrittenOff: null,
        amountOutstanding: null,
      }),
    );
    expect(charge).toMatchObject({ amount: 0, paid: 0, waived: 0, writtenOff: 0, outstanding: 0 });
    expect(charge.status).toBe("none");
  });
  it("keeps the rate of a percentage fee, and none for a flat one", () => {
    expect(one(savingsCharges()[0])).toMatchObject({
      calculation: "percent",
      percentage: 1.5,
      amount: 0,
    });
    expect(one(savingsCharges()[1])).not.toHaveProperty("percentage");
    const interest = {
      chargeCalculationType: {
        id: 4,
        code: "chargeCalculationType.percent.of.interest",
        value: "% Interest",
      },
    };
    expect(one(savingsCharge(10, "annualFee", { ...interest, percentage: 2 })).calculation).toBe(
      "percent",
    );
  });
  it("reads when a recurring fee is charged, including 29 February", () => {
    expect(one(savingsCharges()[3])).toMatchObject({
      dueDate: "2026-12-05",
      feeOn: { month: 12, day: 5 },
      feeInterval: 2,
    });
    expect(one(savingsCharge(11, "annualFee", { feeOnMonthDay: [2, 29] })).feeOn).toEqual({
      month: 2,
      day: 29,
    });
  });
  it("shows a time it does not know with the server's word", () => {
    expect(
      one(
        savingsCharge(12, "specifiedDueDate", {
          chargeTimeType: { id: 99, code: "chargeTimeType.new", value: "New" },
        }),
      ).when,
    ).toEqual({ id: 99, value: "New" });
  });
  it("refuses a whole answer it cannot verify instead of guessing", () => {
    const broken: Record<string, unknown>[] = [
      { accountId: 43 },
      { accountId: undefined },
      { id: 0 },
      { name: " " },
      { chargeTimeType: undefined },
      // An id that disagrees with its code would say the wrong thing about when it is charged.
      { chargeTimeType: { id: 5, code: "chargeTimeType.annualFee", value: "Annual Fee" } },
      { chargeCalculationType: { id: 9, code: "chargeCalculationType.new", value: "New" } },
      { chargeCalculationType: { id: 1, code: "chargeCalculationType.percent.of.amount" } },
      { currency: { code: "mxn", decimalPlaces: 2 } },
      { amount: "25" },
      { amountPaid: -1 },
      { amountOutstanding: Number.NaN },
      { dueDate: [2026, 2, 30] },
      { feeOnMonthDay: [2, 30] },
      { feeOnMonthDay: [13, 1] },
      { feeOnMonthDay: "01-15" },
      { feeInterval: 0 },
      { penalty: "no" },
      { isActive: "yes" },
      { ...percentOfAmount, percentage: -1 },
    ];
    for (const extra of broken)
      expect(
        () =>
          parseSavingsCharges([savingsCharge(1), savingsCharge(2, "specifiedDueDate", extra)], 42),
        JSON.stringify(extra),
      ).toThrow(malformed);
    expect(() => parseSavingsCharges({ charges: [] }, 42)).toThrow(malformed);
    expect(() => parseSavingsCharges([savingsCharge(1), savingsCharge(1)], 42)).toThrow(malformed);
    expect(() => parseSavingsCharges([null], 42)).toThrow(malformed);
    expect(parseSavingsCharges([], 42)).toEqual([]);
  });
});

describe("savings charges read", () => {
  it("asks for every charge of the account, active or not", async () => {
    const { request, client } = setup();
    const signal = new AbortController().signal;
    expect(await client.charges(42, signal)).toHaveLength(6);
    expect(request.mock.calls).toEqual([
      ["savingsaccounts/42/charges", { method: "GET", signal, query: { chargeStatus: "all" } }],
    ]);
  });
  it("sends nothing for an identifier that is not one", async () => {
    const { request, client } = setup();
    for (const id of [0, -1, Number.NaN, 2.5])
      expect(await failure(client.charges(id)), String(id)).toEqual(new AccountsError("denied"));
    expect(request).not.toHaveBeenCalled();
  });
  it("refuses charges of another account", async () => {
    const { client } = setup(() => savingsCharges(43));
    expect(await failure(client.charges(42))).toEqual(malformed);
  });
  it("maps server answers and lost connections to safe failures", async () => {
    for (const [answer, code] of [
      [{ status: 401, ok: false, data: {} }, "expired"],
      [{ status: 403, ok: false, data: { developerMessage: "SECRET_INTERNAL_STACK" } }, "denied"],
      [
        { status: 500, ok: false, data: { developerMessage: "SECRET_INTERNAL_STACK" } },
        "unavailable",
      ],
      [new AuthenticationError("offline"), "offline"],
      [new AuthenticationError("expired"), "expired"],
    ] as const) {
      const { request, client } = setup();
      if (answer instanceof Error) request.mockRejectedValue(answer);
      else request.mockResolvedValue(answer);
      const error = await failure(client.charges(42));
      expect(error, code).toEqual(new AccountsError(code));
      expect(String((error as Error).message)).not.toContain("SECRET");
    }
  });
});
