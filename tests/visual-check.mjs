import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5173";
const extraAudits = {};
async function audit(name) {
  // Measure settled content, not the translucent exit/entrance transition.
  await page.waitForTimeout(1100);
  extraAudits[name] = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
}
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(baseURL);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
await page.screenshot({ path: "artifacts/desktop.png" });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 650) {
    window.scrollTo(0, y);
    await new Promise((resolve) => setTimeout(resolve, 130));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(800);
await page.screenshot({ path: "artifacts/full-page.png", fullPage: true });
const landingAudit = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
await page
  .getByRole("button", { name: "Conoce tu banca", exact: true })
  .click();
await page.waitForTimeout(800);
await page.screenshot({ path: "artifacts/bank.png" });
const bankAudit = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
const dialog = page.getByRole("dialog");
await dialog.getByRole("button", { name: "Transferir", exact: true }).click();
await audit("transfer");
await dialog.getByRole("spinbutton", { name: /Importe/ }).fill("100");
await dialog.getByLabel("Concepto", { exact: true }).fill("Prueba accesible");
await dialog.getByRole("button", { name: "Revisar transferencia" }).click();
await audit("transfer-review");
await dialog.getByRole("button", { name: "Continuar a verificación" }).click();
await audit("transfer-verification");
await dialog
  .getByRole("button", { name: "Beneficiarios", exact: true })
  .click();
await dialog
  .getByRole("button", { name: "Agregar beneficiario", exact: true })
  .click();
await audit("beneficiaries");
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Banca en línea", exact: true }).click();
await audit("login");
await page.keyboard.press("Escape");
await page
  .getByRole("button", { name: "Comienza tu futuro", exact: true })
  .click();
await audit("onboarding");
await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
await audit("onboarding-details");
await page.keyboard.press("Escape");
await page
  .getByRole("button", { name: "Habla con un asesor", exact: true })
  .click();
await audit("contact");
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Mi inversión", exact: true }).click();
await audit("investment");
await page.getByRole("button", { name: "Mi crédito", exact: true }).click();
await audit("credit");
await page.keyboard.press("Escape");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseURL);
await page.waitForTimeout(1100);
await page.screenshot({ path: "artifacts/mobile.png" });
await audit("mobile");
await page.getByRole("button", { name: "Abrir menú" }).click();
await audit("mobile-navigation");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(baseURL);
await page
  .locator(".header-actions .locale-toggle")
  .getByRole("button", { name: "EN" })
  .click();
await audit("english-landing");
await page
  .getByRole("button", { name: "Explore your banking", exact: true })
  .click();
await audit("english-bank");
const missingTranslations = await page.evaluate(
  () => window.__missingI18n || [],
);
const compact = (violations) =>
  violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  }));
const report = {
  errors,
  landing: landingAudit.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  })),
  bank: bankAudit.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  })),
  ...Object.fromEntries(
    Object.entries(extraAudits).map(([name, violations]) => [
      name,
      compact(violations),
    ]),
  ),
  missingTranslations,
};
await writeFile(
  "artifacts/accessibility.json",
  JSON.stringify(report, null, 2),
);
for (const [name, violations] of Object.entries(report)) {
  console.log(name, violations.length ? JSON.stringify(violations) : "PASS");
}
await browser.close();
if (Object.values(report).some((violations) => violations.length))
  process.exitCode = 1;
