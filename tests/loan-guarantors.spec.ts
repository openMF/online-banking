import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, clientId, products, template, loan } from "./fixtures/loans";
import { guarantors } from "./fixtures/guarantors";

// Mocked Self Service contracts only. These do not prove backend authorization.
const base = "https://mx474-bank.invalid/api/v1/self";
async function configure(
  page: Page,
  options: {
    status?: number;
    data?: unknown;
    foreign?: boolean;
    offline?: boolean;
    invalidJson?: boolean;
  } = {},
) {
  const reads: string[] = [];
  let fail = Boolean(options.status || options.offline || options.invalidJson);
  const fulfill = (r: Route, data: unknown, status = 200) =>
    r.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (r) =>
    fulfill(r, { baseUrl: base, tenantId: "mx474-synthetic" }),
  );
  await page.route(`${base}/**`, async (r) => {
    const req = r.request(),
      url = new URL(req.url());
    const path = url.pathname.split("/self/")[1];
    if (path === "authentication") return fulfill(r, login);
    expect(req.headers()["fineract-platform-tenantid"]).toBe("mx474-synthetic");
    expect(req.headers().authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
    if (path === "authentication/logout") return fulfill(r, { status: "success" });
    expect(req.method()).toBe("GET");
    reads.push(path);
    if (path === "loanproducts") return fulfill(r, products);
    if (path === "loans/template") return fulfill(r, template());
    if (path === `clients/${clientId}/accounts`)
      return fulfill(r, { loanAccounts: [{ id: 473, productName: "Synthetic Loan" }] });
    if (path === "loans/473")
      return fulfill(r, { ...loan(), ...(options.foreign ? { clientId: 9002 } : {}) });
    if (path === "loans/473/guarantors") {
      expect(url.search).toBe("");
      if (fail && options.offline) return r.abort("timedout");
      if (fail && options.invalidJson)
        return r.fulfill({ status: 200, contentType: "application/json", body: "not JSON" });
      return fulfill(
        r,
        options.data === undefined ? guarantors : options.data,
        fail ? options.status : 200,
      );
    }
    throw new Error(`Unexpected guarantor route: ${path}`);
  });
  return {
    reads,
    recover: () => {
      fail = false;
    },
  };
}
async function signIn(page: Page, en = false) {
  await page.goto("/");
  if (en)
    await page
      .locator(".header-actions .locale-toggle")
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
  await page
    .getByRole("button", {
      name: en ? "Synthetic Loan · Application ID: 473" : "Synthetic Loan · ID de solicitud: 473",
    })
    .click();
}
for (const en of [false, true])
  test(`collection and details: ${en ? "English mobile" : "Spanish desktop"}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const s = await configure(page);
    await signIn(page, en);
    if (en) await page.setViewportSize({ width: 390, height: 844 });
    const entry = page.getByRole("button", {
      name: en ? "View guarantors" : "Ver garantes",
      exact: true,
    });
    await entry.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", {
        name: en ? "Loan guarantors" : "Garantes del préstamo",
        exact: true,
      }),
    ).toBeFocused();
    const region = page.getByRole("region", {
      name: en ? "Loan guarantors" : "Garantes del préstamo",
      exact: true,
    });
    await expect(region.getByText(/Synthetic Guarantor/)).toBeVisible();
    await expect(region).toContainText(en ? "External guarantor" : "Garante externo");
    await expect(region).toContainText(en ? "Existing group" : "Grupo existente");
    const detail = region.getByRole("button", {
      name: en ? "View guarantor details 71" : "Ver detalle del garante 71",
      exact: true,
    });
    await detail.focus();
    await page.keyboard.press("Enter");
    await expect(
      region.getByRole("heading", {
        name: en ? "Guarantor details" : "Detalle del garante",
        exact: true,
      }),
    ).toBeFocused();
    await expect(region).toContainText("Synthetic relationship");
    await expect(region).toContainText(en ? "Active" : "Activo");
    const detailHeading = await region
      .getByRole("heading", { name: en ? "Guarantor details" : "Detalle del garante", exact: true })
      .boundingBox();
    const fields = await region.locator("dl").boundingBox();
    const back = await region
      .getByRole("button", {
        name: en ? "Back to guarantors" : "Volver a los garantes",
        exact: true,
      })
      .boundingBox();
    expect(
      detailHeading &&
        fields &&
        back &&
        detailHeading.y + detailHeading.height <= fields.y &&
        fields.y + fields.height <= back.y,
    ).toBeTruthy();
    await expect(page.getByText(/PRIVATE_/)).toHaveCount(0);
    expect(s.reads.filter((p) => p.includes("guarantors"))).toEqual(["loans/473/guarantors"]);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
      "Synthetic Guarantor",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: `artifacts/guarantors-${en ? "mobile-en" : "desktop-es"}.png`,
      fullPage: true,
    });
    await region
      .getByRole("button", {
        name: en ? "Back to guarantors" : "Volver a los garantes",
        exact: true,
      })
      .click();
    await expect(detail).toBeFocused();
    await region
      .getByRole("button", {
        name: en ? "Back to loan details" : "Volver al detalle del préstamo",
        exact: true,
      })
      .click();
    await expect(entry).toBeFocused();
    expect(errors).toEqual([]);
  });
test("long unbroken guarantor names wrap within mobile list rows", async ({ page }) => {
  const name = "G".repeat(500);
  await configure(page, { data: [{ ...guarantors[0], firstname: name, lastname: null }] });
  await signIn(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Ver garantes", exact: true }).click();
  const label = page.locator(".loan-guarantors li span");
  await expect(label).toContainText(name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await label.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
test("empty collection is explicit and no creation action is offered", async ({ page }) => {
  await configure(page, { data: [] });
  await signIn(page);
  await page.getByRole("button", { name: "Ver garantes", exact: true }).click();
  await expect(page.getByText("Este préstamo no tiene garantes registrados.")).toBeVisible();
  await expect(
    page.getByText("Consulta de solo lectura. Para agregar garantes, contacta a tu institución."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Agregar garante/ })).toHaveCount(0);
});
for (const status of [403, 404, 500])
  test(`collection ${status} is an error, safe refresh recovers`, async ({ page }) => {
    const s = await configure(page, { status });
    await signIn(page);
    await page.getByRole("button", { name: "Ver garantes", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("Este préstamo no tiene garantes registrados.")).toHaveCount(0);
    await expect(page.getByText(/Synthetic Guarantor/)).toHaveCount(0);
    s.recover();
    await page.getByRole("button", { name: "Actualizar garantes", exact: true }).click();
    await expect(page.getByText(/Synthetic Guarantor/)).toBeVisible();
  });
for (const options of [
  { data: {} },
  { data: [{ ...guarantors[0], loanId: 999 }] },
  { data: [{ ...guarantors[0], id: null }] },
  { invalidJson: true },
])
  test(`reject invalid collection ${JSON.stringify(options)}`, async ({ page }) => {
    await configure(page, options);
    await signIn(page);
    await page.getByRole("button", { name: "Ver garantes", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("La respuesta de garantes no es válida");
    await expect(page.getByText(/Synthetic Guarantor/)).toHaveCount(0);
  });
test("session expiry removes loan and guarantor data", async ({ page }) => {
  await configure(page, { status: 401 });
  await signIn(page);
  await page.getByRole("button", { name: "Ver garantes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Banca en línea", exact: true })).toBeVisible();
  await expect(page.getByText("SYN-473", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Synthetic Guarantor/)).toHaveCount(0);
});
test("foreign loan response never enables guarantor access", async ({ page }) => {
  const s = await configure(page, { foreign: true });
  await signIn(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver garantes", exact: true })).toHaveCount(0);
  expect(s.reads.filter((p) => p.includes("guarantors"))).toEqual([]);
});
test("network timeout is distinct from an empty collection", async ({ page }) => {
  await configure(page, { offline: true });
  await signIn(page);
  await page.getByRole("button", { name: "Ver garantes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No pudimos cargar los garantes", {
    timeout: 20000,
  });
  await expect(page.getByText("Este préstamo no tiene garantes registrados.")).toHaveCount(0);
});
test("unauthenticated and demo modes never request guarantors", async ({ page }) => {
  const s = await configure(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ver garantes", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Banca en línea", exact: true }).click();
  await page
    .getByRole("button", { name: "Explorar demostración con datos ficticios", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Ver garantes", exact: true })).toHaveCount(0);
  expect(s.reads).toEqual([]);
});
