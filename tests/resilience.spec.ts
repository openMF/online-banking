import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { account, clientId, login, productId, template } from "./fixtures/savings";

// US-E12-04 (MX-490): loading indicators, human-readable errors and retry of transient failures,
// against a faked backend. Reads are repeated; a write or the login never is.

const baseUrl = "https://mx490-bank.invalid/fineract-provider/api/v1/self";

type Options = {
  /** Statuses answered, in order, to the template read WITHOUT a product; then it works. */
  templateSteps?: number[];
  /** Milliseconds the template read takes. */
  templateDelayMs?: number;
  /** The POST of the application is answered with this status. */
  postStatus?: number;
  /** The login is answered with this status. */
  loginStatus?: number;
  /** Statuses answered, in order, to runtime-config.json; then it works. */
  configSteps?: number[];
  /** Requests fail as if there was no connection. */
  offline?: boolean;
};

type Seen = { templateReads: number; posts: number; logins: number; configs: number };

async function configure(page: Page, options: Options = {}): Promise<Seen> {
  const seen: Seen = { templateReads: 0, posts: 0, logins: 0, configs: 0 };
  const steps = [...(options.templateSteps ?? [])];
  const configSteps = [...(options.configSteps ?? [])];
  const fulfill = (
    route: Route,
    data: unknown,
    status = 200,
    headers: Record<string, string> = {},
  ) =>
    route.fulfill({ status, contentType: "application/json", headers, body: JSON.stringify(data) });

  await page.route("**/runtime-config.json", (route) => {
    seen.configs += 1;
    const status = configSteps.shift();
    if (status) return fulfill(route, { developerMessage: "SECRET_INTERNAL_STACK" }, status);
    return fulfill(route, { baseUrl, tenantId: "mx490-synthetic" });
  });
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (options.offline && !url.pathname.endsWith("/authentication"))
      return route.abort("internetdisconnected");
    if (url.pathname.endsWith("/authentication/logout"))
      return fulfill(route, { status: "success" });
    if (url.pathname.endsWith("/authentication")) {
      seen.logins += 1;
      if (options.loginStatus)
        return fulfill(route, { developerMessage: "SECRET_INTERNAL_STACK" }, options.loginStatus);
      return fulfill(route, login);
    }
    if (url.pathname.endsWith("/savingsaccounts/template")) {
      const selected = url.searchParams.has("productId");
      if (!selected) {
        seen.templateReads += 1;
        if (options.templateDelayMs)
          await new Promise((resolve) => setTimeout(resolve, options.templateDelayMs));
        const status = steps.shift();
        if (status)
          return fulfill(route, { developerMessage: "SECRET_INTERNAL_STACK" }, status, {
            "Retry-After": "0",
          });
      }
      return fulfill(route, {
        ...template(selected),
        clientId: Number(url.searchParams.get("clientId")),
      });
    }
    if (url.pathname.endsWith("/savingsaccounts") && request.method() === "POST") {
      seen.posts += 1;
      return fulfill(
        route,
        options.postStatus
          ? { developerMessage: "SECRET_INTERNAL_STACK" }
          : { officeId: 1, clientId, savingsId: 469, resourceId: 469 },
        options.postStatus ?? 200,
      );
    }
    if (url.pathname.endsWith("/savingsaccounts/469")) return fulfill(route, account());
    if (url.pathname.endsWith(`/clients/${clientId}/accounts`))
      return fulfill(route, { savingsAccounts: [account()] });
    throw new Error(`Unexpected mocked request: ${request.method()} ${url.pathname}`);
  });
  return seen;
}

async function signIn(page: Page, english = false) {
  await page.goto("/");
  if (english)
    await page
      .locator(".header-actions .locale-toggle")
      .getByRole("button", { name: "EN", exact: true })
      .click();
  // On a phone the header actions are in the menu; the width decides, not a check that races.
  if ((page.viewportSize()?.width ?? Infinity) < 800)
    await page.getByRole("button", { name: english ? "Open menu" : "Abrir menú" }).click();
  await page
    .getByRole("button", { name: english ? "Online banking" : "Banca en línea", exact: true })
    .first()
    .click();
  await page.getByLabel(english ? "Username" : "Usuario", { exact: true }).fill("synthetic");
  await page
    .getByLabel(english ? "Password" : "Contraseña", { exact: true })
    .fill("synthetic-pass");
  await page
    .getByRole("button", { name: english ? "Sign in" : "Iniciar sesión", exact: true })
    .click();
}

const openSavings = (page: Page, english = false) =>
  page
    .getByRole("button", {
      name: english ? "Apply for a savings account" : "Solicitar una cuenta de ahorro",
      exact: true,
    })
    .click();

const productSelect = (page: Page, english = false) =>
  page.getByLabel(english ? "Savings product" : "Producto de ahorro", { exact: true });

async function submit(page: Page) {
  await productSelect(page).selectOption(String(productId));
  await expect(page.getByLabel("Fecha de solicitud", { exact: true })).toHaveValue("2026-10-27");
  await page.getByLabel("Revisé el producto y deseo enviar esta solicitud.").check();
  await page.getByRole("button", { name: "Enviar solicitud de ahorro", exact: true }).click();
}

const status = (page: Page) => page.locator(".network-status-region");

test.describe("loading, retry and offline", () => {
  test("a read that fails once is repeated, and the person never sees the failure", async ({
    page,
  }) => {
    const seen = await configure(page, { templateSteps: [503] });
    await signIn(page);
    await openSavings(page);

    await expect(productSelect(page)).toBeVisible();
    await expect(
      productSelect(page).locator("option", { hasText: "Synthetic Flexible Savings" }),
    ).toHaveCount(1);
    await expect(page.getByRole("alert")).toHaveCount(0);
    // The dev server runs effects twice (React StrictMode), so the first read can be sent once more
    // and cancelled: what matters is that the failed one was repeated, and not in a loop.
    expect(seen.templateReads).toBeGreaterThanOrEqual(2);
    expect(seen.templateReads).toBeLessThanOrEqual(3);
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
  });

  test("a service that stays down is tried a few times, then explained in plain words", async ({
    page,
  }) => {
    const seen = await configure(page, { templateSteps: [503, 503, 503, 503, 503] });
    await signIn(page);
    await openSavings(page);

    await expect(page.getByRole("alert")).toContainText(
      "No pudimos consultar los productos o cuentas",
    );
    // the first try and two retries (plus a cancelled duplicate of StrictMode in dev), not a loop
    expect(seen.templateReads).toBeGreaterThanOrEqual(3);
    expect(seen.templateReads).toBeLessThanOrEqual(4);
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
    await expect(page.locator("body")).not.toContainText("503");
    await expect(status(page)).toHaveText("");
  });

  test("a slow request shows that it is loading, and the indicator goes away", async ({ page }) => {
    await configure(page, { templateDelayMs: 1500 });
    await signIn(page);
    await openSavings(page);

    await expect(status(page).getByText("Cargando…")).toBeVisible();
    await expect(status(page)).toHaveAttribute("aria-live", "polite");
    await expect(productSelect(page)).toBeVisible();
    await expect(status(page)).toHaveText("");
  });

  test("a read that is retried says that the connection is slow", async ({ page }) => {
    // the retry waits 200-400 ms, so keep the failing read slow enough to see the message
    const seen = await configure(page, { templateSteps: [503, 503], templateDelayMs: 700 });
    await signIn(page);
    await openSavings(page);

    await expect(
      status(page).getByText("La conexión es lenta. Estamos reintentando…"),
    ).toBeVisible();
    await expect(productSelect(page)).toBeVisible({ timeout: 15_000 });
    expect(seen.templateReads).toBeGreaterThanOrEqual(3);
    expect(seen.templateReads).toBeLessThanOrEqual(4);
  });

  test("with no connection it says so at once and does not wait or loop", async ({
    page,
    context,
  }) => {
    const seen = await configure(page);
    await signIn(page);
    await context.setOffline(true);
    await configure(page, { offline: true });

    await openSavings(page);

    await expect(page.getByRole("alert")).toContainText("Sin conexión a internet");
    await expect(status(page).getByText("Sin conexión a internet")).toBeVisible();
    expect(seen.templateReads).toBe(0);
    await context.setOffline(false);
    await expect(status(page)).toHaveText("");
  });

  test("the application is sent once: a 503 on the POST is never repeated", async ({ page }) => {
    const seen = await configure(page, { postStatus: 503 });
    await signIn(page);
    await openSavings(page);
    await submit(page);

    await expect(page.getByRole("heading", { name: "Resultado sin confirmar" })).toBeVisible();
    expect(seen.posts).toBe(1);
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
  });

  test("the login is never repeated: a 503 is answered once, in plain words", async ({ page }) => {
    const seen = await configure(page, { loginStatus: 503 });
    await signIn(page);

    await expect(page.getByRole("alert")).toContainText("El servicio de acceso no está disponible");
    expect(seen.logins).toBe(1);
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
  });

  test("the runtime configuration is read again when the service is restarting", async ({
    page,
  }) => {
    const seen = await configure(page, { configSteps: [503] });
    await signIn(page);

    await expect(
      page.getByRole("button", { name: "Solicitar una cuenta de ahorro", exact: true }),
    ).toBeVisible();
    expect(seen.configs).toBe(2);
  });

  test("has no accessibility violations while it is loading, and fits a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await configure(page, { templateDelayMs: 1500 });
    await signIn(page);
    await openSavings(page);
    await expect(status(page).getByText("Cargando…")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
  });

  test("is fully translated into English", async ({ page }) => {
    await configure(page, { templateDelayMs: 1500, templateSteps: [503] });
    await signIn(page, true);
    await openSavings(page, true);

    await expect(status(page).getByText(/Loading…|The connection is slow/)).toBeVisible();
    await expect(productSelect(page, true)).toBeVisible({ timeout: 15_000 });
    expect(
      await page.evaluate(
        () => (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
      ),
    ).toEqual([]);
  });
});
