import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { account, clientId, login, productId, template } from "./fixtures/savings";

const baseUrl = "https://mx469-bank.invalid/fineract-provider/api/v1/self";
type Options = {
  clients?: number[];
  templateStatus?: number;
  empty?: boolean;
  malformed?: boolean;
  postStatus?: number;
  postMalformed?: boolean;
  offline?: boolean;
  state?: string;
  missingNumber?: boolean;
  readFailure?: boolean;
  changed?: boolean;
  unsupported?: boolean;
};
async function configure(page: Page, options: Options = {}) {
  const posts: { body: unknown; headers: Record<string, string>; url: string; method: string }[] =
    [];
  let selectedTemplates = 0;
  const fulfill = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (route) =>
    fulfill(route, { baseUrl, tenantId: "mx469-synthetic" }),
  );
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.endsWith("/authentication/logout"))
      return fulfill(route, { status: "success" });
    if (url.pathname.endsWith("/authentication"))
      return fulfill(route, { ...login, clients: options.clients ?? login.clients });
    if (url.pathname.endsWith("/savingsaccounts/template")) {
      expect(request.method()).toBe("GET");
      expect(request.headers().authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
      expect(request.headers()["fineract-platform-tenantid"]).toBe("mx469-synthetic");
      expect((options.clients ?? login.clients).map(String)).toContain(
        url.searchParams.get("clientId"),
      );
      if (options.templateStatus)
        return fulfill(
          route,
          { developerMessage: "SECRET_INTERNAL_STACK" },
          options.templateStatus,
        );
      if (options.malformed) return fulfill(route, { productOptions: [{}] });
      const selected = url.searchParams.has("productId");
      if (selected) selectedTemplates++;
      return fulfill(route, {
        ...template(selected),
        clientId: Number(url.searchParams.get("clientId")),
        ...(options.empty ? { productOptions: [] } : {}),
        ...(options.changed && selectedTemplates > 1 ? { nominalAnnualInterestRate: 4.5 } : {}),
        ...(options.unsupported && selected ? { datatables: [{}] } : {}),
      });
    }
    if (url.pathname.endsWith("/savingsaccounts") && request.method() === "POST") {
      posts.push({
        body: request.postDataJSON(),
        headers: request.headers(),
        url: request.url(),
        method: request.method(),
      });
      if (options.offline) return route.abort("failed");
      if (options.postStatus)
        return fulfill(
          route,
          {
            developerMessage: "SECRET_INTERNAL_STACK",
            errors: [{ parameterName: "productId", defaultUserMessage: "SECRET_INTERNAL_STACK" }],
          },
          options.postStatus,
        );
      return fulfill(
        route,
        options.postMalformed ? {} : { officeId: 1, clientId, savingsId: 469, resourceId: 469 },
      );
    }
    if (url.pathname.endsWith("/savingsaccounts/469"))
      return fulfill(
        route,
        { ...account(options.state), ...(options.missingNumber ? { accountNo: undefined } : {}) },
        options.readFailure ? 503 : 200,
      );
    if (url.pathname.endsWith(`/clients/${clientId}/accounts`))
      return fulfill(route, {
        savingsAccounts: [{ ...account(), productName: "Synthetic Flexible Savings" }],
      });
    throw new Error(`Unexpected mocked banking request: ${url.pathname}`);
  });
  return posts;
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
  await page
    .getByRole("button", {
      name: english ? "Apply for a savings account" : "Solicitar una cuenta de ahorro",
      exact: true,
    })
    .click();
}
async function selectProduct(page: Page, english = false) {
  await page
    .getByLabel(english ? "Savings product" : "Producto de ahorro", { exact: true })
    .selectOption(String(productId));
  await expect(
    page.getByLabel(english ? "Application date" : "Fecha de solicitud", { exact: true }),
  ).toHaveValue("2026-10-27");
}
async function submit(page: Page, english = false) {
  await page
    .getByLabel(
      english
        ? "I reviewed the product and wish to submit this application."
        : "Revisé el producto y deseo enviar esta solicitud.",
    )
    .check();
  await page
    .getByRole("button", {
      name: english ? "Submit savings application" : "Enviar solicitud de ahorro",
      exact: true,
    })
    .click();
}

for (const state of ["submitted.and.pending.approval", "approved", "active", "rejected"]) {
  test(`real route shapes: template, one POST and actual ${state} confirmation`, async ({
    page,
  }) => {
    const posts = await configure(page, { state });
    await signIn(page);
    await selectProduct(page);
    await expect(page.locator(".savings-summary")).toContainText("3.5%");
    await submit(page);
    await expect(
      page.getByRole("heading", { name: "Solicitud recibida", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".savings-summary")).toContainText("SYN-00000469");
    await expect(page.locator(".savings-summary")).toContainText(
      {
        "submitted.and.pending.approval": "Pendiente de aprobación",
        approved: "Aprobada",
        active: "Activa",
        rejected: "Rechazada",
      }[state]!,
    );
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      method: "POST",
      url: `${baseUrl}/savingsaccounts`,
      body: {
        clientId,
        productId,
        submittedOnDate: "2026-10-27",
        locale: "en",
        dateFormat: "yyyy-MM-dd",
      },
      headers: {
        authorization: `Basic ${login.base64EncodedAuthenticationKey}`,
        "fineract-platform-tenantid": "mx469-synthetic",
      },
    });
    await page.getByRole("button", { name: "Volver a mi sesión", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Solicitar una cuenta de ahorro", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Solicitar una cuenta de ahorro", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Solicitud recibida", exact: true }),
    ).toBeVisible();
    expect(posts).toHaveLength(1);
  });
}
for (const status of [401, 403, 500]) {
  test(`template HTTP ${status} safely handles authentication and server failure`, async ({
    page,
  }) => {
    const posts = await configure(page, { templateStatus: status });
    await signIn(page);
    if (status === 401) {
      await expect(
        page.getByRole("heading", { name: "Acceso verificado", exact: true }),
      ).toHaveCount(0);
      await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
    } else
      await expect(page.getByRole("alert")).toContainText(
        status === 403 ? "no autorizó" : "No pudimos consultar",
      );
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
    expect(posts).toHaveLength(0);
  });
}
for (const scenario of ["empty", "malformed", "unsupported"] as const) {
  test(`${scenario} template cannot be submitted`, async ({ page }) => {
    const posts = await configure(page, { [scenario]: true });
    await signIn(page);
    if (scenario === "empty")
      await expect(page.getByRole("status").filter({ hasText: "No hay productos" })).toBeVisible();
    else {
      if (scenario === "unsupported")
        await page
          .getByLabel("Producto de ahorro", { exact: true })
          .selectOption(String(productId));
      await expect(page.getByRole("alert")).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Enviar solicitud de ahorro", exact: true }),
    ).toBeDisabled();
    expect(posts).toHaveLength(0);
  });
}
for (const options of [
  { postStatus: 400 },
  { postStatus: 403 },
  { postStatus: 401 },
  { postStatus: 500 },
  { offline: true },
  { postMalformed: true },
]) {
  test(`POST ${JSON.stringify(options)} never manufactures confirmation`, async ({ page }) => {
    const posts = await configure(page, options);
    await signIn(page);
    await selectProduct(page);
    await submit(page);
    if (options.postStatus === 401)
      await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
    else {
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Solicitud recibida", exact: true }),
      ).toHaveCount(0);
      if (!options.postStatus || options.postStatus === 500) {
        await expect(
          page.getByRole("heading", { name: "Resultado sin confirmar", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Consultar cuentas sin reenviar", exact: true })
          .click();
        await expect(
          page.getByText(
            "Estas son tus cuentas. Esta consulta no confirma cuál corresponde a la solicitud sin respuesta.",
          ),
        ).toBeVisible();
      }
    }
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
    expect(posts).toHaveLength(1);
  });
}
for (const scenario of ["missingNumber", "readFailure"] as const) {
  test(`${scenario} never labels a database identifier as an account number`, async ({ page }) => {
    const posts = await configure(page, { [scenario]: true });
    await signIn(page);
    await selectProduct(page);
    await submit(page);
    await expect(
      page.getByRole("heading", { name: "Solicitud recibida", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Número de cuenta aún no disponible", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Consultar cuentas sin reenviar", exact: true }).click();
    expect(posts).toHaveLength(1);
    await expect(page.locator(".savings-application")).not.toContainText(/Número de cuenta\s*469/);
  });
}
test("changed defaults force another review before any POST", async ({ page }) => {
  const posts = await configure(page, { changed: true });
  await signIn(page);
  await selectProduct(page);
  await submit(page);
  await expect(page.getByRole("alert")).toContainText("condiciones del producto cambiaron");
  expect(posts).toHaveLength(0);
});
test("explicit client selection is required for multiple mappings and absent mappings cannot submit", async ({
  page,
}) => {
  const posts = await configure(page, { clients: [clientId, 9002] });
  await signIn(page);
  await expect(page.getByLabel("Cliente autorizado", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Producto de ahorro", { exact: true })).toHaveCount(0);
  await page.getByLabel("Cliente autorizado", { exact: true }).selectOption(String(clientId));
  await selectProduct(page);
  expect(posts).toHaveLength(0);
});
test("no authorized clients explains the missing mapping", async ({ page }) => {
  const posts = await configure(page, { clients: [] });
  await signIn(page);
  await expect(page.getByRole("alert")).toContainText("no ha vinculado un cliente autorizado");
  expect(posts).toHaveLength(0);
});
test("native required fields and synchronous duplicate guard permit exactly one submission", async ({
  page,
}) => {
  const posts = await configure(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${baseUrl}/savingsaccounts`, async (route) => {
    await gate;
    await route.fallback();
  });
  await signIn(page);
  await selectProduct(page);
  const button = page.getByRole("button", { name: "Enviar solicitud de ahorro", exact: true });
  await expect(button).toBeDisabled();
  await page.getByLabel("Fecha de solicitud", { exact: true }).fill("");
  await page.getByLabel("Revisé el producto y deseo enviar esta solicitud.").check();
  await expect(button).toBeDisabled();
  await page.getByLabel("Fecha de solicitud", { exact: true }).fill("2026-10-27");
  await submit(page);
  await expect(
    page.getByRole("button", { name: "Enviando solicitud...", exact: true }),
  ).toBeDisabled();
  await page.locator(".savings-application form").evaluate((form) => {
    for (let i = 0; i < 3; i++)
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  release();
  await expect(
    page.getByRole("heading", { name: "Solicitud recibida", exact: true }),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
});
test("English flow renders on desktop and mobile, supports keyboard and has no accessibility or runtime errors", async ({
  page,
}) => {
  await configure(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page, true);
  await selectProduct(page, true);
  await expect(
    page.getByRole("heading", { name: "Apply for a savings account", exact: true }),
  ).toBeVisible();
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(viewport);
    await page.getByLabel("Application date", { exact: true }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `artifacts/mx469-form-${name}.png`, fullPage: true });
  }
  await page.getByLabel("I reviewed the product and wish to submit this application.").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Application received", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".savings-summary")).toContainText("Pending approval");
  await page.screenshot({ path: "artifacts/mx469-confirmation-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("closing the workflow restores focus and configured demo cannot reach real savings requests", async ({
  page,
}) => {
  const posts = await configure(page);
  await signIn(page);
  await page.getByRole("button", { name: "Volver a mi sesión", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Solicitar una cuenta de ahorro", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page
    .getByRole("button", { name: "Explorar demostración con datos ficticios", exact: true })
    .click();
  await page.getByRole("button", { name: "Completar con datos demo", exact: true }).click();
  await page.getByRole("button", { name: "Entrar a mi banca", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hola, Mariana.", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Solicitar una cuenta de ahorro", exact: true }),
  ).toHaveCount(0);
  expect(posts).toHaveLength(0);
});
