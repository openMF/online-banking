import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { application, clientId, discovery, login, template } from "./fixtures/share-application";
const base = "https://mx477-bank.invalid/api/v1/self";
async function configure(
  page: Page,
  options: {
    postStatus?: number;
    malformed?: boolean;
    detailUnavailable?: boolean;
    delayed?: boolean;
  } = {},
) {
  let posts = 0,
    created = false;
  let release: (() => void) | undefined;
  const bodies: unknown[] = [];
  await page.route("**/runtime-config.json", (r) =>
    r.fulfill({ json: { baseUrl: base, tenantId: "mx477-synthetic" } }),
  );
  await page.route(`${base}/**`, async (r) => {
    const req = r.request();
    const url = new URL(req.url());
    const path = url.pathname.split("/self/")[1];
    if (path === "authentication") return r.fulfill({ json: login });
    expect(req.headers()["fineract-platform-tenantid"]).toBe("mx477-synthetic");
    expect(req.headers().authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
    if (path === "authentication/logout") return r.fulfill({ json: { status: "success" } });
    if (path === "shareaccounts") {
      expect(req.method()).toBe("POST");
      posts++;
      bodies.push(req.postDataJSON());
      created = true;
      if (options.delayed)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      return r.fulfill({
        status: options.postStatus ?? 200,
        json: options.malformed ? {} : { resourceId: 477 },
      });
    }
    expect(req.method()).toBe("GET");
    if (path === "shareaccounts/template") {
      expect(url.searchParams.get("clientId")).toBe(String(clientId));
      if (url.searchParams.has("productId")) expect(url.searchParams.get("productId")).toBe("6");
      return r.fulfill({ json: template(url.searchParams.has("productId")) });
    }
    if (path === `clients/${clientId}/accounts`)
      return r.fulfill({ json: { ...discovery(), shareAccounts: created ? [application()] : [] } });
    if (path === "shareaccounts/477")
      return r.fulfill({ status: options.detailUnavailable ? 404 : 200, json: application() });
    throw new Error(`Unexpected synthetic route ${path}`);
  });
  return {
    get posts() {
      return posts;
    },
    bodies,
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
  await page
    .getByRole("button", { name: en ? "Apply for Shares" : "Solicitar acciones", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: en ? "Share Product" : "Producto de acciones", exact: true })
    .selectOption("6");
  await page
    .getByRole("combobox", {
      name: en ? "Linked savings account" : "Cuenta de ahorro vinculada",
      exact: true,
    })
    .selectOption("5");
  await page
    .getByLabel(en ? "Application date" : "Fecha de solicitud", { exact: true })
    .fill("2026-11-03");
}
async function review(page: Page, en = false) {
  await page
    .getByRole("button", {
      name: en ? "Review share application" : "Revisar solicitud de acciones",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: en ? "Review share application" : "Revisar solicitud de acciones",
      exact: true,
    }),
  ).toBeFocused();
}
for (const en of [false, true])
  test(`share application review and confirmed backend status ${en ? "English mobile" : "Spanish desktop"}`, async ({
    page,
  }) => {
    if (en) await page.setViewportSize({ width: 390, height: 844 });
    const backend = await configure(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, en);
    await expect(page.getByRole("option", { name: /SYN-CLOSED|SYN-USD/ })).toHaveCount(0);
    await page
      .getByLabel(en ? "Requested shares" : "Acciones solicitadas", { exact: true })
      .fill("1.5");
    await page
      .getByRole("button", {
        name: en ? "Review share application" : "Revisar solicitud de acciones",
        exact: true,
      })
      .click();
    expect(backend.posts).toBe(0);
    await page
      .getByLabel(en ? "Requested shares" : "Acciones solicitadas", { exact: true })
      .fill("10");
    await review(page, en);
    expect(backend.posts).toBe(0);
    await expect(page.getByText(/102.50 MXN/)).toBeVisible();
    const violations = await new AxeBuilder({ page })
      .include(".share-application")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(violations.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `artifacts/mx477-review-${en ? "mobile-en" : "desktop-es"}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: en ? "Confirm share application" : "Confirmar solicitud de acciones",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: en ? "Share application received" : "Solicitud de acciones recibida",
      }),
    ).toBeFocused();
    await expect(
      page.getByText(en ? "Pending approval" : "Pendiente de aprobación", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("SH-477", { exact: true })).toBeVisible();
    expect(backend.posts).toBe(1);
    expect(backend.bodies[0]).toMatchObject({
      clientId,
      productId: 6,
      savingsAccountId: 5,
      requestedShares: 10,
      applicationDate: "2026-11-03",
      submittedDate: "2026-11-03",
      dateFormat: "yyyy-MM-dd",
      locale: "en",
      charges: [{ chargeId: 2, amount: "2.35" }],
    });
    await page.screenshot({
      path: `artifacts/mx477-confirmed-${en ? "mobile-en" : "desktop-es"}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: en ? "Back to Share Accounts" : "Volver a cuentas de acciones",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", {
        name: en ? "Apply for Shares" : "Solicitar acciones",
        exact: true,
      }),
    ).toBeFocused();
    await expect(page.getByRole("button", { name: /SH-477/ })).toBeVisible();
    expect(errors).toEqual([]);
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(storage).not.toMatch(
      /SH-477|SYN-SAV-5|base64EncodedAuthenticationKey|synthetic-password/,
    );
    if (en)
      expect(
        await page.evaluate(
          () => (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
        ),
      ).toEqual([]);
  });
test("pending POST disables close and ignores repeated activation", async ({ page }) => {
  const backend = await configure(page, { delayed: true });
  await open(page);
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar solicitud de acciones", exact: true })
    .dblclick();
  await expect.poll(() => backend.posts).toBe(1);
  await expect(
    page.getByRole("button", { name: "Volver a cuentas de acciones", exact: true }),
  ).toBeDisabled();
  backend.release();
  await expect(page.getByText("Solicitud de acciones recibida")).toBeVisible();
  expect(backend.posts).toBe(1);
});
for (const scenario of [{ postStatus: 503 }, { malformed: true }])
  test(`ambiguous write is blocked across close/reopen ${JSON.stringify(scenario)}`, async ({
    page,
  }) => {
    const backend = await configure(page, scenario);
    await open(page);
    await review(page);
    await page
      .getByRole("button", { name: "Confirmar solicitud de acciones", exact: true })
      .click();
    await expect(page.locator(".share-application [role=alert]")).toContainText(
      "No podemos confirmar",
    );
    await expect(page.getByText("Solicitud de acciones recibida")).toHaveCount(0);
    await page.getByRole("button", { name: "Volver a cuentas de acciones", exact: true }).click();
    await page.getByRole("button", { name: "Solicitar acciones", exact: true }).click();
    await page.getByRole("button", { name: "Consultar estado de acciones", exact: true }).click();
    await expect(page.locator(".share-application [role=alert]")).toContainText(
      "No podemos confirmar",
    );
    await expect(
      page.getByRole("button", { name: "Confirmar solicitud de acciones", exact: true }),
    ).toHaveCount(0);
    expect(backend.posts).toBe(1);
  });
test("confirmed submission and unavailable read-back are distinct", async ({ page }) => {
  const backend = await configure(page, { detailUnavailable: true });
  await open(page);
  await review(page);
  await page.getByRole("button", { name: "Confirmar solicitud de acciones", exact: true }).click();
  await expect(page.getByText(/El envío está confirmado/)).toBeVisible();
  await expect(page.getByText("Estado no disponible", { exact: true })).toBeVisible();
  await expect(page.getByText("SH-477", { exact: true })).toHaveCount(0);
  expect(backend.posts).toBe(1);
});
test("401 clears the application and returns to authenticated login", async ({ page }) => {
  const backend = await configure(page, { postStatus: 401 });
  await open(page);
  await review(page);
  await page.getByRole("button", { name: "Confirmar solicitud de acciones", exact: true }).click();
  await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
  await expect(page.locator(".share-application")).toHaveCount(0);
  expect(backend.posts).toBe(1);
});
