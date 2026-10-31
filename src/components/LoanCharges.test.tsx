import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import {
  ChargeError,
  parseLoanCharges,
  type LoanCharge,
  type LoanChargesClient,
} from "../lib/loans/charges";
import { charges } from "../../tests/fixtures/charges";
import { LoanCharges } from "./LoanCharges";
beforeEach(() => localStorage.clear());
afterEach(cleanup);
function setup(
  client: LoanChargesClient = { list: vi.fn().mockResolvedValue(parseLoanCharges(charges())) },
) {
  const expired = vi.fn();
  const view = render(
    <I18nProvider>
      <LoanCharges client={client} loanId={473} onExpired={expired} />
    </I18nProvider>,
  );
  return { ...view, client, expired };
}
const open = () => fireEvent.click(screen.getByRole("button", { name: "Ver cargos del préstamo" }));
it("fetches only on opening; shows actual amounts/status, refreshes, closes and restores focus", async () => {
  const { client } = setup();
  expect(client.list).not.toHaveBeenCalled();
  open();
  expect(screen.getByRole("status").textContent).toBe("Cargando cargos...");
  await screen.findByText("Pagado parcialmente");
  for (const status of ["Pagado", "No pagado", "Condonado"])
    expect(screen.getByText(status)).toBeTruthy();
  expect(screen.getAllByText("100.25 MXN").length).toBeGreaterThan(0);
  expect(screen.queryByText(/Total Cost|Costo total/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar cargos" }));
  await waitFor(() => expect(client.list).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole("button", { name: "Volver al detalle del préstamo" }));
  await waitFor(() => expect(document.activeElement?.textContent).toBe("Ver cargos del préstamo"));
  expect(screen.queryByText("Synthetic paid fee")).toBeNull();
});
it("distinguishes empty from failed requests, supports retry and expires session", async () => {
  const list = vi
    .fn()
    .mockRejectedValueOnce(new ChargeError("unavailable"))
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new ChargeError("expired"));
  const s = setup({ list });
  open();
  await screen.findByRole("alert");
  expect(screen.queryByText("Este préstamo no tiene cargos registrados.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar cargos" }));
  await screen.findByText("Este préstamo no tiene cargos registrados.");
  fireEvent.click(screen.getByRole("button", { name: "Actualizar cargos" }));
  await waitFor(() => expect(s.expired).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("Synthetic paid fee")).toBeNull();
});
it("never renders stale results across loans, client/session changes or unmount", async () => {
  let resolve!: (v: LoanCharge[]) => void;
  const list = vi
    .fn<LoanChargesClient["list"]>()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValue([]);
  const client = { list };
  const view = setup(client);
  open();
  const signal = list.mock.calls[0][1];
  view.rerender(
    <I18nProvider>
      <LoanCharges client={client} loanId={474} onExpired={view.expired} />
    </I18nProvider>,
  );
  expect(signal?.aborted).toBe(true);
  resolve(parseLoanCharges(charges()));
  await screen.findByText("Este préstamo no tiene cargos registrados.");
  expect(screen.queryByText("Synthetic paid fee")).toBeNull();
  const next = { list: vi.fn().mockResolvedValue([]) };
  view.rerender(
    <I18nProvider>
      <LoanCharges client={next} loanId={474} onExpired={view.expired} />
    </I18nProvider>,
  );
  await waitFor(() => expect(next.list).toHaveBeenCalled());
  const nextSignal = next.list.mock.calls[0][1];
  view.unmount();
  expect(nextSignal.aborted).toBe(true);
});
it("shows explicit unknown status/currency without inventing zeroes or rounding decimals", async () => {
  setup({
    list: vi.fn().mockResolvedValue([
      { id: 1, name: "Unspecified", status: "unknown" },
      { id: 2, name: "Decimal", status: "unpaid", amount: 0.123456789, currency: "ZZZ" },
    ]),
  });
  open();
  await screen.findByText("Estado no disponible");
  expect(screen.getByText("Importe no disponible")).toBeTruthy();
  expect(screen.getByText("0.123456789 ZZZ")).toBeTruthy();
  expect(screen.queryByText("0 MXN")).toBeNull();
});
