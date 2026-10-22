import { expect, test } from "@playwright/test";

for (const scenario of ["valid", "disabled", "missing", "invalid", "HTML", "redirect"] as const) {
  test(`runtime configuration ${scenario} keeps the demo available and performs no banking requests`, async ({
    page,
  }) => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const bankingRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning") warnings.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (request.url().startsWith("https://mx453-bank.invalid"))
        bankingRequests.push(request.url());
    });
    await page.route("**/runtime-config.json", (route) =>
      route.fulfill({
        status: scenario === "missing" ? 404 : scenario === "redirect" ? 302 : 200,
        headers:
          scenario === "redirect" ? { location: "https://mx453-bank.invalid/config.json" } : {},
        contentType: scenario === "HTML" ? "text/html" : "application/json",
        body:
          scenario === "HTML"
            ? "<html>SPA fallback</html>"
            : JSON.stringify(
                scenario === "disabled"
                  ? null
                  : {
                      baseUrl: "https://mx453-bank.invalid/fineract-provider/api/v1/self",
                      tenantId: scenario === "invalid" ? "bad\r\nheader" : "test",
                    },
              ),
      }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Conoce tu banca", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hola, Mariana.", exact: true })).toBeVisible();
    if (scenario !== "valid") {
      await expect.poll(() => warnings.join("\n")).toContain("[Self Service]");
      expect(warnings.join("\n")).toContain("Demo remains available");
    } else {
      // Wait for the configuration resource to be consumed, not just dispatched.
      await expect
        .poll(() =>
          page.evaluate(() =>
            performance
              .getEntriesByType("resource")
              .some((entry) => entry.name.endsWith("/runtime-config.json")),
          ),
        )
        .toBe(true);
      expect(warnings.filter((message) => message.includes("[Self Service]"))).toEqual([]);
    }
    expect(errors).toEqual([]);
    expect(bankingRequests).toEqual([]);
  });
}

// The UI currently uses origin-root assets; configuration must never be borrowed
// from another root application when the demo is mounted under a subpath.
test("subpath hosting rejects configuration before any root-config request", async ({ page }) => {
  const requests: string[] = [];
  const warnings: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("runtime-config.json")) requests.push(request.url());
  });
  page.on("console", (message) => warnings.push(message.text()));
  await page.goto("/online-banking/");
  await expect(page.locator("h1")).toContainText("MIFOS.");
  await expect.poll(() => warnings.join("\n")).toContain("Subpath deployments are unsupported");
  expect(requests).toEqual([]);
});
