import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { StepUpError, type AuthenticatorApi, type TotpStatus } from "../lib/authenticator";
import type { StepUpApi, StepUpChallenge, StepUpConfig, StepUpGrant } from "../lib/stepup";
import { AuthenticatorSection } from "./AuthenticatorSection";

const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const CODES = ["ABCDE-FGHJK", "KMNPQ-RSTUV", "WXYZ2-34567"];

function status(overrides: Partial<TotpStatus> = {}): TotpStatus {
  return {
    available: true,
    status: "NONE",
    recoveryCodesRemaining: 0,
    exclusive: true,
    confirmedAt: null,
    ...overrides,
  };
}

/** A fake backend whose status follows what the user did, like the real one. */
function fakeAuth(initial: TotpStatus = status(), overrides: Partial<AuthenticatorApi> = {}) {
  let current = initial;
  const api = {
    mode: "backend",
    getStatus: vi.fn(async () => current),
    begin: vi.fn(async () => {
      current = { ...current, status: "PENDING" };
      return {
        secret: SECRET,
        otpauthUri: `otpauth://totp/Mifos:ana?secret=${SECRET}&issuer=Mifos`,
        issuer: "Mifos",
        digits: 6,
        periodSeconds: 30,
      };
    }),
    confirm: vi.fn(async () => {
      current = status({ status: "ACTIVE", recoveryCodesRemaining: 3 });
      return { recoveryCodes: CODES };
    }),
    newRecoveryCodes: vi.fn(async () => ({ recoveryCodes: CODES })),
    remove: vi.fn(async () => {
      current = status();
    }),
    ...overrides,
  } satisfies AuthenticatorApi;
  return api;
}

const stepUpConfig: StepUpConfig = {
  enabled: true,
  protectedActions: ["MANAGE_AUTHENTICATOR", "CHANGE_PASSWORD"],
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
  action: "MANAGE_AUTHENTICATOR",
  channel: "EMAIL",
  maskedDestination: "a***@example.com",
  expiresAt: "2026-10-28T12:05:00",
  attemptsRemaining: 5,
  resendAvailableAt: "2026-10-28T12:00:30",
  resendsRemaining: 3,
};

const grant: StepUpGrant = {
  stepUpToken: "GRANT-TOKEN",
  action: "MANAGE_AUTHENTICATOR",
  expiresAt: "2026-10-28T12:02:00",
};

function fakeStepUp(overrides: Partial<StepUpApi> = {}) {
  return {
    mode: "backend",
    getConfig: vi.fn(async () => stepUpConfig),
    createChallenge: vi.fn(async () => challenge),
    verify: vi.fn(async () => grant),
    resend: vi.fn(async () => challenge),
    ...overrides,
  } satisfies StepUpApi;
}

function renderSection(api: AuthenticatorApi, stepUp: StepUpApi = fakeStepUp()) {
  render(
    <I18nProvider>
      <AuthenticatorSection api={api} stepUpApi={stepUp} />
    </I18nProvider>,
  );
  return stepUp;
}

/** Walks the pairing up to the field for the first code of the app. */
async function pairUpToCode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", { name: /Vincular una app de autenticación/ }),
  );
  await user.click(await screen.findByRole("button", { name: "Ya la agregué" }));
  await user.type(await screen.findByLabelText("Código de verificación"), "123456");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  return screen.findByLabelText("Código de tu app de autenticación");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AuthenticatorSection", () => {
  it("shows nothing when the tenant did not switch the authenticator on", async () => {
    const api = fakeAuth(status({ available: false }));
    const { container } = render(
      <I18nProvider>
        <AuthenticatorSection api={api} stepUpApi={fakeStepUp()} />
      </I18nProvider>,
    );

    await waitFor(() => expect(api.getStatus).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Cargando…")).toBeNull());
    expect(screen.queryByRole("heading", { name: "App de autenticación" })).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("offers to link an app when there is none", async () => {
    renderSection(fakeAuth());
    expect(await screen.findByText("No has vinculado una app de autenticación.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Vincular una app de autenticación/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "App de autenticación" })).toBeTruthy();
  });

  it("says when the status cannot be read, and tries again", async () => {
    const getStatus = vi
      .fn()
      .mockRejectedValueOnce(new StepUpError("network"))
      .mockResolvedValueOnce(status());
    renderSection(fakeAuth(status(), { getStatus }));
    const user = userEvent.setup();

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos conectar");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("No has vinculado una app de autenticación.")).toBeTruthy();
  });

  it("treats a server that says it is switched off as hidden, not as an error", async () => {
    const getStatus = vi.fn().mockRejectedValue(new StepUpError("totp.disabled"));
    renderSection(fakeAuth(status(), { getStatus }));
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Cargando…")).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("heading", { name: "App de autenticación" })).toBeNull();
  });

  // -----------------------------------------------------------------------------------------------
  // pairing
  // -----------------------------------------------------------------------------------------------

  it("shows the secret as a QR code and as text, with a warning that it is shown once", async () => {
    const api = fakeAuth();
    renderSection(api);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /Vincular una app de autenticación/ }),
    );

    expect(api.begin).toHaveBeenCalledTimes(1);
    expect(await screen.findByAltText("Código QR para tu app de autenticación")).toBeTruthy();
    const key = screen.getByLabelText("Clave de tu app de autenticación");
    expect(key.textContent).toBe("JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP");
    expect(screen.getByRole("note").textContent).toContain("solo se muestra ahora");
  });

  it("draws the QR code locally, as an image that cannot run anything", async () => {
    renderSection(fakeAuth());
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: /Vincular una app de autenticación/ }),
    );

    const image = (await screen.findByAltText(
      "Código QR para tu app de autenticación",
    )) as HTMLImageElement;

    expect(image.tagName).toBe("IMG");
    expect(image.src.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(image.src)).toContain("<svg");
  });

  it("walks through the verification and the first code, and shows the recovery codes once", async () => {
    const api = fakeAuth();
    const stepUp = renderSection(api);
    const user = userEvent.setup();

    const field = await pairUpToCode(user);

    // the step-up was for the right action and the grant reached the confirmation
    expect(stepUp.createChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MANAGE_AUTHENTICATOR", channel: "EMAIL" }),
    );
    expect(document.body.textContent).not.toContain("GRANT-TOKEN");

    await user.type(field, "654321");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));

    await waitFor(() => expect(api.confirm).toHaveBeenCalledWith("654321", "GRANT-TOKEN"));
    expect(
      await screen.findByRole("heading", { name: "Guarda tus códigos de recuperación" }),
    ).toBeTruthy();
    CODES.forEach((code) => expect(screen.getByText(code)).toBeTruthy());
    expect(screen.getByRole("list", { name: "Códigos de recuperación" })).toBeTruthy();
    // the secret is gone from the page
    expect(document.body.textContent).not.toContain("JBSW");
    expect(document.body.textContent).not.toContain("GRANT-TOKEN");
  });

  it("only lets the user finish once they say they saved the codes, and then drops them", async () => {
    const api = fakeAuth();
    renderSection(api);
    const user = userEvent.setup();
    const field = await pairUpToCode(user);
    await user.type(field, "654321");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));
    await screen.findByRole("heading", { name: "Guarda tus códigos de recuperación" });

    const done = screen.getByRole("button", { name: "Listo" }) as HTMLButtonElement;
    expect(done.disabled).toBe(true);
    await user.click(screen.getByLabelText("Ya guardé mis códigos en un lugar seguro"));
    expect(done.disabled).toBe(false);
    await user.click(done);

    expect(await screen.findByText("Tu app de autenticación está activa.")).toBeTruthy();
    CODES.forEach((code) => expect(screen.queryByText(code)).toBeNull());
  });

  it("copies the recovery codes, one per line", async () => {
    renderSection(fakeAuth());
    const user = userEvent.setup();
    // after setup(): user-event installs a clipboard of its own, which this one replaces
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const field = await pairUpToCode(user);
    await user.type(field, "654321");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));

    await user.click(await screen.findByRole("button", { name: /Copiar códigos/ }));

    expect(writeText).toHaveBeenCalledWith(CODES.join("\n"));
    expect(await screen.findByText("Códigos copiados.")).toBeTruthy();
  });

  it("copying the key says so only when the browser allowed it", async () => {
    renderSection(fakeAuth());
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn(async () => {
          throw new Error("denied");
        }),
      },
      configurable: true,
    });
    await user.click(
      await screen.findByRole("button", { name: /Vincular una app de autenticación/ }),
    );

    await user.click(await screen.findByRole("button", { name: /Copiar clave/ }));

    expect(screen.queryByText("Clave copiada.")).toBeNull();
  });

  it("goes straight to the code when the server does not ask for a verification", async () => {
    const api = fakeAuth();
    const stepUp = fakeStepUp({
      getConfig: vi.fn(async (): Promise<StepUpConfig> => ({ ...stepUpConfig, enabled: false })),
    });
    renderSection(api, stepUp);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /Vincular una app de autenticación/ }),
    );
    await user.click(await screen.findByRole("button", { name: "Ya la agregué" }));
    const field = await screen.findByLabelText("Código de tu app de autenticación");
    await user.type(field, "654321");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));

    await waitFor(() => expect(api.confirm).toHaveBeenCalledWith("654321", undefined));
    expect(stepUp.createChallenge).not.toHaveBeenCalled();
  });

  it("a wrong first code is an alert with the attempts left, and stays on the same step", async () => {
    const confirm = vi.fn(async () => {
      throw new StepUpError("otp.invalid", { attemptsRemaining: 4 });
    });
    renderSection(fakeAuth(status(), { confirm }));
    const user = userEvent.setup();
    const field = (await pairUpToCode(user)) as HTMLInputElement;

    await user.type(field, "000000");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("no coincide");
    expect(screen.getByText("Te quedan 4 intentos.")).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")).toBe(alert.id);
    expect(field.value).toBe("000000");
  });

  it("an incomplete code does not reach the server", async () => {
    const api = fakeAuth();
    renderSection(api);
    const user = userEvent.setup();
    const field = await pairUpToCode(user);
    await user.type(field, "123");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Escribe los 6 dígitos");
    expect(api.confirm).not.toHaveBeenCalled();
  });

  it("a lock-out says how long to wait", async () => {
    const confirm = vi.fn(async () => {
      throw new StepUpError("locked", { retryAfterSeconds: 900 });
    });
    renderSection(fakeAuth(status(), { confirm }));
    const user = userEvent.setup();
    const field = await pairUpToCode(user);
    await user.type(field, "000000");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));

    expect((await screen.findByRole("alert")).textContent).toContain("15 min");
  });

  it("when the grant ran out, it asks for the verification again", async () => {
    const confirm = vi.fn(async () => {
      throw new StepUpError("invalid");
    });
    renderSection(fakeAuth(status(), { confirm }));
    const user = userEvent.setup();
    const field = await pairUpToCode(user);
    await user.type(field, "654321");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));

    expect((await screen.findByRole("alert")).textContent).toContain("ya no es válida");
    expect(await screen.findByLabelText("Código de verificación")).toBeTruthy();
  });

  it("only digits go into the field", async () => {
    renderSection(fakeAuth());
    const user = userEvent.setup();
    const field = (await pairUpToCode(user)) as HTMLInputElement;
    await user.type(field, "12ab-3 4567");
    expect(field.value).toBe("123456");
    expect(field.getAttribute("autocomplete")).toBe("one-time-code");
    expect(field.getAttribute("inputmode")).toBe("numeric");
  });

  it("cancelling a pairing forgets the secret and cancels it on the server too", async () => {
    const api = fakeAuth();
    renderSection(api);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: /Vincular una app de autenticación/ }),
    );
    await screen.findByLabelText("Clave de tu app de autenticación");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("No has vinculado una app de autenticación.")).toBeTruthy();
    expect(api.remove).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain("JBSW");
  });

  it("moves the focus to the new step", async () => {
    renderSection(fakeAuth());
    const user = userEvent.setup();
    await screen.findByText("No has vinculado una app de autenticación.");
    await user.click(screen.getByRole("button", { name: /Vincular una app de autenticación/ }));
    await screen.findByLabelText("Clave de tu app de autenticación");

    const heading = screen.getByRole("heading", { name: "App de autenticación" });
    await waitFor(() => expect(document.activeElement).toBe(heading.parentElement));
  });

  it("a second tab that paired first sends the user back to the status", async () => {
    const confirm = vi.fn(async () => {
      throw new StepUpError("totp.already.enrolled");
    });
    const api = fakeAuth(status(), { confirm });
    renderSection(api);
    const user = userEvent.setup();
    const field = await pairUpToCode(user);
    await user.type(field, "654321");
    await user.click(screen.getByRole("button", { name: "Vincular app de autenticación" }));

    await waitFor(() => expect(api.getStatus).toHaveBeenCalledTimes(2));
    expect(document.body.textContent).not.toContain("JBSW");
  });

  it("shows the demo notice and the demo code only for the demo backend", async () => {
    const api = fakeAuth(status(), { mode: "demo", demoHint: "135790" });
    renderSection(api);
    const user = userEvent.setup();

    expect(
      await screen.findByText("Verificación de demostración: no es información real."),
    ).toBeTruthy();
    const field = await pairUpToCode(user);
    expect(field).toBeTruthy();
    expect(screen.getByText("135790")).toBeTruthy();
  });

  // -----------------------------------------------------------------------------------------------
  // an active authenticator
  // -----------------------------------------------------------------------------------------------

  it("shows that it is active, what that means, and how many recovery codes are left", async () => {
    renderSection(fakeAuth(status({ status: "ACTIVE", recoveryCodesRemaining: 7 })));

    expect(await screen.findByText("Tu app de autenticación está activa.")).toBeTruthy();
    expect(screen.getByText(/Ya no recibes códigos por SMS ni por correo/)).toBeTruthy();
    expect(screen.getByText("Te quedan 7 códigos de recuperación.")).toBeTruthy();
  });

  it("does not claim the other channels are off when the tenant keeps them", async () => {
    renderSection(
      fakeAuth(status({ status: "ACTIVE", recoveryCodesRemaining: 7, exclusive: false })),
    );
    await screen.findByText("Tu app de autenticación está activa.");
    expect(screen.queryByText(/Ya no recibes códigos por SMS ni por correo/)).toBeNull();
  });

  it("uses the singular for the last recovery code", async () => {
    renderSection(fakeAuth(status({ status: "ACTIVE", recoveryCodesRemaining: 1 })));
    expect(await screen.findByText("Te queda 1 código de recuperación.")).toBeTruthy();
  });

  it("generates new recovery codes behind a verification, and says the old ones are gone", async () => {
    const api = fakeAuth(status({ status: "ACTIVE", recoveryCodesRemaining: 2 }));
    renderSection(api);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /Generar códigos de recuperación nuevos/ }),
    );
    expect(api.newRecoveryCodes).not.toHaveBeenCalled();
    await user.type(await screen.findByLabelText("Código de verificación"), "123456");
    await user.click(screen.getByRole("button", { name: "Generar códigos nuevos" }));

    await waitFor(() => expect(api.newRecoveryCodes).toHaveBeenCalledWith("GRANT-TOKEN"));
    expect(await screen.findByText(/Los anteriores ya no sirven/)).toBeTruthy();
    CODES.forEach((code) => expect(screen.getByText(code)).toBeTruthy());
  });

  it("removes the app behind a verification and says so", async () => {
    const api = fakeAuth(status({ status: "ACTIVE", recoveryCodesRemaining: 5 }));
    renderSection(api);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Quitar la app de autenticación/ }));
    expect(api.remove).not.toHaveBeenCalled();
    await user.type(await screen.findByLabelText("Código de verificación"), "123456");
    await user.click(screen.getByRole("button", { name: "Quitar app de autenticación" }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("GRANT-TOKEN"));
    expect(
      await screen.findByText(/Quitamos tu app de autenticación\. Ya puedes recibir códigos/),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Vincular una app de autenticación/ })).toBeTruthy();
  });

  it("backing out of a removal changes nothing", async () => {
    const api = fakeAuth(status({ status: "ACTIVE", recoveryCodesRemaining: 5 }));
    renderSection(api);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Quitar la app de autenticación/ }));
    await screen.findByLabelText("Código de verificación");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("Tu app de autenticación está activa.")).toBeTruthy();
    expect(api.remove).not.toHaveBeenCalled();
  });

  it("when the grant is refused at removal, it asks for the verification again", async () => {
    const remove = vi.fn(async () => {
      throw new StepUpError("invalid");
    });
    renderSection(fakeAuth(status({ status: "ACTIVE", recoveryCodesRemaining: 5 }), { remove }));
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Quitar la app de autenticación/ }));
    await user.type(await screen.findByLabelText("Código de verificación"), "123456");
    await user.click(screen.getByRole("button", { name: "Quitar app de autenticación" }));

    expect((await screen.findByRole("alert")).textContent).toContain("ya no es válida");
    expect(await screen.findByLabelText("Código de verificación")).toBeTruthy();
  });

  it("a verification that uses the authenticator itself reaches the removal too", async () => {
    const api = fakeAuth(status({ status: "ACTIVE", recoveryCodesRemaining: 5 }));
    const stepUp = fakeStepUp({
      getConfig: vi.fn(async (): Promise<StepUpConfig> => ({
        ...stepUpConfig,
        availableChannels: ["TOTP"],
      })),
      createChallenge: vi.fn(async () => ({
        ...challenge,
        channel: "TOTP" as const,
        maskedDestination: null,
        resendsRemaining: 0,
      })),
    });
    renderSection(api, stepUp);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Quitar la app de autenticación/ }));
    await user.type(await screen.findByLabelText("Código de tu app de autenticación"), "246810");
    await user.click(screen.getByRole("button", { name: "Quitar app de autenticación" }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("GRANT-TOKEN"));
    expect(stepUp.verify).toHaveBeenCalledWith(11, "246810");
  });
});
