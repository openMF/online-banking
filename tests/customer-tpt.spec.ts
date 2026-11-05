import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { login } from "./fixtures/savings";

// Synthetic authenticated customer; no request reaches a public banking environment.
const BASE = "https://mx480-bank.invalid/api/v1/self";
const TITLE = "Transferir a un beneficiario";
const GRANT = "SYNTHETIC-TPT-GRANT";
const source = {
  accountId: 101,
  accountNo: "SRC-0101",
  accountType: { id: 2 },
  clientId: login.clients[0],
  clientName: "Synthetic Sender",
  officeId: 1,
};
const destination = {
  accountId: 902,
  accountNo: "PRIVATE-DEST-00902",
  accountType: { id: 2 },
  clientId: 9902,
  clientName: "Synthetic Recipient",
  officeId: 3,
};
type Options = {
  noBeneficiaries?: boolean;
  stepUpOff?: boolean;
  channels?: string[];
  outcome?:
    | "ok"
    | "funds"
    | "beneficiary"
    | "daily"
    | "removed"
    | "unauthorized"
    | "approval"
    | "forbidden"
    | "expired"
    | "server"
    | "dropped"
    | "malformed"
    | "timeout"
    | "stepup";
  otp?: "expired" | "missing";
  delay?: number;
  loginFails?: boolean;
};
async function configure(page: Page, options: Options = {}) {
  const seen = {
    templates: 0,
    posts: [] as { body: Record<string, unknown>; headers: Record<string, string>; url: string }[],
    challenges: [] as Record<string, unknown>[],
    verifications: 0,
  };
  const fulfill = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  const error = (code: string) => ({
    userMessageGlobalisationCode: "validation.msg.domain.rule.violation",
    defaultUserMessage: "DO-NOT-DISPLAY-INTERNAL-TEXT",
    errors: [{ userMessageGlobalisationCode: code }],
  });
  await page.route("**/runtime-config.json", (route) =>
    fulfill(route, { baseUrl: BASE, tenantId: "mx480-synthetic" }),
  );
  await page.route(`${BASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/v1\/self\//, "");
    if (path !== "authentication") {
      expect(req.headers().authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
      expect(req.headers()["fineract-platform-tenantid"]).toBe("mx480-synthetic");
    }
    if (path === "authentication")
      return fulfill(route, options.loginFails ? {} : login, options.loginFails ? 401 : 200);
    if (path === "authentication/logout") return fulfill(route, { status: "success" });
    if (path === `clients/${login.clients[0]}/accounts`) return fulfill(route, {});
    if (path === "stepup/config")
      return fulfill(route, {
        enabled: !options.stepUpOff,
        protectedActions: ["TPT_TRANSFER"],
        availableChannels: options.channels ?? ["EMAIL"],
        otpLength: 6,
        otpTtlSeconds: 300,
        maxAttempts: 5,
        resendCooldownSeconds: 30,
        maxResends: 3,
        grantTtlSeconds: 120,
        sessionBound: true,
      });
    if (path === "stepup/challenges") {
      const body = req.postDataJSON();
      seen.challenges.push(body);
      return fulfill(
        route,
        {
          challengeId: seen.challenges.length,
          action: body.action,
          channel: body.channel,
          maskedDestination: "s***@example.invalid",
          expiresAt: "2026-11-05T12:05:00",
          attemptsRemaining: 5,
          resendAvailableAt: "2026-11-05T12:00:30",
          resendsRemaining: 3,
        },
        201,
      );
    }
    if (/stepup\/challenges\/\d+\/verify/.test(path)) {
      seen.verifications++;
      if (options.otp === "expired")
        return fulfill(
          route,
          { userMessageGlobalisationCode: "error.msg.selfservice.stepup.otp.expired" },
          400,
        );
      if (req.postDataJSON().otp !== "123456")
        return fulfill(
          route,
          {
            userMessageGlobalisationCode: "error.msg.selfservice.stepup.otp.invalid",
            attemptsRemaining: 4,
          },
          400,
        );
      return fulfill(route, {
        stepUpToken: options.otp === "missing" ? undefined : GRANT,
        action: "TPT_TRANSFER",
        expiresAt: "2026-11-05T12:02:00",
      });
    }
    if (path === "accounttransfers/template") {
      expect(url.searchParams.get("type")).toBe("tpt");
      seen.templates++;
      return fulfill(route, {
        fromAccountOptions: [
          source,
          { ...source, accountId: 102, accountNo: "SRC-0102" },
          { ...source, accountId: 77, accountType: { id: 1 } },
        ],
        toAccountOptions: options.noBeneficiaries
          ? []
          : [
              destination,
              {
                ...destination,
                accountId: 903,
                accountNo: "OTHER-0903",
                clientName: "Other Recipient",
              },
            ],
      });
    }
    if (/savingsaccounts\/\d+$/.test(path))
      return fulfill(route, {
        currency: { code: "MXN", decimalPlaces: 2 },
        summary: { availableBalance: 5000 },
      });
    if (path === "accounttransfers" && req.method() === "POST") {
      seen.posts.push({ body: req.postDataJSON(), headers: req.headers(), url: req.url() });
      expect(url.searchParams.get("type")).toBe("tpt");
      if (options.outcome === "timeout") return; // caller's real HTTP timeout aborts this pending request
      if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay));
      if (options.outcome === "dropped") return route.abort("connectionreset");
      if (options.outcome === "server") return fulfill(route, {}, 500);
      if (options.outcome === "expired") return fulfill(route, {}, 401);
      if (options.outcome === "forbidden") return fulfill(route, error("unknown.forbidden"), 403);
      if (options.outcome === "malformed")
        return fulfill(route, { resourceId: 4242, status: "PENDING_APPROVAL" });
      const codes: Partial<Record<NonNullable<Options["outcome"]>, string>> = {
        funds: "error.msg.savingsaccount.transaction.insufficient.account.balance",
        beneficiary: "error.msg.beneficiary.transfer.amount.limit.for.beneficiary.exceeded",
        daily:
          "error.msg.beneficiary.daily.tpt.transfer.limit.for.fromaccountid.101.fromaccounttype.2.exceeded",
        removed: "validation.msg.accounttransfer.invalid.to.account.details",
        unauthorized: "validation.msg.accounttransfer.invalid.from.account.details",
        approval: "validation.msg.transferapproval.approvalId.dual.approval.required",
        stepup: "error.msg.selfservice.stepup.required",
      };
      const code = options.outcome && codes[options.outcome];
      if (code) return fulfill(route, error(code), 400);
      if (!options.stepUpOff && req.headers()["x-step-up-token"] !== GRANT)
        return fulfill(route, error("error.msg.selfservice.stepup.required"), 403);
      return fulfill(route, { resourceId: 4242, savingsId: 101 });
    }
    throw new Error(`Unexpected mocked request: ${req.method()} ${path}`);
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
  if ((page.viewportSize()?.width ?? 1440) < 800)
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
async function open(page: Page, english = false) {
  await signIn(page, english);
  await page
    .getByRole("button", { name: english ? "Transfer to a beneficiary" : TITLE, exact: true })
    .click();
}
async function review(page: Page, english = false) {
  await page
    .getByLabel(english ? "Source account" : "Cuenta de origen", { exact: true })
    .selectOption("2:101");
  await page
    .getByLabel(english ? "Registered beneficiary" : "Beneficiario registrado", { exact: true })
    .selectOption("2:902");
  await page
    .getByLabel(english ? "Amount in MXN" : "Importe en MXN", { exact: true })
    .fill("1,250.5");
  await page.getByLabel(english ? "Memo" : "Concepto", { exact: true }).fill("Synthetic invoice");
  await page
    .getByRole("button", {
      name: english ? "Review transfer" : "Revisar transferencia",
      exact: true,
    })
    .click();
}
async function verify(page: Page, english = false) {
  await page
    .getByRole("button", {
      name: english ? "Confirm transfer" : "Confirmar transferencia",
      exact: true,
    })
    .click();
  await page
    .getByLabel(english ? "Verification code" : "Código de verificación", { exact: true })
    .fill("123456");
  await page
    .getByRole("button", { name: english ? "Verify and send" : "Verificar y enviar", exact: true })
    .click();
}

test("TPT: authenticated happy path, exact intent, one POST and actual reference", async ({
  page,
}) => {
  const seen = await configure(page);
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(msg.text()));
  page.on("pageerror", (error) => logs.push(error.message));
  await open(page);
  await expect(page.getByLabel("Cuenta de origen", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Beneficiario registrado", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Beneficiario registrado", { exact: true })).not.toContainText(
    destination.accountNo,
  );
  await review(page);
  await expect(page.getByText("1,250.50 MXN", { exact: true })).toBeVisible();
  await verify(page);
  await expect(
    page.getByRole("heading", { name: "Transferencia realizada", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("4242", { exact: true })).toBeVisible();
  expect(seen.posts).toHaveLength(1);
  expect(seen.templates).toBeGreaterThanOrEqual(2);
  expect(seen.posts[0].body).toEqual({
    fromOfficeId: 1,
    fromClientId: login.clients[0],
    fromAccountId: 101,
    fromAccountType: 2,
    toOfficeId: 3,
    toClientId: 9902,
    toAccountId: 902,
    toAccountType: 2,
    transferAmount: "1250.50",
    transferDescription: "Synthetic invoice",
    dateFormat: "yyyy-MM-dd",
    locale: "en",
    transferDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  });
  expect(seen.challenges).toEqual([
    {
      action: "TPT_TRANSFER",
      channel: "EMAIL",
      payload: {
        fromAccountId: 101,
        fromAccountType: 2,
        toAccountId: 902,
        toAccountType: 2,
        transferAmount: "1250.50",
      },
    },
  ]);
  expect(seen.posts[0].headers["x-step-up-token"]).toBe(GRANT);
  expect(logs.join(" ")).not.toMatch(/SYNTHETIC-TPT-GRANT|synthetic-pass|DO-NOT-DISPLAY/);
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toMatch(/SYNTHETIC-TPT-GRANT|synthetic-pass/);
});

test("TPT: no registered beneficiaries", async ({ page }) => {
  const seen = await configure(page, { noBeneficiaries: true });
  await open(page);
  await expect(page.getByText(/No hay beneficiarios/)).toBeVisible();
  expect(seen.posts).toHaveLength(0);
});

test("TPT: missing authentication cannot enter transfers", async ({ page }) => {
  const seen = await configure(page, { loginFails: true });
  await signIn(page);
  await expect(page.getByRole("button", { name: TITLE, exact: true })).toHaveCount(0);
  expect(seen.templates).toBe(0);
});

for (const [outcome, message] of [
  ["funds", "El saldo de la cuenta de origen no alcanza"],
  ["beneficiary", "límite de este beneficiario"],
  ["daily", "límite diario"],
  ["removed", "no reconoce una de las cuentas"],
  ["unauthorized", "no reconoce una de las cuentas"],
  ["approval", "requiere una segunda firma"],
] as const) {
  test(`TPT: confirmed ${outcome} refusal after template load`, async ({ page }) => {
    const seen = await configure(page, { outcome });
    await open(page);
    await review(page);
    await verify(page);
    await expect(page.getByRole("alert")).toContainText(message);
    await expect(page.getByRole("alert")).toContainText("No se movió dinero");
    expect(seen.posts).toHaveLength(1);
    await expect(page.getByText("DO-NOT-DISPLAY-INTERNAL-TEXT")).toHaveCount(0);
  });
}
for (const outcome of ["server", "dropped", "malformed", "forbidden"] as const) {
  test(`TPT: ${outcome} is uncertain and blocks both transfer entry points`, async ({ page }) => {
    const seen = await configure(page, { outcome });
    await open(page);
    await review(page);
    await verify(page);
    await expect(page.getByRole("alert")).toContainText("No la envíes otra vez");
    await page.getByRole("button", { name: "Volver al inicio", exact: true }).first().click();
    await expect(page.getByRole("button", { name: TITLE, exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Transferir entre mis cuentas", exact: true }),
    ).toBeDisabled();
    expect(seen.posts).toHaveLength(1);
  });
}
test("TPT: actual client timeout stays uncertain without a resend", async ({ page }) => {
  const seen = await configure(page, { outcome: "timeout" });
  await open(page);
  await review(page);
  await page.clock.install();
  await verify(page);
  await expect.poll(() => seen.posts.length).toBe(1);
  await page.clock.fastForward(31_000);
  await expect(page.getByRole("alert")).toContainText("No la envíes otra vez");
  expect(seen.posts).toHaveLength(1);
});
test("TPT: closing during dispatch preserves uncertainty and blocks the own-account flow", async ({
  page,
}) => {
  const seen = await configure(page, { outcome: "server", delay: 700 });
  await open(page);
  await review(page);
  await verify(page);
  await expect.poll(() => seen.posts.length).toBe(1);
  await page.getByRole("button", { name: "Volver al inicio", exact: true }).first().click();
  await expect(page.getByRole("button", { name: TITLE, exact: true })).toBeDisabled();
  await expect(page.getByTestId("transfer-track")).toContainText("No pudimos confirmar");
  expect(seen.posts).toHaveLength(1);
});
test("TPT: double-click cannot duplicate POST", async ({ page }) => {
  const seen = await configure(page, { stepUpOff: true, delay: 300 });
  await open(page);
  await review(page);
  await page.getByRole("button", { name: "Confirmar transferencia", exact: true }).dblclick();
  await expect(
    page.getByRole("heading", { name: "Transferencia realizada", exact: true }),
  ).toBeVisible();
  expect(seen.posts).toHaveLength(1);
  expect(seen.challenges).toHaveLength(0);
  expect(seen.posts[0].headers["x-step-up-token"]).toBeUndefined();
});
test("TPT: wrong OTP then actual backend verification", async ({ page }) => {
  const seen = await configure(page);
  await open(page);
  await review(page);
  await page.getByRole("button", { name: "Confirmar transferencia", exact: true }).click();
  await page.getByLabel("Código de verificación", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Verificar y enviar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("no coincide");
  expect(seen.posts).toHaveLength(0);
  await page.getByLabel("Código de verificación", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verificar y enviar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Transferencia realizada", exact: true }),
  ).toBeVisible();
  expect(seen.posts).toHaveLength(1);
});
for (const otp of ["expired", "missing"] as const) {
  test(`TPT: ${otp} OTP grant cannot send`, async ({ page }) => {
    const seen = await configure(page, { otp });
    await open(page);
    await review(page);
    await verify(page);
    await expect(page.getByRole("alert")).toBeVisible();
    expect(seen.posts).toHaveLength(0);
  });
}
test("TPT: missing verification channel cannot send", async ({ page }) => {
  const seen = await configure(page, { channels: [] });
  await open(page);
  await review(page);
  await page.getByRole("button", { name: "Confirmar transferencia", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No hay un medio disponible");
  expect(seen.posts).toHaveLength(0);
});
test("TPT: backend rejection of required step-up asks for new OTP without automatic resend", async ({
  page,
}) => {
  const seen = await configure(page, { outcome: "stepup" });
  await open(page);
  await review(page);
  await verify(page);
  await expect(page.getByLabel("Código de verificación", { exact: true })).toBeVisible();
  await expect.poll(() => seen.challenges.length).toBe(2);
  expect(seen.posts).toHaveLength(1);
});
test("TPT: session expiry during submission ends customer access", async ({ page }) => {
  const seen = await configure(page, { outcome: "expired" });
  await open(page);
  await review(page);
  await verify(page);
  await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
  expect(seen.posts).toHaveLength(1);
});
test("TPT: accessible amount errors, keyboard submission and focus", async ({ page }) => {
  const seen = await configure(page);
  await open(page);
  await page.getByLabel("Cuenta de origen", { exact: true }).selectOption("2:101");
  await page.getByLabel("Beneficiario registrado", { exact: true }).selectOption("2:902");
  await page.getByLabel("Importe en MXN", { exact: true }).fill("1,5");
  await page.getByLabel("Concepto", { exact: true }).fill("Invoice");
  await page.getByLabel("Concepto", { exact: true }).press("Enter");
  await expect(page.getByLabel("Importe en MXN", { exact: true })).toBeFocused();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(seen.posts).toHaveLength(0);
  await page.getByLabel("Importe en MXN", { exact: true }).fill("10.50");
  await page.getByLabel("Concepto", { exact: true }).press("Enter");
  await expect(page.getByRole("heading", { name: TITLE, exact: true })).toBeFocused();
});
test("TPT: English flow has complete localization", async ({ page }) => {
  await configure(page);
  await open(page, true);
  await review(page, true);
  await verify(page, true);
  await expect(page.getByRole("heading", { name: "Transfer made", exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
    ),
  ).toEqual([]);
});
for (const width of [320, 390, 1440]) {
  test(`TPT: layout and axe on form, review, OTP and receipt at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await configure(page);
    await open(page);
    const audit = async () => {
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .include(".customer-transfer")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    };
    await audit();
    await review(page);
    await audit();
    await page.getByRole("button", { name: "Confirmar transferencia", exact: true }).click();
    await expect(page.getByLabel("Código de verificación", { exact: true })).toBeVisible();
    await audit();
    await page.getByLabel("Código de verificación", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Verificar y enviar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Transferencia realizada", exact: true }),
    ).toBeVisible();
    await audit();
    await page.screenshot({ path: `artifacts/tpt-receipt-${width}.png`, fullPage: true });
  });
}

test("TPT: complete keyboard-only transfer commits native selections", async ({ page }) => {
  const seen = await configure(page);
  await open(page);
  await page.getByLabel("Cuenta de origen", { exact: true }).focus();
  await expect(page.getByLabel("Cuenta de origen", { exact: true })).toBeFocused();
  await page.keyboard.press("c");
  await expect(page.getByLabel("Cuenta de origen", { exact: true })).toHaveValue("2:101");
  await expect(page.getByLabel("Importe en MXN", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Beneficiario registrado", { exact: true })).toBeFocused();
  await page.keyboard.press("s");
  await expect(page.getByLabel("Beneficiario registrado", { exact: true })).toHaveValue("2:902");
  await page.keyboard.press("Tab");
  await page.keyboard.type("10.50");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Keyboard invoice");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Confirmar transferencia", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Código de verificación", { exact: true })).toBeFocused();
  await page.keyboard.type("123456");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Transferencia realizada", exact: true }),
  ).toBeVisible();
  expect(seen.posts).toHaveLength(1);
});

test("TPT: demo verification never reaches a real transfer API", async ({ page }) => {
  const seen = await configure(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Conoce tu banca", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Transferir", exact: true }).click();
  await dialog.getByRole("spinbutton", { name: /Importe/ }).fill("10");
  await dialog.getByLabel("Concepto", { exact: true }).fill("Demo invoice");
  await dialog.getByRole("button", { name: "Revisar transferencia", exact: true }).click();
  await dialog.getByRole("button", { name: "Continuar a verificación", exact: true }).click();
  await dialog.getByLabel("Código de verificación demo").fill("123456");
  await dialog.getByRole("button", { name: "Confirmar transferencia demo", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Transferencia simulada.", exact: true }),
  ).toBeVisible();
  expect(seen.templates).toBe(0);
  expect(seen.posts).toHaveLength(0);
  expect(seen.challenges).toHaveLength(0);
});
