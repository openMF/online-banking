import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider, LocaleToggle } from "../i18n";
import {
  AccountsError,
  parseSavingsAccounts,
  type AccountsClient,
  type ClientSavings,
} from "../lib/accounts/client";
import { SavingsAccounts } from "./SavingsAccounts";
import { accounts, summary } from "../../tests/fixtures/accounts";

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const one = (): ClientSavings[] => [{ clientId: 9001, accounts: parseSavingsAccounts(accounts()) }];
/** The answer is set before rendering: the list asks for it as soon as it appears. */
function setup(
  listSavings: AccountsClient["listSavings"] = async () => one(),
  props: Partial<ComponentProps<typeof SavingsAccounts>> = {},
) {
  const client = { listSavings: vi.fn(listSavings) },
    expired = vi.fn();
  const view = render(
    <I18nProvider>
      <LocaleToggle />
      <SavingsAccounts client={client} onExpired={expired} {...props} />
    </I18nProvider>,
  );
  return { client, expired, ...view };
}
const fail = (code: ConstructorParameters<typeof AccountsError>[0]) => async () => {
  throw new AccountsError(code);
};

it("says it is loading, then shows each account with its product, number, status and balance", async () => {
  let answer!: (groups: ClientSavings[]) => void;
  setup(() => new Promise((resolve) => (answer = resolve)));
  const section = screen.getByTestId("savings-accounts");
  expect(section.getAttribute("aria-busy")).toBe("true");
  expect(within(section).getByRole("status").textContent).toBe(
    "Consultando tus cuentas de ahorro…",
  );
  await act(async () => answer(one()));
  expect(section.getAttribute("aria-busy")).toBe("false");
  expect(within(section).getByRole("status").textContent).toBe("");
  const rows = within(section).getAllByRole("listitem");
  expect(rows.map((row) => row.dataset.testid)).toEqual([
    "savings-account-42",
    "savings-account-43",
    "savings-account-57",
  ]);
  expect(rows[0].textContent).toBe(
    "Synthetic WalletActivaCuenta 000000042Saldo disponible1,250.50 MXN",
  );
  // Fineract leaves a zero balance out: an active account still shows it.
  expect(within(rows[1]).getByRole("definition").textContent).toBe("0.00 MXN");
  // An application has no balance yet, and a recurring deposit says what it is.
  expect(rows[2].textContent).toBe(
    "Synthetic WalletPendiente de aprobaciónDepósito recurrente · Cuenta 000000057",
  );
  expect(within(section).queryByRole("alert")).toBeNull();
});

it("uses the account's own decimals and currency, and the server's word for an unknown status", async () => {
  setup(async () => [
    {
      clientId: 9001,
      accounts: parseSavingsAccounts({
        savingsAccounts: [
          summary(5, "active", {
            availableBalance: 1234567,
            currency: { code: "JPY", decimalPlaces: 0 },
            productName: undefined,
          }),
          summary(6, "active", {
            status: { id: 950, code: "savingsAccountStatusType.new", value: "Brand new" },
          }),
        ],
      }),
    },
  ]);
  expect((await screen.findByTestId("savings-account-5")).textContent).toBe(
    "Cuenta de ahorroActivaCuenta 000000005Saldo disponible1,234,567 JPY",
  );
  expect(screen.getByTestId("savings-account-6").textContent).toBe(
    "Synthetic WalletBrand newCuenta 000000006",
  );
});

it("tells a customer without savings accounts so", async () => {
  setup(async () => [{ clientId: 9001, accounts: [] }]);
  expect(await screen.findByText("Aún no tienes cuentas de ahorro.")).toBeTruthy();
  expect(screen.queryByRole("list")).toBeNull();
});

it("names each client when the login is linked to more than one", async () => {
  setup(async () => [...one(), { clientId: 9002, accounts: [] }]);
  const headings = await screen.findAllByRole("heading", { level: 3 });
  expect(headings.map((heading) => heading.textContent)).toEqual(["Cliente 9001", "Cliente 9002"]);
  expect(screen.getAllByRole("list")).toHaveLength(1);
  expect(screen.getByText("Sin cuentas de ahorro.")).toBeTruthy();
});

it("has no client heading for a single client", async () => {
  setup();
  await screen.findByTestId("savings-account-42");
  expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
});

it("retries a failure it can recover from, then shows the accounts", async () => {
  const listSavings = vi
    .fn<AccountsClient["listSavings"]>()
    .mockRejectedValueOnce(new AccountsError("unavailable"))
    .mockResolvedValue(one());
  setup(listSavings);
  expect((await screen.findByRole("alert")).textContent).toBe(
    "No pudimos consultar tus cuentas de ahorro. Intenta la consulta de nuevo.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(screen.queryByRole("alert")).toBeNull();
  await screen.findByTestId("savings-account-42");
  expect(listSavings).toHaveBeenCalledTimes(2);
});

it.each([
  ["offline", "Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.", true],
  ["malformed", "No pudimos verificar la respuesta de tu institución.", true],
  ["denied", "Tu institución no autorizó esta consulta. No se muestran datos protegidos.", false],
] as const)("explains %s, with a retry only when it can help", async (code, message, retry) => {
  setup(fail(code));
  expect((await screen.findByRole("alert")).textContent).toBe(message);
  expect(screen.queryByRole("button", { name: "Reintentar" }) !== null).toBe(retry);
  expect(screen.queryByRole("list")).toBeNull();
});

it("shows an unexpected failure as unavailable, never its text", async () => {
  setup(async () => {
    throw new Error("SECRET_INTERNAL_STACK");
  });
  expect((await screen.findByRole("alert")).textContent).toBe(
    "No pudimos consultar tus cuentas de ahorro. Intenta la consulta de nuevo.",
  );
  expect(document.body.textContent).not.toContain("SECRET");
});

it("hands an expired session back instead of showing an error", async () => {
  const { expired } = setup(fail("expired"));
  await waitFor(() => expect(expired).toHaveBeenCalledOnce());
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows every label in English when English is chosen", async () => {
  setup();
  await screen.findByTestId("savings-account-42");
  fireEvent.click(screen.getByRole("button", { name: "EN" }));
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("My savings accounts");
  expect(screen.getByTestId("savings-account-42").textContent).toBe(
    "Synthetic WalletActiveAccount 000000042Available balance1,250.50 MXN",
  );
  expect(screen.getByTestId("savings-account-57").textContent).toBe(
    "Synthetic WalletPending approvalRecurring deposit · Account 000000057",
  );
});

it("cancels its request when it closes and ignores a late answer", async () => {
  let answer!: (groups: ClientSavings[]) => void;
  let signal: AbortSignal | undefined;
  const { client, unmount } = setup((given) => {
    signal = given;
    return new Promise((resolve) => (answer = resolve));
  });
  unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => answer(one()));
  expect(client.listSavings).toHaveBeenCalledOnce();
});

it("never lets a late answer for an earlier client replace the current list", async () => {
  let late!: (groups: ClientSavings[]) => void;
  const earlier: AccountsClient = {
    listSavings: () => new Promise((resolve) => (late = resolve)),
  };
  const current: AccountsClient = {
    listSavings: async () => [
      { clientId: 9002, accounts: parseSavingsAccounts({ savingsAccounts: [summary(7)] }) },
    ],
  };
  const view = (client: AccountsClient) => (
    <I18nProvider>
      <SavingsAccounts client={client} onExpired={vi.fn()} />
    </I18nProvider>
  );
  const { rerender } = render(view(earlier));
  rerender(view(current));
  await screen.findByTestId("savings-account-7");
  await act(async () => late(one()));
  expect(screen.queryByTestId("savings-account-42")).toBeNull();
  expect(screen.getByTestId("savings-account-7")).toBeTruthy();
});

it("opens the details of a plain savings account only, and names the account it opens", async () => {
  const open = vi.fn();
  setup(undefined, { onOpen: open });
  await screen.findByTestId("savings-account-42");
  const section = screen.getByTestId("savings-accounts");
  expect(
    within(section)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label")),
  ).toEqual([
    "Ver detalles de Synthetic Wallet, cuenta 000000042",
    "Ver detalles de Synthetic Wallet, cuenta 000000043",
  ]);
  // The row reads as before: the product name is the button.
  expect(screen.getByTestId("savings-account-42").textContent).toBe(
    "Synthetic WalletActivaCuenta 000000042Saldo disponible1,250.50 MXN",
  );
  expect(within(screen.getByTestId("savings-account-57")).queryByRole("button")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Ver detalles de Synthetic Wallet, cuenta 000000043" }),
  );
  expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 43, accountNo: "000000043" }));
  fireEvent.click(screen.getByRole("button", { name: "EN" }));
  expect(
    screen.getByRole("button", { name: "View details of Synthetic Wallet, account 000000042" }),
  ).toBeTruthy();
});

it("opens nothing without a place to open it", async () => {
  setup();
  await screen.findByTestId("savings-account-42");
  expect(within(screen.getByTestId("savings-accounts")).queryAllByRole("button")).toEqual([]);
});

it("gives the focus back to the account it came from once the list is read", async () => {
  let answer!: (groups: ClientSavings[]) => void;
  const focused = vi.fn();
  setup(() => new Promise((resolve) => (answer = resolve)), {
    onOpen: vi.fn(),
    focusAccount: 43,
    onFocused: focused,
  });
  expect(focused).not.toHaveBeenCalled();
  await act(async () => answer(one()));
  expect(document.activeElement).toBe(
    within(screen.getByTestId("savings-account-43")).getByRole("button"),
  );
  expect(focused).toHaveBeenCalledOnce();
});

it("gives the focus to the list when the account is gone or the list fails", async () => {
  for (const listSavings of [async () => one(), fail("unavailable")]) {
    const focused = vi.fn();
    setup(listSavings, { onOpen: vi.fn(), focusAccount: 999, onFocused: focused });
    await waitFor(() => expect(focused).toHaveBeenCalledOnce());
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Mis cuentas de ahorro" }),
    );
    cleanup();
  }
});

it("leaves the focus where the customer moved it while the list was read", async () => {
  let answer!: (groups: ClientSavings[]) => void;
  const focused = vi.fn();
  setup(() => new Promise((resolve) => (answer = resolve)), {
    onOpen: vi.fn(),
    focusAccount: 43,
    onFocused: focused,
  });
  const elsewhere = screen.getByRole("button", { name: "EN" });
  elsewhere.focus();
  await act(async () => answer(one()));
  expect(document.activeElement).toBe(elsewhere);
  expect(focused).toHaveBeenCalledOnce();
});
