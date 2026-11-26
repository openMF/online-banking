import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login } from "./fixtures/savings";
import { savingsCharges } from "./fixtures/savingsCharges";
import { details, manyMovements, movement, movements } from "./fixtures/savingsDetails";

// US-E04-02 (MX-467): one savings account of the signed-in customer and its movements, and
// US-E04-03 (MX-468): its charges, against a faked backend.
const baseUrl = "https://mx467-bank.invalid/fineract-provider/api/v1/self";
type State = {
  /** While set, the account read is answered with this status. */
  status?: number;
  /** While set, the charges read is answered with this status. */
  chargesStatus?: number;
  /** The movements of the account, when not the usual three. */
  transactions?: unknown[];
  listReads: number;
  reads: { url: URL; headers: Record<string, string> }[];
  chargeReads: { url: URL; headers: Record<string, string> }[];
};
async function configure(page: Page, options: Partial<State> = {}): Promise<State> {
  const state: State = { listReads: 0, reads: [], chargeReads: [], ...options };
  const fulfill = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (route) =>
    fulfill(route, { baseUrl, tenantId: "mx467-synthetic" }),
  );
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.split("/self/")[1];
    if (path === "authentication") return fulfill(route, login);
    if (path === "authentication/logout") return fulfill(route, { status: "success" });
    if (path === `clients/${login.clients[0]}/accounts`) {
      state.listReads += 1;
      return fulfill(route, accounts());
    }
    const charges = /^savingsaccounts\/(\d+)\/charges$/.exec(path);
    if (charges) {
      expect(request.method()).toBe("GET");
      state.chargeReads.push({ url, headers: request.headers() });
      if (state.chargesStatus)
        return fulfill(route, { developerMessage: "SECRET_INTERNAL_STACK" }, state.chargesStatus);
      return fulfill(route, savingsCharges(Number(charges[1])));
    }
    const read = /^savingsaccounts\/(\d+)(?:\/transactions\/(\d+))?$/.exec(path);
    if (read) {
      expect(request.method()).toBe("GET");
      state.reads.push({ url, headers: request.headers() });
      if (state.status)
        return fulfill(route, { developerMessage: "SECRET_INTERNAL_STACK" }, state.status);
      const id = Number(read[1]),
        rows = state.transactions ?? movements(id);
      // Like the plugin: only the newest `lastTransactions` movements.
      const newest = rows.slice(0, Number(url.searchParams.get("lastTransactions")) || undefined);
      if (!read[2]) return fulfill(route, details(id, "active", { transactions: newest }));
      const row = rows.find((candidate) => (candidate as { id: number }).id === Number(read[2]));
      return fulfill(route, row ?? movement(Number(read[2]), "deposit", {}, id));
    }
    throw new Error(`Unexpected mocked request: ${request.method()} ${path}`);
  });
  return state;
}
async function signIn(page: Page, english = false) {
  await page.goto("/");
  if (english)
    await page
      .locator(".header-actions .locale-toggle")
      .getByRole("button", { name: "EN", exact: true })
      .click();
  await page
    .getByRole("button", { name: english ? "Online banking" : "Banca en línea", exact: true })
    .click();
  await page.getByLabel(english ? "Username" : "Usuario", { exact: true }).fill("synthetic");
  await page
    .getByLabel(english ? "Password" : "Contraseña", { exact: true })
    .fill("synthetic-pass");
  await page
    .getByRole("button", { name: english ? "Sign in" : "Iniciar sesión", exact: true })
    .click();
}
const open = (page: Page, account = "000000042") =>
  page.getByRole("button", { name: `Ver detalles de Synthetic Wallet, cuenta ${account}` }).click();
const screen = (page: Page) => page.getByTestId("savings-account-details");
// The movements only, not the charges.
const rows = (page: Page) => screen(page).locator('li[data-testid^="movement-"]');
const charges = (page: Page) => page.getByTestId("savings-charges");

test("opens an account from its row with the session's credential, and lists its movements", async ({
  page,
}) => {
  const state = await configure(page);
  await signIn(page);
  await open(page);
  await expect(page.getByTestId("savings-accounts")).toHaveCount(0);
  await expect(
    screen(page).getByRole("heading", { level: 2, name: "Synthetic Wallet" }),
  ).toBeFocused();
  await expect(rows(page)).toHaveText([
    "Retiro−250.00 MXN2 nov 2026 · Saldo 1,250.50 MXN",
    "Interés acreditado+0.50 MXN31 oct 2026 · Saldo 1,500.50 MXN",
    "Depósito+1,500.00 MXN15 oct 2026 · Saldo 1,500.00 MXN",
  ]);
  await expect(screen(page).locator(":scope > dl")).toHaveText([
    "Saldo disponible1,250.50 MXN",
    "Tasa de interés anual4.5%Interés ganado0.62 MXNInterés acreditado0.50 MXN",
    "Fecha de solicitud1 oct 2026Fecha de aprobación2 oct 2026Fecha de activación3 oct 2026",
  ]);
  await expect(screen(page).getByRole("alert")).toHaveCount(0);
  expect(state.reads.length).toBeGreaterThanOrEqual(1);
  for (const read of state.reads) {
    expect(read.url.pathname.endsWith("/self/savingsaccounts/42")).toBe(true);
    expect(read.url.searchParams.get("associations")).toBe("transactions");
    expect(read.url.searchParams.get("lastTransactions")).toBe("21");
    expect(read.headers.authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
    expect(read.headers["fineract-platform-tenantid"]).toBe("mx467-synthetic");
  }
});

test("opens a movement in place with how the money moved", async ({ page }) => {
  const state = await configure(page);
  await signIn(page);
  await open(page);
  const withdrawal = page.getByTestId("movement-103");
  const toggle = withdrawal.getByRole("button", { name: /^Retiro/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const before = state.reads.length;
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(withdrawal.locator("dl")).toHaveText(
    "Tipo de movimientoRetiroFecha2 nov 2026Monto−250.00 MXNSaldo después del movimiento1,250.50 MXNForma de pagoSynthetic cashNúmero de reciboSYN-103NotaSynthetic note",
  );
  const movementReads = state.reads.slice(before);
  expect(movementReads.length).toBeGreaterThanOrEqual(1);
  for (const read of movementReads)
    expect(read.url.pathname.endsWith("/self/savingsaccounts/42/transactions/103")).toBe(true);
  await toggle.click();
  await expect(withdrawal.locator("dl")).toHaveCount(0);
});

test("goes back to the list with fresh balances, and to the account it came from", async ({
  page,
}) => {
  const state = await configure(page);
  await signIn(page);
  await open(page, "000000043");
  await expect(screen(page).getByRole("heading", { level: 2 })).toBeFocused();
  const before = state.listReads;
  await screen(page).getByRole("button", { name: "Volver a mi sesión", exact: true }).click();
  await expect(screen(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ver detalles de Synthetic Wallet, cuenta 000000043" }),
  ).toBeFocused();
  expect(state.listReads).toBeGreaterThan(before);
});

test("reads twenty more movements at a time, and says so when there are none", async ({ page }) => {
  const state = await configure(page, { transactions: manyMovements(45) });
  await signIn(page);
  await open(page);
  await expect(rows(page)).toHaveCount(20);
  await screen(page).getByRole("button", { name: "Mostrar más movimientos" }).click();
  await expect(rows(page)).toHaveCount(40);
  await expect(page.getByTestId("movement-1025").getByRole("button")).toBeFocused();
  await screen(page).getByRole("button", { name: "Mostrar más movimientos" }).click();
  await expect(rows(page)).toHaveCount(45);
  await expect(screen(page).getByRole("button", { name: "Mostrar más movimientos" })).toHaveCount(
    0,
  );
  // One more than is listed each time, which tells whether there are more.
  const limits = state.reads
    .filter((read) => !read.url.pathname.includes("/transactions/"))
    .map((read) => read.url.searchParams.get("lastTransactions"));
  expect([...new Set(limits)]).toEqual(["21", "41", "61"]);
  state.transactions = [];
  await screen(page).getByRole("button", { name: "Volver a mi sesión", exact: true }).click();
  await open(page);
  await expect(screen(page)).toContainText("No hay movimientos para mostrar.");
  await expect(screen(page)).toContainText(
    "Algunos movimientos, como los revertidos, pueden no mostrarse aquí.",
  );
  await expect(rows(page)).toHaveCount(0);
});

test("a service that stays down is explained, and trying again shows the account", async ({
  page,
}) => {
  const state = await configure(page, { status: 500 });
  await signIn(page);
  await open(page);
  await expect(screen(page).getByRole("alert")).toHaveText(
    "No pudimos consultar esta cuenta. Intenta la consulta de nuevo.",
  );
  await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
  state.status = undefined;
  await screen(page).getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(screen(page).getByRole("alert")).toHaveCount(0);
});

test("a refused read shows no account data, and the way back", async ({ page }) => {
  await configure(page, { status: 403 });
  await signIn(page);
  await open(page);
  await expect(screen(page).getByRole("alert")).toHaveText(
    "Tu institución no autorizó esta consulta. No se muestran datos protegidos.",
  );
  await expect(screen(page).locator("dl")).toHaveCount(0);
  await expect(screen(page).getByRole("button")).toHaveText(["Volver a mi sesión"]);
});

test("an expired session ends instead of showing the account", async ({ page }) => {
  await configure(page, { status: 401 });
  await signIn(page);
  await open(page);
  await expect(page.getByRole("status").filter({ hasText: "Tu sesión ha expirado" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toHaveCount(0);
});

test("reads the account's charges with the session's credential, still owed first", async ({
  page,
}) => {
  const state = await configure(page);
  await signIn(page);
  await open(page);
  await expect(charges(page).getByRole("listitem")).toHaveCount(6);
  await expect(charges(page).getByRole("listitem").first()).toHaveText(
    "Synthetic annual feePendienteCada año, el 15 de eneroMonto100.00 MXNPróximo cobro15 ene 2027Monto pendiente100.00 MXN",
  );
  await expect(page.getByTestId("savings-charge-1")).toHaveText(
    "Synthetic withdrawal feeEn cada retiroPorcentaje1.5%",
  );
  expect(state.chargeReads.length).toBeGreaterThanOrEqual(1);
  for (const read of state.chargeReads) {
    expect(read.url.pathname.endsWith("/self/savingsaccounts/42/charges")).toBe(true);
    expect(read.url.searchParams.get("chargeStatus")).toBe("all");
    expect(read.headers.authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
    expect(read.headers["fineract-platform-tenantid"]).toBe("mx467-synthetic");
  }
});

test("a charges failure stays in its own section, and trying again shows them", async ({
  page,
}) => {
  const state = await configure(page, { chargesStatus: 500 });
  await signIn(page);
  await open(page);
  await expect(charges(page).getByRole("alert")).toHaveText(
    "No pudimos consultar los cargos de esta cuenta. Intenta la consulta de nuevo.",
  );
  await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
  // The account and its movements still show.
  await expect(rows(page)).toHaveCount(3);
  state.chargesStatus = undefined;
  await charges(page).getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(charges(page).getByRole("listitem")).toHaveCount(6);
  await expect(charges(page).getByRole("alert")).toHaveCount(0);
});

test("English renders on desktop and mobile without overflow, accessibility or runtime errors", async ({
  page,
}) => {
  await configure(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page, true);
  await page
    .getByRole("button", { name: "View details of Synthetic Wallet, account 000000042" })
    .click();
  await expect(rows(page).first()).toHaveText(
    "Withdrawal−250.00 MXNNov 2, 2026 · Balance 1,250.50 MXN",
  );
  await page.getByTestId("movement-103").getByRole("button").click();
  await expect(page.getByTestId("movement-103").locator("dl")).toContainText(
    "Payment methodSynthetic cashReceipt numberSYN-103NoteSynthetic note",
  );
  await expect(screen(page).getByRole("heading", { level: 3 })).toHaveText([
    "Interest",
    "Dates",
    "Charges",
    "Transactions",
  ]);
  await expect(screen(page)).toContainText(
    "Some transactions, such as reversed ones, may not be shown here.",
  );
  await expect(page.getByTestId("savings-charge-2")).toHaveText(
    "Synthetic annual feePendingEvery year on January 15Amount100.00 MXNNext chargeJan 15, 2027Amount outstanding100.00 MXN",
  );
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `artifacts/mx467-details-${name}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});
