import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Conoce tu banca", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hola, Mariana.", exact: true }),
  ).toBeVisible();
}

async function reachStepUp(
  page: Page,
  amount: string,
  concept: string,
  own = false,
) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Transferir", exact: true }).click();
  if (own)
    await dialog.getByRole("button", { name: "Entre mis cuentas" }).click();
  await dialog.getByRole("spinbutton", { name: /Importe/ }).fill(amount);
  await dialog.getByLabel("Concepto", { exact: true }).fill(concept);
  await dialog.getByRole("button", { name: "Revisar transferencia" }).click();
  await expect(
    dialog.getByText("Todo claro antes de continuar."),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Continuar a verificación" })
    .click();
  await expect(dialog.getByLabel("Código de verificación demo")).toBeVisible();
}

async function prepareTransfer(
  page: Page,
  amount: string,
  concept: string,
  own = false,
) {
  await reachStepUp(page, amount, concept, own);
  await page
    .getByRole("dialog")
    .getByLabel("Código de verificación demo")
    .fill("123456");
}

test("landing navigation, product simulators, FAQ, and stories work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/MIFOS/);
  await expect(page.locator("h1")).toContainText("MIFOS.");
  await page.getByRole("button", { name: "Soluciones", exact: true }).click();
  await page
    .locator("#solutions-menu")
    .getByRole("button", { name: /Ahorro e inversión/ })
    .click();
  await expect(page.getByText("Tu próximo logro empieza hoy.")).toBeVisible();
  const result = page.locator(".calculator-result strong");
  const previous = await result.textContent();
  await page.getByRole("button", { name: "365 días" }).click();
  await expect(result).not.toHaveText(previous!);
  await page.getByRole("button", { name: "Mi crédito", exact: true }).click();
  await expect(page.getByText("Dale forma a ese gran proyecto.")).toBeVisible();
  await page.getByRole("button", { name: "36 meses" }).click();
  await expect(page.getByRole("button", { name: "36 meses" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Siguiente historia" }).click();
  await expect(page.locator(".story-content blockquote")).toContainText(
    "Tener todo claro",
  );
  const faq = page.getByRole("button", {
    name: "¿Esta experiencia opera con dinero real?",
  });
  await faq.click();
  await expect(faq).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#faq-answer-5")).toContainText(
    "No está conectado",
  );
  await faq.click();
  await expect(page.locator("#faq-answer-5")).toBeHidden();
});

test("demo login validates credentials and supports password visibility", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Banca en línea", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Número de cliente demo").fill("111111111");
  await dialog
    .getByLabel("Contraseña de prueba", { exact: true })
    .fill("incorrecta");
  await dialog.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(
    dialog.getByLabel("Contraseña de prueba", { exact: true }),
  ).toHaveAttribute("type", "text");
  await dialog.getByRole("button", { name: "Entrar a mi banca" }).click();
  await expect(dialog.getByRole("alert")).toContainText("no coinciden");
  await dialog
    .getByRole("button", { name: "Completar con datos demo" })
    .click();
  await dialog.getByRole("button", { name: "Entrar a mi banca" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Hola, Mariana." }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar sesión demo" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Sesión demo cerrada");
});

test("personal transfers verify OTP, update balances, and export CSV", async ({
  page,
}) => {
  await openDemo(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".total-balance>strong")).toContainText(
    "$215,680.50",
  );
  await dialog
    .getByRole("button", { name: "Ocultar saldos", exact: true })
    .click();
  await expect(dialog.locator(".total-balance>strong")).not.toContainText(
    "215",
  );
  await dialog
    .getByRole("button", { name: "Mostrar saldos", exact: true })
    .click();
  await prepareTransfer(page, "1250.50", "Prueba personal");
  await dialog.getByLabel("Código de verificación demo").fill("000000");
  await dialog
    .getByRole("button", { name: "Confirmar transferencia demo" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("no coincide");
  await dialog.getByLabel("Código de verificación demo").fill("123456");
  await dialog
    .getByRole("button", { name: "Confirmar transferencia demo" })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Transferencia simulada." }),
  ).toBeVisible();
  const receiptDownload = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Descargar comprobante demo" })
    .click();
  expect((await receiptDownload).suggestedFilename()).toMatch(
    /mifos-demo-.*\.txt/,
  );
  await dialog.getByRole("button", { name: "Ver mis movimientos" }).click();
  await dialog.getByRole("searchbox").fill("Prueba personal");
  await expect(dialog.locator(".transaction-list>li")).toHaveCount(1);
  await expect(dialog.locator(".transaction-amount")).toHaveText("-$1,250.50");
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "mifos-movimientos-demo.csv",
  );
  await dialog.getByRole("button", { name: "Mi resumen" }).click();
  await expect(dialog.locator(".total-balance>strong")).toContainText(
    "$214,430.00",
  );
  await prepareTransfer(page, "500", "Entre mis cuentas", true);
  await dialog
    .getByRole("button", { name: "Confirmar transferencia demo" })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Transferencia simulada." }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Mi resumen" }).click();
  await expect(dialog.locator(".total-balance>strong")).toContainText(
    "$214,430.00",
  );
  await expect(dialog.locator(".account-choice").nth(1)).toContainText(
    "$87,730.50",
  );
});

test("business transfers require a second approval and preserve balances until approved", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".header-segments")
    .getByRole("button", { name: "Empresas" })
    .click();
  await expect(page.locator("h1")).toContainText("Tu negocio,");
  await page
    .getByRole("button", { name: "Conoce tu banca", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Hola, Estudio Norte." }),
  ).toBeVisible();
  await prepareTransfer(page, "2000", "Pago a proveedor");
  await dialog.getByRole("button", { name: "Enviar a segunda firma" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Lista para una segunda firma." }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Mi resumen" }).click();
  await expect(dialog.locator(".total-balance>strong")).toContainText(
    "$712,800.00",
  );
  await dialog.getByRole("button", { name: /Aprobaciones/ }).click();
  await dialog.getByRole("button", { name: "Simular segunda firma" }).click();
  await dialog.getByLabel("Código de segunda firma demo").fill("654321");
  await dialog.getByRole("button", { name: "Confirmar segunda firma" }).click();
  await expect(dialog.getByText("Aprobada", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Mi resumen" }).click();
  await expect(dialog.locator(".total-balance>strong")).toContainText(
    "$710,800.00",
  );
});

test("beneficiaries can be added, validated, and removed", async ({ page }) => {
  await openDemo(page);
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Beneficiarios", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Agregar beneficiario", exact: true })
    .click();
  await dialog
    .getByLabel("Nombre del beneficiario de prueba")
    .fill("Ana Prueba");
  await dialog
    .getByLabel("Cuenta de prueba (18 dígitos)")
    .fill("000000000000000001");
  await dialog.getByRole("button", { name: "Guardar beneficiario" }).click();
  await expect(dialog.getByText("Ana Prueba", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Agregar beneficiario", exact: true })
    .click();
  await dialog
    .getByLabel("Nombre del beneficiario de prueba")
    .fill("Duplicado");
  await dialog
    .getByLabel("Cuenta de prueba (18 dígitos)")
    .fill("000000000000000001");
  await dialog.getByRole("button", { name: "Guardar beneficiario" }).click();
  await expect(dialog.getByRole("alert")).toContainText("ya está");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await dialog.getByRole("button", { name: "Eliminar a Ana Prueba" }).click();
  await dialog.getByRole("button", { name: "Sí", exact: true }).click();
  await expect(dialog.getByText("Ana Prueba", { exact: true })).toHaveCount(0);
});

test("onboarding is complete, local, and explicitly a demo", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Comienza tu futuro" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await dialog.getByLabel("Tu nombre de prueba").fill("Persona Demo");
  await dialog
    .getByLabel("Correo electrónico de prueba")
    .fill("demo@example.com");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Crear mi experiencia demo" })
    .click();
  await expect(
    dialog.getByRole("heading", { name: /Tu futuro se ve bien/ }),
  ).toContainText("Persona Demo");
  await dialog.getByRole("button", { name: "Explorar mi banca demo" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Hola, Mariana." }),
  ).toBeVisible();
  expect(posts).toEqual([]);
});

test("contact prepares a message without pretending to send it", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Cotizar mi crédito", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill("Quisiera conocer los requisitos.");
  await dialog.getByRole("button", { name: "Preparar mi consulta" }).click();
  await expect(dialog.getByText("Tu consulta está lista.")).toBeVisible();
  await expect(dialog.locator(".selectable-message")).toContainText("crédito");
  await expect(
    dialog.getByText(/No se ha enviado ningún mensaje/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cotizar mi crédito", exact: true }),
  ).toBeFocused();
});

test("mobile navigation and banking are usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .locator("#mobile-navigation")
    .getByRole("button", { name: "Empresas", exact: true })
    .click();
  await page
    .locator("#mobile-navigation")
    .getByRole("button", { name: "Cuenta MIFOS", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Abrir menú" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".mini-greeting h4")).toContainText(
    "Estudio Norte",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Explora la banca digital" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Hola, Estudio Norte." }),
  ).toBeVisible();
  const widths = await page.getByRole("dialog").evaluate((element) => ({
    content: element.scrollWidth,
    viewport: element.clientWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("transfer limits prevent invalid amounts before review", async ({
  page,
}) => {
  await openDemo(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Transferir", exact: true }).click();
  const amount = dialog.getByRole("spinbutton", { name: /Importe/ });
  await amount.fill("60000");
  await dialog.getByLabel("Concepto", { exact: true }).fill("Fuera de límite");
  await dialog.getByRole("button", { name: "Revisar transferencia" }).click();
  expect(
    await amount.evaluate(
      (element: HTMLInputElement) => element.validity.rangeOverflow,
    ),
  ).toBeTruthy();
  await amount.fill("0");
  await dialog.getByRole("button", { name: "Revisar transferencia" }).click();
  expect(
    await amount.evaluate(
      (element: HTMLInputElement) => element.validity.rangeUnderflow,
    ),
  ).toBeTruthy();
  await expect(
    dialog.getByRole("heading", { name: "¿A dónde vamos hoy?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Mi resumen" }).click();
  await expect(dialog.locator(".total-balance>strong")).toContainText(
    "$215,680.50",
  );
});

test("keyboard focus stays in dialogs and session inactivity resets on input", async ({
  page,
}) => {
  await page.clock.install();
  await openDemo(page);
  for (let index = 0; index < 20; index++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest("dialog[open]")),
      ),
    ).toBeTruthy();
  }
  await page.clock.fastForward(9 * 60 * 1000);
  await page.keyboard.press("Tab");
  await page.clock.fastForward(2 * 60 * 1000);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.clock.fastForward(9 * 60 * 1000);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "10 minutos de inactividad",
  );
});

test("English and Mexican Spanish switch consistently and persist", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await expect(page.locator("h1")).toContainText("Siempre hacia");
  await page
    .locator(".header-actions .locale-toggle")
    .getByRole("button", { name: "EN" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page).toHaveTitle("MIFOS | Always moving forward");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Discover a new digital banking experience/,
  );
  await expect(page.locator("h1")).toContainText("Always moving");
  await expect(
    page.getByRole("button", { name: "Explore your banking", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await page
    .getByRole("button", { name: "Explore your banking", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Hello, Mariana." }),
  ).toBeVisible();
  await expect(dialog.locator(".total-balance>strong")).toContainText(
    "MX$215,680.50",
  );
  await dialog
    .locator(".dialog-locale")
    .getByRole("button", { name: "ES" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await expect(
    dialog.getByRole("heading", { name: "Hola, Mariana." }),
  ).toBeVisible();
  await expect(dialog.locator(".total-balance>strong")).toContainText(
    "$215,680.50",
  );
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
    ),
  ).toEqual([]);
});

test.describe("step-up verification", () => {
  const confirm = "Confirmar transferencia demo";

  test("a wrong code shows the attempts left, and the right code still works", async ({
    page,
  }) => {
    await openDemo(page);
    const dialog = page.getByRole("dialog");
    await reachStepUp(page, "100", "Intentos");
    const code = dialog.getByLabel("Código de verificación demo");
    await expect(code).toBeFocused();
    await expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await expect(dialog.getByText("Te quedan 5 intentos.")).toBeVisible();

    await code.fill("000000");
    await dialog.getByRole("button", { name: confirm }).click();
    await expect(dialog.getByRole("alert")).toContainText("no coincide");
    await expect(dialog.getByText("Te quedan 4 intentos.")).toBeVisible();
    await expect(code).toBeFocused();

    await code.fill("123456");
    await dialog.getByRole("button", { name: confirm }).click();
    await expect(
      dialog.getByRole("heading", { name: "Transferencia simulada." }),
    ).toBeVisible();
  });

  test("five wrong codes lock the verification, even for the right code", async ({
    page,
  }) => {
    await openDemo(page);
    const dialog = page.getByRole("dialog");
    await reachStepUp(page, "100", "Bloqueo");
    const code = dialog.getByLabel("Código de verificación demo");
    for (let attempt = 0; attempt < 5; attempt++) {
      await code.fill("000000");
      await dialog.getByRole("button", { name: confirm }).click();
      if (attempt < 4) await expect(dialog.getByRole("alert")).toBeVisible();
    }
    await expect(dialog.getByRole("alert")).toContainText(
      "Demasiados intentos incorrectos",
    );
    await expect(code).toHaveCount(0);
    await expect(
      dialog.getByRole("heading", { name: "Transferencia simulada." }),
    ).toHaveCount(0);
    // balances are untouched
    await dialog.getByRole("button", { name: "Volver al resumen" }).click();
    await dialog.getByRole("button", { name: "Mi resumen" }).click();
    await expect(dialog.locator(".total-balance>strong")).toContainText(
      "$215,680.50",
    );
  });

  test("resend waits for the cooldown and clears the field", async ({
    page,
  }) => {
    await page.clock.install();
    await openDemo(page);
    const dialog = page.getByRole("dialog");
    await reachStepUp(page, "100", "Reenvío");
    const resend = dialog.getByRole("button", { name: /^Reenviar código/ });
    await expect(resend).toBeDisabled();
    await expect(resend).toContainText(/en \d+ s/);

    await dialog.getByLabel("Código de verificación demo").fill("1234");
    await page.clock.runFor(31_000);
    await expect(resend).toBeEnabled();
    await resend.click();
    await expect(dialog.getByText("Te enviamos un código nuevo.")).toBeVisible();
    await expect(dialog.getByLabel("Código de verificación demo")).toHaveValue(
      "",
    );
    await expect(resend).toBeDisabled();
  });

  test("an expired code asks for a new one", async ({ page }) => {
    await page.clock.install();
    await openDemo(page);
    const dialog = page.getByRole("dialog");
    await reachStepUp(page, "100", "Vence");
    await expect(dialog.getByRole("timer")).toContainText("5:00");
    await page.clock.runFor(5 * 60 * 1000 + 1000);
    await expect(dialog.getByRole("alert")).toContainText("ya no es válido");
    await dialog.getByRole("button", { name: "Pedir un código nuevo" }).click();
    await dialog
      .getByLabel("Código de verificación demo")
      .fill("123456");
    await dialog.getByRole("button", { name: confirm }).click();
    await expect(
      dialog.getByRole("heading", { name: "Transferencia simulada." }),
    ).toBeVisible();
  });

  test("the verification step has no accessibility violations and fits a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openDemo(page);
    const dialog = page.getByRole("dialog");
    await reachStepUp(page, "100", "Accesibilidad");
    await dialog.getByLabel("Código de verificación demo").fill("000000");
    await dialog.getByRole("button", { name: confirm }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include(".stepup-panel")
      .analyze();
    expect(results.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  });

  test("the verification step is fully translated into English", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator(".header-actions .locale-toggle")
      .getByRole("button", { name: "EN" })
      .click();
    await page
      .getByRole("button", { name: "Explore your banking", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Transfer", exact: true }).click();
    await dialog.getByRole("spinbutton", { name: /Amount/ }).fill("100");
    await dialog.getByLabel("Memo", { exact: true }).fill("English");
    await dialog.getByRole("button", { name: /Review transfer/ }).click();
    await dialog.getByRole("button", { name: /Continue to verification/ }).click();
    await expect(dialog.getByLabel("Demo verification code")).toBeVisible();
    await dialog.getByLabel("Demo verification code").fill("000000");
    await dialog.getByRole("button", { name: /Confirm .*transfer/i }).click();
    await expect(dialog.getByRole("alert")).toContainText("does not match");
    await expect(dialog.getByText("You have 4 attempts left.")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Resend code in \d+ s/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
      ),
    ).toEqual([]);
  });
});

test.describe("security activity", () => {
  async function openActivity(page: Page) {
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Actividad de seguridad", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "Actividad de seguridad" }),
    ).toBeVisible();
    return dialog;
  }

  const entries = (page: Page) =>
    page.getByRole("list", { name: "Lista de actividad" }).getByRole("listitem");

  test("shows the sign-in and the older demo history, with masked IP addresses", async ({
    page,
  }) => {
    await openDemo(page);
    const dialog = await openActivity(page);

    await expect(entries(page).first()).toContainText("Iniciaste sesión");
    await expect(entries(page).first()).toContainText("IP 192.0.x.x");
    await expect(dialog.getByText("Actividad de demostración")).toBeVisible();
    await expect(
      entries(page).filter({ hasText: "Intento de acceso fallido" }),
    ).toContainText("No completado");
    // the full address is never on the screen
    await expect(dialog).not.toContainText(/\d+\.\d+\.\d+\.\d+/);
  });

  test("follows what the user does: verification, transfer and beneficiary", async ({
    page,
  }) => {
    await openDemo(page);
    const dialog = page.getByRole("dialog");
    await prepareTransfer(page, "321.50", "Actividad");
    await dialog
      .getByRole("button", { name: "Confirmar transferencia demo" })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "Transferencia simulada." }),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Beneficiarios", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Agregar beneficiario", exact: true })
      .click();
    await dialog
      .getByLabel("Nombre del beneficiario de prueba")
      .fill("Luz Actividad");
    await dialog.getByLabel(/Cuenta de prueba/).fill("000000000000000077");
    await dialog.getByRole("button", { name: "Guardar beneficiario" }).click();
    await dialog
      .getByRole("button", { name: "Eliminar a Luz Actividad" })
      .click();
    await dialog.getByRole("button", { name: "Sí", exact: true }).click();

    await openActivity(page);

    const texts = await entries(page).allTextContents();
    const at = (needle: string) =>
      texts.findIndex((text) => text.includes(needle));
    expect(at("Eliminaste al beneficiario Luz Actividad")).toBeGreaterThanOrEqual(0);
    expect(at("Agregaste al beneficiario Luz Actividad")).toBeGreaterThan(
      at("Eliminaste al beneficiario Luz Actividad"),
    );
    expect(at("Transferencia confirmada de $321.50")).toBeGreaterThan(
      at("Agregaste al beneficiario Luz Actividad"),
    );
    expect(at("Verificaste un código")).toBeGreaterThan(
      at("Transferencia confirmada de $321.50"),
    );
    expect(at("Solicitaste un código de verificación")).toBeGreaterThan(
      at("Verificaste un código"),
    );
    expect(texts.join(" ")).not.toContain("123456");
  });

  test("a wrong code is not listed one by one, but the lock-out is", async ({
    page,
  }) => {
    await openDemo(page);
    const dialog = page.getByRole("dialog");
    await reachStepUp(page, "10", "Bloqueo");
    for (let attempt = 0; attempt < 5; attempt++) {
      await dialog.getByLabel("Código de verificación demo").fill("000000");
      await dialog
        .getByRole("button", { name: "Confirmar transferencia demo" })
        .click();
      if (attempt < 4) await expect(dialog.getByRole("alert")).toBeVisible();
    }
    await expect(dialog.getByRole("alert")).toContainText(
      "Demasiados intentos incorrectos",
    );
    await dialog.getByRole("button", { name: "Volver al resumen" }).click();

    await openActivity(page);

    await expect(
      entries(page).filter({
        hasText: "Verificación bloqueada por demasiados intentos",
      }),
    ).toHaveCount(1);
    await expect(
      entries(page).filter({ hasText: "Verificaste un código" }),
    ).toHaveCount(0);
  });

  test("the filter chips narrow the list", async ({ page }) => {
    await openDemo(page);
    const dialog = await openActivity(page);
    const all = await entries(page).count();

    await dialog.getByRole("button", { name: "Cuenta", exact: true }).click();
    await expect(entries(page)).toHaveCount(1);
    await expect(entries(page).first()).toContainText("Cambiaste tu contraseña");
    await expect(
      dialog.getByRole("button", { name: "Cuenta", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    await dialog.getByRole("button", { name: "Todo", exact: true }).click();
    await expect(entries(page)).toHaveCount(all);
  });

  test("a business transfer waiting for the second signature is not listed until it is approved", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator(".header-segments")
      .getByRole("button", { name: "Empresas" })
      .click();
    await page
      .getByRole("button", { name: "Conoce tu banca", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await prepareTransfer(page, "2000", "Proveedor");
    await dialog.getByRole("button", { name: "Enviar a segunda firma" }).click();
    await openActivity(page);
    await expect(
      entries(page).filter({ hasText: "Transferencia confirmada" }),
    ).toHaveCount(0);

    await dialog.getByRole("button", { name: /Aprobaciones/ }).click();
    await dialog.getByRole("button", { name: "Simular segunda firma" }).click();
    await dialog.getByLabel("Código de segunda firma demo").fill("654321");
    await dialog.getByRole("button", { name: "Confirmar segunda firma" }).click();
    await openActivity(page);

    await expect(
      entries(page).filter({ hasText: "Transferencia confirmada de $2,000.00" }),
    ).toHaveCount(1);
  });

  test("has no accessibility violations and fits a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openDemo(page);
    await openActivity(page);

    const results = await new AxeBuilder({ page })
      .include(".activity-feed")
      .analyze();
    expect(results.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  });

  test("is fully translated into English", async ({ page }) => {
    await page.goto("/");
    await page
      .locator(".header-actions .locale-toggle")
      .getByRole("button", { name: "EN" })
      .click();
    await page
      .getByRole("button", { name: "Explore your banking", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Security activity", exact: true })
      .click();

    await expect(
      dialog.getByRole("heading", { name: "Security activity" }),
    ).toBeVisible();
    await expect(page.locator(".activity-list li").first()).toContainText("You signed in");
    await expect(
      page.locator(".activity-list li").filter({ hasText: "Failed sign-in attempt" }),
    ).toContainText("Not completed");
    await expect(dialog.getByText(/Showing \d+ of \d+/)).toBeVisible();
    await dialog.getByRole("button", { name: "Sign-ins", exact: true }).click();
    await expect(page.locator(".activity-list li").first()).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
      ),
    ).toEqual([]);
  });
});
