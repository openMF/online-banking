import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CustomerAccess, CustomerHome, CustomerLogin } from "./CustomerAccess";
import { I18nProvider, LocaleToggle } from "../i18n";
import {
  AuthenticationError,
  customerAuthentication,
  type CustomerSession,
} from "../lib/authentication/client";
import { getSelfServiceConfig } from "../lib/self-service";
vi.mock("../lib/self-service", () => ({ getSelfServiceConfig: vi.fn() }));
vi.mock("../lib/authentication/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/authentication/client")>()),
  customerAuthentication: { login: vi.fn() },
}));
const login = vi.mocked(customerAuthentication.login);
const configuration = vi.mocked(getSelfServiceConfig);
function session(): CustomerSession {
  return {
    identity: { userId: 12, username: "backend-customer", roles: [], permissions: [], clients: [] },
    expiresAt: Date.now() + 900000,
    logout: vi.fn(async () => true),
  };
}
function renderLogin(onAuthenticated = vi.fn()) {
  render(
    <I18nProvider>
      <LocaleToggle />
      <CustomerLogin onAuthenticated={onAuthenticated} />
    </I18nProvider>,
  );
  return onAuthenticated;
}
async function credentials() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Usuario"), "synthetic-user");
  await user.type(screen.getByLabelText("Contraseña"), "synthetic-pass");
  return user;
}
beforeEach(() => {
  window.localStorage.clear();
  login.mockReset();
  configuration.mockResolvedValue({
    baseUrl: "https://bank.invalid/api/v1/self",
    tenantId: "test",
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("validates empty and whitespace fields without a request", async () => {
  renderLogin();
  expect((screen.getByLabelText("Usuario") as HTMLInputElement).required).toBe(true);
  fireEvent.submit(screen.getByRole("button", { name: "Iniciar sesión" }).closest("form")!);
  expect(screen.getByRole("alert").textContent).toBe("Ingresa tu usuario y contraseña.");
  expect(login).not.toHaveBeenCalled();
});

it("uses keyboard submission, shows loading, clears the password and prevents duplicate requests", async () => {
  let resolve!: (value: CustomerSession) => void;
  login.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const onAuthenticated = renderLogin();
  const user = await credentials();
  await user.keyboard("{Enter}");
  expect(
    (screen.getByRole("button", { name: "Verificando acceso..." }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe("");
  fireEvent.submit(screen.getByRole("button", { name: "Verificando acceso..." }).closest("form")!);
  expect(login).toHaveBeenCalledOnce();
  const verified = session();
  await act(async () => resolve(verified));
  expect(onAuthenticated).toHaveBeenCalledWith(verified);
});

it.each([
  ["invalidCredentials", "Usuario o contraseña incorrectos."],
  ["pending", "Tu cuenta puede estar pendiente"],
  ["additional", "requiere autenticación adicional"],
  ["passwordRenewal", "Debes renovar tu contraseña"],
  ["network", "No pudimos conectar"],
  ["server", "no está disponible"],
  ["timeout", "Se agotó el tiempo"],
  ["configuration", "no está configurado"],
] as const)("renders accessible %s feedback and never grants access", async (code, message) => {
  login.mockRejectedValue(new AuthenticationError(code));
  const authenticated = renderLogin();
  const user = await credentials();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(message));
  expect(authenticated).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("button", { name: "Iniciar sesión" }) as HTMLButtonElement).disabled,
  ).toBe(false);
  expect((screen.getByLabelText("Contraseña") as HTMLInputElement).value).toBe("");
});

it("changes all new form and error copy to English", async () => {
  login.mockRejectedValue(new AuthenticationError("invalidCredentials"));
  renderLogin();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "EN" }));
  await user.type(screen.getByLabelText("Username"), "synthetic");
  await user.type(screen.getByLabelText("Password"), "invalid-pass");
  await user.keyboard("{Enter}");
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("Incorrect username or password."),
  );
  expect(screen.getByRole("heading", { name: "Sign in with your institution." })).toBeTruthy();
});

it("aborts on unmount and discards a transport that completes after cancellation", async () => {
  let resolve!: (value: CustomerSession) => void;
  login.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const authenticated = renderLogin();
  const user = await credentials();
  await user.keyboard("{Enter}");
  const signal = login.mock.calls[0][2];
  cleanup();
  expect(signal?.aborted).toBe(true);
  const late = session();
  await act(async () => resolve(late));
  expect(authenticated).not.toHaveBeenCalled();
  expect(late.logout).toHaveBeenCalledOnce();
});

it("defaults to customer sign-in with configuration and keeps demo an explicit choice", async () => {
  const props = {
    initialSegment: "personas" as const,
    onLogin: vi.fn(),
    onRegister: vi.fn(),
    onAuthenticated: vi.fn(),
  };
  render(
    <I18nProvider>
      <CustomerAccess {...props} />
    </I18nProvider>,
  );
  await screen.findByLabelText("Usuario");
  expect(screen.queryByLabelText("Número de cliente demo")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Explorar demostración con datos ficticios" }),
  );
  expect(screen.getByLabelText("Número de cliente demo")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Volver al acceso de clientes" }));
  expect(screen.getByLabelText("Usuario")).toBeTruthy();
  expect(login).not.toHaveBeenCalled();
});

it("preserves standalone demo for absent or invalid configuration", async () => {
  configuration.mockRejectedValue(new Error("disabled"));
  render(
    <I18nProvider>
      <CustomerAccess
        initialSegment="personas"
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        onAuthenticated={vi.fn()}
      />
    </I18nProvider>,
  );
  await screen.findByLabelText("Número de cliente demo");
  expect(
    screen.getByText("El acceso a clientes no está configurado. La demostración sigue disponible."),
  ).toBeTruthy();
  expect(login).not.toHaveBeenCalled();
});

it("shows server identity and unavailable data, then clears the authenticated view immediately on logout", async () => {
  const verified = session();
  function Boundary() {
    const [current, setCurrent] = useState<CustomerSession | null>(verified);
    return current ? (
      <CustomerHome session={current} onEnd={() => setCurrent(null)} />
    ) : (
      <p>signed out</p>
    );
  }
  render(
    <I18nProvider>
      <Boundary />
    </I18nProvider>,
  );
  expect(screen.getByTestId("customer-username").textContent).toBe("backend-customer");
  expect(screen.getByRole("status").textContent).toContain(
    "Las cuentas y operaciones aún no están integradas",
  );
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Acceso verificado" }));
  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(screen.queryByTestId("customer-username")).toBeNull();
  expect(screen.getByText("signed out")).toBeTruthy();
  expect(verified.logout).toHaveBeenCalledOnce();
});

it("expires after ten minutes of inactivity, including under StrictMode", async () => {
  vi.useFakeTimers();
  const verified = session(),
    onEnd = vi.fn();
  render(
    <StrictMode>
      <I18nProvider>
        <CustomerHome session={verified} onEnd={onEnd} />
      </I18nProvider>
    </StrictMode>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600000);
  });
  expect(onEnd).toHaveBeenCalledWith(true, expect.any(Promise));
  expect(verified.logout).toHaveBeenCalledOnce();
});

it("enforces the absolute lifetime despite activity and checks expiry on return to a suspended tab", async () => {
  vi.useFakeTimers();
  const verified = session(),
    onEnd = vi.fn();
  render(
    <I18nProvider>
      <CustomerHome session={verified} onEnd={onEnd} />
    </I18nProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500000);
  });
  fireEvent.keyDown(window, { key: "Tab" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300000);
  });
  expect(onEnd).not.toHaveBeenCalled();
  vi.setSystemTime(verified.expiresAt + 1);
  fireEvent.focus(window);
  expect(onEnd).toHaveBeenCalledWith(true, expect.any(Promise));
});
