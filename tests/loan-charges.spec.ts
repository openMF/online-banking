import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { charges, charge } from "./fixtures/charges";
import { loan, login, products, product, template, clientId } from "./fixtures/loans";
const base = "https://mx475-bank.invalid/fineract-provider/api/v1/self";
async function configure(
  page: Page,
  options: { data?: unknown; status?: number; network?: boolean; delay?: boolean } = {},
) {
  let reads = 0;
  let release: (() => void) | undefined;
  const mutations: string[] = [];
  const fulfill = (r: Route, data: unknown, status = 200) =>
    r.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (r) =>
    fulfill(r, { baseUrl: base, tenantId: "mx475-synthetic" }),
  );
  await page.route(`${base}/**`, async (r) => {
    const req = r.request(),
      path = new URL(req.url()).pathname.split("/self/")[1];
    if (path === "authentication") return fulfill(r, login);
    if (path === "authentication/logout") return fulfill(r, { status: "success" });
    expect(req.headers()["fineract-platform-tenantid"]).toBe("mx475-synthetic");
    expect(req.headers().authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
    if (req.method() !== "GET") {
      mutations.push(path);
      return fulfill(r, {}, 405);
    }
    if (/loans\/\d+\/charges/.test(path)) {
      reads++;
      expect(new URL(req.url()).search).toBe("");
      if (options.delay)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (options.network) return r.abort("failed");
      return fulfill(r, options.data === undefined ? charges() : options.data, options.status);
    }
    if (path === "loanproducts") return fulfill(r, products);
    if (path.startsWith("loanproducts/")) return fulfill(r, product());
    if (path === "loans/template") return fulfill(r, template());
    if (path === `clients/${clientId}/accounts`)
      return fulfill(r, {
        loanAccounts: [
          { id: 473, productName: "Synthetic Loan" },
          { id: 475, productName: "Synthetic Other Loan" },
        ],
      });
    if (/^loans\/\d+$/.test(path)) return fulfill(r, { ...loan(), id: Number(path.split("/")[1]) });
    throw new Error(`Unexpected synthetic route ${path}`);
  });
  return {
    get reads() {
      return reads;
    },
    mutations,
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
    .getByRole("button", { name: en ? "Apply for a loan" : "Solicitar un préstamo", exact: true })
    .click();
  await page.getByRole("button", { name: /Synthetic Loan ·/ }).click();
  await page
    .getByRole("button", {
      name: en ? "View loan charges" : "Ver cargos del préstamo",
      exact: true,
    })
    .click();
}
for (const en of [false, true])
  test(`charges, refresh, keyboard, accessibility (${en ? "English mobile" : "Spanish desktop"})`, async ({
    page,
  }) => {
    if (en) await page.setViewportSize({ width: 390, height: 844 });
    const mock = await configure(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, en);
    const panel = page.getByRole("region", {
      name: en ? "Loan Charges" : "Cargos del préstamo",
      exact: true,
    });
    for (const label of en
      ? ["Paid", "Unpaid", "Partially paid", "Waived"]
      : ["Pagado", "No pagado", "Pagado parcialmente", "Condonado"])
      await expect(panel.getByText(label, { exact: true })).toBeVisible();
    await expect(panel.getByText("75.25 MXN", { exact: true })).toBeVisible();
    await panel
      .getByRole("button", { name: en ? "Refresh charges" : "Actualizar cargos", exact: true })
      .click();
    await expect.poll(() => mock.reads).toBe(2);
    await expect(panel.getByText("Synthetic paid fee")).toBeVisible();
    await expect(page.getByText(/Total Cost of Credit|Costo total del crédito/)).toHaveCount(0);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".loan-charges")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `artifacts/mx475-${en ? "mobile-en" : "desktop-es"}.png`,
      fullPage: true,
    });
    await panel
      .getByRole("button", {
        name: en ? "Back to loan details" : "Volver al detalle del préstamo",
        exact: true,
      })
      .click();
    const entry = panel.getByRole("button", {
      name: en ? "View loan charges" : "Ver cargos del préstamo",
      exact: true,
    });
    await expect(entry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(panel.getByText("Synthetic paid fee")).toBeVisible();
    expect(mock.mutations).toEqual([]);
    expect(errors).toEqual([]);
  });
for (const scenario of [
  { name: "empty", data: [], text: "Este préstamo no tiene cargos registrados." },
  {
    name: "unknown",
    data: [charge({ paid: undefined, currency: undefined, dueDate: undefined })],
    text: "Estado no disponible",
  },
  { name: "malformed", data: {}, text: "La respuesta de cargos no es válida. Vuelve a consultar." },
  {
    name: "forbidden",
    status: 403,
    text: "No tienes permiso para consultar los cargos de este préstamo.",
  },
  { name: "not found", status: 404, text: "No se encontró el préstamo solicitado." },
  { name: "server", status: 500, text: "No pudimos cargar los cargos. Inténtalo de nuevo." },
  { name: "network", network: true, text: "No pudimos cargar los cargos. Inténtalo de nuevo." },
])
  test(`charges state: ${scenario.name}`, async ({ page }) => {
    await configure(page, scenario);
    await open(page);
    await expect(page.getByText(scenario.text, { exact: true })).toBeVisible();
    if (!["empty", "unknown"].includes(scenario.name))
      await expect(page.getByText("Este préstamo no tiene cargos registrados.")).toHaveCount(0);
  });
test("401 clears protected data and returns to authentication", async ({ page }) => {
  await configure(page, { status: 401 });
  await open(page);
  await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic paid fee")).toHaveCount(0);
});
test("switching authorized loans aborts the prior charge request", async ({ page }) => {
  const mock = await configure(page, { delay: true });
  await open(page);
  await expect(page.getByText("Cargando cargos...", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Synthetic Other Loan ·/ }).click();
  mock.release();
  await expect(page.getByText("Synthetic paid fee")).toHaveCount(0);
  await page.getByRole("button", { name: "Ver cargos del préstamo", exact: true }).click();
  await expect.poll(() => mock.reads).toBe(2);
  mock.release();
  await expect(page.getByText("Synthetic paid fee")).toBeVisible();
});
test("logout during loading discards the late response", async ({ page }) => {
  const mock = await configure(page, { delay: true });
  await open(page);
  await expect.poll(() => mock.reads).toBe(1);
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  mock.release();
  await expect(page.getByText("Synthetic paid fee")).toHaveCount(0);
  await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
});
test("demo never requests real charges", async ({ page }) => {
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
