import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import type { CustomerSession } from "../lib/authentication/client";
import { createLoanClient } from "../lib/loans/client";
import { LoanApplication } from "./LoanApplication";
import {
  loan,
  template,
  product,
  products,
  login,
  clientId,
  createBody,
} from "../../tests/fixtures/loans";
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(cleanup);
function setup(clients = [clientId]) {
  let current = loan();
  const request = vi.fn<CustomerSession["request"]>().mockImplementation(async (path, o) => {
    if (path === "loans/473" && o.method === "PUT")
      current = loan(undefined, Number((o.body as { principal: number }).principal));
    if (path === "loans/473" && o.method === "POST") current = loan("withdrawn.by.client");
    return {
      status: 200,
      ok: true,
      data:
        path === "loanproducts"
          ? products
          : path.startsWith("loanproducts/")
            ? product(Number(path.split("/")[1]))
            : path === "loans/template"
              ? { ...template(Number(o.query?.productId)), clientId: Number(o.query?.clientId) }
              : path.startsWith("clients/")
                ? { loanAccounts: [{ id: 473, productName: "Synthetic Loan" }] }
                : path === "loans" || o.method !== "GET"
                  ? { resourceId: 473 }
                  : current,
    };
  });
  const client = createLoanClient({
    identity: { ...login, clients },
    request,
    expiresAt: Date.now() + 900000,
    logout: vi.fn(),
  });
  const expired = vi.fn(),
    close = vi.fn();
  const view = render(
    <I18nProvider>
      <LoanApplication client={client} clients={clients} onExpired={expired} onClose={close} />
    </I18nProvider>,
  );
  return { request, client, expired, close, ...view };
}
async function select() {
  const select = await screen.findByLabelText("Producto de préstamo");
  await waitFor(() => expect((select as HTMLSelectElement).disabled).toBe(false));
  fireEvent.change(select, { target: { value: "27" } });
  await screen.findByLabelText("Monto solicitado");
}
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
it("displays defaults, validates before review, submits once and focuses the readback", async () => {
  const s = setup();
  await select();
  expect((screen.getByLabelText("Monto solicitado") as HTMLInputElement).value).toBe("1000");
  click("Revisar solicitud de préstamo");
  await screen.findByRole("region", { name: "Revisar solicitud de préstamo" });
  click("Confirmar solicitud de préstamo");
  await screen.findByRole("heading", { name: "Detalle de la solicitud" });
  expect(screen.getByText("Pendiente de aprobación")).toBeTruthy();
  expect(document.activeElement?.textContent).toBe("Detalle de la solicitud");
  expect(s.request.mock.calls.filter(([, o]) => o.method === "POST")[0][1].body).toEqual(
    createBody,
  );
});
it("switches product defaults and offers only authorized clients", async () => {
  setup([clientId, 9002]);
  expect((screen.getByLabelText("Cliente autorizado") as HTMLSelectElement).value).toBe("");
  fireEvent.change(screen.getByLabelText("Cliente autorizado"), {
    target: { value: String(clientId) },
  });
  await select();
  fireEvent.change(screen.getByLabelText("Producto de préstamo"), { target: { value: "28" } });
  await waitFor(() =>
    expect((screen.getByLabelText("Monto solicitado") as HTMLInputElement).value).toBe("2000"),
  );
  expect(screen.getByLabelText("Cliente autorizado").querySelectorAll("option")).toHaveLength(3);
});
it("loads an existing loan, corrects it with PUT, and canceling withdrawal sends nothing", async () => {
  const s = setup();
  await screen.findByRole("button", { name: /Synthetic Loan · ID/ });
  click("Synthetic Loan · ID de solicitud: 473");
  await screen.findByText("Pendiente de aprobación");
  click("Corregir solicitud");
  await screen.findByLabelText("Monto solicitado");
  fireEvent.change(screen.getByLabelText("Monto solicitado"), { target: { value: "1500" } });
  expect(screen.queryByLabelText("Fecha de solicitud")).toBeNull();
  click("Revisar solicitud de préstamo");
  click("Confirmar corrección");
  await screen.findByText("1500 MXN");
  click("Retirar solicitud");
  expect(screen.getByRole("dialog")).toBeTruthy();
  click("Cancelar");
  expect(s.request.mock.calls.filter(([, o]) => o.method === "POST")).toHaveLength(0);
  click("Retirar solicitud");
  fireEvent.change(screen.getByLabelText("Fecha de retiro"), { target: { value: "2026-10-30" } });
  click("Confirmar retiro");
  await screen.findByText("Retirada por el solicitante");
  expect(screen.queryByRole("button", { name: "Corregir solicitud" })).toBeNull();
});
it("clears protected data through the session-expiry callback", async () => {
  const s = setup();
  await select();
  s.request.mockResolvedValueOnce({ status: 401, ok: false, data: {} });
  fireEvent.change(screen.getByLabelText("Producto de préstamo"), { target: { value: "28" } });
  await waitFor(() => expect(s.expired).toHaveBeenCalledOnce());
});
it("shows a safe unsupported-product message without enabling submission", async () => {
  const s = setup();
  await waitFor(() =>
    expect((screen.getByLabelText("Producto de préstamo") as HTMLSelectElement).disabled).toBe(
      false,
    ),
  );
  s.request.mockResolvedValueOnce({
    status: 200,
    ok: true,
    data: { ...template(), multiDisburseLoan: true },
  });
  fireEvent.change(screen.getByLabelText("Producto de préstamo"), { target: { value: "27" } });
  await screen.findByText(
    "Este producto requiere condiciones adicionales. Solicítalo con tu institución.",
  );
  expect(screen.queryByRole("button", { name: "Confirmar solicitud de préstamo" })).toBeNull();
});

it("refreshes and removes pending-only actions when approval races a correction", async () => {
  const s = setup();
  await screen.findByRole("button", { name: /Synthetic Loan · ID/ });
  click("Synthetic Loan · ID de solicitud: 473");
  await screen.findByText("Pendiente de aprobación");
  click("Corregir solicitud");
  await screen.findByLabelText("Monto solicitado");
  const normal = s.request.getMockImplementation()!;
  s.request.mockImplementation((path, o) =>
    path === "loans/473" && o.method === "GET"
      ? Promise.resolve({ status: 200, ok: true, data: loan("approved") })
      : normal(path, o),
  );
  click("Revisar solicitud de préstamo");
  click("Confirmar corrección");
  await screen.findByText("Approved");
  expect(screen.queryByRole("button", { name: "Corregir solicitud" })).toBeNull();
  expect(s.request.mock.calls.filter(([, o]) => o.method === "PUT")).toHaveLength(0);
});
