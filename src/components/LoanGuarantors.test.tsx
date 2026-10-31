import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { LoanGuarantors } from "./LoanGuarantors";
import { GuarantorError, parseGuarantors, type GuarantorClient } from "../lib/loans/guarantors";
import { guarantors } from "../../tests/fixtures/guarantors";
afterEach(cleanup);
function setup(
  client: GuarantorClient = { list: vi.fn().mockResolvedValue(parseGuarantors(guarantors, 473)) },
) {
  const expired = vi.fn();
  const view = render(
    <I18nProvider>
      <LoanGuarantors client={client} loanId={473} onExpired={expired} />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ver garantes" }));
  return { ...view, client, expired };
}
it("shows list, keyboard-focusable details, returns focus and never persists PII", async () => {
  const persist = vi.spyOn(Storage.prototype, "setItem");
  setup();
  await screen.findByText(/Synthetic Guarantor/);
  fireEvent.click(screen.getByRole("button", { name: "Ver detalle del garante 71" }));
  const heading = screen.getByRole("heading", { name: "Detalle del garante" });
  expect(document.activeElement).toBe(heading);
  expect(screen.getByText("Synthetic relationship")).toBeTruthy();
  expect(screen.queryByText(/PRIVATE/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Volver a los garantes" }));
  await waitFor(() =>
    expect(document.activeElement?.textContent?.trim()).toBe("Ver detalle del garante 71"),
  );
  expect(persist).not.toHaveBeenCalled();
});
it("clears old records before retrying and distinguishes failures from empty", async () => {
  const list = vi
    .fn()
    .mockResolvedValueOnce(parseGuarantors(guarantors, 473))
    .mockRejectedValueOnce(new GuarantorError("denied"))
    .mockResolvedValueOnce([]);
  setup({ list });
  await screen.findByText(/Synthetic Guarantor/);
  fireEvent.click(screen.getByRole("button", { name: "Actualizar garantes" }));
  await screen.findByRole("alert");
  expect(screen.queryByText(/Synthetic Guarantor/)).toBeNull();
  expect(screen.queryByText("Este préstamo no tiene garantes registrados.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar garantes" }));
  await screen.findByText("Este préstamo no tiene garantes registrados.");
});
it("clears records on expiry and requests termination", async () => {
  const list = vi
    .fn()
    .mockResolvedValueOnce(parseGuarantors(guarantors, 473))
    .mockRejectedValueOnce(new GuarantorError("expired"));
  const s = setup({ list });
  await screen.findByText(/Synthetic Guarantor/);
  fireEvent.click(screen.getByRole("button", { name: "Actualizar garantes" }));
  await waitFor(() => expect(s.expired).toHaveBeenCalledOnce());
  expect(screen.queryByText(/Synthetic Guarantor/)).toBeNull();
});
it("aborts on close/unmount and ignores late protected responses", async () => {
  let finish!: (value: ReturnType<typeof parseGuarantors>) => void;
  const list = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const s = setup({ list });
  await screen.findByText("Cargando garantes...");
  const signal = list.mock.calls[0][1] as AbortSignal;
  fireEvent.click(screen.getByRole("button", { name: "Volver al detalle del préstamo" }));
  expect(signal.aborted).toBe(true);
  finish(parseGuarantors(guarantors, 473));
  await waitFor(() => expect(screen.queryByText(/Synthetic Guarantor/)).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Ver garantes" }));
  const next = list.mock.calls[1][1] as AbortSignal;
  s.unmount();
  expect(next.aborted).toBe(true);
});
