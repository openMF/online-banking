import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import {
  ActivityError,
  type ActivityApi,
  type ActivityItem,
  type ActivityPage,
} from "../lib/activity";
import { ActivityFeed } from "./ActivityFeed";

function entry(id: number, overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id,
    type: "LOGIN",
    outcome: "SUCCESS",
    occurredAt: "2026-10-23T09:30:05",
    ipAddress: "203.0.x.x",
    details: {},
    ...overrides,
  };
}

function apiReturning(...pages: ActivityPage[]): ActivityApi & { list: ReturnType<typeof vi.fn> } {
  let call = 0;
  return {
    mode: "backend",
    list: vi.fn(async () => pages[Math.min(call++, pages.length - 1)]),
  };
}

function renderFeed(api: ActivityApi) {
  return render(
    <I18nProvider>
      <ActivityFeed api={api} />
    </I18nProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("ActivityFeed", () => {
  it("lists what happened, newest first, with the time and the masked IP address", async () => {
    renderFeed(
      apiReturning({
        totalFilteredRecords: 2,
        pageItems: [
          entry(2, {
            type: "TRANSFER_CONFIRMED",
            details: {
              amount: "1250.50",
              currency: "MXN",
              toName: "Luz Pérez",
              toAccountLast4: "0042",
            },
          }),
          entry(1),
        ],
      }),
    );

    const list = await screen.findByRole("list", { name: "Lista de actividad" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("Transferencia confirmada de");
    expect(rows[0].textContent).toContain("$1,250.50");
    expect(rows[0].textContent).toContain("Luz Pérez");
    expect(rows[0].textContent).toContain("Cuenta destino terminada en 0042");
    expect(rows[1].textContent).toContain("Iniciaste sesión");
    expect(rows[1].textContent).toContain("IP 203.0.x.x");
    expect(rows[1].querySelector("time")?.getAttribute("datetime")).toBe("2026-10-23T09:30:05");
  });

  it("shows how many are shown of how many exist", async () => {
    renderFeed(apiReturning({ totalFilteredRecords: 41, pageItems: [entry(1)] }));

    expect(await screen.findByText("Mostrando 1 de 41")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Mostrando 1 de 41");
  });

  it("marks a failed attempt in words, not only in colour", async () => {
    renderFeed(
      apiReturning({
        totalFilteredRecords: 1,
        pageItems: [entry(1, { type: "LOGIN_FAILED", outcome: "FAILURE" })],
      }),
    );

    const row = (await screen.findAllByRole("listitem"))[0];
    expect(row.textContent).toContain("Intento de acceso fallido");
    expect(row.textContent).toContain("No completado");
  });

  it("narrows the list with the filter chips, and says which one is on", async () => {
    const api = apiReturning({ totalFilteredRecords: 1, pageItems: [entry(1)] });
    const user = userEvent.setup();
    renderFeed(api);
    await screen.findAllByRole("listitem");
    expect(screen.getByRole("button", { name: "Todo" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Accesos" }));

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(api.list.mock.calls[1][0].types).toEqual([
      "LOGIN",
      "LOGIN_FAILED",
      "LOGIN_NEW_DEVICE",
      "LOGOUT",
      "PASSWORD_RESET",
    ]);
    expect(screen.getByRole("button", { name: "Accesos" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Todo" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("shows more when there is more, and then stops offering it", async () => {
    const api = apiReturning(
      { totalFilteredRecords: 2, pageItems: [entry(2)] },
      { totalFilteredRecords: 2, pageItems: [entry(1)] },
    );
    const user = userEvent.setup();
    renderFeed(api);

    await user.click(await screen.findByRole("button", { name: "Mostrar más" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(screen.queryByRole("button", { name: "Mostrar más" })).toBeNull();
    expect(api.list.mock.calls[1][0].offset).toBe(1);
  });

  it("says when there is nothing to show", async () => {
    renderFeed(apiReturning({ totalFilteredRecords: 0, pageItems: [] }));

    expect(await screen.findByText("Todavía no hay actividad para mostrar.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Lista de actividad" })).toBeNull();
  });

  it("reports a failure as an alert with a fixed message, and retries", async () => {
    const api: ActivityApi & { list: ReturnType<typeof vi.fn> } = {
      mode: "backend",
      list: vi
        .fn()
        .mockRejectedValueOnce(new ActivityError("network"))
        .mockResolvedValue({ totalFilteredRecords: 1, pageItems: [entry(1)] }),
    };
    const user = userEvent.setup();
    renderFeed(api);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No pudimos conectar con el servidor");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect((await screen.findAllByRole("listitem")).length).toBe(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tells the user when the session ended", async () => {
    renderFeed({ mode: "backend", list: vi.fn().mockRejectedValue(new ActivityError("session")) });

    expect((await screen.findByRole("alert")).textContent).toContain("Tu sesión terminó");
  });

  it("says that demo data is not real, and only then", async () => {
    const demo = apiReturning({ totalFilteredRecords: 0, pageItems: [] });
    const { unmount } = renderFeed({ ...demo, mode: "demo" });
    expect(
      await screen.findByText("Actividad de demostración: no es información real."),
    ).toBeTruthy();
    unmount();

    renderFeed(apiReturning({ totalFilteredRecords: 0, pageItems: [] }));
    await screen.findByText("Todavía no hay actividad para mostrar.");
    expect(screen.queryByText(/de demostración/)).toBeNull();
  });

  it("speaks English when the locale is English", async () => {
    window.localStorage.setItem("mifos-locale", "en-US");
    renderFeed(
      apiReturning({
        totalFilteredRecords: 2,
        pageItems: [
          entry(2, { type: "LOGIN_FAILED", outcome: "FAILURE" }),
          entry(1, { type: "BENEFICIARY_ADDED", details: { name: "Luz" } }),
        ],
      }),
    );

    expect(await screen.findByRole("heading", { name: "Security activity" })).toBeTruthy();
    const rows = await screen.findAllByRole("listitem");
    expect(rows[1].textContent).toContain("You added the beneficiary Luz");
    expect(rows[0].textContent).toContain("Failed sign-in attempt");
    expect(rows[0].textContent).toContain("Not completed");
    expect(screen.getByRole("button", { name: "Sign-ins" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Showing 2 of 2");
  });
});
