import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// The authenticator app (TOTP) in the offline demo. The demo "app" shows the code 135790 and the
// e-mail code is 123456; none of it is a security control, it only lets the screens be walked.
const APP_CODE = "135790";
const EMAIL_CODE = "123456";

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Conoce tu banca", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hola, Mariana.", exact: true })).toBeVisible();
}

async function openSecurity(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Actividad de seguridad", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "App de autenticación" })).toBeVisible();
  return dialog;
}

/** Links the demo authenticator and leaves the recovery codes on screen, then finishes. */
async function pair(page: Page): Promise<{ dialog: Locator; recoveryCodes: string[] }> {
  const dialog = await openSecurity(page);
  await dialog.getByRole("button", { name: /Vincular una app de autenticación/ }).click();
  await dialog.getByRole("button", { name: "Ya la agregué" }).click();
  await dialog.getByLabel("Código de verificación demo").fill(EMAIL_CODE);
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await dialog.getByLabel("Código de tu app de autenticación").fill(APP_CODE);
  await dialog.getByRole("button", { name: "Vincular app de autenticación" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Guarda tus códigos de recuperación" }),
  ).toBeVisible();
  const recoveryCodes = await dialog.locator(".recovery-codes code").allTextContents();
  await dialog.getByLabel("Ya guardé mis códigos en un lugar seguro").check();
  await dialog.getByRole("button", { name: "Listo", exact: true }).click();
  await expect(dialog.getByText("Tu app de autenticación está activa.")).toBeVisible();
  return { dialog, recoveryCodes };
}

async function reachTransferVerification(page: Page, concept: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Transferir", exact: true }).click();
  await dialog.getByRole("spinbutton", { name: /Importe/ }).fill("100");
  await dialog.getByLabel("Concepto", { exact: true }).fill(concept);
  await dialog.getByRole("button", { name: "Revisar transferencia" }).click();
  await dialog.getByRole("button", { name: "Continuar a verificación" }).click();
  return dialog;
}

test.describe("authenticator app", () => {
  test("is offered in the security view, and starts with nothing linked", async ({ page }) => {
    await openDemo(page);
    const dialog = await openSecurity(page);

    await expect(dialog.getByText("No has vinculado una app de autenticación.")).toBeVisible();
    await expect(
      dialog.getByText("Verificación de demostración: no es información real."),
    ).toBeVisible();
    // the history is still below it
    await expect(dialog.getByRole("heading", { name: "Actividad de seguridad" })).toBeVisible();
  });

  test("links an app: QR and key, a verification, the first code, then the recovery codes", async ({
    page,
  }) => {
    await openDemo(page);
    const dialog = await openSecurity(page);

    await dialog.getByRole("button", { name: /Vincular una app de autenticación/ }).click();
    await expect(dialog.getByAltText("Código QR para tu app de autenticación")).toBeVisible();
    await expect(dialog.getByLabel("Clave de tu app de autenticación")).toHaveText(
      /^([A-Z2-7]{4} ){7}[A-Z2-7]{4}$/,
    );
    await expect(dialog.getByRole("note")).toContainText("solo se muestra ahora");
    await dialog.getByRole("button", { name: "Ya la agregué" }).click();

    // a verification comes before the pairing
    await expect(dialog.getByText("Antes de vincular tu app, confirma que eres tú.")).toBeVisible();
    await dialog.getByLabel("Código de verificación demo").fill(EMAIL_CODE);
    await dialog.getByRole("button", { name: "Continuar", exact: true }).click();

    const first = dialog.getByLabel("Código de tu app de autenticación");
    await expect(first).toBeVisible();
    await first.fill("000000");
    await dialog.getByRole("button", { name: "Vincular app de autenticación" }).click();
    await expect(dialog.getByRole("alert")).toContainText("no coincide");
    await expect(dialog.getByText("Te quedan 4 intentos.")).toBeVisible();

    await first.fill(APP_CODE);
    await dialog.getByRole("button", { name: "Vincular app de autenticación" }).click();
    await expect(
      dialog.getByRole("heading", { name: "Guarda tus códigos de recuperación" }),
    ).toBeVisible();
    await expect(dialog.locator(".recovery-codes li")).toHaveCount(10);
    // the secret is no longer on the page
    await expect(dialog.getByLabel("Clave de tu app de autenticación")).toHaveCount(0);

    // finishing needs the confirmation, and drops the codes from the page
    const done = dialog.getByRole("button", { name: "Listo", exact: true });
    await expect(done).toBeDisabled();
    await dialog.getByLabel("Ya guardé mis códigos en un lugar seguro").check();
    await done.click();
    await expect(dialog.getByText("Tu app de autenticación está activa.")).toBeVisible();
    await expect(dialog.getByText("Te quedan 10 códigos de recuperación.")).toBeVisible();
    await expect(dialog.locator(".recovery-codes")).toHaveCount(0);
  });

  test("after linking, a transfer asks for the code of the app, not for an e-mail code", async ({
    page,
  }) => {
    await openDemo(page);
    await pair(page);
    const dialog = await reachTransferVerification(page, "Con la app");

    const code = dialog.getByLabel("Código de tu app de autenticación");
    await expect(code).toBeVisible();
    await expect(code).toBeFocused();
    await expect(dialog.getByLabel("Código de verificación demo")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /Reenviar código/ })).toHaveCount(0);

    await code.fill(EMAIL_CODE);
    await dialog.getByRole("button", { name: "Confirmar transferencia demo" }).click();
    await expect(dialog.getByRole("alert")).toContainText("no coincide");

    await code.fill(APP_CODE);
    await dialog.getByRole("button", { name: "Confirmar transferencia demo" }).click();
    await expect(dialog.getByRole("heading", { name: "Transferencia simulada." })).toBeVisible();
  });

  test("a recovery code works once, and the history says so", async ({ page }) => {
    await openDemo(page);
    const { dialog, recoveryCodes } = await pair(page);
    expect(recoveryCodes).toHaveLength(10);

    await reachTransferVerification(page, "Teléfono perdido");
    await dialog.getByRole("button", { name: "Usar un código de recuperación" }).click();
    const field = dialog.getByLabel("Código de recuperación");
    await field.fill(recoveryCodes[0].toLowerCase());
    await dialog.getByRole("button", { name: "Confirmar transferencia demo" }).click();
    await expect(dialog.getByRole("heading", { name: "Transferencia simulada." })).toBeVisible();

    // the same code again is refused
    await dialog.getByRole("button", { name: "Hacer otra transferencia" }).click();
    await dialog.getByRole("spinbutton", { name: /Importe/ }).fill("100");
    await dialog.getByLabel("Concepto", { exact: true }).fill("Otra vez");
    await dialog.getByRole("button", { name: "Revisar transferencia" }).click();
    await dialog.getByRole("button", { name: "Continuar a verificación" }).click();
    await dialog.getByRole("button", { name: "Usar un código de recuperación" }).click();
    await dialog.getByLabel("Código de recuperación").fill(recoveryCodes[0]);
    await dialog.getByRole("button", { name: "Confirmar transferencia demo" }).click();
    await expect(dialog.getByRole("alert")).toContainText("no coincide");

    // the history shows the emergency way in, once, and marks it as worth a look
    await dialog.getByRole("button", { name: "Actividad de seguridad", exact: true }).click();
    const used = dialog
      .getByRole("list", { name: "Lista de actividad" })
      .getByRole("listitem")
      .filter({ hasText: "Usaste un código de recuperación" });
    await expect(used).toHaveCount(1);
    await expect(used).toHaveClass(/warning/);
  });

  test("new recovery codes and the removal each need a verification", async ({ page }) => {
    await openDemo(page);
    const { dialog } = await pair(page);

    await dialog.getByRole("button", { name: /Generar códigos de recuperación nuevos/ }).click();
    await expect(
      dialog.getByText("Antes de generar códigos nuevos, confirma que eres tú."),
    ).toBeVisible();
    await dialog.getByLabel("Código de tu app de autenticación").fill(APP_CODE);
    await dialog.getByRole("button", { name: "Generar códigos nuevos" }).click();
    await expect(dialog.getByText(/Los anteriores ya no sirven/)).toBeVisible();
    await expect(dialog.locator(".recovery-codes li")).toHaveCount(10);
    await dialog.getByLabel("Ya guardé mis códigos en un lugar seguro").check();
    await dialog.getByRole("button", { name: "Listo", exact: true }).click();

    await dialog.getByRole("button", { name: /Quitar la app de autenticación/ }).click();
    await expect(dialog.getByText("Antes de quitar tu app, confirma que eres tú.")).toBeVisible();
    await dialog.getByRole("button", { name: "Usar un código de recuperación" }).click();
    await expect(dialog.getByLabel("Código de recuperación")).toBeVisible();
    await dialog.getByRole("button", { name: "Usar el código de mi app" }).click();
    await dialog.getByLabel("Código de tu app de autenticación").fill(APP_CODE);
    await dialog.getByRole("button", { name: "Quitar app de autenticación" }).click();

    await expect(dialog.getByText(/Quitamos tu app de autenticación/)).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Vincular una app de autenticación/ }),
    ).toBeVisible();

    // e-mail codes are back
    const transfer = await reachTransferVerification(page, "Sin app");
    await expect(transfer.getByLabel("Código de verificación demo")).toBeVisible();
  });

  test("ending the demo session forgets the authenticator, like the history", async ({ page }) => {
    await openDemo(page);
    const { dialog } = await pair(page);
    await dialog.getByRole("button", { name: "Cerrar sesión demo" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await openDemo(page);
    const again = await openSecurity(page);

    await expect(again.getByText("No has vinculado una app de autenticación.")).toBeVisible();
    // and the verification is the e-mail code again
    const transfer = await reachTransferVerification(page, "Nueva sesión");
    await expect(transfer.getByLabel("Código de verificación demo")).toBeVisible();
  });

  test("cancelling a pairing leaves nothing behind", async ({ page }) => {
    await openDemo(page);
    const dialog = await openSecurity(page);
    await dialog.getByRole("button", { name: /Vincular una app de autenticación/ }).click();
    await expect(dialog.getByLabel("Clave de tu app de autenticación")).toBeVisible();

    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();

    await expect(dialog.getByText("No has vinculado una app de autenticación.")).toBeVisible();
    await expect(dialog.getByLabel("Clave de tu app de autenticación")).toHaveCount(0);
  });

  test("shows up in the security history", async ({ page }) => {
    await openDemo(page);
    const { dialog } = await pair(page);

    const list = dialog.getByRole("list", { name: "Lista de actividad" });
    await expect(list.getByRole("listitem").first()).toContainText(
      "Vinculaste una app de autenticación",
    );
    await expect(dialog.getByText("Mostrando", { exact: false })).toBeVisible();
    await dialog.getByRole("button", { name: "Cuenta", exact: true }).click();
    await expect(list.getByRole("listitem").first()).toContainText(
      "Vinculaste una app de autenticación",
    );
  });

  test("the steps have no accessibility violations and fit a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openDemo(page);
    const dialog = await openSecurity(page);
    const scan = async () =>
      expect(
        (await new AxeBuilder({ page }).include(".authenticator").analyze()).violations,
      ).toEqual([]);

    await scan();
    await dialog.getByRole("button", { name: /Vincular una app de autenticación/ }).click();
    await expect(dialog.getByAltText("Código QR para tu app de autenticación")).toBeVisible();
    await scan();
    await dialog.getByRole("button", { name: "Ya la agregué" }).click();
    await expect(dialog.getByLabel("Código de verificación demo")).toBeVisible();
    await scan();
    await dialog.getByLabel("Código de verificación demo").fill(EMAIL_CODE);
    await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(dialog.getByLabel("Código de tu app de autenticación")).toBeVisible();
    await scan();
    await dialog.getByLabel("Código de tu app de autenticación").fill(APP_CODE);
    await dialog.getByRole("button", { name: "Vincular app de autenticación" }).click();
    await expect(dialog.locator(".recovery-codes li")).toHaveCount(10);
    await scan();
    await dialog.getByLabel("Ya guardé mis códigos en un lugar seguro").check();
    await dialog.getByRole("button", { name: "Listo", exact: true }).click();
    await expect(dialog.getByText("Tu app de autenticación está activa.")).toBeVisible();
    await scan();

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
  });

  test("is fully translated into English", async ({ page }) => {
    await page.goto("/");
    await page
      .locator(".header-actions .locale-toggle")
      .getByRole("button", { name: "EN" })
      .click();
    await page.getByRole("button", { name: "Explore your banking", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Security activity", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Authenticator app" })).toBeVisible();
    await expect(dialog.getByText("You have not linked an authenticator app.")).toBeVisible();

    await dialog.getByRole("button", { name: /Link an authenticator app/ }).click();
    await expect(dialog.getByAltText("QR code for your authenticator app")).toBeVisible();
    await expect(dialog.getByText("Cannot scan it? Type this key into your app:")).toBeVisible();
    await dialog.getByRole("button", { name: "I added it" }).click();
    await expect(dialog.getByText("Before linking your app, confirm it is you.")).toBeVisible();
    await dialog.getByLabel("Demo verification code").fill(EMAIL_CODE);
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByLabel("Code from your authenticator app").fill(APP_CODE);
    await dialog.getByRole("button", { name: "Link authenticator app" }).click();
    await expect(dialog.getByRole("heading", { name: "Save your recovery codes" })).toBeVisible();
    await dialog.getByLabel("I saved my codes somewhere safe").check();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(dialog.getByText("Your authenticator app is active.")).toBeVisible();
    await expect(dialog.getByText("You have 10 recovery codes left.")).toBeVisible();
    await expect(dialog.locator(".activity-list li").first()).toContainText(
      "You linked an authenticator app",
    );

    expect(
      await page.evaluate(
        () => (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
      ),
    ).toEqual([]);
  });
});
