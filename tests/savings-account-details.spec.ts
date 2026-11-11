import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login } from "./fixtures/savings";
import { details, manyMovements, movement, movements } from "./fixtures/savingsDetails";

// US-E04-02 (MX-467): one savings account of the signed-in customer and its movements, against a
// faked backend.
const baseUrl = "https://mx467-bank.invalid/fineract-provider/api/v1/self";
type State = {
  /** While set, the account read is answered with this status. */
  status?: number;
  /** The movements of the account, when not the usual three. */
  transactions?: unknown[];
  listReads: number;
  reads: { url: URL; headers: Record<string, string> }[];
};
async function configure(page: Page, options: Partial<State> = {}): Promise<State> {
  const state: State = { listReads: 0, reads: [], ...options };
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
    const read = /^savingsaccounts\/(\d+)(?:\/transactions\/(\d+))?$/.exec(path);
    if (read) {
      expect(request.method()).toBe("GET");
      state.reads.push({ url, headers: request.headers() });
      if (state.status)
        return fulfill(route, { developerMessage: "SECRET_INTERNAL_STACK" }, state.status);
      const id = Number(read[1]),
        rows = state.transactions ?? movements(id);
      if (!read[2]) return fulfill(route, details(id, "active", { transactions: rows }));
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
const rows = (page: Page) => screen(page).getByRole("listitem");

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

test("lists twenty movements at a time, and says so when there are none", async ({ page }) => {
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
  state.transactions = [];
  await screen(page).getByRole("button", { name: "Volver a mi sesión", exact: true }).click();
  await open(page);
  await expect(screen(page)).toContainText("Aún no hay movimientos en esta cuenta.");
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
    "Transactions",
  ]);
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
