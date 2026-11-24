import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider, LocaleToggle } from "../i18n";
import { parseSavingsCharges, type SavingsCharge } from "../lib/accounts/charges";
import { AccountsError, parseSavingsAccount } from "../lib/accounts/client";
import {
  parseSavingsDetails,
  type SavingsDetails,
  type SavingsDetailsClient,
} from "../lib/accounts/details";
import { SavingsAccountDetails } from "./SavingsAccountDetails";
import { summary } from "../../tests/fixtures/accounts";
import {
  percentOfAmount,
  savingsCharge,
  savingsCharges,
} from "../../tests/fixtures/savingsCharges";
import { details, manyMovements } from "../../tests/fixtures/savingsDetails";

// US-E04-03 (MX-468): the charges of an account, on its details screen (MX-467).
beforeEach(() => localStorage.clear());
afterEach(cleanup);
const read = (data: unknown = details(), id = 42) => parseSavingsDetails(data, id, [9001]);
const chargesOf = (data: unknown[] = savingsCharges(), id = 42) => parseSavingsCharges(data, id);
/** The answers are set before rendering: the screen asks for them as soon as it appears. */
function setup(
  answerCharges: SavingsDetailsClient["charges"] = async () => chargesOf(),
  answer: SavingsDetailsClient["details"] = async () => read(),
) {
  const client = {
      details: vi.fn(answer),
      charges: vi.fn(answerCharges),
      movement: vi.fn(async (): Promise<never> => {
        throw new AccountsError("unavailable");
      }),
    },
    expired = vi.fn();
  const view = render(
    <I18nProvider>
      <LocaleToggle />
      <SavingsAccountDetails
        client={client}
        account={parseSavingsAccount(summary(42, "active", { availableBalance: 1250.5 }))}
        onExpired={expired}
        onClose={vi.fn()}
      />
    </I18nProvider>,
  );
  return { client, expired, ...view };
}
const fail = (code: ConstructorParameters<typeof AccountsError>[0]) => async (): Promise<never> => {
  throw new AccountsError(code);
};
const charges = () => screen.getByTestId("savings-charges");
const chargeRows = () => within(charges()).queryAllByRole("listitem");
const text = (id: number) => screen.getByTestId(`savings-charge-${id}`).textContent;

it("reads the charges alongside the account, and shows them only with it", async () => {
  let answer!: (read: SavingsDetails) => void;
  const { client } = setup(undefined, () => new Promise((resolve) => (answer = resolve)));
  // Asked at once, without waiting for the account.
  expect(client.charges).toHaveBeenCalledWith(42, expect.any(AbortSignal));
  await act(async () => {});
  expect(screen.queryByTestId("savings-charges")).toBeNull();
  await act(async () => answer(read()));
  expect(charges().getAttribute("aria-labelledby")).toBe("savings-charges-heading");
  expect(within(charges()).getByRole("heading", { level: 3 }).textContent).toBe("Cargos");
  // Still owed first, switched off last.
  expect(chargeRows().map((row) => row.dataset.testid)).toEqual([
    "savings-charge-2",
    "savings-charge-4",
    "savings-charge-1",
    "savings-charge-3",
    "savings-charge-5",
    "savings-charge-6",
  ]);
  // Between the dates and the movements.
  const headings = within(screen.getByTestId("savings-account-details"))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
  expect(headings).toEqual(["Interés", "Fechas", "Cargos", "Movimientos"]);
});

it("says what each charge is, when it applies, where it stands and what is left", async () => {
  setup();
  await screen.findByTestId("savings-charge-2");
  expect(text(2)).toBe(
    "Synthetic annual feePendienteCada año, el 15 de eneroMonto100.00 MXNPróximo cobro15 ene 2027Monto pendiente100.00 MXN",
  );
  expect(text(4)).toBe(
    "Synthetic monthly feePagado parcialmenteCada 2 meses, el día 5Monto30.00 MXNPróximo cobro5 dic 2026Monto pagado10.00 MXNMonto pendiente20.00 MXN",
  );
  // A percentage fee charged at each withdrawal: no amount, no status, its rate.
  expect(text(1)).toBe("Synthetic withdrawal feeEn cada retiroPorcentaje1.5%");
  expect(text(3)).toBe(
    "Synthetic overdraft penaltyPagadoPor sobregiro · PenalizaciónMonto50.00 MXNMonto pagado50.00 MXN",
  );
  expect(text(5)).toBe(
    "Synthetic waived feeCondonadoFecha específicaMonto25.00 MXNFecha de cobro15 dic 2026Monto condonado25.00 MXN",
  );
  expect(text(6)).toBe(
    "Synthetic inactive feeInactivoFecha específicaMonto25.00 MXNFecha de cobro15 dic 2026Monto pendiente25.00 MXN",
  );
  expect(within(charges()).queryByRole("alert")).toBeNull();
});

it("names every time a savings charge can apply, and the server's word for one it does not know", async () => {
  const times = [
    savingsCharge(1, "savingsActivation", { dueDate: undefined }),
    savingsCharge(2, "weeklyFee"),
    savingsCharge(3, "savingsNoActivityFee"),
    savingsCharge(4, "annualFee", { feeOnMonthDay: undefined }),
    savingsCharge(5, "monthlyFee"),
    savingsCharge(6, "monthlyFee", { feeOnMonthDay: [3, 31] }),
    savingsCharge(7, "monthlyFee", { feeInterval: 3 }),
    savingsCharge(8, "specifiedDueDate", {
      chargeTimeType: { id: 4, code: "chargeTimeType.savingsClosure", value: "Savings Closure" },
    }),
    savingsCharge(9, "specifiedDueDate", {
      chargeTimeType: { id: 99, code: "chargeTimeType.new", value: "Brand new" },
    }),
  ];
  setup(async () => chargesOf(times));
  await screen.findByTestId("savings-charge-9");
  const meta = (id: number) =>
    screen.getByTestId(`savings-charge-${id}`).querySelector(".account-item-meta")?.textContent;
  expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(meta)).toEqual([
    "Al activar la cuenta",
    "Cada semana",
    "Por inactividad",
    "Cada año",
    "Cada mes",
    "Cada mes, el día 31",
    "Cada 3 meses",
    "Al cerrar la cuenta",
    "Brand new",
  ]);
});

it("shows the rate and the amount of a percentage fee once Fineract has worked it out", async () => {
  setup(async () =>
    chargesOf([
      savingsCharge(1, "specifiedDueDate", {
        ...percentOfAmount,
        percentage: 2,
        amount: 20,
        amountOutstanding: 20,
      }),
    ]),
  );
  expect((await screen.findByTestId("savings-charge-1")).textContent).toBe(
    "Synthetic charge 1PendienteFecha específicaPorcentaje2%Monto20.00 MXNFecha de cobro15 dic 2026Monto pendiente20.00 MXN",
  );
});

it("tells a customer without charges so", async () => {
  setup(async () => []);
  expect(
    await within(await screen.findByTestId("savings-charges")).findByText(
      "Esta cuenta no tiene cargos.",
    ),
  ).toBeTruthy();
  expect(chargeRows()).toHaveLength(0);
});

it("says it is reading the charges while the account already shows", async () => {
  let answer!: (charges: SavingsCharge[]) => void;
  setup(() => new Promise((resolve) => (answer = resolve)));
  await screen.findByTestId("savings-charges");
  expect(charges().getAttribute("aria-busy")).toBe("true");
  expect(within(charges()).getByRole("status").textContent).toBe("Consultando los cargos…");
  await act(async () => answer(chargesOf()));
  expect(charges().getAttribute("aria-busy")).toBe("false");
  expect(within(charges()).getByRole("status").textContent).toBe("");
  expect(chargeRows()).toHaveLength(6);
});

it("keeps a charges failure to its own section, and tries only the charges again", async () => {
  let release: (() => void) | undefined;
  const answers: SavingsDetailsClient["charges"][] = [
    fail("unavailable"),
    () => new Promise((resolve) => (release = () => resolve(chargesOf()))),
  ];
  const { client } = setup((...args) => answers.shift()!(...args));
  expect(
    (await within(await screen.findByTestId("savings-charges")).findByRole("alert")).textContent,
  ).toBe("No pudimos consultar los cargos de esta cuenta. Intenta la consulta de nuevo.");
  // The account itself is still there.
  expect(screen.getByText("Saldo disponible")).toBeTruthy();
  expect(screen.getByTestId("movement-103")).toBeTruthy();
  fireEvent.click(within(charges()).getByRole("button", { name: "Reintentar" }));
  // While it tries again, the old failure is gone and the section says it is reading.
  expect(within(charges()).queryByRole("alert")).toBeNull();
  expect(within(charges()).getByRole("status").textContent).toBe("Consultando los cargos…");
  await act(async () => release!());
  await waitFor(() => expect(chargeRows()).toHaveLength(6));
  expect(client.charges).toHaveBeenCalledTimes(2);
  expect(client.details).toHaveBeenCalledOnce();
});

it("shows a refused or unverifiable read without charges, and offers no retry for a refused one", async () => {
  for (const [code, message, retry] of [
    ["denied", "Tu institución no autorizó esta consulta. No se muestran datos protegidos.", 0],
    ["malformed", "No pudimos verificar la respuesta de tu institución.", 1],
    ["offline", "Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.", 1],
  ] as const) {
    setup(fail(code));
    const section = await screen.findByTestId("savings-charges");
    expect((await within(section).findByRole("alert")).textContent, code).toBe(message);
    expect(chargeRows()).toHaveLength(0);
    expect(within(section).queryAllByRole("button"), code).toHaveLength(retry);
    cleanup();
  }
});

it("shows an unexpected failure as unavailable, never its text", async () => {
  setup(async () => {
    throw new Error("SECRET_INTERNAL_STACK");
  });
  await within(await screen.findByTestId("savings-charges")).findByRole("alert");
  expect(document.body.textContent).not.toContain("SECRET");
});

it("hands an expired session back instead of showing an error", async () => {
  const { expired } = setup(fail("expired"));
  await waitFor(() => expect(expired).toHaveBeenCalledOnce());
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows no charges when the account itself cannot be read", async () => {
  const { client } = setup(undefined, fail("unavailable"));
  await screen.findByRole("alert");
  await waitFor(() => expect(client.charges).toHaveBeenCalledOnce());
  expect(screen.queryByTestId("savings-charges")).toBeNull();
});

it("does not read the charges again for more movements", async () => {
  const history = manyMovements(25);
  const { client } = setup(undefined, async (_account, limit) =>
    read(details(42, "active", { transactions: history.slice(0, limit) })),
  );
  await screen.findByTestId("savings-charge-2");
  fireEvent.click(screen.getByRole("button", { name: "Mostrar más movimientos" }));
  await waitFor(() => expect(client.details).toHaveBeenCalledTimes(2));
  await screen.findByTestId("movement-1001");
  expect(client.charges).toHaveBeenCalledOnce();
});

it("shows every charge label in English when English is chosen", async () => {
  setup();
  await screen.findByTestId("savings-charge-2");
  fireEvent.click(screen.getByRole("button", { name: "EN" }));
  expect(within(charges()).getByRole("heading", { level: 3 }).textContent).toBe("Charges");
  expect(text(2)).toBe(
    "Synthetic annual feePendingEvery year on January 15Amount100.00 MXNNext chargeJan 15, 2027Amount outstanding100.00 MXN",
  );
  expect(text(4)).toBe(
    "Synthetic monthly feePartially paidEvery 2 months on day 5Amount30.00 MXNNext chargeDec 5, 2026Amount paid10.00 MXNAmount outstanding20.00 MXN",
  );
  expect(text(1)).toBe("Synthetic withdrawal feeOn each withdrawalPercentage1.5%");
  expect(text(3)).toBe(
    "Synthetic overdraft penaltyPaidWhen the account is overdrawn · PenaltyAmount50.00 MXNAmount paid50.00 MXN",
  );
  expect(text(5)).toBe(
    "Synthetic waived feeWaivedOn a specific dateAmount25.00 MXNDue dateDec 15, 2026Amount waived25.00 MXN",
  );
  expect(text(6)).toContain("Inactive");
});

it("cancels its read when the screen closes and ignores a late answer", async () => {
  let answer!: (charges: SavingsCharge[]) => void;
  let signal: AbortSignal | undefined;
  const { unmount, expired } = setup((_account, given) => {
    signal = given;
    return new Promise((resolve) => (answer = resolve));
  });
  unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => answer(chargesOf()));
  expect(expired).not.toHaveBeenCalled();
});

it("shows nothing of the previous account's charges while another account's are read", async () => {
  let answer!: (charges: SavingsCharge[]) => void;
  const client: SavingsDetailsClient = {
    details: async (id) => read(details(id), id),
    charges: (id) =>
      id === 42 ? Promise.resolve(chargesOf()) : new Promise((resolve) => (answer = resolve)),
    movement: async () => {
      throw new AccountsError("unavailable");
    },
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
  await screen.findByTestId("savings-charge-2");
  rerender(view(7));
  await screen.findByText("Cuenta 000000007");
  await waitFor(() => expect(screen.getByTestId("savings-charges")).toBeTruthy());
  expect(chargeRows()).toHaveLength(0);
  expect(within(charges()).getByRole("status").textContent).toBe("Consultando los cargos…");
  await act(async () => answer(chargesOf([savingsCharge(70, "specifiedDueDate", {}, 7)], 7)));
  expect(chargeRows().map((row) => row.dataset.testid)).toEqual(["savings-charge-70"]);
});

it("never lets a late answer for an earlier account replace the current one's charges", async () => {
  const answers = new Map<number, (charges: SavingsCharge[]) => void>();
  const client: SavingsDetailsClient = {
    details: async (id) => read(details(id), id),
    charges: (id) => new Promise((resolve) => answers.set(id, resolve)),
    movement: async () => {
      throw new AccountsError("unavailable");
    },
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
  await screen.findByTestId("savings-charges");
  await act(async () =>
    answers.get(7)!(chargesOf([savingsCharge(70, "specifiedDueDate", {}, 7)], 7)),
  );
  await act(async () => answers.get(42)!(chargesOf()));
  expect(chargeRows().map((row) => row.dataset.testid)).toEqual(["savings-charge-70"]);
});
