import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { ShareAccounts } from "./ShareAccounts";
import { createShareClient } from "../lib/shares/client";
import { createShareApplicationClient } from "../lib/shares/application";
import type { CustomerSession, CustomerResponse } from "../lib/authentication/client";
import {
  application,
  clientId,
  discovery,
  login,
  savingsAccount,
  template,
} from "../../tests/fixtures/share-application";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);
const ok = (data: unknown): CustomerResponse => ({ ok: true, status: 200, data });
function setup(
  options: {
    post?: () => Promise<CustomerResponse>;
    detail?: () => CustomerResponse;
    discovery?: () => Record<string, unknown>;
    template?: (selected: boolean) => unknown;
    clients?: number[];
    initialShare?: boolean;
  } = {},
) {
  let created = Boolean(options.initialShare);
  const request = vi.fn<CustomerSession["request"]>().mockImplementation(async (path, opts) => {
    if (path === "shareaccounts/template")
      return ok((options.template ?? template)(Boolean(opts.query?.productId)));
    if (path.startsWith("clients/"))
      return ok({
        ...(options.discovery ?? discovery)(),
        shareAccounts: created ? [application()] : [],
      });
    if (path === "shareaccounts/477") return options.detail ? options.detail() : ok(application());
    if (path === "shareaccounts") {
      created = true;
      return options.post ? options.post() : ok({ resourceId: 477 });
    }
    throw new Error("Unexpected synthetic route");
  });
  const session: CustomerSession = {
    identity: { ...login, clients: options.clients ?? [clientId] },
    expiresAt: Date.now() + 60000,
    request,
    logout: vi.fn(),
  };
  const expired = vi.fn();
  render(
    <I18nProvider>
      <ShareAccounts
        client={createShareClient(session)}
        application={createShareApplicationClient(session)}
        clients={session.identity.clients}
        onExpired={expired}
        onClose={vi.fn()}
      />
    </I18nProvider>,
  );
  const posts = () => request.mock.calls.filter(([path]) => path === "shareaccounts");
  return { request, expired, posts };
}
async function open() {
  await screen.findByText("No tienes cuentas de acciones.");
  fireEvent.click(screen.getByRole("button", { name: "Solicitar acciones" }));
  await screen.findByRole("option", { name: "Synthetic Equity" });
  fireEvent.change(screen.getByLabelText("Producto de acciones"), { target: { value: "6" } });
  await screen.findByText("Condiciones del producto de acciones");
}
async function review() {
  fireEvent.change(screen.getByLabelText("Cuenta de ahorro vinculada"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Fecha de solicitud"), {
    target: { value: "2026-11-03" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar solicitud de acciones" }));
  await screen.findByRole("region", { name: "Revisar solicitud de acciones" });
}
it("reviews real defaults, eligible savings, charges and estimate before one explicit submission; refreshes list and restores focus", async () => {
  const v = setup();
  await open();
  expect((screen.getByLabelText("Acciones solicitadas") as HTMLInputElement).value).toBe("10");
  expect(screen.queryByRole("option", { name: /SYN-CLOSED|SYN-USD/ })).toBeNull();
  expect(screen.getByText(/Synthetic activation fee: 2.35 MXN/)).toBeTruthy();
  await review();
  expect(document.activeElement?.textContent).toBe("Revisar solicitud de acciones");
  expect(v.posts()).toHaveLength(0);
  expect(screen.getByText(/102.50 MXN/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar solicitud de acciones" }));
  await screen.findByText("Solicitud de acciones recibida");
  expect(screen.getByText("Pendiente de aprobación")).toBeTruthy();
  expect(v.posts()).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Volver a cuentas de acciones" }));
  await screen.findByRole("button", { name: /Ver cuenta de acciones/ });
  await waitFor(() => expect(document.activeElement?.textContent).toBe("Solicitar acciones"));
});
it("disables double submission and closing during a pending write", async () => {
  let release!: (r: CustomerResponse) => void;
  const v = setup({
    post: () =>
      new Promise((r) => {
        release = r;
      }),
  });
  await open();
  await review();
  const confirm = screen.getByRole("button", { name: "Confirmar solicitud de acciones" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() => expect(v.posts()).toHaveLength(1));
  expect(screen.getByRole("status").textContent).toBe("Procesando solicitud...");
  expect(
    (screen.getByRole("button", { name: "Volver a cuentas de acciones" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await act(async () => release(ok({ resourceId: 477 })));
  await screen.findByText("Solicitud de acciones recibida");
  expect(v.posts()).toHaveLength(1);
});
it("keeps ambiguous writes blocked after close/reopen and read-only checks", async () => {
  const v = setup({ post: async () => ({ ok: false, status: 503, data: {} }) });
  await open();
  await review();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar solicitud de acciones" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("Solicitud de acciones recibida")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Volver a cuentas de acciones" }));
  await screen.findByRole("button", { name: /Ver cuenta de acciones/ });
  fireEvent.click(screen.getByRole("button", { name: "Solicitar acciones" }));
  await screen.findByRole("button", { name: "Consultar estado de acciones" });
  expect(screen.queryByRole("button", { name: "Confirmar solicitud de acciones" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Consultar estado de acciones" }));
  await screen.findByRole("alert");
  expect(v.posts()).toHaveLength(1);
});
it("distinguishes confirmed submission from unavailable details and retries only GET", async () => {
  let unavailable = true;
  const v = setup({
    detail: () => (unavailable ? { ok: false, status: 503, data: {} } : ok(application(200))),
  });
  await open();
  await review();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar solicitud de acciones" }));
  await screen.findByText(/El envío está confirmado/);
  expect(screen.getByText("Estado no disponible")).toBeTruthy();
  unavailable = false;
  fireEvent.click(screen.getByRole("button", { name: "Consultar estado de acciones" }));
  await screen.findByText("Aprobada, pendiente de activación");
  expect(v.posts()).toHaveLength(1);
});
it("blocks submission when there are no eligible savings accounts", async () => {
  const v = setup({
    discovery: () => ({
      savingsAccounts: [savingsAccount({ currency: { code: "USD", decimalPlaces: 2 } })],
    }),
  });
  await open();
  expect(screen.getByText(/No hay cuentas de ahorro activas elegibles/)).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Revisar solicitud de acciones" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(v.posts()).toHaveLength(0);
});
it("requires explicit client selection and cancels a late template on close", async () => {
  let release!: (r: unknown) => void;
  const v = setup({ clients: [clientId, 2] });
  expect(v.request).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("button", { name: "Solicitar acciones" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("ID de cliente"), { target: { value: String(clientId) } });
  await screen.findByText("No tienes cuentas de acciones.");
  v.request.mockImplementationOnce(
    (_path, opts) =>
      new Promise((r) => {
        release = () => r(ok(template()));
        expect(opts.signal).toBeTruthy();
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Solicitar acciones" }));
  fireEvent.click(screen.getByRole("button", { name: "Volver a cuentas de acciones" }));
  await act(async () => release(template()));
  expect(screen.queryByText("Datos de la solicitud de acciones")).toBeNull();
  expect(v.posts()).toHaveLength(0);
});
it("expires the session on an authenticated template 401", async () => {
  const v = setup();
  await screen.findByText("No tienes cuentas de acciones.");
  v.request.mockImplementation(async () => ({ ok: false, status: 401, data: {} }));
  fireEvent.click(screen.getByRole("button", { name: "Solicitar acciones" }));
  await waitFor(() => expect(v.expired).toHaveBeenCalledOnce());
  expect(v.posts()).toHaveLength(0);
});
it("renders the whole flow in English", async () => {
  window.localStorage.setItem("mifos-locale", "en-US");
  setup();
  await screen.findByText("You have no share accounts.");
  fireEvent.click(screen.getByRole("button", { name: "Apply for Shares" }));
  await screen.findByRole("option", { name: "Synthetic Equity" });
  fireEvent.change(screen.getByLabelText("Share Product"), { target: { value: "6" } });
  await screen.findByText("Share product terms");
  expect(screen.getByLabelText("Requested shares")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Review share application" })).toBeTruthy();
});

it("returns to the refreshed account list when applying from an existing account detail", async () => {
  setup({ initialShare: true });
  fireEvent.click(await screen.findByRole("button", { name: /Ver cuenta de acciones/ }));
  await screen.findByRole("heading", { name: "Detalle de la cuenta de acciones" });
  fireEvent.click(screen.getByRole("button", { name: "Solicitar acciones" }));
  await screen.findByRole("option", { name: "Synthetic Equity" });
  fireEvent.click(screen.getByRole("button", { name: "Volver a cuentas de acciones" }));
  await screen.findByRole("heading", { name: "Mis cuentas de acciones" });
  await screen.findByRole("button", { name: /Ver cuenta de acciones/ });
});
