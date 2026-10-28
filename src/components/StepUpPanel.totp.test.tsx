import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import {
  StepUpError,
  type StepUpApi,
  type StepUpChallenge,
  type StepUpConfig,
  type StepUpGrant,
} from "../lib/stepup";
import { StepUpPanel } from "./StepUpPanel";

/** The authenticator-app (TOTP) channel of the verification panel. */

const config: StepUpConfig = {
  enabled: true,
  protectedActions: ["TPT_TRANSFER", "CHANGE_PASSWORD"],
  availableChannels: ["TOTP"],
  otpLength: 8, // the tenant's SMS length: an authenticator app always has 6 digits
  otpTtlSeconds: 300,
  maxAttempts: 5,
  resendCooldownSeconds: 30,
  maxResends: 3,
  grantTtlSeconds: 120,
  sessionBound: true,
};

function appChallenge(overrides: Partial<StepUpChallenge> = {}): StepUpChallenge {
  return {
    challengeId: 21,
    action: "TPT_TRANSFER",
    channel: "TOTP",
    maskedDestination: null,
    expiresAt: "2026-10-28T12:05:00",
    attemptsRemaining: 5,
    resendAvailableAt: "2026-10-28T12:00:30",
    resendsRemaining: 0,
    ...overrides,
  };
}

const grant: StepUpGrant = {
  stepUpToken: "SECRET-ONE-TIME-TOKEN",
  action: "TPT_TRANSFER",
  expiresAt: "2026-10-28T12:02:00",
};

function fakeApi(overrides: Partial<StepUpApi> = {}) {
  return {
    mode: "backend",
    getConfig: vi.fn(async () => config),
    createChallenge: vi.fn(async () => appChallenge()),
    verify: vi.fn(async () => grant),
    resend: vi.fn(async () => appChallenge()),
    ...overrides,
  } satisfies StepUpApi;
}

function renderPanel(api: StepUpApi) {
  const onVerified = vi.fn();
  render(
    <I18nProvider>
      <StepUpPanel
        api={api}
        action="TPT_TRANSFER"
        submitLabel="Confirmar transferencia"
        onVerified={onVerified}
        onBack={vi.fn()}
      />
    </I18nProvider>,
  );
  return { onVerified };
}

const appCode = () => screen.findByLabelText("Código de tu app de autenticación");

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("StepUpPanel with an authenticator app", () => {
  it("opens the challenge on its own and asks for the code of the app, not for a code that was sent", async () => {
    const api = fakeApi();
    renderPanel(api);

    expect(await appCode()).toBeTruthy();
    expect(
      screen.getByText("Abre tu app de autenticación y escribe el código de 6 dígitos."),
    ).toBeTruthy();
    expect(screen.queryByText(/Enviamos un código/)).toBeNull();
    expect(api.createChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TPT_TRANSFER", channel: "TOTP" }),
    );
  });

  it("always asks for 6 digits, whatever length the tenant uses for SMS", async () => {
    const api = fakeApi();
    renderPanel(api);
    const user = userEvent.setup();
    const field = (await appCode()) as HTMLInputElement;

    expect(field.maxLength).toBe(6);
    expect(field.getAttribute("pattern")).toBe("[0-9]{6}");
    expect(field.getAttribute("inputmode")).toBe("numeric");
    expect(field.getAttribute("autocomplete")).toBe("one-time-code");
    await user.type(field, "12345678");
    expect(field.value).toBe("123456");
  });

  it("hands over the token for a code of the app", async () => {
    const api = fakeApi();
    const { onVerified } = renderPanel(api);
    const user = userEvent.setup();

    await user.type(await appCode(), "123456");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith("SECRET-ONE-TIME-TOKEN"));
    expect(api.verify).toHaveBeenCalledWith(21, "123456");
    expect(document.body.textContent).not.toContain("SECRET-ONE-TIME-TOKEN");
  });

  it("has nothing to resend: no resend button and no 'sent to' text", async () => {
    renderPanel(fakeApi());
    await appCode();
    expect(screen.queryByRole("button", { name: /Reenviar código/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Usar un código de recuperación" })).toBeTruthy();
  });

  it("a wrong code shows the attempts left and keeps the field focused", async () => {
    const api = fakeApi({
      verify: vi.fn(async () => {
        throw new StepUpError("otp.invalid", { attemptsRemaining: 3 });
      }),
    });
    renderPanel(api);
    const user = userEvent.setup();

    const field = await appCode();
    await user.type(field, "000000");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    expect((await screen.findByRole("alert")).textContent).toContain("no coincide");
    expect(screen.getByText("Te quedan 3 intentos.")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(field));
  });

  it("an incomplete code does not reach the server", async () => {
    const api = fakeApi();
    renderPanel(api);
    const user = userEvent.setup();
    await user.type(await appCode(), "123");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Escribe los 6 dígitos");
    expect(api.verify).not.toHaveBeenCalled();
  });

  it("a lock-out stops asking for codes and says how long to wait", async () => {
    const api = fakeApi({
      verify: vi.fn(async () => {
        throw new StepUpError("locked", { retryAfterSeconds: 900 });
      }),
    });
    renderPanel(api);
    const user = userEvent.setup();
    await user.type(await appCode(), "000000");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    expect((await screen.findByRole("alert")).textContent).toContain("15 min");
    expect(screen.queryByLabelText("Código de tu app de autenticación")).toBeNull();
  });

  it("says so when the app is no longer active", async () => {
    const api = fakeApi({
      createChallenge: vi.fn(async () => {
        throw new StepUpError("totp.not.enrolled");
      }),
    });
    renderPanel(api);
    expect((await screen.findByRole("alert")).textContent).toContain("ya no está activa");
  });

  // -----------------------------------------------------------------------------------------------
  // recovery codes
  // -----------------------------------------------------------------------------------------------

  it("switches to a recovery code and back", async () => {
    renderPanel(fakeApi());
    const user = userEvent.setup();
    await appCode();

    await user.click(screen.getByRole("button", { name: "Usar un código de recuperación" }));

    const field = screen.getByLabelText("Código de recuperación") as HTMLInputElement;
    expect(field.getAttribute("inputmode")).toBe("text");
    expect(field.getAttribute("autocomplete")).toBe("off");
    expect(screen.getByText(/Cada código sirve una sola vez/)).toBeTruthy();
    expect(screen.queryByLabelText("Código de tu app de autenticación")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Usar el código de mi app" }));

    expect(screen.getByLabelText("Código de tu app de autenticación")).toBeTruthy();
  });

  it("sends a recovery code as such, cleaned up", async () => {
    const api = fakeApi();
    const { onVerified } = renderPanel(api);
    const user = userEvent.setup();
    await appCode();
    await user.click(screen.getByRole("button", { name: "Usar un código de recuperación" }));

    await user.type(screen.getByLabelText("Código de recuperación"), "abcde-fghjk");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith("SECRET-ONE-TIME-TOKEN"));
    expect(api.verify).toHaveBeenCalledWith(21, "ABCDEFGHJK", "recovery");
  });

  it("does not send a malformed recovery code", async () => {
    const api = fakeApi();
    renderPanel(api);
    const user = userEvent.setup();
    await appCode();
    await user.click(screen.getByRole("button", { name: "Usar un código de recuperación" }));

    await user.type(screen.getByLabelText("Código de recuperación"), "abc");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Escribe los 10 caracteres");
    expect(api.verify).not.toHaveBeenCalled();
  });

  it("keeps symbols out of the recovery field", async () => {
    renderPanel(fakeApi());
    const user = userEvent.setup();
    await appCode();
    await user.click(screen.getByRole("button", { name: "Usar un código de recuperación" }));
    const field = screen.getByLabelText("Código de recuperación") as HTMLInputElement;

    await user.type(field, "ab;<c-d>e");

    expect(field.value).toBe("abc-de");
  });

  it("starts again in the normal mode after a new challenge", async () => {
    const verify = vi.fn().mockRejectedValueOnce(new StepUpError("otp.expired"));
    const api = fakeApi({ verify });
    renderPanel(api);
    const user = userEvent.setup();
    await appCode();
    await user.click(screen.getByRole("button", { name: "Usar un código de recuperación" }));
    await user.type(screen.getByLabelText("Código de recuperación"), "abcdefghjk");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    await user.click(await screen.findByRole("button", { name: "Pedir un código nuevo" }));

    expect(await appCode()).toBeTruthy();
  });

  // -----------------------------------------------------------------------------------------------
  // choosing, and the demo
  // -----------------------------------------------------------------------------------------------

  it("lets the user choose the app among the other channels", async () => {
    const api = fakeApi({
      getConfig: vi.fn(async (): Promise<StepUpConfig> => ({
        ...config,
        availableChannels: ["EMAIL", "TOTP"],
      })),
    });
    renderPanel(api);
    const user = userEvent.setup();

    expect(api.createChallenge).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: /Usar mi app de autenticación/ }));

    expect(await appCode()).toBeTruthy();
    expect(api.createChallenge).toHaveBeenCalledWith(expect.objectContaining({ channel: "TOTP" }));
  });

  it("shows the demo code of the app only in the demo, and not for a recovery code", async () => {
    const api = fakeApi({ mode: "demo", demoHint: "123456", demoAppHint: "135790" });
    renderPanel(api);
    const user = userEvent.setup();
    await appCode();

    expect(screen.getByText("135790")).toBeTruthy();
    expect(screen.queryByText("123456")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Usar un código de recuperación" }));
    expect(screen.queryByText("135790")).toBeNull();
  });

  it("shows no demo code against a real backend", async () => {
    renderPanel(fakeApi({ demoAppHint: undefined }));
    await appCode();
    expect(screen.queryByText(/Tu código de prueba es/)).toBeNull();
  });
});
