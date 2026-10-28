import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { createSavingsClient } from "../lib/savings/client";
import type { CustomerSession } from "../lib/authentication/client";
import { SavingsApplication } from "./SavingsApplication";
import { account, clientId, login, productId, template } from "../../tests/fixtures/savings";

beforeEach(() => localStorage.clear());
afterEach(cleanup);
function setup(clients = [clientId]) {
  const request = vi
    .fn<CustomerSession["request"]>()
    .mockImplementation(async (resource, options) => ({
      status: 200,
      ok: true,
      data:
        resource === "savingsaccounts/template"
          ? template(Boolean(options.query?.productId))
          : resource === "savingsaccounts"
            ? { resourceId: 469 }
            : account(),
    }));
  const session: CustomerSession = {
    identity: { ...login, clients },
    expiresAt: Date.now() + 900000,
    request,
    logout: vi.fn(),
  };
  const client = createSavingsClient(session),
    expired = vi.fn(),
    close = vi.fn();
  const view = render(
    <I18nProvider>
      <SavingsApplication client={client} clients={clients} onExpired={expired} onClose={close} />
    </I18nProvider>,
  );
  return { request, client, expired, close, ...view };
}
async function select() {
  await screen.findByLabelText("Producto de ahorro");
  fireEvent.change(screen.getByLabelText("Producto de ahorro"), {
    target: { value: String(productId) },
  });
  await screen.findByLabelText("Fecha de solicitud");
}
function send() {
  fireEvent.click(screen.getByLabelText("Revisé el producto y deseo enviar esta solicitud."));
  fireEvent.submit(screen.getByLabelText("Fecha de solicitud").closest("form")!);
}
it("shows a loading state and discards cancelled template requests on unmount", async () => {
  const context = setup();
  expect(screen.getByRole("status").textContent).toBe("Consultando productos y condiciones...");
  const signal = context.request.mock.calls[0][1].signal;
  context.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => {});
});
it("renders defaults, requires date and review, then focuses the actual confirmation", async () => {
  const { request } = setup();
  await select();
  expect((screen.getByLabelText("Fecha de solicitud") as HTMLInputElement).value).toBe(
    "2026-10-27",
  );
  expect(
    (screen.getByRole("button", { name: "Enviar solicitud de ahorro" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  send();
  await screen.findByRole("heading", { name: "Solicitud recibida" });
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Solicitud recibida" }));
  expect(screen.getByText("SYN-00000469")).toBeTruthy();
  expect(screen.getByText("Pendiente de aprobación")).toBeTruthy();
  expect(request.mock.calls.filter(([, options]) => options.method === "POST")).toHaveLength(1);
});
it("guards duplicate programmatic submissions while POST is pending", async () => {
  const { request } = setup();
  await select();
  let release!: (value: { status: number; ok: boolean; data: unknown }) => void;
  request.mockResolvedValueOnce({ status: 200, ok: true, data: template(true) });
  request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  send();
  const form = screen.getByLabelText("Fecha de solicitud").closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() =>
    expect(request.mock.calls.filter(([, options]) => options.method === "POST")).toHaveLength(1),
  );
  await act(async () => release({ status: 200, ok: true, data: { resourceId: 469 } }));
  await screen.findByText("SYN-00000469");
});
it("clears the customer session callback when a template returns 401", async () => {
  const { request, expired } = setup();
  await screen.findByLabelText("Producto de ahorro");
  request.mockResolvedValueOnce({ status: 401, ok: false, data: {} });
  fireEvent.change(screen.getByLabelText("Producto de ahorro"), {
    target: { value: String(productId) },
  });
  await waitFor(() => expect(expired).toHaveBeenCalledOnce());
});
it("keeps an uncertain POST locked when the form is unmounted and reopened", async () => {
  const { request, client, unmount } = setup();
  await select();
  request.mockResolvedValueOnce({ status: 200, ok: true, data: template(true) });
  request.mockRejectedValueOnce(new Error("private-detail"));
  send();
  await screen.findByRole("heading", { name: "Resultado sin confirmar" });
  unmount();
  render(
    <I18nProvider>
      <SavingsApplication
        client={client}
        clients={[clientId]}
        onClose={vi.fn()}
        onExpired={vi.fn()}
      />
    </I18nProvider>,
  );
  expect(screen.queryByRole("button", { name: "Enviar solicitud de ahorro" })).toBeNull();
  expect(screen.getByRole("button", { name: "Consultar cuentas sin reenviar" })).toBeTruthy();
  expect(document.body.textContent).not.toContain("private-detail");
});
it("does not arbitrarily pick one client from multiple mappings", async () => {
  const { request } = setup([clientId, 9002]);
  expect((screen.getByLabelText("Cliente autorizado") as HTMLSelectElement).value).toBe("");
  expect(request).not.toHaveBeenCalled();
});
it("requires an actual backend client mapping", () => {
  const { request } = setup([]);
  expect(screen.getByRole("alert").textContent).toContain("no ha vinculado");
  expect(request).not.toHaveBeenCalled();
});
