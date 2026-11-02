import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { share, discovery, login, clientId } from "./fixtures/shares";
const base = "https://mx476-bank.invalid/api/v1/self";
async function configure(
  page: Page,
  options: { status?: number; discovery?: unknown; detail?: unknown; delay?: boolean } = {},
) {
  let reads = 0,
    release: (() => void) | undefined;
  await page.route("**/runtime-config.json", (r) =>
    r.fulfill({ json: { baseUrl: base, tenantId: "mx476-synthetic" } }),
  );
  await page.route(`${base}/**`, async (r) => {
    const path = new URL(r.request().url()).pathname.split("/self/")[1];
    if (path === "authentication") return r.fulfill({ json: login });
    if (path === "authentication/logout") return r.fulfill({ json: { status: "success" } });
    expect(r.request().method()).toBe("GET");
    expect(r.request().headers()["fineract-platform-tenantid"]).toBe("mx476-synthetic");
    expect(r.request().headers().authorization).toBe(
      `Basic ${login.base64EncodedAuthenticationKey}`,
    );
    reads++;
    if (path === `clients/${clientId}/accounts`)
      return r.fulfill({ json: options.discovery ?? discovery() });
    if (path.startsWith("shareaccounts/")) {
      if (options.delay)
        await new Promise<void>((r) => {
          release = r;
        });
      const id = Number(path.split("/")[1]);
      return r.fulfill({
        status: options.status ?? 200,
        json:
          options.detail ??
          share({
            id,
            ...(id === 477
              ? { accountNo: "SH-477", productName: "Synthetic Pending", status: { id: 100 } }
              : {}),
          }),
      });
    }
    throw new Error(`Unexpected route ${path}`);
  });
  return {
    get reads() {
      return reads;
    },
    release: () => release?.(),
  };
}
async function open(page: Page, en = false) {
  await page.goto("/");
  if (page.viewportSize()!.width < 600)
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  if (en)
    await page
      .locator(
        page.viewportSize()!.width < 600
          ? ".mobile-navigation .locale-toggle"
          : ".header-actions .locale-toggle",
      )
      .getByRole("button", { name: "EN", exact: true })
      .click();
  await page
    .getByRole("button", { name: en ? "Online banking" : "Banca en línea", exact: true })
    .click();
  await page.getByLabel(en ? "Username" : "Usuario", { exact: true }).fill("synthetic");
  await page.getByLabel(en ? "Password" : "Contraseña", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: en ? "Sign in" : "Iniciar sesión", exact: true }).click();
  await page
    .getByRole("button", {
      name: en ? "My Share Accounts" : "Mis cuentas de acciones",
      exact: true,
    })
    .click();
}
for (const en of [false, true])
  test(`share holdings and details ${en ? "English mobile" : "Spanish desktop"}`, async ({
    page,
  }) => {
    if (en) await page.setViewportSize({ width: 390, height: 844 });
    await configure(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, en);
    await expect(page.getByText("Synthetic Equity", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Synthetic Pending", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("71.75 MXN", { exact: true })).toBeVisible();
    const button = page.getByRole("button", { name: /SH-476/ });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Credited dividend|Dividendo acreditado/)).toBeVisible();
    await expect(page.getByText(/Pending dividend|Dividendo pendiente/)).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .include(".share-accounts")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `artifacts/mx476-${en ? "mobile-en" : "desktop-es"}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: en ? "Back to Share Accounts" : "Volver a cuentas de acciones",
        exact: true,
      })
      .click();
    await expect(button).toBeFocused();
    expect(errors).toEqual([]);
  });
for (const scenario of [
  { name: "empty", discovery: { shareAccounts: [] }, text: "No tienes cuentas de acciones." },
  {
    name: "malformed",
    discovery: { shareAccounts: {} },
    text: "La respuesta de acciones no es válida. Vuelve a consultar.",
  },
  { name: "denied", status: 403, text: "No tienes permiso para consultar estas acciones." },
  {
    name: "partial",
    status: 500,
    text: "Algunos detalles no están disponibles. Abre la cuenta para volver a consultar.",
  },
  {
    name: "unavailable valuation",
    detail: share({ currentMarketPrice: undefined }),
    text: "Valor no disponible",
  },
])
  test(`share state ${scenario.name}`, async ({ page }) => {
    await configure(page, scenario);
    await open(page);
    await expect(page.getByText(scenario.text, { exact: true }).first()).toBeVisible();
  });
test("expired session clears protected data", async ({ page }) => {
  await configure(page, { status: 401 });
  await open(page);
  await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic Equity", { exact: true })).toHaveCount(0);
});
test("logout during discovery enrichment discards late responses", async ({ page }) => {
  const mock = await configure(page, { delay: true });
  await open(page);
  await expect(page.getByText("Cargando acciones...", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  mock.release();
  await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic Equity", { exact: true })).toHaveCount(0);
});
test("demo sends no share requests", async ({ page }) => {
  const mock = await configure(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Banca en línea", exact: true }).click();
  await page
    .getByRole("button", { name: "Explorar demostración con datos ficticios", exact: true })
    .click();
  await page.getByRole("button", { name: "Completar con datos demo", exact: true }).click();
  await page.getByRole("button", { name: "Entrar a mi banca", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hola, Mariana.", exact: true })).toBeVisible();
  expect(mock.reads).toBe(0);
});
test("missing dividends and failed detail never fabricate holdings", async ({ page }) => {
  await configure(page, { detail: share({ dividends: undefined, currentMarketPrice: undefined }) });
  await open(page);
  await page.getByRole("button", { name: /SH-476/ }).click();
  await expect(page.getByText("Información de dividendos no disponible.")).toBeVisible();
  await page.route(`${base}/shareaccounts/476`, (r) => r.fulfill({ status: 404, json: {} }));
  await page.getByRole("button", { name: "Actualizar acciones", exact: true }).click();
  await expect(page.getByText("No se encontró la cuenta de acciones.")).toBeVisible();
  await expect(page.getByText("Synthetic Equity", { exact: true })).toHaveCount(0);
});
test("leaving a delayed detail discards it and preserves the new list", async ({ page }) => {
  await configure(page);
  await open(page);
  await expect(page.getByRole("button", { name: /SH-476/ })).toBeVisible();
  let release: (() => void) | undefined;
  await page.route(`${base}/shareaccounts/476`, async (r) => {
    await new Promise<void>((done) => {
      release = done;
    });
    await r.fulfill({ json: share({ productName: "Stale Detail" }) });
  });
  await page.getByRole("button", { name: /SH-476/ }).click();
  await expect(page.getByText("Cargando acciones...", { exact: true })).toBeVisible();
  await page.unroute(`${base}/shareaccounts/476`);
  await page.getByRole("button", { name: "Volver a cuentas de acciones", exact: true }).click();
  release?.();
  await expect(page.getByRole("button", { name: /SH-477/ })).toBeVisible();
  await expect(page.getByText("Stale Detail")).toHaveCount(0);
});
