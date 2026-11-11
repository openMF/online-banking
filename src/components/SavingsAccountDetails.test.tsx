import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider, LocaleToggle } from "../i18n";
import { AccountsError, parseSavingsAccount } from "../lib/accounts/client";
import {
  parseMovementDetail,
  parseSavingsDetails,
  type MovementDetail,
  type SavingsDetails,
  type SavingsDetailsClient,
} from "../lib/accounts/details";
import { SavingsAccountDetails } from "./SavingsAccountDetails";
import { summary } from "../../tests/fixtures/accounts";
import { details, manyMovements, movement, movements } from "../../tests/fixtures/savingsDetails";

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const active = parseSavingsAccount(summary(42, "active", { availableBalance: 1250.5 }));
const read = (data: unknown = details()) => parseSavingsDetails(data, 42, [9001]);
const readMovement = async (_account: number, id: number) =>
  parseMovementDetail(movements().find((row) => row.id === id) ?? movement(id), 42, id);
/** The answers are set before rendering: the screen asks for the account as soon as it appears. */
function setup(
  answer: SavingsDetailsClient["details"] = async () => read(),
  answerMovement: SavingsDetailsClient["movement"] = readMovement,
  account = active,
) {
  const client = { details: vi.fn(answer), movement: vi.fn(answerMovement) },
    expired = vi.fn(),
    close = vi.fn();
  const view = render(
    <I18nProvider>
      <LocaleToggle />
      <SavingsAccountDetails
        client={client}
        account={account}
        onExpired={expired}
        onClose={close}
      />
    </I18nProvider>,
  );
  return { client, expired, close, ...view };
}
const fail = (code: ConstructorParameters<typeof AccountsError>[0]) => async (): Promise<never> => {
  throw new AccountsError(code);
};
const section = () => screen.getByTestId("savings-account-details");
/** Each term of a description list with its description. */
const pairs = (list: Element) =>
  [...list.querySelectorAll("dt")].map((term) => [
    term.textContent,
    term.nextElementSibling?.textContent,
  ]);
const lists = () => [...section().querySelectorAll(":scope > dl")].map(pairs);
const rows = () => within(section()).queryAllByRole("listitem");
const toggle = (id: number) =>
  within(screen.getByTestId(`movement-${id}`)).getAllByRole("button")[0];

it("names the account at once, then shows its balance, interest, dates and movements, newest first", async () => {
  let answer!: (read: SavingsDetails) => void;
  const { client } = setup(() => new Promise((resolve) => (answer = resolve)));
  const heading = screen.getByRole("heading", { level: 2 });
  expect(heading.textContent).toBe("Synthetic Wallet");
  expect(document.activeElement).toBe(heading);
  expect(section().getAttribute("aria-busy")).toBe("true");
  expect(within(section()).getByRole("status").textContent).toBe("Consultando tu cuenta…");
  expect(client.details).toHaveBeenCalledWith(42, expect.any(AbortSignal));
  await act(async () => answer(read()));
  expect(section().getAttribute("aria-busy")).toBe("false");
  expect(within(section()).getByRole("status").textContent).toBe("");
  expect(section().querySelector(".account-item-meta")?.textContent).toBe("Cuenta 000000042");
  expect(lists()).toEqual([
    [["Saldo disponible", "1,250.50 MXN"]],
    [
      ["Tasa de interés anual", "4.5%"],
      ["Interés ganado", "0.62 MXN"],
      ["Interés acreditado", "0.50 MXN"],
    ],
    [
      ["Fecha de solicitud", "1 oct 2026"],
      ["Fecha de aprobación", "2 oct 2026"],
      ["Fecha de activación", "3 oct 2026"],
    ],
  ]);
  expect(
    within(section())
      .getAllByRole("heading", { level: 3 })
      .map((title) => title.textContent),
  ).toEqual(["Interés", "Fechas", "Movimientos"]);
  expect(rows().map((row) => row.textContent)).toEqual([
    "Retiro−250.00 MXN2 nov 2026 · Saldo 1,250.50 MXN",
    "Interés acreditado+0.50 MXN31 oct 2026 · Saldo 1,500.50 MXN",
    "Depósito+1,500.00 MXN15 oct 2026 · Saldo 1,500.00 MXN",
  ]);
  expect(within(section()).queryByRole("alert")).toBeNull();
  expect(client.movement).not.toHaveBeenCalled();
});

it("shows the ledger balance and the money on hold only when some is held", async () => {
  setup(async () =>
    read(
      details(42, "active", {
        savingsAmountOnHold: 200,
        summary: { accountBalance: 1250.5, availableBalance: 1050.5 },
      }),
    ),
  );
  await screen.findByText("Saldo contable");
  expect(lists()[0]).toEqual([
    ["Saldo disponible", "1,050.50 MXN"],
    ["Saldo contable", "1,250.50 MXN"],
    ["Monto retenido", "200.00 MXN"],
  ]);
});

it("shows an application with its dates, but no balance, earned interest or movements", async () => {
  setup(
    async () => read(details(42, "pending")),
    readMovement,
    parseSavingsAccount(summary(42, "pending")),
  );
  await screen.findByText("Aún no hay movimientos en esta cuenta.");
  expect(section().querySelector(".account-status")?.textContent).toBe("Pendiente de aprobación");
  expect(lists()).toEqual([
    [["Tasa de interés anual", "4.5%"]],
    [["Fecha de solicitud", "1 oct 2026"]],
  ]);
  expect(rows()).toHaveLength(0);
});

it("uses the account's own decimals, and the server's word without a sign for a movement type it does not know", async () => {
  const yen = { currency: { code: "JPY", decimalPlaces: 0 } };
  setup(async () =>
    read(
      details(42, "active", {
        ...yen,
        summary: { availableBalance: 1234567, accountBalance: 1234567 },
        transactions: [
          movement(9, "deposit", {
            amount: 5,
            runningBalance: 1234567,
            transactionType: { id: 99, code: "savingsAccountTransactionType.new", value: "New" },
          }),
        ],
      }),
    ),
  );
  expect((await screen.findByTestId("movement-9")).textContent).toBe(
    "New5 JPY2 nov 2026 · Saldo 1,234,567 JPY",
  );
  expect(lists()[0]).toEqual([["Saldo disponible", "1,234,567 JPY"]]);
});

it("opens a movement in place, reads it once, and closes it again", async () => {
  let answer!: (read: MovementDetail) => void;
  const { client } = setup(undefined, () => new Promise((resolve) => (answer = resolve)));
  await screen.findByTestId("movement-103");
  const button = toggle(103);
  const panel = document.getElementById(button.getAttribute("aria-controls")!)!;
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(panel.hidden).toBe(true);
  fireEvent.click(button);
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(panel.hidden).toBe(false);
  expect(within(panel).getByRole("status").textContent).toBe("Consultando el movimiento…");
  expect(client.movement).toHaveBeenCalledWith(42, 103, expect.any(AbortSignal));
  await act(async () => answer(await readMovement(42, 103)));
  expect(pairs(panel.querySelector("dl")!)).toEqual([
    ["Tipo de movimiento", "Retiro"],
    ["Fecha", "2 nov 2026"],
    ["Monto", "−250.00 MXN"],
    ["Saldo después del movimiento", "1,250.50 MXN"],
    ["Forma de pago", "Synthetic cash"],
    ["Número de recibo", "SYN-103"],
    ["Nota", "Synthetic note"],
  ]);
  expect(within(panel).queryByRole("status")).toBeNull();
  fireEvent.click(button);
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(panel.hidden).toBe(true);
  fireEvent.click(button);
  expect(pairs(panel.querySelector("dl")!)).toHaveLength(7);
  expect(client.movement).toHaveBeenCalledOnce();
});

it("leaves out what a movement does not have, and says when it was reversed", async () => {
  setup(undefined, async (_account, id) =>
    parseMovementDetail(movement(id, "payCharge", { reversed: true }), 42, id),
  );
  await screen.findByTestId("movement-102");
  fireEvent.click(toggle(102));
  const panel = screen.getByTestId("movement-102");
  await within(panel).findByText("Este movimiento fue revertido.");
  expect(pairs(panel.querySelector("dl")!).map(([term]) => term)).toEqual([
    "Tipo de movimiento",
    "Fecha",
    "Monto",
    "Saldo después del movimiento",
  ]);
});

it("explains a movement it could not read, tries again, and never retries a refused one", async () => {
  const answers: SavingsDetailsClient["movement"][] = [fail("unavailable"), readMovement];
  const { client } = setup(undefined, (...args) => answers.shift()!(...args));
  await screen.findByTestId("movement-103");
  fireEvent.click(toggle(103));
  const panel = screen.getByTestId("movement-103");
  expect((await within(panel).findByRole("alert")).textContent).toBe(
    "No pudimos consultar este movimiento. Intenta la consulta de nuevo.",
  );
  fireEvent.click(within(panel).getByRole("button", { name: "Reintentar" }));
  await within(panel).findByText("SYN-103");
  expect(within(panel).queryByRole("alert")).toBeNull();
  expect(client.movement).toHaveBeenCalledTimes(2);

  cleanup();
  setup(undefined, fail("denied"));
  await screen.findByTestId("movement-101");
  fireEvent.click(toggle(101));
  const refused = screen.getByTestId("movement-101");
  expect((await within(refused).findByRole("alert")).textContent).toBe(
    "Tu institución no autorizó esta consulta. No se muestran datos protegidos.",
  );
  expect(within(refused).getAllByRole("button")).toHaveLength(1);
});

it("lists twenty movements at a time and moves to the first new one", async () => {
  setup(async () => read(details(42, "active", { transactions: manyMovements(45) })));
  await screen.findByTestId("movement-1045");
  expect(rows()).toHaveLength(20);
  fireEvent.click(screen.getByRole("button", { name: "Mostrar más movimientos" }));
  expect(rows()).toHaveLength(40);
  expect(document.activeElement).toBe(toggle(1025));
  fireEvent.click(screen.getByRole("button", { name: "Mostrar más movimientos" }));
  expect(rows()).toHaveLength(45);
  expect(document.activeElement).toBe(toggle(1005));
  expect(screen.queryByRole("button", { name: "Mostrar más movimientos" })).toBeNull();
});

it("retries a failure it can recover from, and always offers the way back", async () => {
  const answers: SavingsDetailsClient["details"][] = [
    fail("unavailable"),
    fail("malformed"),
    async () => read(),
  ];
  const { client, close } = setup((...args) => answers.shift()!(...args));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "No pudimos consultar esta cuenta. Intenta la consulta de nuevo.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe(
      "No pudimos verificar la respuesta de tu institución.",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByTestId("movement-103");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(client.details).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByRole("button", { name: "Volver a mi sesión" }));
  expect(close).toHaveBeenCalledOnce();
});

it("shows a refused read without account data or a retry, but with the way back", async () => {
  setup(fail("denied"));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Tu institución no autorizó esta consulta. No se muestran datos protegidos.",
  );
  expect(section().querySelector("dl")).toBeNull();
  expect(
    within(section())
      .getAllByRole("button")
      .map((button) => button.textContent),
  ).toEqual(["Volver a mi sesión"]);
});

it("shows an unexpected failure as unavailable, never its text", async () => {
  setup(async () => {
    throw new Error("SECRET_INTERNAL_STACK");
  });
  expect((await screen.findByRole("alert")).textContent).toBe(
    "No pudimos consultar esta cuenta. Intenta la consulta de nuevo.",
  );
  expect(document.body.textContent).not.toContain("SECRET");
});

it("hands an expired session back instead of showing an error, for the account or a movement", async () => {
  const account = setup(fail("expired"));
  await waitFor(() => expect(account.expired).toHaveBeenCalledOnce());
  expect(screen.queryByRole("alert")).toBeNull();
  cleanup();
  const movementRead = setup(undefined, fail("expired"));
  await screen.findByTestId("movement-103");
  fireEvent.click(toggle(103));
  await waitFor(() => expect(movementRead.expired).toHaveBeenCalledOnce());
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows every label in English when English is chosen", async () => {
  setup();
  await screen.findByTestId("movement-103");
  fireEvent.click(screen.getByRole("button", { name: "EN" }));
  expect(section().querySelector(".account-status")?.textContent).toBe("Active");
  expect(section().querySelector(".account-item-meta")?.textContent).toBe("Account 000000042");
  expect(lists().map((list) => list.map(([term]) => term))).toEqual([
    ["Available balance"],
    ["Annual interest rate", "Interest earned", "Interest posted"],
    ["Application date", "Approval date", "Activation date"],
  ]);
  expect(lists()[2][0][1]).toBe("Oct 1, 2026");
  expect(rows()[0].textContent).toBe("Withdrawal−250.00 MXNNov 2, 2026 · Balance 1,250.50 MXN");
  fireEvent.click(toggle(103));
  await within(rows()[0]).findByText("Payment method");
  expect(screen.getByRole("button", { name: "Back to my session" })).toBeTruthy();
});

it("cancels its reads when it closes and ignores late answers", async () => {
  let answer!: (read: SavingsDetails) => void;
  let signal: AbortSignal | undefined;
  const first = setup((_account, given) => {
    signal = given;
    return new Promise((resolve) => (answer = resolve));
  });
  first.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => answer(read()));
  expect(first.client.details).toHaveBeenCalledOnce();

  let answerMovement!: (read: MovementDetail) => void;
  const second = setup(undefined, (_account, _id, given) => {
    signal = given;
    return new Promise((resolve) => (answerMovement = resolve));
  });
  await screen.findByTestId("movement-103");
  fireEvent.click(toggle(103));
  second.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => answerMovement(await readMovement(42, 103)));
  expect(second.expired).not.toHaveBeenCalled();
});

it("never lets a late answer for an earlier account replace the current one", async () => {
  let late!: (read: SavingsDetails) => void;
  const client: SavingsDetailsClient = {
    details: (id) =>
      id === 42
        ? new Promise((resolve) => (late = resolve))
        : Promise.resolve(
            parseSavingsDetails(
              details(7, "active", { summary: { availableBalance: 70, accountBalance: 70 } }),
              7,
              [9001],
            ),
          ),
    movement: readMovement,
  };
  const view = (account: number) => (
    <I18nProvider>
      <SavingsAccountDetails
        client={client}
        account={parseSavingsAccount(summary(account))}
        onExpired={vi.fn()}
        onClose={vi.fn()}
      />
    </I18nProvider>
  );
  const { rerender } = render(view(42));
  rerender(view(7));
  await screen.findByText("Cuenta 000000007");
  await waitFor(() => expect(rows()).toHaveLength(3));
  await act(async () => late(read()));
  expect(section().querySelector(".account-item-meta")?.textContent).toBe("Cuenta 000000007");
  expect(lists()[0]).toEqual([["Saldo disponible", "70.00 MXN"]]);
});
