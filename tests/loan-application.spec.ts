import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  clientId,
  productId,
  login,
  products,
  product,
  template,
  loan,
  createBody,
} from "./fixtures/loans";
// Mocked integration tests: these verify frontend contracts, not live Fineract operations.
const base = "https://mx473-bank.invalid/fineract-provider/api/v1/self";
type Options = {
  status?: number;
  mutationStatus?: number;
  uncertain?: boolean;
  malformed?: boolean;
  state?: string;
  clients?: number[];
  empty?: boolean;
  readFailure?: boolean;
  unsupported?: boolean;
  mutationMalformed?: boolean;
};
async function configure(page: Page, options: Options = {}) {
  const mutations: {
    path: string;
    method: string;
    query: string;
    body: Record<string, unknown>;
  }[] = [];
  let current = loan(options.state);
  const fulfill = (r: Route, data: unknown, status = 200) =>
    r.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (r) =>
    fulfill(r, { baseUrl: base, tenantId: "mx473-synthetic" }),
  );
  await page.route(`${base}/**`, async (r) => {
    const req = r.request(),
      url = new URL(req.url()),
      path = url.pathname.split("/self/")[1];
    if (path === "authentication")
      return fulfill(r, { ...login, clients: options.clients ?? login.clients });
    if (path === "authentication/logout") return fulfill(r, { status: "success" });
    expect(req.headers()["fineract-platform-tenantid"]).toBe("mx473-synthetic");
    expect(req.headers().authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
    if (req.method() !== "GET") {
      mutations.push({ path, method: req.method(), query: url.search, body: req.postDataJSON() });
      if (options.uncertain) return r.abort("failed");
      if (options.mutationStatus)
        return fulfill(
          r,
          {
            developerMessage: "SECRET_STACK",
            errors: options.mutationStatus === 422 ? [{ parameterName: "principal" }] : [],
          },
          options.mutationStatus,
        );
      if (options.mutationMalformed) return fulfill(r, {});
      if (req.method() === "PUT") current = loan(undefined, req.postDataJSON().principal);
      if (url.searchParams.has("command")) current = loan("withdrawn.by.client");
      return fulfill(r, { resourceId: 473, loanId: 473 });
    }
    if (path === "loanproducts") return fulfill(r, options.empty ? [] : products, options.status);
    if (path.startsWith("loanproducts/")) return fulfill(r, product(Number(path.split("/")[1])));
    if (path === "loans/template") {
      expect(url.searchParams.get("templateType")).toBe("individual");
      expect((options.clients ?? login.clients).map(String)).toContain(
        url.searchParams.get("clientId"),
      );
      return fulfill(
        r,
        options.malformed
          ? {}
          : {
              ...template(Number(url.searchParams.get("productId"))),
              ...(options.unsupported ? { multiDisburseLoan: true } : {}),
            },
      );
    }
    if (path === `clients/${clientId}/accounts`)
      return fulfill(r, { loanAccounts: [{ id: 473, productName: "Synthetic Loan" }] });
    if (path === "loans/473") return fulfill(r, current, options.readFailure ? 403 : 200);
    throw new Error(`Unexpected loan mock route: ${path}`);
  });
  return mutations;
}
async function loginPage(page: Page, en = false) {
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
}
async function select(page: Page, en = false) {
  await page
    .getByRole("combobox", { name: en ? "Loan product" : "Producto de préstamo", exact: true })
    .selectOption(String(productId));
  await expect(
    page.getByLabel(en ? "Requested principal" : "Monto solicitado", { exact: true }),
  ).toHaveValue("1000");
}
async function send(page: Page, en = false, edit = false) {
  await page
    .getByRole("button", {
      name: en ? "Review loan application" : "Revisar solicitud de préstamo",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: edit
        ? en
          ? "Confirm correction"
          : "Confirmar corrección"
        : en
          ? "Confirm loan application"
          : "Confirmar solicitud de préstamo",
      exact: true,
    })
    .click();
}
for (const en of [false, true])
  test(`mocked integration: create, correct, cancel then withdraw (${en ? "English mobile" : "Spanish desktop"})`, async ({
    page,
  }) => {
    const mutations = await configure(page);
    await loginPage(page, en);
    if (en) await page.setViewportSize({ width: 390, height: 844 });
    await select(page, en);
    await page
      .getByRole("combobox", { name: en ? "Loan product" : "Producto de préstamo", exact: true })
      .selectOption("28");
    await expect(
      page.getByLabel(en ? "Requested principal" : "Monto solicitado", { exact: true }),
    ).toHaveValue("2000");
    await select(page, en);
    await send(page, en);
    const detail = page.getByRole("heading", {
      name: en ? "Application details" : "Detalle de la solicitud",
      exact: true,
    });
    await expect(detail).toBeFocused();
    await expect(
      page.getByText(en ? "Pending approval" : "Pendiente de aprobación", { exact: true }),
    ).toBeVisible();
    expect(mutations).toEqual([{ path: "loans", method: "POST", query: "", body: createBody }]);
    await page
      .getByRole("button", { name: en ? "Correct application" : "Corregir solicitud", exact: true })
      .click();
    await page
      .getByLabel(en ? "Requested principal" : "Monto solicitado", { exact: true })
      .fill("1500");
    await send(page, en, true);
    await expect(page.getByText("1500 MXN", { exact: true })).toBeVisible();
    const {
      clientId: c,
      productId: p,
      submittedOnDate: d,
      loanType: l,
      ...updateBody
    } = createBody;
    expect(mutations[1]).toEqual({
      path: "loans/473",
      method: "PUT",
      query: "",
      body: { ...updateBody, principal: 1500 },
    });
    const withdraw = page.getByRole("button", {
      name: en ? "Withdraw application" : "Retirar solicitud",
      exact: true,
    });
    await withdraw.click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: en ? "Cancel" : "Cancelar", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(withdraw).toBeFocused();
    expect(mutations).toHaveLength(2);
    await withdraw.click();
    await dialog.getByLabel(en ? "Withdrawal date" : "Fecha de retiro").fill("2026-10-30");
    await dialog
      .getByRole("button", { name: en ? "Confirm withdrawal" : "Confirmar retiro", exact: true })
      .click();
    await expect(
      page.getByText(en ? "Withdrawn by applicant" : "Retirada por el solicitante", {
        exact: true,
      }),
    ).toBeVisible();
    expect(mutations[2]).toEqual({
      path: "loans/473",
      method: "POST",
      query: "?command=withdrawnByApplicant",
      body: { withdrawnOnDate: "2026-10-30", locale: "en", dateFormat: "yyyy-MM-dd" },
    });
    await expect(withdraw).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: `artifacts/loan-${en ? "mobile-en" : "desktop-es"}.png`,
      fullPage: true,
    });
  });
test("mocked integration: existing application is loaded and approved loans offer no mutations", async ({
  page,
}) => {
  const mutations = await configure(page, { state: "approved" });
  await loginPage(page);
  await page.getByRole("button", { name: "Synthetic Loan · ID de solicitud: 473" }).click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Corregir solicitud", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Retirar solicitud", exact: true })).toHaveCount(0);
  expect(mutations).toHaveLength(0);
});
test("mocked integration: invalid form never submits and client choices come from login", async ({
  page,
}) => {
  const mutations = await configure(page, { clients: [clientId, 9002] });
  await loginPage(page);
  await expect(page.getByLabel("Cliente autorizado")).toHaveValue("");
  await page.getByLabel("Cliente autorizado").selectOption(String(clientId));
  await select(page);
  await page.getByLabel("Monto solicitado", { exact: true }).fill("99999");
  await page.getByRole("button", { name: "Revisar solicitud de préstamo", exact: true }).click();
  expect(mutations).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: "Confirmar solicitud de préstamo", exact: true }),
  ).toHaveCount(0);
});
for (const options of [
  { uncertain: true },
  { mutationStatus: 500 },
  { mutationMalformed: true },
] as Options[])
  test(`mocked integration: unconfirmed create stays locked after closing ${JSON.stringify(options)}`, async ({
    page,
  }) => {
    const mutations = await configure(page, options);
    await loginPage(page);
    await select(page);
    await send(page);
    await expect(page.getByRole("alert")).toContainText("No pudimos confirmar");
    await expect(
      page.getByRole("button", { name: "Confirmar solicitud de préstamo", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Volver al inicio", exact: true }).click();
    await page.getByRole("button", { name: "Solicitar un préstamo", exact: true }).click();
    await expect(
      page.getByText(
        "La solicitud anterior está enviada o sin confirmar. No vuelvas a enviarla; consulta las solicitudes.",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Consultar solicitudes", exact: true }).click();
    expect(mutations).toHaveLength(1);
  });
for (const method of ["update", "withdraw"])
  test(`mocked integration: uncertain ${method} cannot be retried`, async ({ page }) => {
    const mutations = await configure(page, { uncertain: true });
    await loginPage(page);
    await page.getByRole("button", { name: "Synthetic Loan · ID de solicitud: 473" }).click();
    if (method === "update") {
      await page.getByRole("button", { name: "Corregir solicitud", exact: true }).click();
      await page.getByLabel("Monto solicitado", { exact: true }).fill("1500");
      await send(page, false, true);
    } else {
      await page.getByRole("button", { name: "Retirar solicitud", exact: true }).click();
      await page.getByLabel("Fecha de retiro").fill("2026-10-30");
      await page.getByRole("button", { name: "Confirmar retiro", exact: true }).click();
    }
    await expect(page.getByRole("alert")).toContainText("No pudimos confirmar");
    await page.getByRole("button", { name: "Consultar solicitudes", exact: true }).click();
    await expect(page.getByRole("button", { name: "Corregir solicitud", exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Retirar solicitud", exact: true })).toHaveCount(
      0,
    );
    expect(mutations).toHaveLength(1);
  });
for (const status of [401, 403, 422, 409])
  test(`mocked integration: mutation ${status} shows no fake success`, async ({ page }) => {
    const mutations = await configure(page, { mutationStatus: status });
    await loginPage(page);
    await select(page);
    await send(page);
    if (status === 401)
      await expect(page.getByRole("button", { name: "Banca en línea", exact: true })).toBeVisible();
    else await expect(page.getByRole("alert")).toBeVisible();
    expect(mutations).toHaveLength(1);
    await expect(
      page.getByRole("heading", { name: "Detalle de la solicitud", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("SECRET_STACK")).toHaveCount(0);
  });
for (const options of [
  { empty: true },
  { malformed: true },
  { unsupported: true },
  { status: 403 },
] as Options[])
  test(`mocked integration: safe product loading ${JSON.stringify(options)}`, async ({ page }) => {
    const mutations = await configure(page, options);
    await loginPage(page);
    if (options.empty)
      await expect(page.getByText("No hay productos de préstamo disponibles.")).toBeVisible();
    else {
      if (!options.status && !options.malformed)
        await page
          .getByRole("combobox", { name: "Producto de préstamo", exact: true })
          .selectOption("27");
      await expect(page.getByRole("alert")).toBeVisible();
    }
    expect(mutations).toHaveLength(0);
  });
test("mocked integration: denied read never exposes customer details", async ({ page }) => {
  const mutations = await configure(page, { readFailure: true });
  await loginPage(page);
  await page.getByRole("button", { name: "Synthetic Loan · ID de solicitud: 473" }).click();
  await expect(page.getByRole("alert")).toContainText("No tienes acceso");
  await expect(page.getByText("SYN-473")).toHaveCount(0);
  expect(mutations).toHaveLength(0);
});
test("mocked integration: double-click confirms at most once", async ({ page }) => {
  const mutations = await configure(page);
  await loginPage(page);
  await select(page);
  await page.getByRole("button", { name: "Revisar solicitud de préstamo", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmar solicitud de préstamo", exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(page.getByText("Pendiente de aprobación", { exact: true })).toBeVisible();
  expect(mutations).toHaveLength(1);
});
test("mocked integration: demo does not expose real loan operations", async ({ page }) => {
  const mutations = await configure(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Banca en línea", exact: true }).click();
  await page
    .getByRole("button", { name: "Explorar demostración con datos ficticios", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Solicitar un préstamo", exact: true }),
  ).toHaveCount(0);
  expect(mutations).toHaveLength(0);
});
