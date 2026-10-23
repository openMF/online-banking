import { expect, test, type Locator, type Page } from "@playwright/test";
import enUS from "../src/i18n/locales/en-US.json" with { type: "json" };

type Locale = "es-MX" | "en-US";
const english = enUS.messages as Record<string, string>;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function phrases(locale: Locale) {
  const t = (key: string) => {
    if (locale === "es-MX") return key;
    if (!(key in english)) throw new Error(`No English translation for "${key}"`);
    return english[key];
  };
  return { t, re: (key: string) => new RegExp(escape(t(key))) };
}

async function openWith(page: Page, locale: Locale) {
  await page.addInitScript((value) => window.localStorage.setItem("mifos-locale", value), locale);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

const message = (field: Locator) =>
  field.evaluate((element: HTMLInputElement) => element.validationMessage);

for (const locale of ["es-MX", "en-US"] as const) {
  test.describe(`form validation in ${locale}`, () => {
    const { t } = phrases(locale);

    test("login, transfer, and beneficiary fields explain errors in the app language", async ({
      page,
    }) => {
      await openWith(page, locale);
      await page.getByRole("button", { name: t("Banca en línea"), exact: true }).click();
      const dialog = page.getByRole("dialog");
      const client = dialog.getByLabel(t("Número de cliente demo"));
      await dialog.getByRole("button", { name: t("Entrar a mi banca") }).click();
      expect(await message(client)).toBe(t("Completa este campo."));
      // Demo autofill sets values from code; the earlier custom error must not block it.
      await dialog.getByRole("button", { name: t("Completar con datos demo") }).click();
      await dialog.getByRole("button", { name: t("Entrar a mi banca") }).click();
      await expect(dialog.getByRole("heading", { name: t("Hola, Mariana.") })).toBeVisible();

      await dialog.getByRole("button", { name: t("Transferir"), exact: true }).click();
      const amount = dialog.getByRole("spinbutton");
      const concept = dialog.getByLabel(t("Concepto"), { exact: true });
      const review = dialog.getByRole("button", {
        name: t("Revisar transferencia"),
      });
      await amount.fill("60000");
      await concept.fill("ok");
      await review.click();
      expect(await message(amount)).toBe(
        t("Escribe un valor de {max} como máximo.").replace("{max}", "50,000"),
      );
      await amount.fill("0");
      await review.click();
      expect(await message(amount)).toBe(
        t("Escribe un valor de al menos {min}.").replace("{min}", "0.01"),
      );
      await amount.fill("100");
      await concept.fill("x");
      await review.click();
      expect(await message(concept)).toBe(
        t("Escribe al menos {min} caracteres; llevas {count}.")
          .replace("{min}", "2")
          .replace("{count}", "1"),
      );
      await concept.fill("Renta");
      expect(await message(concept)).toBe("");

      await dialog.getByRole("button", { name: t("Beneficiarios"), exact: true }).click();
      await dialog.getByRole("button", { name: t("Agregar beneficiario"), exact: true }).click();
      await dialog.getByLabel(t("Nombre del beneficiario de prueba")).fill("Ana Prueba");
      const account = dialog.getByLabel(t("Cuenta de prueba (18 dígitos)"));
      await account.fill("123");
      await dialog.getByRole("button", { name: t("Guardar beneficiario") }).click();
      expect(await message(account)).toBe(t("Escribe {count} dígitos.").replace("{count}", "18"));
    });

    test("onboarding and recovery fields explain errors in the app language", async ({ page }) => {
      await openWith(page, locale);
      await page.getByRole("button", { name: t("Comienza tu futuro") }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: t("Continuar"), exact: true }).click();
      const name = dialog.getByLabel(t("Tu nombre de prueba"));
      const email = dialog.getByLabel(t("Correo electrónico de prueba"));
      const create = dialog.getByRole("button", {
        name: t("Crear mi experiencia demo"),
      });
      await name.fill("   ");
      await create.click();
      expect(await message(name)).toBe(t("Completa este campo."));
      await name.fill("Persona Demo");
      await email.fill("correo");
      await create.click();
      expect(await message(email)).toBe(t("Escribe un correo electrónico válido."));
      await email.fill("demo@example.com");
      await create.click();
      expect(await message(dialog.getByRole("checkbox"))).toBe(
        t("Marca esta casilla para continuar."),
      );
      await dialog.getByRole("checkbox").check();
      await create.click();
      await expect(
        dialog.getByRole("heading", { name: new RegExp(escape("Persona Demo")) }),
      ).toBeVisible();
    });
  });
}

test("switching language keeps what the user has typed", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await page.getByRole("button", { name: "Conoce tu banca", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Transferir", exact: true }).click();
  await dialog.getByRole("spinbutton").fill("321.5");
  await dialog.getByLabel("Concepto", { exact: true }).fill("Renta de octubre");
  await dialog.locator(".dialog-locale").getByRole("button", { name: "EN" }).click();
  await expect(dialog.getByLabel("Memo", { exact: true })).toHaveValue("Renta de octubre");
  await expect(dialog.getByRole("spinbutton")).toHaveValue("321.5");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
});

// Names, the legal entity suffix, and brands are the same in both languages.
const languageIndependent = [
  "Mariana López",
  "Sofía Martínez",
  "Daniel García",
  "Sofía",
  "Estudio Norte",
  "S.A. de C.V.",
  // The masked step-up destination is account data from the API.
  "@ejemplo.mx",
];
const otherLanguage: Record<Locale, RegExp> = {
  "en-US":
    /[¿¡áéíóúñ]|\b(de|del|la|las|los|el|una|para|por|con|sin|tu|tus|cuenta|saldo|pago|monto|importe|concepto|fecha|cerrar|guardar|enviar|cancelar|continuar|código|correo|nombre|meses|días|hoy|ahorro|crédito|empresa|negocio|hola|ejemplo)\b/i,
  "es-MX":
    /\b(the|and|your|you|with|for|to|of|is|are|account|transfer|balance|save|cancel|close|code|error|invalid|failed|loading|submit|back|next)\b/i,
};

async function untranslated(page: Page, locale: Locale) {
  return page.evaluate(
    ({ pattern, allowed }) => {
      const other = new RegExp(pattern, "i");
      const strip = (value: string) =>
        allowed.reduce((text, name) => text.split(name).join(""), value);
      const found = new Set<string>();
      const root = document.querySelector("dialog[open]") ?? document.body;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.parentElement?.checkVisibility()) continue;
        const text = node.textContent!.replace(/\s+/g, " ").trim();
        if (other.test(strip(text))) found.add(text);
      }
      // Options of a closed <select> are not visible, but they are still what the user picks from.
      for (const option of root.querySelectorAll("option")) {
        const text = option.textContent!.replace(/\s+/g, " ").trim();
        if (other.test(strip(text))) found.add(`option: ${text}`);
      }
      for (const element of root.querySelectorAll("*"))
        for (const attribute of ["aria-label", "placeholder", "title", "alt"]) {
          const value = element.getAttribute(attribute);
          if (value && other.test(strip(value))) found.add(`${attribute}: ${value}`);
        }
      return [...found];
    },
    { pattern: otherLanguage[locale].source, allowed: languageIndependent },
  );
}

for (const locale of ["es-MX", "en-US"] as const) {
  test(`main screens show no text in the other language (${locale})`, async ({ page }) => {
    test.setTimeout(90000);
    const { t, re } = phrases(locale);
    const leaks: string[] = [];
    const check = async (screen: string) => {
      for (const text of await untranslated(page, locale)) leaks.push(`${screen}: ${text}`);
    };
    await openWith(page, locale);
    await check("landing");
    await page.getByRole("button", { name: t("Soluciones"), exact: true }).click();
    await page
      .locator("#solutions-menu")
      .getByRole("button", { name: re("Ahorro e inversión") })
      .click();
    await expect(page.getByText(t("Tu próximo logro empieza hoy."))).toBeVisible();
    await check("savings simulator");
    await page.getByRole("button", { name: t("Mi crédito"), exact: true }).click();
    await page.getByRole("button", { name: t("¿Esta experiencia opera con dinero real?") }).click();
    await check("credit simulator and FAQ");

    await page.getByRole("button", { name: t("Banca en línea"), exact: true }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: t("¿Olvidaste tu contraseña?") }).click();
    await check("password recovery");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: t("Banca en línea"), exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(t("Número de cliente demo")).fill("111111111");
    await dialog.getByLabel(t("Contraseña de prueba"), { exact: true }).fill("x");
    await dialog.getByRole("button", { name: t("Entrar a mi banca") }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await check("login error");
    await dialog.getByRole("button", { name: t("Completar con datos demo") }).click();
    await dialog.getByRole("button", { name: t("Entrar a mi banca") }).click();
    await expect(dialog.getByRole("heading", { name: t("Hola, Mariana.") })).toBeVisible();
    await check("overview");
    await dialog.getByRole("button", { name: t("Ocultar saldos"), exact: true }).click();
    await check("hidden balances");
    await dialog.getByRole("button", { name: t("Mostrar saldos"), exact: true }).click();

    await dialog.getByRole("button", { name: t("Transferir"), exact: true }).click();
    await dialog.getByRole("spinbutton").fill("100");
    await dialog.getByLabel(t("Concepto"), { exact: true }).fill("Renta");
    await dialog.getByRole("button", { name: t("Revisar transferencia") }).click();
    await expect(dialog.getByText(t("Todo claro antes de continuar."))).toBeVisible();
    await check("transfer review");
    await dialog.getByRole("button", { name: t("Continuar a verificación") }).click();
    await dialog.getByLabel(t("Código de verificación demo")).fill("000000");
    await dialog.getByRole("button", { name: t("Confirmar transferencia demo") }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await check("wrong verification code");
    await dialog.getByLabel(t("Código de verificación demo")).fill("123456");
    await dialog.getByRole("button", { name: t("Confirmar transferencia demo") }).click();
    await expect(dialog.getByRole("heading", { name: t("Transferencia simulada.") })).toBeVisible();
    await check("transfer done");
    await dialog.getByRole("button", { name: t("Ver mis movimientos") }).click();
    await check("transactions");
    await dialog.getByRole("searchbox").fill("zzz");
    await expect(dialog.getByText(t("No hay movimientos por aquí."))).toBeVisible();
    await check("empty search");

    await dialog.getByRole("button", { name: t("Beneficiarios"), exact: true }).click();
    await dialog.getByRole("button", { name: t("Agregar beneficiario"), exact: true }).click();
    await check("add beneficiary");
    await dialog.getByRole("button", { name: t("Cancelar"), exact: true }).click();
    await dialog
      .getByRole("button", {
        name: t("Eliminar a {name}").replace("{name}", "Sofía Martínez"),
      })
      .click();
    await check("delete beneficiary");
    await dialog.getByRole("button", { name: t("Cerrar sesión demo") }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await check("signed out");

    await page
      .locator(".header-segments")
      .getByRole("button", { name: t("Empresas") })
      .click();
    await page.getByRole("button", { name: t("Conoce tu banca"), exact: true }).click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: t("Hola, Estudio Norte.") })).toBeVisible();
    await dialog.getByRole("button", { name: t("Transferir"), exact: true }).click();
    await dialog.getByRole("spinbutton").fill("2000");
    await dialog.getByLabel(t("Concepto"), { exact: true }).fill("Proveedor");
    await dialog.getByRole("button", { name: t("Revisar transferencia") }).click();
    await dialog.getByRole("button", { name: t("Continuar a verificación") }).click();
    await dialog.getByLabel(t("Código de verificación demo")).fill("123456");
    await dialog.getByRole("button", { name: t("Enviar a segunda firma") }).click();
    await expect(
      dialog.getByRole("heading", { name: t("Lista para una segunda firma.") }),
    ).toBeVisible();
    await check("second signature pending");
    await dialog.getByRole("button", { name: re("Aprobaciones") }).click();
    await dialog.getByRole("button", { name: t("Simular segunda firma") }).click();
    await dialog.getByLabel(t("Código de segunda firma demo")).fill("111111");
    await dialog.getByRole("button", { name: t("Confirmar segunda firma") }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await check("wrong second signature");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: t("Comienza tu futuro") }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: t("Continuar"), exact: true }).click();
    await check("onboarding");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: t("Cotizar mi crédito"), exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("2026");
    await dialog.getByRole("button", { name: t("Preparar mi consulta") }).click();
    await expect(dialog.getByText(t("Tu consulta está lista."))).toBeVisible();
    await check("contact");
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: t("Abrir menú") }).click();
    await expect(page.locator("#mobile-navigation")).toBeVisible();
    await check("mobile menu");

    expect(leaks).toEqual([]);
    expect(
      await page.evaluate(
        () => (window as Window & { __missingI18n?: string[] }).__missingI18n ?? [],
      ),
    ).toEqual([]);
  });
}
