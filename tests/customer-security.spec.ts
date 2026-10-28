import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { login } from "./fixtures/savings";

// The security area of a REAL customer (MX-455, MX-488 and MX-491 through the login of MX-452):
// every call goes through the memory-only session, against a faked backend. Nothing here is demo
// data and nothing is a real credential.

const baseUrl = "https://mx455-bank.invalid/fineract-provider/api/v1/self";
const EMAIL_CODE = "123456";
const GRANT = "SYNTHETIC-ONE-TIME-GRANT";
const NEW_PASSWORD = "Synthetic-new-pass-1!";

type Options = {
  /** The server does not ask for a verification. */
  stepUpOff?: boolean;
  /** The first `PUT /user` is refused by the password policy. */
  policyOnce?: boolean;
  /** The authenticator is not offered by the tenant. */
  totpUnavailable?: boolean;
};

type Seen = {
  puts: { body: unknown; headers: Record<string, string> }[];
  challenges: number;
  totpCalls: { method: string; path: string; authorization?: string }[];
};

async function configure(page: Page, options: Options = {}): Promise<Seen> {
  const seen: Seen = { puts: [], challenges: 0, totpCalls: [] };
  let policyRefused = false;
  const fulfill = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (route) =>
    fulfill(route, { baseUrl, tenantId: "mx455-synthetic" }),
  );
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1\/self\//, "");
    const method = request.method();
    // every call of the area carries the session of the login and the tenant of the login
    if (path !== "authentication") {
      expect(request.headers().authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
      expect(request.headers()["fineract-platform-tenantid"]).toBe("mx455-synthetic");
    }
    if (path === "authentication/logout") return fulfill(route, { status: "success" });
    if (path === "authentication") return fulfill(route, login);
    if (path === "stepup/config")
      return fulfill(route, {
        enabled: !options.stepUpOff,
        protectedActions: ["CHANGE_PASSWORD", "MANAGE_AUTHENTICATOR"],
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
      seen.challenges += 1;
      return fulfill(
        route,
        {
          challengeId: seen.challenges,
          action: request.postDataJSON().action,
          channel: "EMAIL",
          maskedDestination: "s***@example.invalid",
          expiresAt: "2026-10-29T12:05:00",
          attemptsRemaining: 5,
          resendAvailableAt: "2026-10-29T12:00:30",
          resendsRemaining: 3,
        },
        201,
      );
    }
    if (/^stepup\/challenges\/\d+\/verify$/.test(path)) {
      if (request.postDataJSON().otp !== EMAIL_CODE)
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
        action: "CHANGE_PASSWORD",
        expiresAt: "2026-10-29T12:02:00",
      });
    }
    if (path === "stepup/totp") {
      seen.totpCalls.push({ method, path, authorization: request.headers().authorization });
      return fulfill(route, {
        available: !options.totpUnavailable,
        status: "NONE",
        recoveryCodesRemaining: 0,
        exclusive: true,
        confirmedAt: null,
      });
    }
    if (path === "stepup/totp/enrollment" && method === "POST") {
      seen.totpCalls.push({ method, path, authorization: request.headers().authorization });
      return fulfill(
        route,
        {
          secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
          otpauthUri: "otpauth://totp/Mifos:synthetic?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
          issuer: "Mifos",
          digits: 6,
          periodSeconds: 30,
        },
        201,
      );
    }
    if (path === "activity")
      return fulfill(route, {
        totalFilteredRecords: 1,
        pageItems: [
          {
            id: 1,
            type: "LOGIN",
            outcome: "SUCCESS",
            occurredAt: "2026-10-29T09:30:05",
            ipAddress: "203.0.x.x",
            details: {},
          },
        ],
      });
    if (path === "user" && method === "PUT") {
      seen.puts.push({ body: request.postDataJSON(), headers: request.headers() });
      if (!options.stepUpOff && request.headers()["x-step-up-token"] !== GRANT)
        return fulfill(
          route,
          { userMessageGlobalisationCode: "error.msg.selfservice.stepup.required" },
          403,
        );
      if (options.policyOnce && !policyRefused) {
        policyRefused = true;
        return fulfill(
          route,
          {
            userMessageGlobalisationCode: "error.msg.password.validation.policy.failed",
            developerMessage: "SECRET_INTERNAL_STACK",
          },
          400,
        );
      }
      return fulfill(route, { officeId: 1, resourceId: 452, changes: { password: true } });
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
  // On a phone the header actions are in the menu. The width decides, not a visibility check that
  // does not wait: right after the page loads that check could say "hidden" for a button that
  // is about to appear.
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

async function openSecurity(page: Page, english = false) {
  await signIn(page, english);
  await page
    .getByRole("button", {
      name: english ? "Your account security" : "Seguridad de tu cuenta",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: english ? "Your account security" : "Seguridad de tu cuenta",
    }),
  ).toBeVisible();
}

async function startChange(page: Page) {
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Repite la nueva contraseña", { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
}

async function verify(page: Page) {
  await page.getByLabel("Código de verificación", { exact: true }).fill(EMAIL_CODE);
  await page.getByRole("button", { name: "Cambiar contraseña", exact: true }).click();
}

test.describe("security area of a customer", () => {
  test("opens from the home with the authenticator, the password and the real history", async ({
    page,
  }) => {
    await configure(page);
    await openSecurity(page);

    await expect(page.getByRole("heading", { name: "App de autenticación" })).toBeVisible();
    await expect(page.getByText("No has vinculado una app de autenticación.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cambiar contraseña" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Actividad de seguridad" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Iniciaste sesión" })).toBeVisible();
    // none of it is demo data
    await expect(page.getByText(/(Actividad|Verificación) de demostración/)).toHaveCount(0);

    await page.getByRole("button", { name: "Volver al inicio" }).click();
    await expect(
      page.getByRole("button", { name: "Seguridad de tu cuenta", exact: true }),
    ).toBeFocused();
  });

  test("the authenticator is hidden when the tenant did not switch it on", async ({ page }) => {
    await configure(page, { totpUnavailable: true });
    await openSecurity(page);

    await expect(page.getByRole("heading", { name: "Cambiar contraseña" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "App de autenticación" })).toHaveCount(0);
  });

  test("starting the pairing calls the real endpoint with the session of the login", async ({
    page,
  }) => {
    const seen = await configure(page);
    await openSecurity(page);

    await page.getByRole("button", { name: /Vincular una app de autenticación/ }).click();

    await expect(page.getByAltText("Código QR para tu app de autenticación")).toBeVisible();
    expect(seen.totpCalls.some((call) => call.method === "POST")).toBe(true);
    for (const call of seen.totpCalls) {
      expect(call.authorization).toBe(`Basic ${login.base64EncodedAuthenticationKey}`);
    }
  });

  test("changes the password behind a verification, ends the session and says why", async ({
    page,
  }) => {
    const seen = await configure(page);
    await openSecurity(page);

    await startChange(page);
    await expect(page.getByText("Antes de cambiarla, confirma que eres tú.")).toBeVisible();
    // nothing was sent yet
    expect(seen.puts).toHaveLength(0);
    await page.getByLabel("Código de verificación", { exact: true }).fill("000000");
    await page.getByRole("button", { name: "Cambiar contraseña", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("no coincide");
    await verify(page);

    await expect(
      page.getByText("Tu contraseña cambió. Inicia sesión de nuevo con la nueva contraseña."),
    ).toBeVisible();
    expect(seen.puts).toHaveLength(1);
    expect(seen.puts[0].body).toEqual({ password: NEW_PASSWORD, repeatPassword: NEW_PASSWORD });
    expect(seen.puts[0].headers["x-step-up-token"]).toBe(GRANT);
    expect(seen.puts[0].headers.authorization).toBe(
      `Basic ${login.base64EncodedAuthenticationKey}`,
    );
    // back at the login, with no session
    await expect(page.getByLabel("Usuario", { exact: true })).toBeVisible();
    await expect(page.getByText("synthetic-customer")).toHaveCount(0);
    // and the password is nowhere on the page
    await expect(page.locator("body")).not.toContainText(NEW_PASSWORD);
  });

  test("a refused password costs no new code, and the retry uses the same verification", async ({
    page,
  }) => {
    const seen = await configure(page, { policyOnce: true });
    await openSecurity(page);

    await startChange(page);
    await verify(page);
    await expect(page.getByRole("alert")).toContainText("no aceptó esa contraseña");
    await expect(page.locator("body")).not.toContainText("SECRET_INTERNAL_STACK");
    await expect(page.getByLabel("Nueva contraseña", { exact: true })).toHaveValue(NEW_PASSWORD);

    await page.getByRole("button", { name: "Continuar", exact: true }).click();

    await expect(page.getByText(/Tu contraseña cambió/)).toBeVisible();
    expect(seen.challenges).toBe(1);
    expect(seen.puts).toHaveLength(2);
    expect(seen.puts[1].headers["x-step-up-token"]).toBe(GRANT);
  });

  test("two different passwords never leave the page", async ({ page }) => {
    const seen = await configure(page);
    await openSecurity(page);

    await page.getByLabel("Nueva contraseña", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Repite la nueva contraseña", { exact: true }).fill("other");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();

    await expect(page.getByRole("alert")).toContainText("no coinciden");
    expect(seen.challenges).toBe(0);
    expect(seen.puts).toHaveLength(0);
  });

  test("changes it without a verification when the server does not ask for one", async ({
    page,
  }) => {
    const seen = await configure(page, { stepUpOff: true });
    await openSecurity(page);

    await startChange(page);

    await expect(page.getByText(/Tu contraseña cambió/)).toBeVisible();
    expect(seen.challenges).toBe(0);
    expect(seen.puts[0].headers["x-step-up-token"]).toBeUndefined();
  });

  test("has no accessibility violations and fits a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await configure(page);
    await openSecurity(page);
    await expect(page.getByRole("listitem").filter({ hasText: "Iniciaste sesión" })).toBeVisible();

    const results = await new AxeBuilder({ page }).include(".customer-security").analyze();
    expect(results.violations).toEqual([]);
    await startChange(page);
    await expect(page.getByLabel("Código de verificación", { exact: true })).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).include(".customer-security").analyze()).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
  });

  test("is fully translated into English", async ({ page }) => {
    await configure(page);
    await openSecurity(page, true);

    await expect(page.getByRole("heading", { name: "Authenticator app" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Change password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Repeat the new password", { exact: true }).fill("other");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("do not match");
    await expect(page.getByRole("button", { name: "Show passwords" })).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
      ),
    ).toEqual([]);
  });
});
