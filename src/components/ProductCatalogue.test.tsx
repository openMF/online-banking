import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { ProductCatalogue } from "./ProductCatalogue";
import type { CustomerSession, CustomerResponse } from "../lib/authentication/client";
import { clientId, login, template } from "../../tests/fixtures/share-application";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);
const ok = (data: unknown): CustomerResponse => ({ ok: true, status: 200, data });
/** Renders the catalogue for a login with one client and no savings or loan products. */
function setup(shareTemplate: (selected: boolean) => unknown = template) {
  const request = vi.fn<CustomerSession["request"]>().mockImplementation(async (path, opts) => {
    if (path === "loanproducts") return ok([]);
    if (path === "savingsaccounts/template") return ok({ clientId, productOptions: [] });
    if (path === "loans/template") return ok({ clientId, productOptions: [] });
    if (path === "shareaccounts/template") return ok(shareTemplate(Boolean(opts.query?.productId)));
    throw new Error("Unexpected synthetic route");
  });
  const session: CustomerSession = {
    identity: { ...login, clients: [clientId] },
    expiresAt: Date.now() + 60000,
    request,
    logout: vi.fn(),
  };
  render(
    <I18nProvider>
      <ProductCatalogue session={session} onClose={vi.fn()} onExpired={vi.fn()} />
    </I18nProvider>,
  );
}
/** The text shown next to the lock-in period label. */
async function lockin() {
  const label = await screen.findByText("Periodo de bloqueo");
  return label.nextElementSibling?.textContent;
}

it("names the unit of a share product's lock-in period", async () => {
  // The fixture product locks shares in for 3 months (lockPeriodTypeEnum.id 2).
  setup();
  expect(await lockin()).toBe("3 Meses");
});

it.each([
  [0, "Días"],
  [1, "Semanas"],
  [3, "Años"],
])("names lock-in period unit %i", async (id, unit) => {
  setup((selected) => template(selected, { lockinPeriod: 6, lockPeriodTypeEnum: { id } }));
  expect(await lockin()).toBe(`6 ${unit}`);
});
