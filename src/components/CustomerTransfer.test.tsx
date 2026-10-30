import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import type { StepUpApi, StepUpChallenge, StepUpConfig, StepUpGrant } from "../lib/stepup";
import {
  TransferError,
  type TransferAccount,
  type TransferReceipt,
  type TransferTemplate,
  type TransfersApi,
} from "../lib/transfers";
import { CustomerTransfer } from "./CustomerTransfer";

const stepUpConfig: StepUpConfig = {
  enabled: true,
  protectedActions: ["OWN_TRANSFER"],
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
  action: "OWN_TRANSFER",
  channel: "EMAIL",
  maskedDestination: "a***@example.com",
  expiresAt: "2026-10-29T12:05:00",
  attemptsRemaining: 5,
  resendAvailableAt: "2026-10-29T12:00:30",
  resendsRemaining: 3,
};

const grant: StepUpGrant = {
  stepUpToken: "GRANT-TOKEN",
  action: "OWN_TRANSFER",
  expiresAt: "2026-10-29T12:02:00",
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

const account = (id: number, extra: Partial<TransferAccount> = {}): TransferAccount => ({
  accountId: id,
  accountNo: `0000${id}`,
  accountType: 2,
  clientId: 81,
  officeId: 1,
  clientName: "Ana Pérez",
  ...extra,
});

const loan = account(9, { accountType: 1, accountNo: "L-0009" });
const template: TransferTemplate = {
  from: [account(1), account(2), account(3), loan],
  to: [account(1), account(2), account(3), loan],
};

function receiptOf(input: Parameters<TransfersApi["create"]>[1]): TransferReceipt {
  return { reference: 55, ...input, date: "2026-10-30" };
}

function fakeTransfers(overrides: Partial<TransfersApi> = {}) {
  return {
    getTemplate: vi.fn(async () => template),
    getSummary: vi.fn(async () => ({
      currency: { code: "USD", decimalPlaces: 2 },
      available: 1250.5,
    })),
    create: vi.fn(async (_kind, input) => receiptOf(input)),
    ...overrides,
  } satisfies TransfersApi;
}

function setup(transfers = fakeTransfers(), stepUp = fakeStepUp()) {
  const onClose = vi.fn();
  const onExpired = vi.fn();
  const onSend = vi.fn();
  const { unmount } = render(
    <I18nProvider>
      <CustomerTransfer
        api={transfers}
        stepUpApi={stepUp}
        onClose={onClose}
        onExpired={onExpired}
        onSend={onSend}
      />
    </I18nProvider>,
  );
  return { transfers, stepUp, onClose, onExpired, onSend, unmount, user: userEvent.setup() };
}

type User = ReturnType<typeof userEvent.setup>;

async function ready(label = "Cuenta de destino") {
  await screen.findByLabelText(label);
}

async function fillForm(user: User, to = "2:2", amount = "10.5", concept = "Renta de octubre") {
  await ready();
  if (to) await user.selectOptions(screen.getByLabelText("Cuenta de destino"), to);
  await user.type(screen.getByLabelText(/^Importe/), amount);
  await user.type(screen.getByLabelText("Concepto"), concept);
}

async function toReview(
  user: User,
  ...args: Parameters<typeof fillForm> extends [User, ...infer R] ? R : never
) {
  await fillForm(user, ...args);
  await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));
}

async function verify(user: User) {
  await user.type(await screen.findByLabelText("Código de verificación"), "123456");
  await user.click(screen.getByRole("button", { name: "Verificar y enviar" }));
}

beforeEach(() => {
  window.localStorage.clear();
  (window as Window & { __missingI18n?: string[] }).__missingI18n = [];
});

afterEach(() => {
  cleanup();
});

describe("CustomerTransfer: the form", () => {
  it("lists the savings accounts of the customer, never a loan, and starts without a destination", async () => {
    setup();
    await ready();

    const from = screen.getByLabelText("Cuenta de origen") as HTMLSelectElement;
    const to = screen.getByLabelText("Cuenta de destino") as HTMLSelectElement;
    expect([...from.options].map((o) => o.textContent)).toEqual([
      "Cuenta de ahorro 00001 · Ana Pérez",
      "Cuenta de ahorro 00002 · Ana Pérez",
      "Cuenta de ahorro 00003 · Ana Pérez",
    ]);
    expect(from.value).toBe("2:1");
    // the source is not a destination, and nothing is chosen for the person
    expect(to.value).toBe("");
    expect([...to.options].map((o) => o.value)).toEqual(["", "2:2", "2:3"]);
    expect(document.body.textContent).not.toContain("L-0009");
  });

  it("shows the currency and the available balance of the source account as advice", async () => {
    const { transfers } = setup();
    await ready();

    expect(await screen.findByText("Disponible: 1,250.50 USD")).toBeTruthy();
    expect(screen.getByLabelText("Importe en USD")).toBeTruthy();
    expect(transfers.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 1 }),
      expect.anything(),
    );
  });

  it("works without the advice when the account cannot be read", async () => {
    setup(fakeTransfers({ getSummary: vi.fn(async () => ({})) }));
    await ready();
    expect(screen.getByLabelText("Importe")).toBeTruthy();
    expect(screen.queryByText(/Disponible/)).toBeNull();
  });

  it("takes the source out of the destinations and clears a destination that became the source", async () => {
    const { user } = setup();
    await ready();
    await user.selectOptions(screen.getByLabelText("Cuenta de destino"), "2:2");

    await user.selectOptions(screen.getByLabelText("Cuenta de origen"), "2:2");

    const to = screen.getByLabelText("Cuenta de destino") as HTMLSelectElement;
    expect(to.value).toBe("");
    expect([...to.options].map((o) => o.value)).toEqual(["", "2:1", "2:3"]);
  });

  it("says so when there are fewer than two savings accounts, and offers no form", async () => {
    setup(
      fakeTransfers({
        getTemplate: vi.fn(async () => ({ from: [account(1), loan], to: [account(1), loan] })),
      }),
    );
    expect(await screen.findByText(/al menos dos cuentas de ahorro/)).toBeTruthy();
    expect(screen.queryByLabelText("Cuenta de destino")).toBeNull();
  });

  it.each([
    ["no destination", "", "10", "Renta", "Selecciona la cuenta de destino.", "Cuenta de destino"],
    ["no amount", "2:2", "", "Renta", "Escribe el importe de la transferencia.", /^Importe/],
    ["a decimal comma", "2:2", "1,5", "Renta", "solo con números y punto decimal", /^Importe/],
    ["a negative amount", "2:2", "-5", "Renta", "solo con números y punto decimal", /^Importe/],
    ["zero", "2:2", "0.00", "Renta", "mayor que cero", /^Importe/],
    ["too many decimals", "2:2", "1.234", "Renta", "como máximo 2 decimales", /^Importe/],
    ["no concept", "2:2", "10", "   ", "Escribe un concepto", "Concepto"],
  ])(
    "refuses %s before anything is sent, and puts the focus on the field",
    async (_name, to, amount, concept, message, label) => {
      const { user, transfers, stepUp } = setup();
      await ready();
      if (to) await user.selectOptions(screen.getByLabelText("Cuenta de destino"), to);
      if (amount) await user.type(screen.getByLabelText(/^Importe/), amount);
      if (concept) await user.type(screen.getByLabelText("Concepto"), concept);

      await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));

      expect((await screen.findByRole("alert")).textContent).toContain(message);
      const field = screen.getByLabelText(label);
      expect(field.getAttribute("aria-invalid")).toBe("true");
      await waitFor(() => expect(document.activeElement).toBe(field));
      expect(transfers.create).not.toHaveBeenCalled();
      expect(stepUp.createChallenge).not.toHaveBeenCalled();
    },
  );

  it("follows the decimals of the currency", async () => {
    const { user } = setup(
      fakeTransfers({
        getSummary: vi.fn(async () => ({ currency: { code: "JPY", decimalPlaces: 0 } })),
      }),
    );
    await ready();
    await screen.findByLabelText("Importe en JPY");
    await user.selectOptions(screen.getByLabelText("Cuenta de destino"), "2:2");
    await user.type(screen.getByLabelText(/^Importe/), "10.5");
    await user.type(screen.getByLabelText("Concepto"), "x");

    await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));

    expect((await screen.findByRole("alert")).textContent).toContain("no admite decimales");
  });
});

describe("CustomerTransfer: loading", () => {
  it("shows an error and reads again on request", async () => {
    const getTemplate = vi
      .fn()
      .mockRejectedValueOnce(new TransferError("unavailable"))
      .mockResolvedValueOnce(template);
    const { user } = setup(fakeTransfers({ getTemplate }));

    expect((await screen.findByRole("alert")).textContent).toContain("no está disponible");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await ready();
    expect(getTemplate).toHaveBeenCalledTimes(2);
  });

  it("ends the session screen when the session ended while loading", async () => {
    const { onExpired } = setup(
      fakeTransfers({ getTemplate: vi.fn().mockRejectedValue(new TransferError("session")) }),
    );
    await waitFor(() => expect(onExpired).toHaveBeenCalledTimes(1));
  });

  it("says when the institution does not allow it", async () => {
    setup(fakeTransfers({ getTemplate: vi.fn().mockRejectedValue(new TransferError("refused")) }));
    expect((await screen.findByRole("alert")).textContent).toContain("no permite consultar");
  });
});

describe("CustomerTransfer: review and verification", () => {
  it("shows what will happen, and goes back to the form with the typed values", async () => {
    const { user, transfers } = setup();
    await toReview(user);

    expect(screen.getByText("Cuenta de ahorro 00001 · Ana Pérez")).toBeTruthy();
    expect(screen.getByText("Cuenta de ahorro 00002 · Ana Pérez")).toBeTruthy();
    expect(screen.getByText("10.50 USD")).toBeTruthy();
    expect(screen.getByText("Renta de octubre")).toBeTruthy();
    expect(transfers.create).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Editar datos" }));

    expect((screen.getByLabelText("Cuenta de destino") as HTMLSelectElement).value).toBe("2:2");
    expect((screen.getByLabelText(/^Importe/) as HTMLInputElement).value).toBe("10.5");
    expect((screen.getByLabelText("Concepto") as HTMLInputElement).value).toBe("Renta de octubre");
  });

  it("asks for the verification of this exact transfer, then sends it once with the token", async () => {
    const { user, transfers, stepUp } = setup();
    await toReview(user);

    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    // the token is bound to the five fields of the transfer, the amount as text
    await waitFor(() =>
      expect(stepUp.createChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "OWN_TRANSFER",
          payload: {
            fromAccountId: 1,
            fromAccountType: 2,
            toAccountId: 2,
            toAccountType: 2,
            transferAmount: "10.50",
          },
        }),
      ),
    );
    expect(transfers.create).not.toHaveBeenCalled();
    await verify(user);

    await waitFor(() => expect(transfers.create).toHaveBeenCalledTimes(1));
    expect(transfers.create).toHaveBeenCalledWith(
      "own",
      {
        from: expect.objectContaining({ accountId: 1 }),
        to: expect.objectContaining({ accountId: 2 }),
        amount: "10.50",
        description: "Renta de octubre",
      },
      "GRANT-TOKEN",
    );
    expect(document.body.textContent).not.toContain("GRANT-TOKEN");
  });

  it("sends without a token when the server does not ask for a verification", async () => {
    const stepUp = fakeStepUp({
      getConfig: vi.fn(async (): Promise<StepUpConfig> => ({ ...stepUpConfig, enabled: false })),
    });
    const { user, transfers } = setup(fakeTransfers(), stepUp);
    await toReview(user);

    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));

    await waitFor(() => expect(transfers.create).toHaveBeenCalledTimes(1));
    expect(transfers.create).toHaveBeenCalledWith("own", expect.anything(), undefined);
    expect(stepUp.createChallenge).not.toHaveBeenCalled();
  });

  it("goes back from the verification to the review without sending", async () => {
    const { user, transfers } = setup();
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await screen.findByLabelText("Código de verificación");

    await user.click(screen.getByRole("button", { name: /Volver al resumen/ }));

    expect(screen.getByRole("button", { name: "Confirmar transferencia" })).toBeTruthy();
    expect(transfers.create).not.toHaveBeenCalled();
  });
});

describe("CustomerTransfer: the receipt", () => {
  it("shows the receipt with the reference, and starts another transfer from a clean form", async () => {
    const { user } = setup();
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);

    const receipt = (await screen.findByText("Transferencia realizada")).closest("div")!;
    expect(within(receipt).getByText("10.50 USD")).toBeTruthy();
    expect(within(receipt).getByText("Renta de octubre")).toBeTruthy();
    expect(within(receipt).getByText("2026-10-30")).toBeTruthy();
    expect(within(receipt).getByText("55")).toBeTruthy();
    expect(screen.queryByLabelText("Código de verificación")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Hacer otra transferencia" }));

    expect((screen.getByLabelText("Cuenta de destino") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText(/^Importe/) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Concepto") as HTMLInputElement).value).toBe("");
  });

  it("does not need a reference to be a done transfer", async () => {
    const { user } = setup(
      fakeTransfers({
        create: vi.fn(async (_kind, input) => ({ ...receiptOf(input), reference: undefined })),
      }),
    );
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);

    expect(await screen.findByText("Transferencia realizada")).toBeTruthy();
    expect(screen.queryByText("Referencia")).toBeNull();
  });

  it("takes the person back home", async () => {
    const { user, onClose } = setup();
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);
    await screen.findByText("Transferencia realizada");

    await user.click(screen.getAllByRole("button", { name: "Volver al inicio" }).at(-1)!);

    expect(onClose).toHaveBeenCalled();
  });
});

describe("CustomerTransfer: when the transfer fails", () => {
  it.each([
    ["funds", "no alcanza"],
    ["limit", "supera el límite"],
    ["daily", "límite diario"],
    ["same", "deben ser distintas"],
    ["date", "fecha de tu dispositivo"],
    ["invalid", "no aceptó los datos"],
    ["refused", "no autorizó"],
    ["busy", "demasiadas solicitudes"],
    ["offline", "Sin conexión"],
    ["unknown", "No pudimos completar"],
  ] as const)(
    "%s: says nothing moved, keeps the form, and reuses the token for the same transfer",
    async (code, message) => {
      const create = vi
        .fn()
        .mockRejectedValueOnce(new TransferError(code))
        .mockImplementation(async (_kind, input) => receiptOf(input));
      const { user, stepUp } = setup(fakeTransfers({ create }));
      await toReview(user);
      await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
      await verify(user);

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain(message);
      expect((screen.getByLabelText(/^Importe/) as HTMLInputElement).value).toBe("10.5");
      expect((screen.getByLabelText("Concepto") as HTMLInputElement).value).toBe(
        "Renta de octubre",
      );

      // the same transfer: the grant is used again, without a second code
      await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));
      await user.click(await screen.findByRole("button", { name: "Confirmar transferencia" }));

      await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
      expect(create).toHaveBeenLastCalledWith("own", expect.anything(), "GRANT-TOKEN");
      expect(stepUp.createChallenge).toHaveBeenCalledTimes(1);
      expect(await screen.findByText("Transferencia realizada")).toBeTruthy();
    },
  );

  it("asks for a new verification when the transfer changed after the first one", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new TransferError("funds"))
      .mockImplementation(async (_kind, input) => receiptOf(input));
    const { user, stepUp } = setup(fakeTransfers({ create }));
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);
    await screen.findByRole("alert");

    // a smaller amount is another transfer: the old token is not for it
    const amount = screen.getByLabelText(/^Importe/);
    await user.clear(amount);
    await user.type(amount, "5");
    await user.click(screen.getByRole("button", { name: "Revisar transferencia" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar transferencia" }));

    await waitFor(() => expect(stepUp.createChallenge).toHaveBeenCalledTimes(2));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("asks for the verification again when the server says the token is no good", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new TransferError("stepup"))
      .mockImplementation(async (_kind, input) => receiptOf(input));
    const { user, stepUp } = setup(fakeTransfers({ create }));
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);

    expect((await screen.findByRole("alert")).textContent).toContain("ya no es válida");
    await waitFor(() => expect(stepUp.createChallenge).toHaveBeenCalledTimes(2));
    await verify(user);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Transferencia realizada")).toBeTruthy();
  });

  it("offers to refresh the accounts when the server does not recognise one", async () => {
    const getTemplate = vi.fn(async () => template);
    const create = vi.fn().mockRejectedValue(new TransferError("accounts"));
    const { user } = setup(fakeTransfers({ create, getTemplate }));
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Actualizar mis cuentas" }));

    await waitFor(() => expect(getTemplate).toHaveBeenCalledTimes(2));
    await ready();
    expect((screen.getByLabelText("Cuenta de destino") as HTMLSelectElement).value).toBe("");
  });

  it("ends the screen when the session ended", async () => {
    const create = vi.fn().mockRejectedValue(new TransferError("session"));
    const { user, onExpired } = setup(fakeTransfers({ create }));
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);

    await waitFor(() => expect(onExpired).toHaveBeenCalledTimes(1));
  });
});

describe("CustomerTransfer: an answer that did not arrive", () => {
  async function uncertain() {
    const create = vi.fn().mockRejectedValue(new TransferError("uncertain"));
    const setupResult = setup(fakeTransfers({ create }));
    await toReview(setupResult.user);
    await setupResult.user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(setupResult.user);
    await screen.findByText(/No pudimos confirmar el resultado de la transferencia/);
    return { ...setupResult, create };
  }

  it("says the money may have moved, and offers no way to send it again", async () => {
    const { create } = await uncertain();

    expect(screen.getByRole("alert").textContent).toContain("No la envíes otra vez");
    expect(screen.queryByLabelText("Cuenta de destino")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Confirmar transferencia|Revisar transferencia/ }),
    ).toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("forgets the transfer and the token: the way out is home", async () => {
    const { user, onClose, create } = await uncertain();

    await user.click(screen.getAllByRole("button", { name: "Volver al inicio" }).at(-1)!);

    expect(onClose).toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("CustomerTransfer: one send at a time", () => {
  it("shows that it is sending, and sends once while the answer is pending", async () => {
    let finish: (receipt: TransferReceipt) => void = () => undefined;
    const create = vi.fn(
      (_kind, input) =>
        new Promise<TransferReceipt>((resolve) => (finish = () => resolve(receiptOf(input)))),
    );
    const { user } = setup(fakeTransfers({ create }));
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);

    const status = await screen.findAllByText("Enviando tu transferencia…");
    expect(status.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Confirmar transferencia/ })).toBeNull();
    expect(create).toHaveBeenCalledTimes(1);

    finish(receiptOf({} as never));
    expect(await screen.findByText("Transferencia realizada")).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("CustomerTransfer: language", () => {
  it("speaks English, with no text missing from the catalog", async () => {
    window.localStorage.setItem("mifos-locale", "en-US");
    const { user } = setup();
    await ready("Destination account");
    await screen.findByText("Available: 1,250.50 USD");

    expect(screen.getByRole("heading", { name: "Transfer between my accounts" })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Destination account"), "2:2");
    await user.type(screen.getByLabelText("Amount in USD"), "10.5");
    await user.type(screen.getByLabelText("Memo"), "October rent");
    await user.click(screen.getByRole("button", { name: "Review transfer" }));
    expect(await screen.findByText("Savings account 00002 · Ana Pérez")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Confirm transfer" }));
    await screen.findByLabelText(/verification code/i);

    expect((window as Window & { __missingI18n?: string[] }).__missingI18n ?? []).toEqual([]);
  });

  it("shows the failure in English too", async () => {
    window.localStorage.setItem("mifos-locale", "en-US");
    const create = vi.fn().mockRejectedValue(new TransferError("funds"));
    const { user } = setup(
      fakeTransfers({ create }),
      fakeStepUp({
        getConfig: vi.fn(async (): Promise<StepUpConfig> => ({ ...stepUpConfig, enabled: false })),
      }),
    );
    await ready("Destination account");
    await user.selectOptions(screen.getByLabelText("Destination account"), "2:2");
    await user.type(screen.getByLabelText("Amount in USD"), "10");
    await user.type(screen.getByLabelText("Memo"), "Rent");
    await user.click(screen.getByRole("button", { name: "Review transfer" }));
    await user.click(await screen.findByRole("button", { name: "Confirm transfer" }));

    expect((await screen.findByRole("alert")).textContent).toContain("No money moved");
    expect((window as Window & { __missingI18n?: string[] }).__missingI18n ?? []).toEqual([]);
  });
});

describe("CustomerTransfer: what the home is told", () => {
  it("reports the start, the result and that the receipt was seen", async () => {
    const { user, onSend } = setup();
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);
    await screen.findByText("Transferencia realizada");

    expect(onSend.mock.calls.map(([event]) => event)).toEqual([
      { kind: "start" },
      { kind: "done", reference: 55 },
      { kind: "seen" },
    ]);
  });

  it("reports a refusal as failed and an unknown result as uncertain", async () => {
    const refused = setup(
      fakeTransfers({ create: vi.fn().mockRejectedValue(new TransferError("funds")) }),
    );
    await toReview(refused.user);
    await refused.user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(refused.user);
    await screen.findByRole("alert");
    expect(refused.onSend.mock.calls.map(([event]) => event.kind)).toEqual(["start", "failed"]);
    cleanup();

    const unknown = setup(
      fakeTransfers({ create: vi.fn().mockRejectedValue(new TransferError("uncertain")) }),
    );
    await toReview(unknown.user);
    await unknown.user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(unknown.user);
    await screen.findByText(/No pudimos confirmar el resultado de la transferencia/);
    expect(unknown.onSend.mock.calls.map(([event]) => event.kind)).toEqual(["start", "uncertain"]);
  });

  it("still reports the result when the screen was closed while the transfer was being sent", async () => {
    let finish: () => void = () => undefined;
    const create = vi.fn(
      (_kind, input) =>
        new Promise<TransferReceipt>((resolve) => {
          finish = () => resolve(receiptOf(input));
        }),
    );
    const { user, onSend, unmount } = setup(fakeTransfers({ create }));
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);
    await screen.findAllByText("Enviando tu transferencia…");

    unmount();
    finish();

    await waitFor(() =>
      expect(onSend.mock.calls.map(([event]) => event)).toEqual([
        { kind: "start" },
        { kind: "done", reference: 55 },
      ]),
    );
  });

  it("reports an unknown result even when the screen was closed", async () => {
    let fail: () => void = () => undefined;
    const create = vi.fn(
      () =>
        new Promise<TransferReceipt>((_resolve, reject) => {
          fail = () => reject(new TransferError("uncertain"));
        }),
    );
    const { user, onSend, unmount } = setup(fakeTransfers({ create }));
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar transferencia" }));
    await verify(user);
    await screen.findAllByText("Enviando tu transferencia…");

    unmount();
    fail();

    await waitFor(() =>
      expect(onSend.mock.calls.map(([event]) => event.kind)).toEqual(["start", "uncertain"]),
    );
  });
});

describe("CustomerTransfer: the currency arrives after the amount was typed", () => {
  it("goes back to the form, with the problem, and sends nothing, when the decimals change", async () => {
    let answer: (summary: { currency: { code: string; decimalPlaces: number } }) => void = () =>
      undefined;
    const getSummary = vi.fn(
      () =>
        new Promise<{ currency: { code: string; decimalPlaces: number } }>((resolve) => {
          answer = resolve;
        }),
    );
    const { user, transfers, stepUp } = setup(fakeTransfers({ getSummary }));
    // 10.50 is a good amount while the currency is not known yet (2 decimals)
    await toReview(user);
    expect(screen.getByRole("button", { name: "Confirmar transferencia" })).toBeTruthy();

    // the account turns out to have no decimals: 10.50 is not an amount of this currency
    answer({ currency: { code: "JPY", decimalPlaces: 0 } });

    expect((await screen.findByRole("alert")).textContent).toContain("no admite decimales");
    expect(screen.getByLabelText(/^Importe/)).toBeTruthy();
    expect(transfers.create).not.toHaveBeenCalled();
    expect(stepUp.createChallenge).not.toHaveBeenCalled();
  });
});
