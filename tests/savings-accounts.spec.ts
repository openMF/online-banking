import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { accounts } from "./fixtures/accounts";
import { login, template } from "./fixtures/savings";

// US-E04-01 (MX-466): the signed-in customer's savings accounts, against a faked backend.
const baseUrl = "https://mx466-bank.invalid/fineract-provider/api/v1/self";
type State = {
  clients: number[];
  /** While set, the accounts read is answered with this status. */
  status?: number;
  malformed?: boolean;
  reads: { url: URL; headers: Record<string, string> }[];
};
async function configure(page: Page, options: Partial<State> = {}): Promise<State> {
  const state: State = { clients: login.clients, reads: [], ...options };
  const fulfill = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (route) =>
    fulfill(route, { baseUrl, tenantId: "mx466-synthetic" }),
  );
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.split("/self/")[1];
    if (path === "authentication") return fulfill(route, { ...login, clients: state.clients });
    if (path === "authentication/logout") return fulfill(route, { status: "success" });
    if (path === "savingsaccounts/template")
      return fulfill(route, { ...template(), clientId: Number(url.searchParams.get("clientId")) });
    const linked = /^clients\/(\d+)\/accounts$/.exec(path);
    if (linked) {
      expect(request.method()).toBe("GET");
      expect(state.clients).toContain(Number(linked[1]));
      state.reads.push({ url, headers: request.headers() });
      if (state.status)
        return fulfill(route, { developerMessage: "SECRET_INTERNAL_STACK" }, state.status);
      // Each linked client has its own accounts: 42, 43, 57 for the first, 1042... for the second.
      const offset = state.clients.indexOf(Number(linked[1])) * 1000;
      return fulfill(route, state.malformed ? { savingsAccounts: [{}] } : accounts(offset));
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
const list = (page: Page) => page.getByTestId("savings-accounts");

test("lists the linked client's accounts from the real route, with the session's credential", async ({
  page,
}) => {
  const state = await configure(page);
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Mis cuentas de ahorro", exact: true }),
  ).toBeVisible();
  await expect(list(page).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByTestId("savings-account-42")).toHaveText(
    "Synthetic WalletActivaCuenta 000000042Saldo disponible1,250.50 MXN",
  );
  await expect(page.getByTestId("savings-account-43")).toContainText("0.00 MXN");
  await expect(page.getByTestId("savings-account-57")).toHaveText(
    "Synthetic WalletPendiente de aprobaciónDepósito recurrente · Cuenta 000000057",
  );
  await expect(list(page).getByRole("alert")).toHaveCount(0);
  expect(state.reads.length).toBeGreaterThanOrEqual(1);
  for (const read of state.reads) {
    expect(read.url.searchParams.get("fields")).toBe("savingsAccounts");
    expect(read.headers.authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
    expect(read.headers["fineract-platform-tenantid"]).toBe("mx466-synthetic");
  }
});

test("names each client when the login is linked to more than one", async ({ page }) => {
  await configure(page, { clients: [9001, 9002] });
  await signIn(page);
  await expect(list(page).getByRole("heading", { level: 3 })).toHaveText([
    "Cliente 9001",
    "Cliente 9002",
  ]);
  // Each account is listed under its own client, never under the other one.
  const client = (heading: string) =>
    list(page).locator(".savings-accounts-client").filter({ hasText: heading });
  await expect(client("Cliente 9001").getByRole("listitem")).toHaveCount(3);
  await expect(client("Cliente 9001").getByTestId("savings-account-42")).toBeVisible();
  await expect(client("Cliente 9001").getByTestId("savings-account-1042")).toHaveCount(0);
  await expect(client("Cliente 9002").getByRole("listitem")).toHaveCount(3);
  await expect(client("Cliente 9002").getByTestId("savings-account-1042")).toBeVisible();
  await expect(client("Cliente 9002").getByTestId("savings-account-42")).toHaveCount(0);
});

test("a service that stays down is explained, and trying again shows the accounts", async ({
  page,
}) => {
  const state = await configure(page, { status: 500 });
  await signIn(page);
  await expect(list(page).getByRole("alert")).toHaveText(
    "No pudimos consultar tus cuentas de ahorro. Intenta la consulta de nuevo.",
  );
  await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
  state.status = undefined;
  await list(page).getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(list(page).getByRole("listitem")).toHaveCount(3);
  await expect(list(page).getByRole("alert")).toHaveCount(0);
});

for (const [scenario, options, message] of [
  [
    "a refused read",
    { status: 403 },
    "Tu institución no autorizó esta consulta. No se muestran datos protegidos.",
  ],
  [
    "an answer it cannot verify",
    { malformed: true },
    "No pudimos verificar la respuesta de tu institución.",
  ],
] as const) {
  test(`${scenario} shows no account data`, async ({ page }) => {
    await configure(page, options);
    await signIn(page);
    await expect(list(page).getByRole("alert")).toHaveText(message);
    await expect(list(page).getByRole("listitem")).toHaveCount(0);
    await expect(list(page).getByRole("button", { name: "Reintentar" })).toHaveCount(
      "malformed" in options ? 1 : 0,
    );
  });
}

test("an expired session ends instead of showing the list", async ({ page }) => {
  await configure(page, { status: 401 });
  await signIn(page);
  await expect(page.getByRole("status").filter({ hasText: "Tu sesión ha expirado" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toHaveCount(0);
});

test("the list hides while a screen is open and reads the balances again when it closes", async ({
  page,
}) => {
  const state = await configure(page);
  await signIn(page);
  await expect(list(page).getByRole("listitem")).toHaveCount(3);
  const before = state.reads.length;
  await page.getByRole("button", { name: "Solicitar una cuenta de ahorro", exact: true }).click();
  await expect(list(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Volver a mi sesión", exact: true }).click();
  await expect(list(page).getByRole("listitem")).toHaveCount(3);
  expect(state.reads.length).toBeGreaterThan(before);
});

test("English renders on desktop and mobile without overflow, accessibility or runtime errors", async ({
  page,
}) => {
  await configure(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page, true);
  await expect(
    page.getByRole("heading", { name: "My savings accounts", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("savings-account-42")).toHaveText(
    "Synthetic WalletActiveAccount 000000042Available balance1,250.50 MXN",
  );
  await expect(page.getByTestId("savings-account-57")).toContainText(
    "Pending approvalRecurring deposit · Account 000000057",
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
    await page.screenshot({ path: `artifacts/mx466-accounts-${name}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});
