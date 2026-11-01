import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { ShareAccounts } from "./ShareAccounts";
import { parseShare, ShareError, type ShareAccount, type ShareClient } from "../lib/shares/client";
import { share, clientId } from "../../tests/fixtures/shares";
beforeEach(() => localStorage.clear());
afterEach(cleanup);
function setup(
  client: ShareClient = {
    list: vi.fn().mockResolvedValue([parseShare(share(), clientId, 476)]),
    detail: vi.fn().mockResolvedValue(parseShare(share(), clientId, 476)),
  },
  clients = [clientId],
) {
  const expired = vi.fn(),
    close = vi.fn();
  const element = (c = client, ids = clients) => (
    <I18nProvider>
      <ShareAccounts client={c} clients={ids} onExpired={expired} onClose={close} />
    </I18nProvider>
  );
  return { ...render(element()), client, expired, close, element };
}
it("shows holdings, exact valuation and dividend states; restores list focus", async () => {
  const v = setup();
  await screen.findByRole("heading", { name: "Synthetic Equity" });
  expect(screen.getByText("71.75 MXN")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Ver cuenta de acciones/ }));
  await screen.findByText(/Dividendo acreditado/);
  expect(screen.getByText(/Dividendo pendiente/)).toBeTruthy();
  expect(v.client.detail).toHaveBeenCalledWith(clientId, 476, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "Volver a cuentas de acciones" }));
  await screen.findByRole("heading", { name: "Synthetic Equity" });
  await waitFor(() =>
    expect(document.activeElement?.textContent).toContain("Ver cuenta de acciones"),
  );
});
it("distinguishes failure from empty and handles retry and expiration", async () => {
  const list = vi
    .fn()
    .mockRejectedValueOnce(new ShareError("unavailable"))
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new ShareError("expired"));
  const v = setup({ list, detail: vi.fn() });
  await screen.findByRole("alert");
  expect(screen.queryByText("No tienes cuentas de acciones.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar acciones" }));
  await screen.findByText("No tienes cuentas de acciones.");
  fireEvent.click(screen.getByRole("button", { name: "Actualizar acciones" }));
  await waitFor(() => expect(v.expired).toHaveBeenCalledOnce());
});
it("requires explicit multi-client selection and discards late results after client/session changes and unmount", async () => {
  let resolve!: (v: ShareAccount[]) => void;
  const list = vi
    .fn<ShareClient["list"]>()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValue([]);
  const v = setup({ list, detail: vi.fn() }, [clientId, 999]);
  expect(list).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: String(clientId) } });
  const signal = list.mock.calls[0][1];
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "999" } });
  expect(signal?.aborted).toBe(true);
  await act(async () => resolve([parseShare(share(), clientId, 476)]));
  await screen.findByText("No tienes cuentas de acciones.");
  expect(screen.queryByText("Synthetic Equity")).toBeNull();
  const next = { list: vi.fn().mockResolvedValue([]), detail: vi.fn() };
  v.rerender(v.element(next, [999]));
  await waitFor(() => expect(next.list).toHaveBeenCalledWith(999, expect.any(AbortSignal)));
  v.unmount();
  expect(next.list.mock.calls[0][1].aborted).toBe(true);
});
it("shows honest missing valuation and dividends and preserves per-account failures", async () => {
  const a = {
    ...parseShare(share({ currentMarketPrice: undefined, dividends: undefined }), clientId, 476),
    detailUnavailable: true,
  };
  setup({ list: vi.fn().mockResolvedValue([a]), detail: vi.fn().mockResolvedValue(a) });
  await screen.findByText(/Algunos detalles/);
  expect(screen.getByText("Valor no disponible")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Ver cuenta de acciones/ }));
  await screen.findByText("Información de dividendos no disponible.");
});
