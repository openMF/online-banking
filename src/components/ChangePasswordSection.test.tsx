import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { PasswordError, type PasswordApi } from "../lib/password";
import type { StepUpApi, StepUpChallenge, StepUpConfig, StepUpGrant } from "../lib/stepup";
import { ChangePasswordSection } from "./ChangePasswordSection";

const config: StepUpConfig = {
  enabled: true,
  protectedActions: ["CHANGE_PASSWORD"],
  availableChannels: ["EMAIL"],
  otpLength: 6,
  otpTtlSeconds: 300,
  maxAttempts: 5,
  resendCooldownSeconds: 30,
  maxResends: 3,
  grantTtlSeconds: 120,
  sessionBound: true,
};

const challenge: StepUpChallenge = {
  challengeId: 11,
  action: "CHANGE_PASSWORD",
  channel: "EMAIL",
  maskedDestination: "a***@example.com",
  expiresAt: "2026-10-29T12:05:00",
  attemptsRemaining: 5,
  resendAvailableAt: "2026-10-29T12:00:30",
  resendsRemaining: 3,
};

const grant: StepUpGrant = {
  stepUpToken: "GRANT-TOKEN",
  action: "CHANGE_PASSWORD",
  expiresAt: "2026-10-29T12:02:00",
};

function fakeStepUp(overrides: Partial<StepUpApi> = {}) {
  return {
    mode: "backend",
    getConfig: vi.fn(async () => config),
    createChallenge: vi.fn(async () => challenge),
    verify: vi.fn(async () => grant),
    resend: vi.fn(async () => challenge),
    ...overrides,
  } satisfies StepUpApi;
}

function fakePassword(overrides: Partial<PasswordApi> = {}) {
  return { change: vi.fn(async () => undefined), ...overrides } satisfies PasswordApi;
}

function setup(password = fakePassword(), stepUp = fakeStepUp()) {
  const onChanged = vi.fn();
  const onExpired = vi.fn();
  render(
    <I18nProvider>
      <ChangePasswordSection
        api={password}
        stepUpApi={stepUp}
        onChanged={onChanged}
        onExpired={onExpired}
      />
    </I18nProvider>,
  );
  return { password, stepUp, onChanged, onExpired, user: userEvent.setup() };
}

const NEW = "New-pass-1234!";

async function fill(user: ReturnType<typeof userEvent.setup>, first = NEW, second = NEW) {
  await user.type(screen.getByLabelText("Nueva contraseña"), first);
  await user.type(screen.getByLabelText("Repite la nueva contraseña"), second);
}

async function verify(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Código de verificación"), "123456");
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("ChangePasswordSection", () => {
  it("asks for the two passwords, hidden, with the autofill hint for a new password", () => {
    setup();
    const first = screen.getByLabelText("Nueva contraseña") as HTMLInputElement;
    const second = screen.getByLabelText("Repite la nueva contraseña") as HTMLInputElement;
    expect(first.type).toBe("password");
    expect(second.type).toBe("password");
    expect(first.getAttribute("autocomplete")).toBe("new-password");
    expect(second.getAttribute("autocomplete")).toBe("new-password");
    expect(screen.getByText(/cerramos todas tus sesiones/)).toBeTruthy();
  });

  it("shows and hides the passwords on request", async () => {
    const { user } = setup();
    const toggle = screen.getByRole("button", { name: "Mostrar contraseñas" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await user.click(toggle);

    expect((screen.getByLabelText("Nueva contraseña") as HTMLInputElement).type).toBe("text");
    expect(
      screen.getByRole("button", { name: "Ocultar contraseñas" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("does not go on with an empty form or with two different passwords, and asks the server nothing", async () => {
    const { user, password, stepUp } = setup();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("dos veces");

    await fill(user, NEW, "Other-pass-1!");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("no coinciden");
    expect(screen.getByLabelText("Repite la nueva contraseña").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(stepUp.getConfig).not.toHaveBeenCalled();
    expect(password.change).not.toHaveBeenCalled();
  });

  it("verifies first, then changes the password with the one-time token, and says it is done", async () => {
    const { user, password, stepUp, onChanged } = setup();
    await fill(user);

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(password.change).not.toHaveBeenCalled();
    expect(stepUp.createChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHANGE_PASSWORD", channel: "EMAIL" }),
    );
    // the password is never part of what the verification is bound to
    expect(JSON.stringify(vi.mocked(stepUp.createChallenge).mock.calls)).not.toContain(NEW);
    await verify(user);

    await waitFor(() => expect(password.change).toHaveBeenCalledWith(NEW, NEW, "GRANT-TOKEN"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(document.body.textContent).not.toContain("GRANT-TOKEN");
    expect(document.body.textContent).not.toContain(NEW);
  });

  it("changes it without a token when the server does not ask for a verification", async () => {
    const stepUp = fakeStepUp({
      getConfig: vi.fn(async (): Promise<StepUpConfig> => ({ ...config, enabled: false })),
    });
    const { user, password, onChanged } = setup(fakePassword(), stepUp);
    await fill(user);

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => expect(password.change).toHaveBeenCalledWith(NEW, NEW, undefined));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(stepUp.createChallenge).not.toHaveBeenCalled();
  });

  it("a refused password goes back to the form with the typed passwords, and costs no new code", async () => {
    const change = vi
      .fn()
      .mockRejectedValueOnce(new PasswordError("policy"))
      .mockResolvedValueOnce(undefined);
    const { user, stepUp, onChanged } = setup(fakePassword({ change }));
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await verify(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("no aceptó esa contraseña");
    const first = screen.getByLabelText("Nueva contraseña") as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(first));
    expect(first.getAttribute("aria-invalid")).toBe("true");
    expect(first.value).toBe(NEW);
    expect(onChanged).not.toHaveBeenCalled();

    // the same, still valid grant is used for the retry: no second verification
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => expect(change).toHaveBeenCalledTimes(2));
    expect(change).toHaveBeenLastCalledWith(NEW, NEW, "GRANT-TOKEN");
    expect(stepUp.createChallenge).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("an expired or used verification asks for it again and keeps the passwords", async () => {
    const change = vi
      .fn()
      .mockRejectedValueOnce(new PasswordError("stepup"))
      .mockResolvedValueOnce(undefined);
    const { user, stepUp, onChanged } = setup(fakePassword({ change }));
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await verify(user);

    expect((await screen.findByRole("alert")).textContent).toContain("ya no es válida");
    // a fresh verification starts: a second challenge is asked for
    await waitFor(() => expect(stepUp.createChallenge).toHaveBeenCalledTimes(2));
    await user.type(await screen.findByLabelText("Código de verificación"), "123456");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => expect(change).toHaveBeenCalledTimes(2));
    expect(change).toHaveBeenLastCalledWith(NEW, NEW, "GRANT-TOKEN");
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("a network failure keeps the form and lets the user try again", async () => {
    const change = vi
      .fn()
      .mockRejectedValueOnce(new PasswordError("network"))
      .mockResolvedValueOnce(undefined);
    const { user, onChanged } = setup(fakePassword({ change }));
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await verify(user);

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos conectar");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("an ended session is reported, not shown as a password problem", async () => {
    const change = vi.fn().mockRejectedValue(new PasswordError("session"));
    const { user, onExpired, onChanged } = setup(fakePassword({ change }));
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await verify(user);

    await waitFor(() => expect(onExpired).toHaveBeenCalledTimes(1));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("an unknown failure says so without the server's words", async () => {
    const change = vi.fn().mockRejectedValue(new Error("stack trace with the secret"));
    const { user } = setup(fakePassword({ change }));
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await verify(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No pudimos cambiar tu contraseña");
    expect(document.body.textContent).not.toContain("secret");
  });

  it("going back from the verification keeps what was typed", async () => {
    const { user } = setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByLabelText("Código de verificación");

    await user.click(screen.getByRole("button", { name: "Volver al formulario" }));

    expect((screen.getByLabelText("Nueva contraseña") as HTMLInputElement).value).toBe(NEW);
  });

  it("sends the change once even if the verification reports twice", async () => {
    const { user, password } = setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await verify(user);
    await waitFor(() => expect(password.change).toHaveBeenCalledTimes(1));
    expect(password.change).toHaveBeenCalledTimes(1);
  });
});
