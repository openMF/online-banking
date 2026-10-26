import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const baseUrl = "https://mx452-bank.invalid/fineract-provider/api/v1/self";
const key = btoa("00000000-0000-4000-8000-000000000001");
const success = {
  authenticated: true,
  username: "synthetic-customer",
  userId: 452,
  roles: [{ id: 1, name: "Customer" }],
  permissions: ["READ_CLIENT"],
  clients: [9001],
  base64EncodedAuthenticationKey: key,
  refreshToken: "synthetic-refresh-never-store",
  shouldRenewPassword: false,
  isTwoFactorAuthenticationRequired: false,
};
async function configure(page: Page, enabled = true) {
  await page.route("**/runtime-config.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(enabled ? { baseUrl, tenantId: "mx452-synthetic" } : null),
    }),
  );
}
async function open(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Banca en línea", exact: true }).click();
  await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
  await expect(page.locator(".dialog-content")).toHaveCSS("opacity", "1");
}
async function fill(page: Page) {
  await page.getByLabel("Usuario", { exact: true }).fill("synthetic-user");
  await page.getByLabel("Contraseña", { exact: true }).fill("synthetic-pass");
}

test("real login uses runtime endpoint and tenant, isolates demo data and clears on logout", async ({
  page,
}) => {
  await configure(page);
  const requests: { url: string; headers: Record<string, string>; body: unknown }[] = [];
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request();
    requests.push({ url: request.url(), headers: request.headers(), body: request.postDataJSON() });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(request.url().endsWith("/logout") ? { status: "success" } : success),
    });
  });
  await open(page);
  await fill(page);
  await page.getByLabel("Contraseña", { exact: true }).press("Enter");
  await expect(page.getByRole("heading", { name: "Acceso verificado", exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    url: `${baseUrl}/authentication`,
    headers: {
      "fineract-platform-tenantid": "mx452-synthetic",
      "content-type": "application/json",
    },
    body: { username: "synthetic-user", password: "synthetic-pass" },
  });
  expect(requests[0].headers.authorization).toBeUndefined();
  await expect(page.getByTestId("customer-username")).toHaveText("synthetic-customer");
  await expect(page.getByRole("status")).toContainText(
    "Las cuentas y operaciones aún no están integradas",
  );
  await expect(page.locator("body")).not.toContainText(
    /Mariana|344988355|Mifos#26|Saldo disponible/,
  );
  await expect(page.getByRole("button", { name: "Transferir", exact: true })).toHaveCount(0);
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    cookie: document.cookie,
  }));
  expect(JSON.stringify(storage)).not.toMatch(
    /synthetic-pass|synthetic-refresh|synthetic-customer/,
  );
  expect(JSON.stringify(storage)).not.toContain(key);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: "artifacts/mx452-customer-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeInViewport();
  await page.screenshot({ path: "artifacts/mx452-customer-mobile.png" });
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Acceso verificado", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toMatchObject({
    url: `${baseUrl}/authentication/logout`,
    headers: { authorization: `Basic ${key}`, "fineract-platform-tenantid": "mx452-synthetic" },
  });
  await expect(page.getByRole("status").filter({ hasText: "El servidor confirmó" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toHaveCount(0);
});

for (const scenario of [
  "401",
  "403",
  "false",
  "malformed",
  "mfa",
  "renewal",
  "offline",
  "500",
] as const) {
  test(`${scenario} cannot grant a customer session or fall back to demo`, async ({ page }) => {
    await configure(page);
    await page.route(`${baseUrl}/authentication`, (route) =>
      scenario === "offline"
        ? route.abort("failed")
        : route.fulfill({
            status: ["401", "403", "500"].includes(scenario) ? Number(scenario) : 200,
            contentType: "application/json",
            body: JSON.stringify(
              scenario === "false"
                ? { ...success, authenticated: false }
                : scenario === "mfa"
                  ? { ...success, isTwoFactorAuthenticationRequired: true }
                  : scenario === "renewal"
                    ? { ...success, shouldRenewPassword: true }
                    : { developerMessage: "SECRET_INTERNAL_STACK_TRACE" },
            ),
          }),
    );
    await open(page);
    await fill(page);
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    const expected = {
      "401": "Usuario o contraseña incorrectos.",
      "403": "Tu institución no autorizó",
      false: "pendiente de confirmación",
      malformed: "verificar la respuesta",
      mfa: "autenticación adicional",
      renewal: "renovar tu contraseña",
      offline: "No pudimos conectar",
      "500": "no está disponible",
    }[scenario];
    await expect(page.getByRole("alert")).toContainText(expected);
    await expect(page.getByRole("dialog")).not.toContainText("SECRET_INTERNAL_STACK_TRACE");
    await expect(page.getByRole("heading", { name: "Acceso verificado" })).toHaveCount(0);
    await expect(page.getByLabel("Número de cliente demo")).toHaveCount(0);
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
  });
}

test("native validation and a pending submission prevent parallel login requests", async ({
  page,
}) => {
  await configure(page);
  let count = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${baseUrl}/authentication`, async (route) => {
    count++;
    await gate;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(success) });
  });
  await open(page);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  expect(count).toBe(0);
  await fill(page);
  await page.getByLabel("Contraseña", { exact: true }).press("Enter");
  await expect.poll(() => count).toBe(1);
  await expect(
    page.getByRole("button", { name: "Verificando acceso...", exact: true }),
  ).toBeDisabled();
  await page.locator('form[aria-busy="true"]').evaluate((form) => {
    for (let i = 0; i < 3; i++)
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  release();
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toBeVisible();
  expect(count).toBe(1);
});

test("no configuration retains standalone demo login and performs no banking requests", async ({
  page,
}) => {
  await configure(page, false);
  let count = 0;
  page.on("request", (request) => {
    if (request.url().includes("/self/")) count++;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Banca en línea", exact: true }).click();
  await expect(page.getByLabel("Número de cliente demo")).toBeVisible();
  await page.getByRole("button", { name: "Completar con datos demo" }).click();
  await page.getByRole("button", { name: "Entrar a mi banca", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hola, Mariana.", exact: true })).toBeVisible();
  expect(count).toBe(0);
});

test("configured demo remains a separate explicit choice and never sends its credentials", async ({
  page,
}) => {
  await configure(page);
  let count = 0;
  page.on("request", (request) => {
    if (request.url().startsWith(baseUrl)) count++;
  });
  await open(page);
  await page.getByRole("button", { name: "Explorar demostración con datos ficticios" }).click();
  await page.getByRole("button", { name: "Completar con datos demo" }).click();
  await page.getByRole("button", { name: "Entrar a mi banca", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hola, Mariana.", exact: true })).toBeVisible();
  expect(count).toBe(0);
});

test("English customer login and additional-authentication errors are localized", async ({
  page,
}) => {
  await configure(page);
  await page.route(`${baseUrl}/authentication`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...success, isTwoFactorAuthenticationRequired: true }),
    }),
  );
  await page.goto("/");
  await page
    .locator(".header-actions .locale-toggle")
    .getByRole("button", { name: "EN", exact: true })
    .click();
  await page.getByRole("button", { name: "Online banking", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill("synthetic");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-pass");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your institution requires additional authentication.",
  );
});

test("failed server logout still removes the customer view and explains local clearing", async ({
  page,
}) => {
  await configure(page);
  await page.route(`${baseUrl}/authentication`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(success) }),
  );
  await page.route(`${baseUrl}/authentication/logout`, (route) => route.abort("failed"));
  await open(page);
  await fill(page);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "No pudimos confirmar" })).toBeVisible();
});

test("reload discards the real session without restoring credentials", async ({ page }) => {
  await configure(page);
  let logins = 0;
  await page.route(`${baseUrl}/authentication`, (route) => {
    logins++;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(success) });
  });
  await open(page);
  await fill(page);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Banca en línea", exact: true }).click();
  await expect(page.getByLabel("Usuario", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
  expect(logins).toBe(1);
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toHaveCount(0);
});

test("customer session expires on inactivity and attempts access-token logout", async ({
  page,
}) => {
  await page.clock.install();
  await configure(page);
  let logouts = 0;
  await page.route(`${baseUrl}/**`, (route) => {
    if (route.request().url().endsWith("/logout")) logouts++;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        route.request().url().endsWith("/logout") ? { status: "success" } : success,
      ),
    });
  });
  await open(page);
  await fill(page);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toBeVisible();
  await page.clock.fastForward(10 * 60_000 + 1000);
  await expect(page.getByRole("heading", { name: "Acceso verificado" })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Tu sesión ha expirado" })).toBeVisible();
  await expect.poll(() => logouts).toBe(1);
});

test("real login is accessible on desktop and mobile without page errors", async ({ page }) => {
  await configure(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(viewport);
    await expect(
      page.getByRole("button", { name: "Iniciar sesión", exact: true }),
    ).toBeInViewport();
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `artifacts/mx452-login-${name}.png` });
  }
  expect(errors).toEqual([]);
});
