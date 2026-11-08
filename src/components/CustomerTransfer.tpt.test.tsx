import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { StepUpError, type StepUpApi, type StepUpConfig } from "../lib/stepup";
import { TransferError, type TransferAccount, type TransfersApi } from "../lib/transfers";
import { CustomerTransfer } from "./CustomerTransfer";

const account = (id: number, clientName = "Sender"): TransferAccount => ({
  accountId: id,
  accountNo: `SENSITIVE-${id}`,
  accountType: 2,
  clientId: id < 3 ? 81 : 99,
  officeId: id < 3 ? 1 : 3,
  clientName,
});
const source = account(1);
const recipient = account(902, "Recipient");
const config: StepUpConfig = {
  enabled: true,
  protectedActions: ["TPT_TRANSFER"],
  availableChannels: ["EMAIL"],
  otpLength: 6,
  otpTtlSeconds: 300,
  maxAttempts: 5,
  resendCooldownSeconds: 30,
  maxResends: 3,
  grantTtlSeconds: 120,
  sessionBound: true,
};
const challenge = {
  challengeId: 11,
  action: "TPT_TRANSFER" as const,
  channel: "EMAIL" as const,
  maskedDestination: "s***@example.invalid",
  expiresAt: "2026-11-05T12:05:00",
  attemptsRemaining: 5,
  resendAvailableAt: "2026-11-05T12:00:30",
  resendsRemaining: 3,
};
function setup(options: { transfers?: Partial<TransfersApi>; stepUp?: Partial<StepUpApi> } = {}) {
  const transfers: TransfersApi = {
    getTemplate: vi.fn(async () => ({
      from: [source, account(2), { ...account(3), accountType: 1 }],
      to: [recipient, account(903, "Other recipient")],
    })),
    getSummary: vi.fn(async () => ({
      currency: { code: "MXN", decimalPlaces: 2 },
      available: 100,
    })),
    create: vi.fn(async (_kind, input) => ({ ...input, date: "2026-11-05", reference: 456 })),
    ...options.transfers,
  };
  const stepUp: StepUpApi = {
    mode: "backend",
    getConfig: vi.fn(async () => config),
    createChallenge: vi.fn(async () => challenge),
    verify: vi.fn(async () => ({
      stepUpToken: "SYNTHETIC-GRANT",
      action: "TPT_TRANSFER" as const,
      expiresAt: "2026-11-05T12:02:00",
    })),
    resend: vi.fn(async () => challenge),
    ...options.stepUp,
  };
  const onExpired = vi.fn();
  const onClose = vi.fn();
  const onSend = vi.fn();
  const view = render(
    <I18nProvider>
      <CustomerTransfer
        kind="tpt"
        api={transfers}
        stepUpApi={stepUp}
        onExpired={onExpired}
        onClose={onClose}
        onSend={onSend}
      />
    </I18nProvider>,
  );
  return { ...view, transfers, stepUp, onExpired, onClose, onSend, user: userEvent.setup() };
}
type User = ReturnType<typeof userEvent.setup>;
async function details(user: User, amount = "1,250.5") {
  await user.selectOptions(await screen.findByLabelText("Cuenta de origen"), "2:1");
  await screen.findByLabelText("Importe en MXN");
  await user.selectOptions(screen.getByLabelText("Beneficiario registrado"), "2:902");
  await user.type(screen.getByLabelText("Importe en MXN"), amount);
  await user.type(screen.getByLabelText("Concepto"), "Invoice");
  await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));
}
async function otp(user: User) {
  await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
  await user.type(await screen.findByLabelText("Código de verificación"), "123456");
  await user.click(screen.getByRole("button", { name: "Verificar y enviar" }));
}
beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe("CustomerTransfer TPT", () => {
  it("requires explicit source and registered destination; never offers loans or unmasked destination numbers", async () => {
    const { transfers, user } = setup();
    const sourceSelect = (await screen.findByLabelText("Cuenta de origen")) as HTMLSelectElement;
    expect(sourceSelect.value).toBe("");
    expect((screen.getByLabelText("Beneficiario registrado") as HTMLSelectElement).value).toBe("");
    expect(sourceSelect.options).toHaveLength(3);
    expect(document.body.textContent).not.toContain("SENSITIVE-902");
    expect(document.body.textContent).toContain("Recipient · Cuenta terminada en -902");
    expect(transfers.getTemplate).toHaveBeenCalledWith("tpt", expect.any(AbortSignal));
    await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));
    expect(screen.getByRole("alert").textContent).toContain("Selecciona la cuenta de origen");
    expect(document.activeElement).toBe(sourceSelect);
  });
  it("reviews exact details, binds all five fields to TPT and sends once on double submission", async () => {
    const { user, stepUp, transfers, onSend } = setup();
    await details(user);
    expect(screen.getByText("1,250.50 MXN")).toBeTruthy();
    await user.dblClick(screen.getByRole("button", { name: "Confirmar transferencia" }));
    expect(await screen.findByLabelText("Código de verificación")).toBeTruthy();
    expect(stepUp.createChallenge).toHaveBeenCalledWith({
      action: "TPT_TRANSFER",
      channel: "EMAIL",
      payload: {
        fromAccountId: 1,
        fromAccountType: 2,
        toAccountId: 902,
        toAccountType: 2,
        transferAmount: "1250.50",
      },
    });
    await user.type(screen.getByLabelText("Código de verificación"), "123456");
    await user.dblClick(screen.getByRole("button", { name: "Verificar y enviar" }));
    await screen.findByText("Transferencia realizada");
    expect(transfers.create).toHaveBeenCalledExactlyOnceWith(
      "tpt",
      { from: source, to: recipient, amount: "1250.50", description: "Invoice" },
      "SYNTHETIC-GRANT",
    );
    expect(onSend).toHaveBeenCalledWith({ kind: "done", reference: 456 });
    expect(document.body.textContent).not.toContain("SYNTHETIC-GRANT");
    expect(JSON.stringify(localStorage)).not.toContain("SYNTHETIC-GRANT");
  });
  it("verifies the source currency again for another transfer, so it can be reviewed", async () => {
    const { user, transfers } = setup();
    await details(user);
    await otp(user);
    await screen.findByText("Transferencia realizada");

    await user.click(screen.getByRole("button", { name: "Hacer otra transferencia" }));

    expect(await screen.findByLabelText("Importe en MXN")).toBeTruthy();
    expect(transfers.getSummary).toHaveBeenCalledTimes(2);
    expect(
      (screen.getByRole("button", { name: "Revisar transferencia" }) as HTMLButtonElement).disabled,
    ).toBe(false);

    // the second transfer reaches its review with the currency's decimals
    await user.selectOptions(screen.getByLabelText("Beneficiario registrado"), "2:902");
    await user.type(screen.getByLabelText("Importe en MXN"), "1,250.5");
    await user.type(screen.getByLabelText("Concepto"), "Invoice");
    await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));
    expect(await screen.findByText("1,250.50 MXN")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmar transferencia" })).toBeTruthy();
  });
  it("follows the unprotected backend policy without a challenge", async () => {
    const { user, stepUp, transfers } = setup({
      stepUp: {
        getConfig: vi.fn(async () => ({ ...config, protectedActions: ["OWN_TRANSFER" as const] })),
      },
    });
    await details(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await screen.findByText("Transferencia realizada");
    expect(stepUp.createChallenge).not.toHaveBeenCalled();
    expect(transfers.create).toHaveBeenCalledWith("tpt", expect.anything(), undefined);
  });
  it.each([undefined, "", "   "])(
    "does not submit when verification returns missing/empty token %#",
    async (token) => {
      const { user, transfers } = setup({
        stepUp: {
          verify: vi.fn(async () => ({
            stepUpToken: token,
            action: "TPT_TRANSFER",
          })) as unknown as StepUpApi["verify"],
        },
      });
      await details(user);
      await otp(user);
      await screen.findByRole("alert");
      expect(transfers.create).not.toHaveBeenCalled();
    },
  );
  it("rejects a grant for another action", async () => {
    const { user, transfers } = setup({
      stepUp: {
        verify: vi.fn(async () => ({
          stepUpToken: "WRONG-ACTION",
          action: "OWN_TRANSFER" as const,
          expiresAt: "x",
        })),
      },
    });
    await details(user);
    await otp(user);
    await screen.findByRole("alert");
    expect(transfers.create).not.toHaveBeenCalled();
  });
  it.each([
    "otp.invalid",
    "otp.expired",
    "locked",
    "resend.cooldown",
    "channel.unavailable",
  ] as const)("cannot move money after %s", async (code) => {
    const { user, transfers } = setup({
      stepUp: {
        verify: vi.fn(async () => {
          throw new StepUpError(code);
        }),
      },
    });
    await details(user);
    await otp(user);
    await screen.findByRole("alert");
    expect(transfers.create).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {},
    { ...config, enabled: undefined },
    { ...config, availableChannels: ["UNKNOWN"] },
  ])("fails closed on malformed backend policy %#", async (policy) => {
    const { user, transfers } = setup({
      stepUp: { getConfig: vi.fn(async () => policy) as unknown as StepUpApi["getConfig"] },
    });
    await details(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await screen.findByRole("alert");
    expect(transfers.create).not.toHaveBeenCalled();
  });
  it("ends the session if step-up authentication expires", async () => {
    const { user, onExpired, transfers } = setup({
      stepUp: {
        getConfig: vi.fn(async () => {
          throw new StepUpError("session.required");
        }),
      },
    });
    await details(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await waitFor(() => expect(onExpired).toHaveBeenCalled());
    expect(transfers.create).not.toHaveBeenCalled();
  });
  it("requires verified currency even when balance advice is unavailable", async () => {
    const { user, transfers } = setup({ transfers: { getSummary: vi.fn(async () => ({})) } });
    await user.selectOptions(await screen.findByLabelText("Cuenta de origen"), "2:1");
    await user.selectOptions(screen.getByLabelText("Beneficiario registrado"), "2:902");
    await user.type(screen.getByLabelText("Importe"), "10");
    await user.type(screen.getByLabelText("Concepto"), "Invoice");
    await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));
    expect(screen.getByRole("alert").textContent).toContain("moneda de origen");
    expect(transfers.create).not.toHaveBeenCalled();
  });
  it.each(["1,5", "0", "-1", "1.234"])("announces invalid amount %s", async (amount) => {
    const { user, transfers } = setup();
    await details(user, amount);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Importe en MXN"));
    expect(transfers.create).not.toHaveBeenCalled();
  });
  it("shows an empty state without beneficiary CRUD or fictional recipients", async () => {
    setup({ transfers: { getTemplate: vi.fn(async () => ({ from: [source], to: [] })) } });
    expect(await screen.findByText(/No hay beneficiarios/)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it.each(["from", "to", "amount"] as const)(
    "requires a new challenge after changing %s, even when later restored",
    async (field) => {
      const { user, transfers, stepUp } = setup({
        transfers: {
          create: vi.fn(async () => {
            throw new TransferError("daily");
          }),
        },
      });
      await details(user);
      await otp(user);
      await screen.findByRole("alert");
      if (field === "amount") {
        const input = screen.getByLabelText("Importe en MXN");
        await user.clear(input);
        await user.type(input, "1250.50");
      } else {
        const select = screen.getByLabelText(
          field === "from" ? "Cuenta de origen" : "Beneficiario registrado",
        );
        await user.selectOptions(select, field === "from" ? "2:2" : "2:903");
        await user.selectOptions(select, field === "from" ? "2:1" : "2:902");
      }
      await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));
      await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
      await screen.findByLabelText("Código de verificación");
      expect(stepUp.createChallenge).toHaveBeenCalledTimes(2);
      expect(transfers.create).toHaveBeenCalledTimes(1);
    },
  );
  it("reports unexpected errors as uncertain and offers no resend", async () => {
    const { user, transfers, onSend } = setup({
      transfers: {
        create: vi.fn(async () => {
          throw new Error("unexpected after dispatch");
        }),
      },
    });
    await details(user);
    await otp(user);
    expect((await screen.findByRole("alert")).textContent).toContain("No la envíes otra vez");
    expect(screen.queryByRole("button", { name: "Revisar transferencia" })).toBeNull();
    expect(transfers.create).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith({ kind: "uncertain" });
  });
  it("reports a delayed uncertain outcome to the parent even after closing the screen", async () => {
    let reject!: (reason: Error) => void;
    const { user, unmount, onSend } = setup({
      transfers: {
        create: vi.fn(
          () =>
            new Promise<Awaited<ReturnType<TransfersApi["create"]>>>((_resolve, fail) => {
              reject = fail;
            }),
        ),
      },
    });
    await details(user);
    await otp(user);
    unmount();
    reject(new TransferError("uncertain"));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith({ kind: "uncertain" }));
  });
});
