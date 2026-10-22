import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const baseConfig: StepUpConfig = {
  enabled: true,
  protectedActions: ["TPT_TRANSFER", "CHANGE_PASSWORD"],
  availableChannels: ["EMAIL"],
  otpLength: 6,
  otpTtlSeconds: 300,
  maxAttempts: 5,
  resendCooldownSeconds: 30,
  maxResends: 3,
  grantTtlSeconds: 120,
  sessionBound: true,
};

function challenge(overrides: Partial<StepUpChallenge> = {}): StepUpChallenge {
  return {
    challengeId: 11,
    action: "TPT_TRANSFER",
    channel: "EMAIL",
    maskedDestination: "a***@example.com",
    expiresAt: "2026-10-21T12:05:00",
    attemptsRemaining: 5,
    resendAvailableAt: "2026-10-21T12:00:30",
    resendsRemaining: 3,
    ...overrides,
  };
}

const grant: StepUpGrant = {
  stepUpToken: "SECRET-ONE-TIME-TOKEN",
  action: "TPT_TRANSFER",
  expiresAt: "2026-10-21T12:02:00",
};

function fakeApi(overrides: Partial<StepUpApi> = {}) {
  const api = {
    mode: "backend",
    getConfig: vi.fn(async () => baseConfig),
    createChallenge: vi.fn(async () => challenge()),
    verify: vi.fn(async () => grant),
    resend: vi.fn(async () => challenge({ challengeId: 12 })),
    ...overrides,
  } satisfies StepUpApi;
  return api;
}

type Handlers = {
  onVerified: (token: string) => void;
  onNotRequired: () => void;
  onBack: () => void;
};

function renderPanel(api: StepUpApi, extra: Partial<Handlers> = {}, strict = false) {
  const handlers: Handlers = {
    onVerified: vi.fn(),
    onNotRequired: vi.fn(),
    onBack: vi.fn(),
    ...extra,
  };
  const panel = (
    <I18nProvider>
      <StepUpPanel
        api={api}
        action="TPT_TRANSFER"
        payload={{ fromAccountId: 1, toAccountId: 2, transferAmount: 100 }}
        submitLabel="Confirmar transferencia"
        {...handlers}
      />
    </I18nProvider>
  );
  render(strict ? <StrictMode>{panel}</StrictMode> : panel);
  return handlers;
}

async function codeField() {
  return screen.findByLabelText("Código de verificación");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StepUpPanel", () => {
  it("sends one code automatically when there is a single channel and shows where it went", async () => {
    const api = fakeApi();
    renderPanel(api);

    expect(await screen.findByText(/a\*\*\*@example\.com/)).toBeTruthy();
    expect(screen.getByText(/código de 6 dígitos por correo/)).toBeTruthy();
    expect(api.createChallenge).toHaveBeenCalledTimes(1);
    expect(api.createChallenge).toHaveBeenCalledWith({
      action: "TPT_TRANSFER",
      channel: "EMAIL",
      payload: { fromAccountId: 1, toAccountId: 2, transferAmount: 100 },
    });
  });

  it("asks the browser for one-time-code autofill, a numeric keypad, and focuses the field", async () => {
    renderPanel(fakeApi());
    const field = (await codeField()) as HTMLInputElement;

    expect(field.getAttribute("autocomplete")).toBe("one-time-code");
    expect(field.getAttribute("inputmode")).toBe("numeric");
    expect(field.maxLength).toBe(6);
    expect(field.getAttribute("pattern")).toBe("[0-9]{6}");
    expect(document.activeElement).toBe(field);
  });

  it("does not create a second challenge when React runs effects twice (StrictMode)", async () => {
    const api = fakeApi();
    renderPanel(api, {}, true);
    await codeField();
    expect(api.getConfig).toHaveBeenCalledTimes(1);
    expect(api.createChallenge).toHaveBeenCalledTimes(1);
  });

  it("lets the user choose when SMS and e-mail are both possible", async () => {
    const api = fakeApi({
      getConfig: vi.fn(
        async () =>
          ({ ...baseConfig, availableChannels: ["SMS", "EMAIL"] as const }) as StepUpConfig,
      ),
      createChallenge: vi.fn(async () =>
        challenge({ channel: "SMS", maskedDestination: "******0324" }),
      ),
    });
    renderPanel(api);
    const user = userEvent.setup();

    expect(api.createChallenge).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: /mensaje de texto \(SMS\)/ }));

    expect(await screen.findByText(/por SMS a \*+0324/)).toBeTruthy();
    expect(api.createChallenge).toHaveBeenCalledWith(expect.objectContaining({ channel: "SMS" }));
  });

  it("only accepts digits in the field", async () => {
    renderPanel(fakeApi());
    const user = userEvent.setup();
    const field = (await codeField()) as HTMLInputElement;

    await user.type(field, "12ab-3 4");

    expect(field.value).toBe("1234");
  });

  it("does not call the server for an incomplete code", async () => {
    const api = fakeApi();
    renderPanel(api);
    const user = userEvent.setup();
    await user.type(await codeField(), "123");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Escribe los 6 dígitos");
    expect(api.verify).not.toHaveBeenCalled();
  });

  it("hands the one-time token to the caller exactly once and never renders it", async () => {
    const api = fakeApi();
    const { onVerified } = renderPanel(api);
    const user = userEvent.setup();

    await user.type(await codeField(), "123456");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    expect(onVerified).toHaveBeenCalledWith("SECRET-ONE-TIME-TOKEN");
    expect(api.verify).toHaveBeenCalledWith(11, "123456");
    expect(document.body.textContent).not.toContain("SECRET-ONE-TIME-TOKEN");
  });

  it("shows a wrong code as an alert with the attempts left, and keeps the field focused", async () => {
    const api = fakeApi({
      verify: vi.fn(async () => {
        throw new StepUpError("otp.invalid", { attemptsRemaining: 2 });
      }),
    });
    const { onVerified } = renderPanel(api);
    const user = userEvent.setup();

    await user.type(await codeField(), "000000");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("no coincide");
    expect(screen.getByText("Te quedan 2 intentos.")).toBeTruthy();
    const field = screen.getByLabelText("Código de verificación");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")).toContain(alert.id);
    expect(onVerified).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(field));
  });

  it("uses the singular for the last attempt", async () => {
    const api = fakeApi({
      verify: vi.fn(async () => {
        throw new StepUpError("otp.invalid", { attemptsRemaining: 1 });
      }),
    });
    renderPanel(api);
    const user = userEvent.setup();
    await user.type(await codeField(), "000000");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    expect(await screen.findByText("Te queda 1 intento.")).toBeTruthy();
  });

  it("stops asking for a code after a lock-out and says how long to wait", async () => {
    const api = fakeApi({
      verify: vi.fn(async () => {
        throw new StepUpError("locked", { retryAfterSeconds: 900 });
      }),
    });
    renderPanel(api);
    const user = userEvent.setup();
    await user.type(await codeField(), "000000");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("15 min");
    expect(screen.queryByLabelText("Código de verificación")).toBeNull();
  });

  it("lets the user retry after a network failure without losing the code", async () => {
    const verify = vi
      .fn()
      .mockRejectedValueOnce(new StepUpError("network"))
      .mockResolvedValueOnce(grant);
    const { onVerified } = renderPanel(fakeApi({ verify }));
    const user = userEvent.setup();

    const field = (await codeField()) as HTMLInputElement;
    await user.type(field, "123456");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos conectar");
    expect(field.value).toBe("123456");

    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith("SECRET-ONE-TIME-TOKEN"));
  });

  it("offers a new code when the old one is no longer valid", async () => {
    const verify = vi.fn().mockRejectedValueOnce(new StepUpError("otp.expired"));
    const api = fakeApi({ verify });
    renderPanel(api);
    const user = userEvent.setup();
    await user.type(await codeField(), "123456");
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    await user.click(await screen.findByRole("button", { name: "Pedir un código nuevo" }));

    await waitFor(() => expect(api.createChallenge).toHaveBeenCalledTimes(2));
    expect(await codeField()).toBeTruthy();
  });

  it("explains that nothing can be sent when the user has no channel", async () => {
    renderPanel(
      fakeApi({ getConfig: vi.fn(async () => ({ ...baseConfig, availableChannels: [] })) }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain("Contacta a tu institución");
  });

  it("explains when the session cannot be used for step-up", async () => {
    renderPanel(
      fakeApi({ getConfig: vi.fn(async () => ({ ...baseConfig, sessionBound: false })) }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain("Inicia sesión de nuevo");
  });

  it("tells the caller to carry on when the server does not require step-up for the action", async () => {
    const api = fakeApi({
      getConfig: vi.fn(async (): Promise<StepUpConfig> => ({
        ...baseConfig,
        protectedActions: ["CHANGE_PASSWORD"],
      })),
    });
    const { onNotRequired } = renderPanel(api);

    await waitFor(() => expect(onNotRequired).toHaveBeenCalledTimes(1));
    expect(api.createChallenge).not.toHaveBeenCalled();
  });

  it("does the same when step-up is switched off", async () => {
    const { onNotRequired } = renderPanel(
      fakeApi({ getConfig: vi.fn(async () => ({ ...baseConfig, enabled: false })) }),
    );
    await waitFor(() => expect(onNotRequired).toHaveBeenCalledTimes(1));
  });

  it("goes back when asked", async () => {
    const { onBack } = renderPanel(fakeApi());
    const user = userEvent.setup();
    await codeField();
    await user.click(screen.getByRole("button", { name: "Volver al resumen" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows the demo hint only for the demo backend", async () => {
    const { unmount } = render(
      <I18nProvider>
        <StepUpPanel
          api={fakeApi({ mode: "demo", demoHint: "123456" })}
          action="TPT_TRANSFER"
          submitLabel="Confirmar"
          onVerified={vi.fn()}
          onBack={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(await screen.findByLabelText("Código de verificación demo")).toBeTruthy();
    expect(screen.getByText("123456")).toBeTruthy();
    unmount();

    renderPanel(fakeApi());
    await codeField();
    expect(screen.queryByText(/Tu código de prueba/)).toBeNull();
  });

  it("renders in English when the locale is English", async () => {
    window.localStorage.setItem("mifos-locale", "en-US");
    renderPanel(fakeApi());

    expect(await screen.findByLabelText("Verification code")).toBeTruthy();
    expect(
      screen.getByText(/We sent a 6-digit code by email to a\*\*\*@example\.com\./),
    ).toBeTruthy();
    expect(screen.getByText("You have 5 attempts left.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Resend code in 30 s/ })).toBeTruthy();
  });
});

describe("StepUpPanel timers", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  async function settle() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }

  it("counts down the resend cooldown and enables resending afterwards", async () => {
    const api = fakeApi();
    renderPanel(api);
    await settle();

    const resend = screen.getByRole("button", {
      name: /Reenviar código en 30 s/,
    }) as HTMLButtonElement;
    expect(resend.disabled).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    const ready = screen.getByRole("button", { name: "Reenviar código" }) as HTMLButtonElement;
    expect(ready.disabled).toBe(false);

    fireEvent.click(ready);
    await settle();
    expect(api.resend).toHaveBeenCalledWith(11);
    expect(screen.getByText("Te enviamos un código nuevo.")).toBeTruthy();
    // a fresh code: the field is empty and a new cooldown starts
    expect((screen.getByLabelText("Código de verificación") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: /Reenviar código en 30 s/ })).toBeTruthy();
  });

  it("shows how long the code is still valid and expires it", async () => {
    renderPanel(fakeApi());
    await settle();
    expect(screen.getByRole("timer").textContent).toBe("El código vence en 5:00.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    expect(screen.getByRole("timer").textContent).toBe("El código vence en 3:59.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(240_000);
    });
    expect((await screen.findByRole("alert")).textContent).toContain("ya no es válido");
    expect(screen.getByRole("button", { name: "Pedir un código nuevo" })).toBeTruthy();
  });

  it("respects a cooldown demanded by the server", async () => {
    const api = fakeApi({
      resend: vi.fn(async () => {
        throw new StepUpError("resend.cooldown", { retryAfterSeconds: 12 });
      }),
    });
    renderPanel(api);
    await settle();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    fireEvent.click(screen.getByRole("button", { name: "Reenviar código" }));
    await settle();

    expect(screen.getByRole("button", { name: /Reenviar código en 12 s/ })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Espera un momento");
  });

  it("keeps the current code usable after the last allowed resend", async () => {
    const api = fakeApi({
      resend: vi.fn(async () => {
        throw new StepUpError("resend.limit");
      }),
    });
    renderPanel(api);
    await settle();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    fireEvent.click(screen.getByRole("button", { name: "Reenviar código" }));
    await settle();

    expect(screen.getByRole("alert").textContent).toContain("Ya no puedes reenviar");
    expect(screen.getByLabelText("Código de verificación")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Reenviar código" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
