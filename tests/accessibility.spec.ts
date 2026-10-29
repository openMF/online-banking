import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { account, clientId, login, productId, template } from "./fixtures/savings";

// MX-492 (US-E12-06): the whole app, screen by screen, at three widths. It FAILS on:
//   - any WCAG 2.1 A / AA violation found by axe (after the animations have settled),
//   - best-practice problems (heading order, duplicate landmarks, ...),
//   - horizontal scroll (reflow, 1.4.10),
//   - a control smaller than 24 x 24 px (2.5.8),
//   - a control Tab cannot reach, one without a visible focus indicator, or focus escaping a dialog.
// Add a screen to the lists below and it is covered. No rule is switched off: an exception would
// have to be written down here, with its reason.

const WIDTHS = (process.env.A11Y_WIDTHS ?? "320,768,1440").split(",").map(Number);
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.use({ actionTimeout: 10_000 });

type Screen = {
  name: string;
  open: (page: Page) => Promise<void>;
  /** Walk the page with Tab (the slow check): only where it adds something. */
  keyboard?: boolean;
  /** Undo what the screen set up that would leak into the next one. */
  after?: (page: Page) => Promise<void>;
};

const phone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 800;
const dialog = (page: Page) => page.getByRole("dialog");

/** Animations that fade a section in change its colours while they run: measure after them. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const deadline = Date.now() + 4000;
    while (document.getAnimations().length > 0 && Date.now() < deadline) {
      await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    }
  });
  await page.waitForTimeout(350);
}

// -------------------------------------------------------------------------------------------------
// what is checked on every screen
// -------------------------------------------------------------------------------------------------

async function checkAxe(page: Page) {
  const wcag = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(
    wcag.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
    "WCAG 2.1 A/AA",
  ).toEqual([]);
  const practice = await new AxeBuilder({ page }).withTags(["best-practice"]).analyze();
  expect(
    practice.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    ),
    "best practice",
  ).toEqual([]);
}

async function checkReflow(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, "horizontal scroll (px)").toBeLessThanOrEqual(1);
}

async function checkTargetSize(page: Page) {
  const small = await page.evaluate(() => {
    const scope = document.querySelector("dialog[open]") ?? document;
    const sel =
      'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [tabindex]:not([tabindex="-1"])';
    return [...scope.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === "hidden") return false;
        if (el.hasAttribute("disabled") || cs.display === "inline") return false; // in a sentence
        if (r.width >= 24 && r.height >= 24) return false;
        // A checkbox or a radio is hit through its label as well: that is its target.
        if (el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)) {
          const label = el.labels?.[0]?.getBoundingClientRect();
          if (label && label.width >= 24 && label.height >= 24) return false;
        }
        return true;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        const name = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30);
        return `${el.tagName.toLowerCase()} "${name}" ${Math.round(r.width)}x${Math.round(r.height)}`;
      });
  });
  expect(small, "controls under 24x24 px").toEqual([]);
}

async function checkHeadings(page: Page) {
  const problems = await page.evaluate(() => {
    const scope: ParentNode = document.querySelector("dialog[open]") ?? document;
    const levels = [...scope.querySelectorAll("h1,h2,h3,h4,h5,h6")]
      .filter(
        (h) =>
          (h as HTMLElement).getBoundingClientRect().height > 0 || h.classList.contains("sr-only"),
      )
      .map((h) => Number(h.tagName[1]));
    const skipped = levels.filter((level, i) => i > 0 && level - levels[i - 1] > 1);
    return {
      skipped,
      h1: document.querySelectorAll("h1").length,
      title: document.title,
      lang: document.documentElement.lang,
    };
  });
  expect(problems.skipped, "skipped heading levels").toEqual([]);
  expect(problems.title, "page title").not.toBe("");
  expect(problems.lang, "html lang").not.toBe("");
}

/** Tab through the page (or the open dialog): all of it reachable, a visible indicator on each. */
async function checkKeyboard(page: Page) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  const inDialog = (await page.locator("dialog[open]").count()) > 0;
  const expected = await page.evaluate(() => {
    const scope = document.querySelector("dialog[open]") ?? document;
    const sel =
      'a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return [...scope.querySelectorAll<HTMLElement>(sel)].filter(
      (el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== "hidden",
    ).length;
  });

  const reached = new Set<number>();
  const withoutIndicator: string[] = [];
  let previous = -1;
  const limit = Math.min(expected + 20, 160);
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      let mark = el.getAttribute("data-a11y-id");
      const fresh = mark === null;
      if (fresh) {
        mark = String(
          ((window as unknown as { __a11y?: number }).__a11y =
            ((window as unknown as { __a11y?: number }).__a11y ?? 0) + 1),
        );
        el.setAttribute("data-a11y-id", mark);
      }
      const cs = getComputedStyle(el);
      const indicator =
        (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
        cs.boxShadow !== "none" ||
        // a text field shows its focus with the border and the caret
        el.matches("input:not([type=checkbox]):not([type=radio]), select, textarea");
      return {
        mark: Number(mark),
        fresh,
        indicator,
        name: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28)}"`,
        escaped: Boolean(document.querySelector("dialog[open]")) && !el.closest("dialog"),
      };
    });
    if (!info) continue;
    if (inDialog) expect(info.escaped, `focus left the dialog at ${info.name}`).toBe(false);
    // A date field has several stops inside it (day, month, year, picker): the same element.
    if (info.mark === previous) continue;
    previous = info.mark;
    if (!info.fresh) break; // round again: everything has been visited
    reached.add(info.mark);
    if (!info.indicator) withoutIndicator.push(info.name);
  }
  expect(withoutIndicator, "focused without a visible indicator").toEqual([]);
  // Everything that can be focused is reached (a few extra stops, like the page, are allowed).
  expect(
    reached.size,
    `Tab reached ${reached.size} of ${expected} controls`,
  ).toBeGreaterThanOrEqual(expected);
  await page.evaluate(() =>
    document.querySelectorAll("[data-a11y-id]").forEach((el) => el.removeAttribute("data-a11y-id")),
  );
}

async function audit(page: Page, screen: Screen) {
  await settle(page);
  await checkAxe(page);
  await checkReflow(page);
  await checkTargetSize(page);
  await checkHeadings(page);
  if (screen.keyboard && (page.viewportSize()?.width ?? 0) >= 768) await checkKeyboard(page);
}

// -------------------------------------------------------------------------------------------------
// screens that need no backend
// -------------------------------------------------------------------------------------------------

async function openMenuIfPhone(page: Page) {
  if (phone(page)) await page.getByRole("button", { name: "Abrir menú" }).click();
}

async function openSolution(page: Page) {
  await page.goto("/");
  if (phone(page)) {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page
      .locator("#mobile-navigation")
      .getByRole("button", { name: /Ahorro e inversión/ })
      .click();
  } else {
    await page.getByRole("button", { name: "Soluciones", exact: true }).click();
    await page
      .locator("#solutions-menu")
      .getByRole("button", { name: /Ahorro e inversión/ })
      .click();
  }
  await page.getByText("Tu próximo logro empieza hoy.").waitFor();
}

async function openDemo(page: Page, business = false) {
  await page.goto("/");
  if (business) {
    if (phone(page)) {
      await page.getByRole("button", { name: "Abrir menú" }).click();
      await page
        .locator("#mobile-navigation")
        .getByRole("button", { name: "Empresas", exact: true })
        .click();
      // the menu stays open over the page: close it, as a person would
      await page.getByRole("button", { name: "Cerrar menú" }).click();
    } else {
      await page.locator(".header-segments").getByRole("button", { name: "Empresas" }).click();
    }
  }
  await page.getByRole("button", { name: "Conoce tu banca", exact: true }).click();
  await page
    .getByRole("heading", {
      name: business ? "Hola, Estudio Norte." : "Hola, Mariana.",
      exact: true,
    })
    .waitFor();
}

const nav = (page: Page, name: string | RegExp) =>
  dialog(page)
    .getByRole("button", { name, exact: typeof name === "string" })
    .click();

async function reachVerification(page: Page) {
  await openDemo(page);
  await nav(page, "Transferir");
  await dialog(page)
    .getByRole("spinbutton", { name: /Importe/ })
    .fill("100");
  await dialog(page).getByLabel("Concepto", { exact: true }).fill("Accesibilidad");
  await dialog(page).getByRole("button", { name: "Revisar transferencia" }).click();
}

const screens: Screen[] = [
  {
    name: "landing",
    open: async (p) => {
      await p.goto("/");
      await p.waitForSelector("h1");
    },
    keyboard: true,
  },
  {
    name: "landing: solutions menu",
    open: async (p) => {
      if (phone(p)) {
        await p.goto("/");
        await p.getByRole("button", { name: "Abrir menú" }).click();
        await p.locator("#mobile-navigation").waitFor();
        return;
      }
      await p.goto("/");
      await p.getByRole("button", { name: "Soluciones", exact: true }).click();
      await p.locator("#solutions-menu").waitFor();
    },
    keyboard: true,
  },
  { name: "landing: savings simulator", open: openSolution },
  {
    name: "landing: credit simulator",
    open: async (p) => {
      await openSolution(p);
      await p.getByRole("button", { name: "Mi crédito", exact: true }).click();
      await p.getByText("Dale forma a ese gran proyecto.").waitFor();
    },
  },
  {
    name: "landing: FAQ open",
    open: async (p) => {
      await p.goto("/");
      await p.getByRole("button", { name: "¿Esta experiencia opera con dinero real?" }).click();
    },
  },
  {
    name: "login dialog",
    open: async (p) => {
      await p.goto("/");
      await openMenuIfPhone(p);
      await p.getByRole("button", { name: "Banca en línea", exact: true }).first().click();
      await dialog(p).waitFor();
    },
    keyboard: true,
  },
  {
    name: "onboarding dialog",
    open: async (p) => {
      await p.goto("/");
      await openMenuIfPhone(p);
      await p.getByRole("button", { name: "Abre tu cuenta" }).first().click();
      await dialog(p).waitFor();
    },
    keyboard: true,
  },
  { name: "demo: overview", open: (p) => openDemo(p), keyboard: true },
  {
    name: "demo: transfer form",
    open: async (p) => {
      await openDemo(p);
      await nav(p, "Transferir");
    },
    keyboard: true,
  },
  {
    name: "demo: transfer review",
    open: async (p) => {
      await reachVerification(p);
      await dialog(p).getByText("Todo claro antes de continuar.").waitFor();
    },
    keyboard: true,
  },
  {
    name: "demo: transfer verification",
    open: async (p) => {
      await reachVerification(p);
      await dialog(p).getByRole("button", { name: "Continuar a verificación" }).click();
      await dialog(p).getByLabel("Código de verificación demo").waitFor();
    },
    keyboard: true,
  },
  {
    name: "demo: transfer wrong code",
    open: async (p) => {
      await reachVerification(p);
      await dialog(p).getByRole("button", { name: "Continuar a verificación" }).click();
      await dialog(p).getByLabel("Código de verificación demo").fill("000000");
      await dialog(p).getByRole("button", { name: "Confirmar transferencia demo" }).click();
      await dialog(p).getByRole("alert").waitFor();
    },
  },
  {
    name: "demo: transfer done",
    open: async (p) => {
      await reachVerification(p);
      await dialog(p).getByRole("button", { name: "Continuar a verificación" }).click();
      await dialog(p).getByLabel("Código de verificación demo").fill("123456");
      await dialog(p).getByRole("button", { name: "Confirmar transferencia demo" }).click();
      await dialog(p).getByRole("heading", { name: "Transferencia simulada." }).waitFor();
    },
  },
  {
    name: "demo: movements",
    open: async (p) => {
      await openDemo(p);
      await nav(p, "Movimientos");
    },
    keyboard: true,
  },
  {
    name: "demo: beneficiaries",
    open: async (p) => {
      await openDemo(p);
      await nav(p, "Beneficiarios");
    },
    keyboard: true,
  },
  {
    name: "demo: security and activity",
    open: async (p) => {
      await openDemo(p);
      await nav(p, "Actividad de seguridad");
    },
    keyboard: true,
  },
  {
    name: "demo: authenticator secret",
    open: async (p) => {
      await openDemo(p);
      await nav(p, "Actividad de seguridad");
      await dialog(p)
        .getByRole("button", { name: /Vincular una app de autenticación/ })
        .click();
      await dialog(p).getByLabel("Clave de tu app de autenticación").waitFor();
    },
    keyboard: true,
  },
  {
    name: "demo: business approvals",
    open: async (p) => {
      await openDemo(p, true);
      await nav(p, /Aprobaciones/);
    },
    keyboard: true,
  },
];

// -------------------------------------------------------------------------------------------------
// the real customer screens, against a faked backend
// -------------------------------------------------------------------------------------------------

const baseUrl = "https://a11y-bank.invalid/fineract-provider/api/v1/self";

async function customerBackend(page: Page) {
  const fulfill = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.route("**/runtime-config.json", (route) =>
    fulfill(route, { baseUrl, tenantId: "a11y" }),
  );
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1\/self\//, "");
    if (path === "authentication/logout") return fulfill(route, { status: "success" });
    if (path === "authentication") return fulfill(route, login);
    if (path === "savingsaccounts/template")
      return fulfill(route, { ...template(url.searchParams.has("productId")), clientId });
    if (path === "stepup/config")
      return fulfill(route, {
        enabled: true,
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
    if (path === "stepup/totp")
      return fulfill(route, {
        available: true,
        status: "NONE",
        recoveryCodesRemaining: 0,
        exclusive: true,
        confirmedAt: null,
      });
    if (path === "activity")
      return fulfill(route, {
        totalFilteredRecords: 2,
        pageItems: [
          {
            id: 2,
            type: "LOGIN_FAILED",
            outcome: "FAILURE",
            occurredAt: "2026-10-29T09:30:05",
            ipAddress: "203.0.x.x",
            details: {},
          },
          {
            id: 1,
            type: "LOGIN",
            outcome: "SUCCESS",
            occurredAt: "2026-10-29T09:20:05",
            ipAddress: "203.0.x.x",
            details: {},
          },
        ],
      });
    if (path.startsWith(`clients/${clientId}/accounts`))
      return fulfill(route, { savingsAccounts: [account()] });
    return fulfill(route, {});
  });
}

async function customerSignIn(page: Page) {
  await page.goto("/");
  await openMenuIfPhone(page);
  await page.getByRole("button", { name: "Banca en línea", exact: true }).first().click();
  await page.getByLabel("Usuario", { exact: true }).fill("synthetic");
  await page.getByLabel("Contraseña", { exact: true }).fill("synthetic-pass");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await page.getByRole("heading", { name: "Acceso verificado" }).waitFor();
}

const customerScreens: Screen[] = [
  {
    name: "customer: login error",
    open: async (p) => {
      await p.route("**/authentication", (r) =>
        r.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
      );
      await p.goto("/");
      await openMenuIfPhone(p);
      await p.getByRole("button", { name: "Banca en línea", exact: true }).first().click();
      await p.getByLabel("Usuario", { exact: true }).fill("x");
      await p.getByLabel("Contraseña", { exact: true }).fill("y");
      await p.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
      await p.getByRole("alert").first().waitFor();
    },
    keyboard: true,
    after: (p) => p.unroute("**/authentication"),
  },
  { name: "customer: home", open: customerSignIn, keyboard: true },
  {
    name: "customer: savings application",
    open: async (p) => {
      await customerSignIn(p);
      await p.getByRole("button", { name: "Solicitar una cuenta de ahorro", exact: true }).click();
      await p.getByLabel("Producto de ahorro", { exact: true }).selectOption(String(productId));
      await p.getByLabel("Fecha de solicitud", { exact: true }).waitFor();
    },
    keyboard: true,
  },
  {
    name: "customer: security area",
    open: async (p) => {
      await customerSignIn(p);
      await p.getByRole("button", { name: "Seguridad de tu cuenta", exact: true }).click();
      await p.getByRole("heading", { name: "Actividad de seguridad" }).waitFor();
    },
    keyboard: true,
  },
  {
    name: "customer: change password, mismatch",
    open: async (p) => {
      await customerSignIn(p);
      await p.getByRole("button", { name: "Seguridad de tu cuenta", exact: true }).click();
      await p.getByLabel("Nueva contraseña", { exact: true }).fill("a");
      await p.getByLabel("Repite la nueva contraseña", { exact: true }).fill("b");
      await p.getByRole("button", { name: "Continuar", exact: true }).click();
      await p.getByRole("alert").first().waitFor();
    },
    keyboard: true,
  },
];

test.describe("every screen, at every width", () => {
  for (const width of WIDTHS) {
    for (const screen of [...screens, ...customerScreens]) {
      test(`${screen.name} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 800 ? 800 : 1000 });
        await customerBackend(page);
        await screen.open(page);
        await audit(page, screen);
        await screen.after?.(page);
      });
    }
  }
});

// -------------------------------------------------------------------------------------------------
// what axe cannot see
// -------------------------------------------------------------------------------------------------

test.describe("zoom, text size and motion", () => {
  test("at 320 CSS px (400 % zoom of 1280) nothing needs horizontal scroll and nothing is cut off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await customerBackend(page);
    for (const screen of [screens[0], screens[7], customerScreens[1]]) {
      await screen.open(page);
      await settle(page);
      await checkReflow(page);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("h1,h2,h3,p,button,a[href],label")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.left < -1;
          })
          .map((el) => el.textContent?.trim().slice(0, 30)),
      );
      expect(cut, `${screen.name}: content cut off on the left`).toEqual([]);
    }
  });

  test("text 200 % larger (1.4.4) and the WCAG text spacing (1.4.12) lose no content", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.waitForSelector("h1");
    await page.addStyleTag({
      content: `html { font-size: 200% !important; }
        * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
        p { margin-bottom: 2em !important; }`,
    });
    await settle(page);
    await checkReflow(page);
    // the main actions are still on the page, named and visible
    await expect(page.getByRole("button", { name: "Conoce tu banca", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Conoce tu banca", exact: true }).click();
    await expect(dialog(page).getByRole("heading", { name: "Hola, Mariana." })).toBeVisible();
    await expect(
      dialog(page).getByRole("button", { name: "Transferir", exact: true }),
    ).toBeVisible();
  });

  test("with reduced motion nothing keeps moving", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForSelector("h1");
    await page.waitForTimeout(1500);
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (a) =>
            a.playState === "running" &&
            Number(a.effect?.getComputedTiming().iterations) === Infinity,
        )
        .map((a) => (a.effect as KeyframeEffect | null)?.target?.tagName),
    );
    expect(running, "animations that repeat forever").toEqual([]);
  });
});

test.describe("keyboard and language", () => {
  test("the skip link is the first stop, becomes visible and moves to the content", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("h1");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenido$/);
    await expect(page.locator("#contenido")).toBeAttached();
  });

  for (const open of ["login", "demo"] as const) {
    test(`a ${open} dialog closes with Escape and gives the focus back where it was`, async ({
      page,
    }) => {
      await page.goto("/");
      const opener =
        open === "login"
          ? page.getByRole("button", { name: "Banca en línea", exact: true }).first()
          : page.getByRole("button", { name: "Conoce tu banca", exact: true });
      await opener.focus();
      await page.keyboard.press("Enter");
      await expect(dialog(page)).toBeVisible();
      // the focus is inside the dialog, and Tab keeps it there
      for (let i = 0; i < 6; i += 1) {
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog")))).toBe(
          true,
        );
      }
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toHaveCount(0);
      await expect(opener).toBeFocused();
    });
  }

  test("the language switch changes the lang of the page, and the choice is announced as pressed", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("h1");
    expect(await page.evaluate(() => document.documentElement.lang)).toMatch(/^es/);
    const toggle = page.locator(".header-actions .locale-toggle");
    await toggle.getByRole("button", { name: "EN", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.lang)).toMatch(/^en/);
    await expect(toggle.getByRole("button", { name: "EN", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(toggle.getByRole("button", { name: "ES", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
