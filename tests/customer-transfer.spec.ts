import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { login } from "./fixtures/savings";

// The transfer between own accounts of a REAL customer (MX-478, US-E07-01) through the login of
// MX-452: every call goes through the memory-only session, against a faked backend. Nothing here
// is demo data and nothing is a real credential.

const baseUrl = "https://mx478-bank.invalid/fineract-provider/api/v1/self";
const CODE = "123456";
const GRANT = "SYNTHETIC-TRANSFER-GRANT";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const savings = (id: number, accountNo: string) => ({
  accountId: id,
  accountNo,
  accountType: { id: 2, code: "accountType.savings", value: "Savings Account" },
  clientId: 9001,
  clientName: "Synthetic Customer",
  officeId: 1,
  officeName: "Head Office",
});
const loan = {
  accountId: 77,
  accountNo: "LOAN-0077",
  accountType: { id: 1, code: "accountType.loan", value: "Loan Account" },
  clientId: 9001,
  clientName: "Synthetic Customer",
  officeId: 1,
  officeName: "Head Office",
};
const accounts = [
  savings(101, "SYN-0101"),
  savings(102, "SYN-0102"),
  savings(103, "SYN-0103"),
  loan,
];

type Options = {
  /** The server does not ask for a verification. */
  stepUpOff?: boolean;
  /** What the first `POST /accounttransfers` answers. */
  post?: "ok" | "funds" | "serverError" | "dropped" | "expired";
  /** The first transfer is answered only after this many milliseconds. */
  postDelayMs?: number;
  /** Only one savings account. */
  single?: boolean;
  /** The account summary cannot be read. */
  noSummary?: boolean;
};

type Seen = {
  posts: { body: Record<string, unknown>; headers: Record<string, string> }[];
  challenges: { action: string; payload: Record<string, unknown> }[];
  authorizations: Set<string | undefined>;
};

async function configure(page: Page, options: Options = {}): Promise<Seen> {
  const seen: Seen = { posts: [], challenges: [], authorizations: new Set() };
  let attempts = 0;
  const fulfill = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (route) =>
    fulfill(route, { baseUrl, tenantId: "mx478-synthetic" }),
  );
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1\/self\//, "");
    const method = request.method();
    if (path !== "authentication") {
      seen.authorizations.add(request.headers().authorization);
      expect(request.headers()["fineract-platform-tenantid"]).toBe("mx478-synthetic");
    }
    if (path === "authentication/logout") return fulfill(route, { status: "success" });
    if (path === "authentication") return fulfill(route, login);
    if (path === "stepup/config")
      return fulfill(route, {
        enabled: !options.stepUpOff,
        protectedActions: ["OWN_TRANSFER", "TPT_TRANSFER"],
        availableChannels: ["EMAIL"],
        otpLength: 6,
        otpTtlSeconds: 300,
        maxAttempts: 5,
        resendCooldownSeconds: 30,
        maxResends: 3,
        grantTtlSeconds: 120,
        sessionBound: true,
      });
    if (path === "stepup/challenges" && method === "POST") {
      const body = request.postDataJSON();
      seen.challenges.push({ action: body.action, payload: body.payload });
      return fulfill(
        route,
        {
          challengeId: seen.challenges.length,
          action: body.action,
          channel: "EMAIL",
          maskedDestination: "s***@example.invalid",
          expiresAt: "2026-10-30T12:05:00",
          attemptsRemaining: 5,
          resendAvailableAt: "2026-10-30T12:00:30",
          resendsRemaining: 3,
        },
        201,
      );
    }
    if (/^stepup\/challenges\/\d+\/verify$/.test(path)) {
      if (request.postDataJSON().otp !== CODE)
        return fulfill(
          route,
          {
            userMessageGlobalisationCode: "error.msg.selfservice.stepup.otp.invalid",
            attemptsRemaining: 4,
          },
          400,
        );
      return fulfill(route, {
        stepUpToken: GRANT,
        action: "OWN_TRANSFER",
        expiresAt: "2026-10-30T12:02:00",
      });
    }
    if (path === "accounttransfers/template") {
      const own = options.single ? [accounts[0], loan] : accounts;
      return fulfill(route, { fromAccountOptions: own, toAccountOptions: own });
    }
    if (/^savingsaccounts\/\d+$/.test(path)) {
      if (options.noSummary) return fulfill(route, { userMessageGlobalisationCode: "x" }, 500);
      return fulfill(route, {
        id: Number(path.split("/")[1]),
        currency: { code: "MXN", decimalPlaces: 2, name: "Mexican Peso" },
        summary: { accountBalance: 5000, availableBalance: 4321.5 },
      });
    }
    if (path === "accounttransfers" && method === "POST") {
      attempts += 1;
      seen.posts.push({ body: request.postDataJSON(), headers: request.headers() });
      const mode = attempts === 1 ? (options.post ?? "ok") : "ok";
      if (attempts === 1 && options.postDelayMs)
        await new Promise((resolve) => setTimeout(resolve, options.postDelayMs));
      if (mode === "dropped") return route.abort("connectionreset");
      if (mode === "serverError")
        return fulfill(route, { userMessageGlobalisationCode: "error.msg.internal" }, 500);
      if (mode === "expired") return fulfill(route, { userMessageGlobalisationCode: "x" }, 401);
      if (mode === "funds")
        return fulfill(
          route,
          {
            userMessageGlobalisationCode:
              "error.msg.savingsaccount.transaction.insufficient.account.balance",
            defaultUserMessage: "SECRET_INTERNAL_TEXT",
          },
          403,
        );
      if (!options.stepUpOff && request.headers()["x-step-up-token"] !== GRANT)
        return fulfill(
          route,
          { userMessageGlobalisationCode: "error.msg.selfservice.stepup.required" },
          403,
        );
      return fulfill(route, { officeId: 1, clientId: 9001, savingsId: 101, resourceId: 4242 });
    }
    throw new Error(`Unexpected mocked request: ${method} ${path}`);
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
  if ((page.viewportSize()?.width ?? Infinity) < 800) {
    await page.getByRole("button", { name: english ? "Open menu" : "Abrir menú" }).click();
  }
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

async function openTransfer(page: Page, english = false) {
  await signIn(page, english);
  const title = english ? "Transfer between my accounts" : "Transferir entre mis cuentas";
  await page.getByRole("button", { name: title, exact: true }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

async function fillForm(page: Page, amount = "250.5", concept = "Renta de octubre") {
  await page.getByLabel("Cuenta de destino", { exact: true }).selectOption("2:102");
  await page.getByLabel(/^Importe/).fill(amount);
  await page.getByLabel("Concepto", { exact: true }).fill(concept);
  await page.getByRole("button", { name: "Revisar transferencia", exact: true }).click();
}

async function startVerification(page: Page) {
  await page.getByRole("button", { name: "Confirmar transferencia", exact: true }).click();
}

async function verify(page: Page, code = CODE) {
  await page.getByLabel("Código de verificación", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Verificar y enviar", exact: true }).click();
}

async function noAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG)
    .include(".customer-transfer")
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe("transfer between own accounts of a customer", () => {
  test("opens from the home with the savings accounts, the currency and the available balance", async ({
    page,
  }) => {
    const seen = await configure(page);
    await openTransfer(page);

    const from = page.getByLabel("Cuenta de origen", { exact: true });
    await expect(from.locator("option")).toHaveText([
      "Cuenta de ahorro SYN-0101 · Synthetic Customer",
      "Cuenta de ahorro SYN-0102 · Synthetic Customer",
      "Cuenta de ahorro SYN-0103 · Synthetic Customer",
    ]);
    await expect(page.getByText("Disponible: 4,321.50 MXN")).toBeVisible();
    await expect(page.getByLabel("Importe en MXN")).toBeVisible();
    // none of it is demo data, and the loan is not offered
    await expect(page.locator("body")).not.toContainText("LOAN-0077");
    await expect(page.getByText(/Transferencia simulada|Referencia demo|de prueba/)).toHaveCount(0);
    expect(seen.authorizations).toEqual(new Set([`Basic ${login.base64EncodedAuthenticationKey}`]));

    await page.getByRole("button", { name: "Volver al inicio" }).first().click();
    await expect(
      page.getByRole("button", { name: "Transferir entre mis cuentas", exact: true }),
    ).toBeFocused();
  });

  test("makes the transfer behind a verification of exactly that transfer, then shows the receipt", async ({
    page,
  }) => {
    const seen = await configure(page);
    await openTransfer(page);
    await noAccessibilityViolations(page);

    await fillForm(page);
    await expect(page.getByText("250.50 MXN")).toBeVisible();

    await expect(page.getByText("Renta de octubre")).toBeVisible();
    await noAccessibilityViolations(page);
    // nothing was asked or sent yet
    expect(seen.challenges).toHaveLength(0);
    expect(seen.posts).toHaveLength(0);

    await startVerification(page);
    await expect(page.getByLabel("Código de verificación", { exact: true })).toBeVisible();
    expect(seen.challenges).toEqual([
      {
        action: "OWN_TRANSFER",
        payload: {
          fromAccountId: 101,
          fromAccountType: 2,
          toAccountId: 102,
          toAccountType: 2,
          transferAmount: "250.50",
        },
      },
    ]);
    await noAccessibilityViolations(page);
    await verify(page, "000000");
    await expect(page.getByRole("alert")).toContainText("no coincide");
    expect(seen.posts).toHaveLength(0);
    await verify(page);

    await expect(page.getByRole("heading", { name: "Transferencia realizada" })).toBeVisible();
    expect(seen.posts).toHaveLength(1);
    expect(seen.posts[0].body).toEqual({
      fromOfficeId: 1,
      fromClientId: 9001,
      fromAccountId: 101,
      fromAccountType: 2,
      toOfficeId: 1,
      toClientId: 9001,
      toAccountId: 102,
      toAccountType: 2,
      transferDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      transferAmount: "250.50",
      transferDescription: "Renta de octubre",
      dateFormat: "yyyy-MM-dd",
      locale: "en",
    });
    expect(seen.posts[0].headers["x-step-up-token"]).toBe(GRANT);
    expect(seen.posts[0].headers.authorization).toBe(
      `Basic ${login.base64EncodedAuthenticationKey}`,
    );
    const receipt = page.locator(".transfer-receipt");
    await expect(receipt).toContainText("250.50 MXN");
    await expect(receipt).toContainText("Cuenta de ahorro SYN-0102");
    await expect(receipt).toContainText("Renta de octubre");
    await expect(receipt).toContainText("4242");
    // the token is nowhere on the page
    await expect(page.locator("body")).not.toContainText(GRANT);
    await noAccessibilityViolations(page);

    // another transfer starts from a clean form
    await page.getByRole("button", { name: "Hacer otra transferencia" }).click();
    await expect(page.getByLabel("Cuenta de destino", { exact: true })).toHaveValue("");
    await expect(page.getByLabel(/^Importe/)).toHaveValue("");
  });

  test("sends without a token when the server does not ask for a verification", async ({
    page,
  }) => {
    const seen = await configure(page, { stepUpOff: true });
    await openTransfer(page);

    await fillForm(page);
    await startVerification(page);

    await expect(page.getByRole("heading", { name: "Transferencia realizada" })).toBeVisible();
    expect(seen.challenges).toHaveLength(0);
    expect(seen.posts).toHaveLength(1);
    expect(seen.posts[0].headers["x-step-up-token"]).toBeUndefined();
  });

  test("refuses a wrong form before anything is sent", async ({ page }) => {
    const seen = await configure(page);
    await openTransfer(page);

    await page.getByRole("button", { name: "Revisar transferencia", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Selecciona la cuenta de destino");
    await expect(page.getByLabel("Cuenta de destino", { exact: true })).toBeFocused();
    await page.getByLabel("Cuenta de destino", { exact: true }).selectOption("2:102");
    await page.getByLabel(/^Importe/).fill("1,5");
    await page.getByLabel("Concepto", { exact: true }).fill("Renta");
    await page.getByRole("button", { name: "Revisar transferencia", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("solo con números y punto decimal");
    await expect(page.getByLabel(/^Importe/)).toBeFocused();
    await noAccessibilityViolations(page);
    expect(seen.challenges).toHaveLength(0);
    expect(seen.posts).toHaveLength(0);
  });

  test("not enough money: says nothing moved, and the same transfer reuses the verification", async ({
    page,
  }) => {
    const seen = await configure(page, { post: "funds" });
    await openTransfer(page);
    await fillForm(page);
    await startVerification(page);
    await verify(page);

    await expect(page.getByRole("alert")).toContainText("No se movió dinero");
    await expect(page.getByRole("alert")).toContainText("no alcanza");
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_TEXT");
    await expect(page.getByLabel(/^Importe/)).toHaveValue("250.5");
    await noAccessibilityViolations(page);

    // the same transfer: no second code
    await page.getByRole("button", { name: "Revisar transferencia", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar transferencia", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Transferencia realizada" })).toBeVisible();
    expect(seen.challenges).toHaveLength(1);
    expect(seen.posts).toHaveLength(2);
    expect(seen.posts[1].headers["x-step-up-token"]).toBe(GRANT);
  });

  for (const post of ["serverError", "dropped"] as const) {
    test(`${post}: it may have run, so it says so and cannot be sent again`, async ({ page }) => {
      const seen = await configure(page, { post });
      await openTransfer(page);
      await fillForm(page);
      await startVerification(page);
      await verify(page);

      await expect(page.getByRole("alert")).toContainText("No la envíes otra vez");
      await noAccessibilityViolations(page);
      await expect(page.getByLabel("Cuenta de destino", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Confirmar transferencia/ })).toHaveCount(0);
      await page.waitForTimeout(500);
      expect(seen.posts).toHaveLength(1);
      expect(seen.challenges).toHaveLength(1);

      await page.getByRole("button", { name: "Volver al inicio" }).last().click();
      await expect(
        page.getByRole("button", { name: "Transferir entre mis cuentas", exact: true }),
      ).toBeVisible();
    });
  }

  test("closing the screen while the transfer is being sent blocks the next one until the result is known", async ({
    page,
  }) => {
    const seen = await configure(page, { postDelayMs: 1500 });
    await openTransfer(page);
    await fillForm(page);
    await startVerification(page);
    await verify(page);
    await expect(page.getByText("Enviando tu transferencia…").first()).toBeVisible();

    // the person goes back to the home while the transfer is on its way
    await page.getByRole("button", { name: "Volver al inicio" }).first().click();
    const entry = page.getByRole("button", { name: "Transferir entre mis cuentas", exact: true });
    await expect(entry).toBeDisabled();
    await expect(page.getByTestId("transfer-track")).toContainText(
      "Hay una transferencia en curso",
    );

    // the result arrives with the screen closed: it is told on the home, and the next one is free
    await expect(page.getByTestId("transfer-track")).toContainText(
      "se realizó. Referencia: 4242.",
      {
        timeout: 10000,
      },
    );
    await expect(entry).toBeEnabled();
    expect(seen.posts).toHaveLength(1);

    // opening the screen again clears what was told
    await entry.click();
    await expect(page.getByRole("heading", { name: "Transferir entre mis cuentas" })).toBeVisible();
    await page.getByRole("button", { name: "Volver al inicio" }).first().click();
    await expect(page.getByTestId("transfer-track")).toHaveCount(0);
  });

  test("a transfer whose result is unknown blocks the next one, even after closing the screen", async ({
    page,
  }) => {
    const seen = await configure(page, { post: "dropped", postDelayMs: 800 });
    await openTransfer(page);
    await fillForm(page);
    await startVerification(page);
    await verify(page);
    await page.getByRole("button", { name: "Volver al inicio" }).first().click();

    const entry = page.getByRole("button", { name: "Transferir entre mis cuentas", exact: true });
    await expect(page.getByTestId("transfer-track")).toContainText(
      "No pudimos confirmar tu última transferencia",
      { timeout: 10000 },
    );
    await expect(entry).toBeDisabled();
    await page.waitForTimeout(500);
    await expect(entry).toBeDisabled();
    expect(seen.posts).toHaveLength(1);
  });

  test("a double click on the confirmation sends one transfer", async ({ page }) => {
    const seen = await configure(page);
    await openTransfer(page);
    await fillForm(page);
    await startVerification(page);
    await page.getByLabel("Código de verificación", { exact: true }).fill(CODE);

    await page
      .getByRole("button", { name: "Verificar y enviar", exact: true })
      .dblclick({ noWaitAfter: true });

    await expect(page.getByRole("heading", { name: "Transferencia realizada" })).toBeVisible();
    await page.waitForTimeout(300);
    expect(seen.posts).toHaveLength(1);
  });

  test("a session that ended during the transfer goes back to the login", async ({ page }) => {
    await configure(page, { post: "expired" });
    await openTransfer(page);
    await fillForm(page);
    await startVerification(page);
    await verify(page);

    await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
    await expect(page.getByText("synthetic-customer")).toHaveCount(0);
  });

  test("works without the advice when the account cannot be read", async ({ page }) => {
    await configure(page, { noSummary: true });
    await openTransfer(page);

    await expect(page.getByLabel("Importe", { exact: true })).toBeVisible();
    await expect(page.getByText(/Disponible/)).toHaveCount(0);
  });

  test("says so when there is only one savings account", async ({ page }) => {
    await configure(page, { single: true });
    await openTransfer(page);

    await expect(page.getByText(/al menos dos cuentas de ahorro/)).toBeVisible();
    await expect(page.getByLabel("Cuenta de destino", { exact: true })).toHaveCount(0);
  });

  test("is fully translated into English", async ({ page }) => {
    await configure(page);
    await openTransfer(page, true);

    await expect(page.getByText("Available: 4,321.50 MXN")).toBeVisible();
    await page.getByLabel("Destination account", { exact: true }).selectOption("2:102");
    await page.getByLabel("Amount in MXN").fill("10");
    await page.getByLabel("Memo", { exact: true }).fill("October rent");
    await page.getByRole("button", { name: "Review transfer", exact: true }).click();
    await expect(page.getByText("Savings account SYN-0102 · Synthetic Customer")).toBeVisible();
    await page.getByRole("button", { name: "Confirm transfer", exact: true }).click();
    await page.getByLabel(/verification code/i).fill(CODE);
    await page.getByRole("button", { name: "Verify and send", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Transfer made" })).toBeVisible();
    const missing = await page.evaluate(
      () => (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
    );
    expect(missing).toEqual([]);
  });

  test("the whole flow works with the keyboard alone", async ({ page }) => {
    const seen = await configure(page);
    await openTransfer(page);

    // fields in reading order: origin, destination (chosen with the keyboard), amount, memo
    await page.getByLabel("Cuenta de destino", { exact: true }).focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");
    await page.keyboard.type("99.99");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Teclado");
    await page.keyboard.press("Enter");
    await expect(page.getByText("99.99 MXN")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar transferencia", exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Código de verificación", { exact: true }).focus();
    await page.keyboard.type(CODE);
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { name: "Transferencia realizada" })).toBeVisible();
    expect(seen.posts).toHaveLength(1);
    expect(seen.posts[0].body.transferAmount).toBe("99.99");
  });

  for (const width of [320, 390]) {
    test(`fits a phone of ${width} px without horizontal scroll in every step`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await configure(page);
      await openTransfer(page);
      const fits = () =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

      expect(await fits()).toBe(true);
      await fillForm(page, "250.5", "Un concepto largo para comprobar que el texto se ajusta");
      expect(await fits()).toBe(true);
      await startVerification(page);
      await expect(page.getByLabel("Código de verificación", { exact: true })).toBeVisible();
      expect(await fits()).toBe(true);
      await verify(page);
      await expect(page.getByRole("heading", { name: "Transferencia realizada" })).toBeVisible();
      expect(await fits()).toBe(true);
      await noAccessibilityViolations(page);
    });
  }
});
