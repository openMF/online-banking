import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedUsers } from "@/lib/banca/demo";
import {
  ACTIVATION_MS,
  capFor,
  dailyUsedNow,
  isBeneficiaryActive,
  LOCK_MS,
  MAX_ATTEMPTS,
  mexicoDay,
  PRIVATE_SCREENS,
  roundMoney,
  SECOND_SIGN_AT,
  SESSION_MS,
  type EnrollDraft,
  type Screen,
  type User,
} from "@/lib/banca/model";

type Result = { ok: true } | { ok: false; error: string };

type TransferInput = {
  fromAccountId: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  own: boolean;
  amount: number;
  concept: string;
  reference: string;
};

type BancaData = {
  users: User[];
  sessionUserId: string | null;
  sessionExpiresAt: number | null;
  pendingUserId: string | null;
  screen: Screen;
  folioSeq: number;
};

type BancaState = BancaData & {
  boot: () => void;
  go: (screen: Screen) => void;
  touch: () => void;
  continueClient: (clientNumber: string) => Result;
  login: (password: string) => Result;
  endSession: (reason: "voluntario" | "inactividad") => void;
  enroll: (draft: EnrollDraft) => Result;
  resetDemo: () => void;
  addBeneficiary: (input: { name: string; account: string; alias: string; limit: number }) => Result;
  removeBeneficiary: (id: string) => Result;
  updateLimits: (daily: number, perOp: number) => Result;
  changePassword: (current: string, next: string) => Result;
  changeContact: (kind: "email" | "phone", value: string) => Result;
  transfer: (input: TransferInput) => Result & { receipt?: import("@/lib/banca/model").Receipt };
  resolvePending: (id: string, approve: boolean) => Result & { receipt?: import("@/lib/banca/model").Receipt };
  requestProduct: (input: { product: string; amount: number; termMonths: number }) => Result;
  markNoticesRead: () => void;
};

function initialData(): BancaData {
  return {
    users: seedUsers(),
    sessionUserId: null,
    sessionExpiresAt: null,
    pendingUserId: null,
    screen: "landing",
    folioSeq: 1200,
  };
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

function mapUser(users: User[], id: string, fn: (user: User) => User) {
  return users.map((user) => (user.id === id ? fn(user) : user));
}

function accountTaken(users: User[], number: string) {
  return users.some((user) => user.accounts.some((account) => account.number === number));
}

function makeAccountNumber(seq: number, users: User[]) {
  let n = 80000000000 + seq;
  let value = String(n);
  while (accountTaken(users, value)) {
    n += 1;
    value = String(n);
  }
  return value;
}

export const useBanca = create<BancaState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      boot: () => {
        const { sessionExpiresAt, sessionUserId, screen } = get();
        if (sessionUserId && sessionExpiresAt && sessionExpiresAt <= Date.now()) {
          get().endSession("inactividad");
          return;
        }
        if (!sessionUserId && PRIVATE_SCREENS.includes(screen)) {
          set({ screen: "landing" });
        }
      },

      go: (screen) => {
        const session = get().sessionUserId;
        if (!session && PRIVATE_SCREENS.includes(screen)) return;
        if (session) get().touch();
        set({ screen });
      },

      touch: () => {
        if (!get().sessionUserId) return;
        set({ sessionExpiresAt: Date.now() + SESSION_MS });
      },

      continueClient: (clientNumber) => {
        const clean = clientNumber.replace(/\s/g, "");
        if (!/^\d{6,12}$/.test(clean)) {
          return { ok: false, error: "El identificador de usuario debe tener entre 6 y 12 dígitos." };
        }
        const user = get().users.find((item) => item.clientNumber === clean);
        if (!user) {
          return {
            ok: false,
            error: "Los datos no corresponden a un cliente con Banca Web contratada. Verifique su número o regístrese.",
          };
        }
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
          const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
          return {
            ok: false,
            error: `Acceso bloqueado por intentos fallidos. Podrá intentar de nuevo en ${mins} min. Se notificó al medio registrado.`,
          };
        }
        set({ pendingUserId: user.id, screen: "login" });
        return { ok: true };
      },

      login: (password) => {
        const pendingId = get().pendingUserId;
        const user = get().users.find((item) => item.id === pendingId);
        if (!user) return { ok: false, error: "Vuelva a capturar su número de cliente." };
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
          return { ok: false, error: "El acceso sigue bloqueado temporalmente." };
        }
        if (password !== user.password) {
          const attempts = user.failedAttempts + 1;
          const lock = attempts >= MAX_ATTEMPTS;
          const folio = `BT-${get().folioSeq + 1}`;
          set({
            folioSeq: get().folioSeq + 1,
            users: mapUser(get().users, user.id, (current) => ({
              ...current,
              failedAttempts: lock ? 0 : attempts,
              lockedUntil: lock ? Date.now() + LOCK_MS : current.lockedUntil,
              audit: [
                {
                  id: uid("aud"),
                  at: new Date().toISOString(),
                  event: lock ? "Bloqueo temporal" : "Intento de acceso fallido",
                  detail: lock
                    ? `Tres autenticaciones incorrectas. Factor categoría 2 bloqueado 10 minutos.`
                    : `Contraseña incorrecta. Intento ${attempts} de ${MAX_ATTEMPTS}.`,
                  folio,
                },
                ...current.audit,
              ],
              notices: lock
                ? [
                    {
                      id: uid("nt"),
                      at: new Date().toISOString(),
                      channel: "SMS" as const,
                      title: "Acceso bloqueado",
                      body: "Se bloqueó temporalmente Banca Web por intentos fallidos. Si no fue usted, comuníquese al 477 461 4700.",
                      read: false,
                    },
                    ...current.notices,
                  ]
                : current.notices,
            })),
          });
          return {
            ok: false,
            error: lock
              ? "Por su seguridad el acceso quedó bloqueado 10 minutos."
              : `Contraseña incorrecta. Le quedan ${MAX_ATTEMPTS - attempts} intento(s).`,
          };
        }

        const nowIso = new Date().toISOString();
        const folio = `BT-${get().folioSeq + 1}`;
        set({
          folioSeq: get().folioSeq + 1,
          pendingUserId: null,
          sessionUserId: user.id,
          sessionExpiresAt: Date.now() + SESSION_MS,
          screen: "dashboard",
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            failedAttempts: 0,
            lockedUntil: null,
            previousLogin: current.currentLogin ?? current.previousLogin,
            currentLogin: nowIso,
            audit: [
              {
                id: uid("aud"),
                at: nowIso,
                event: "Inicio de sesión",
                detail: "Acceso correcto a Banca Web. Se validó identificador de usuario y factor de autenticación categoría 2.",
                folio,
              },
              ...current.audit,
            ],
            notices: [
              {
                id: uid("nt"),
                at: nowIso,
                channel: "SMS",
                title: "Inicio de sesión",
                body: "Detectamos un acceso a Banca Web Mifos. Si no fue usted, cierre la sesión y comuníquese al 477 461 4700.",
                read: false,
              },
              ...current.notices,
            ],
          })),
        });
        return { ok: true };
      },

      endSession: (reason) => {
        const id = get().sessionUserId;
        const folio = `BT-${get().folioSeq + 1}`;
        set({
          folioSeq: get().folioSeq + 1,
          sessionUserId: null,
          sessionExpiresAt: null,
          pendingUserId: null,
          screen: "landing",
          users: id
            ? mapUser(get().users, id, (current) => ({
                ...current,
                audit: [
                  {
                    id: uid("aud"),
                    at: new Date().toISOString(),
                    event: reason === "inactividad" ? "Cierre por inactividad" : "Cierre de sesión",
                    detail:
                      reason === "inactividad"
                        ? "La sesión se terminó de forma automática al cumplir 5 minutos sin actividad."
                        : "El usuario cerró la sesión de Banca Web.",
                    folio,
                  },
                  ...current.audit,
                ],
              }))
            : get().users,
        });
      },

      enroll: (draft) => {
        const clean = draft.clientNumber.replace(/\s/g, "");
        if (get().users.some((user) => user.clientNumber === clean)) {
          return { ok: false, error: "Ese número de cliente ya tiene Banca Web contratada." };
        }
        const seq = get().folioSeq + 1;
        const number = makeAccountNumber(seq, get().users);
        const nowIso = new Date().toISOString();
        const persona = draft.segment === "personas";
        const user: User = {
          id: uid("u"),
          segment: draft.segment,
          clientNumber: clean,
          password: draft.password,
          displayName: draft.displayName.trim(),
          loginHint: persona
            ? draft.displayName
                .trim()
                .split(/\s+/)
                .map((word) => word.charAt(0).toUpperCase() + "*".repeat(Math.max(word.length - 1, 2)))
                .join(" ")
            : draft.displayName.trim(),
          email: draft.email.trim(),
          phone: draft.phone.replace(/\D/g, ""),
          extraId: draft.extraId.trim().toUpperCase(),
          roleLabel: persona ? "Titular" : "Representante legal",
          previousLogin: nowIso,
          currentLogin: null,
          failedAttempts: 0,
          lockedUntil: null,
          dailyLimit: persona ? 20_000 : 200_000,
          perOpLimit: persona ? 10_000 : 50_000,
          dailyUsed: 0,
          dailyStamp: mexicoDay(),
          accounts: [
            {
              id: uid("acc"),
              alias: persona ? "Ahorro a la vista" : "Cuenta eje",
              number,
              product: persona ? "Cuenta de ahorro a la vista" : "Cuenta empresarial",
              balance: 0,
            },
          ],
          beneficiaries: [],
          movements: [],
          audit: [
            {
              id: uid("aud"),
              at: nowIso,
              event: "Contratación del canal",
              detail: "El cliente aceptó los términos de Banca Web y activó el servicio con el código enviado a su correo.",
              folio: `BT-${seq}`,
            },
          ],
          notices: [
            {
              id: uid("nt"),
              at: nowIso,
              channel: "Correo",
              title: "Banca Web activada",
              body: "Su servicio quedó activo. Las operaciones monetarias pedirán la clave dinámica de su banca móvil.",
              read: false,
            },
          ],
          pending: [],
          requests: [],
          signerName: persona ? null : "Facultado autorizador por registrar en sucursal",
        };
        set({
          users: [...get().users, user],
          folioSeq: seq,
          pendingUserId: user.id,
          screen: "login",
        });
        return { ok: true };
      },

      resetDemo: () => {
        set({ ...initialData() });
      },

      addBeneficiary: ({ name, account, alias, limit }) => {
        const id = get().sessionUserId;
        const user = get().users.find((item) => item.id === id);
        if (!user) return { ok: false, error: "Sesión no válida." };
        const clean = account.replace(/\s/g, "");
        if (!/^\d{11}$/.test(clean)) {
          return { ok: false, error: "Capture la cuenta Mifos de 11 dígitos. SPEI a otros bancos no está habilitado en este prototipo." };
        }
        if (user.accounts.some((item) => item.number === clean)) {
          return { ok: false, error: "Esa cuenta es propia. Transfiérala desde Cuentas propias, sin darla de alta." };
        }
        if (user.beneficiaries.some((item) => item.account === clean)) {
          return { ok: false, error: "Ese beneficiario ya está registrado." };
        }
        if (!name.trim()) return { ok: false, error: "Indique el nombre del beneficiario." };
        const cap = user.perOpLimit;
        const safeLimit = roundMoney(Math.min(Math.max(limit, 1), cap));
        const folio = `BT-${get().folioSeq + 1}`;
        const activatesAt = Date.now() + ACTIVATION_MS;
        set({
          folioSeq: get().folioSeq + 1,
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            beneficiaries: [
              ...current.beneficiaries,
              {
                id: uid("ben"),
                name: name.trim(),
                account: clean,
                alias: alias.trim() || name.trim(),
                limit: safeLimit,
                activatesAt,
              },
            ],
            audit: [
              {
                id: uid("aud"),
                at: new Date().toISOString(),
                event: "Alta de beneficiario",
                detail: `${name.trim()} · ${clean}. Periodo de activación iniciado. Clave dinámica validada.`,
                folio,
              },
              ...current.audit,
            ],
          })),
        });
        get().touch();
        return { ok: true };
      },

      removeBeneficiary: (beneficiaryId) => {
        const id = get().sessionUserId;
        const user = get().users.find((item) => item.id === id);
        if (!user) return { ok: false, error: "Sesión no válida." };
        const target = user.beneficiaries.find((item) => item.id === beneficiaryId);
        if (!target) return { ok: false, error: "Beneficiario no encontrado." };
        const folio = `BT-${get().folioSeq + 1}`;
        set({
          folioSeq: get().folioSeq + 1,
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            beneficiaries: current.beneficiaries.filter((item) => item.id !== beneficiaryId),
            audit: [
              {
                id: uid("aud"),
                at: new Date().toISOString(),
                event: "Baja de beneficiario",
                detail: `${target.name} · ${target.account}. Clave dinámica validada.`,
                folio,
              },
              ...current.audit,
            ],
          })),
        });
        get().touch();
        return { ok: true };
      },

      updateLimits: (daily, perOp) => {
        const id = get().sessionUserId;
        const user = get().users.find((item) => item.id === id);
        if (!user) return { ok: false, error: "Sesión no válida." };
        const cap = capFor(user.segment);
        const nextDaily = roundMoney(daily);
        const nextOp = roundMoney(perOp);
        if (nextDaily < 100 || nextOp < 100) return { ok: false, error: "El límite mínimo es de $100.00." };
        if (nextDaily > cap) {
          return { ok: false, error: `El límite diario institucional de su perfil es ${cap.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}.` };
        }
        if (nextOp > nextDaily) return { ok: false, error: "El límite por operación no puede exceder el límite diario." };
        const folio = `BT-${get().folioSeq + 1}`;
        set({
          folioSeq: get().folioSeq + 1,
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            dailyLimit: nextDaily,
            perOpLimit: nextOp,
            beneficiaries: current.beneficiaries.map((item) => ({
              ...item,
              limit: Math.min(item.limit, nextOp),
            })),
            audit: [
              {
                id: uid("aud"),
                at: new Date().toISOString(),
                event: "Cambio de límites",
                detail: `Diario ${nextDaily.toFixed(2)} · por operación ${nextOp.toFixed(2)}.`,
                folio,
              },
              ...current.audit,
            ],
            notices: [
              {
                id: uid("nt"),
                at: new Date().toISOString(),
                channel: "Correo" as const,
                title: "Límites actualizados",
                body: "Se modificaron los límites de Banca Web. Si usted no lo solicitó, comuníquese de inmediato.",
                read: false,
              },
              ...current.notices,
            ],
          })),
        });
        get().touch();
        return { ok: true };
      },

      changePassword: (currentPassword, next) => {
        const id = get().sessionUserId;
        const user = get().users.find((item) => item.id === id);
        if (!user) return { ok: false, error: "Sesión no válida." };
        if (currentPassword !== user.password) return { ok: false, error: "La contraseña actual no coincide." };
        if (next === user.password) return { ok: false, error: "La nueva contraseña debe ser distinta." };
        const folio = `BT-${get().folioSeq + 1}`;
        set({
          folioSeq: get().folioSeq + 1,
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            password: next,
            audit: [
              {
                id: uid("aud"),
                at: new Date().toISOString(),
                event: "Cambio de contraseña",
                detail: "Se actualizó el factor de autenticación categoría 2, con confirmación de clave dinámica.",
                folio,
              },
              ...current.audit,
            ],
            notices: [
              {
                id: uid("nt"),
                at: new Date().toISOString(),
                channel: "Correo" as const,
                title: "Contraseña modificada",
                body: "Su contraseña de Banca Web cambió. Si usted no lo hizo, llame al 477 461 4700.",
                read: false,
              },
              ...current.notices,
            ],
          })),
        });
        get().touch();
        return { ok: true };
      },

      changeContact: (kind, value) => {
        const id = get().sessionUserId;
        const user = get().users.find((item) => item.id === id);
        if (!user) return { ok: false, error: "Sesión no válida." };
        const folio = `BT-${get().folioSeq + 1}`;
        const email = value.trim();
        const phone = value.replace(/\D/g, "");
        if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return { ok: false, error: "Capture un correo válido." };
        }
        if (kind === "phone" && !/^\d{10}$/.test(phone)) {
          return { ok: false, error: "El celular debe tener 10 dígitos." };
        }
        set({
          folioSeq: get().folioSeq + 1,
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            email: kind === "email" ? email : current.email,
            phone: kind === "phone" ? phone : current.phone,
            audit: [
              {
                id: uid("aud"),
                at: new Date().toISOString(),
                event: kind === "email" ? "Cambio de correo" : "Cambio de teléfono",
                detail: "Medio de notificación actualizado con clave dinámica.",
                folio,
              },
              ...current.audit,
            ],
            notices: [
              {
                id: uid("nt"),
                at: new Date().toISOString(),
                channel: kind === "email" ? ("Correo" as const) : ("SMS" as const),
                title: "Medio de contacto actualizado",
                body: "Los avisos de operaciones se enviarán al nuevo medio registrado.",
                read: false,
              },
              ...current.notices,
            ],
          })),
        });
        get().touch();
        return { ok: true };
      },

      transfer: (input) => {
        const id = get().sessionUserId;
        const user = get().users.find((item) => item.id === id);
        if (!user) return { ok: false, error: "Sesión no válida." };
        const amount = roundMoney(input.amount);
        const concept = input.concept.trim();
        const reference = input.reference.trim();
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Capture un monto mayor a cero." };
        if (!/^\d{1,7}$/.test(reference)) return { ok: false, error: "La referencia debe ser numérica, de 1 a 7 dígitos." };
        if (concept.length < 3 || concept.length > 40) return { ok: false, error: "El concepto debe tener entre 3 y 40 caracteres." };
        const origin = user.accounts.find((account) => account.id === input.fromAccountId);
        if (!origin) return { ok: false, error: "Seleccione la cuenta origen." };
        if (origin.number === input.beneficiaryAccount) {
          return { ok: false, error: "La cuenta destino debe ser distinta de la origen." };
        }
        if (!input.own) {
          const saved = user.beneficiaries.find((item) => item.account === input.beneficiaryAccount);
          if (!saved || !isBeneficiaryActive(saved)) {
            return { ok: false, error: "El beneficiario no está activo. Debe concluir el periodo de activación." };
          }
          if (amount > saved.limit) {
            return { ok: false, error: "El monto supera el límite registrado para ese beneficiario." };
          }
        }
        if (amount > origin.balance) return { ok: false, error: "Saldo insuficiente en la cuenta origen." };
        const used = dailyUsedNow(user);
        if (amount > user.perOpLimit) {
          return { ok: false, error: "El monto supera su límite por operación. Puede ajustarlo en Ajustes." };
        }
        if (used + amount > user.dailyLimit) {
          return { ok: false, error: "El monto supera el límite diario disponible." };
        }
        const needsSecond =
          user.segment === "empresas" && !input.own && amount > SECOND_SIGN_AT;
        const folioNum = get().folioSeq + 1;
        const folio = needsSecond ? `BW-${folioNum}` : String(960000 + (folioNum % 1000)).padStart(6, "0");
        const nowIso = new Date().toISOString();
        const day = mexicoDay();
        const baseUsed = user.dailyStamp === day ? user.dailyUsed : 0;

        if (needsSecond) {
          set({
            folioSeq: folioNum,
            users: mapUser(get().users, user.id, (current) => ({
              ...current,
              pending: [
                {
                  id: uid("pend"),
                  fromAccountId: origin.id,
                  beneficiaryName: input.beneficiaryName,
                  beneficiaryAccount: input.beneficiaryAccount,
                  amount,
                  concept: concept.toUpperCase(),
                  reference,
                  createdAt: nowIso,
                  status: "pendiente_segunda_firma",
                  folio,
                },
                ...current.pending,
              ],
              audit: [
                {
                  id: uid("aud"),
                  at: nowIso,
                  event: "Transferencia en espera de segunda firma",
                  detail: `${amount.toFixed(2)} a ${input.beneficiaryName}. Supera $50,000.00 y requiere al facultado autorizador.`,
                  folio: `BT-${folioNum}`,
                },
                ...current.audit,
              ],
              notices: [
                {
                  id: uid("nt"),
                  at: nowIso,
                  channel: "Correo" as const,
                  title: "Pendiente de autorización",
                  body: `Se capturó una transferencia por ${amount.toFixed(2)} pendiente de la clave del autorizador. Folio ${folio}.`,
                  read: false,
                },
                ...current.notices,
              ],
            })),
          });
          get().touch();
          return {
            ok: true,
            receipt: {
              kind: "pendiente",
              at: nowIso,
              amount,
              originMask: origin.number,
              beneficiary: input.beneficiaryName,
              destMask: input.beneficiaryAccount,
              concept: concept.toUpperCase(),
              reference,
              folio,
              commission: 0,
            },
          };
        }

        const nextOriginBalance = roundMoney(origin.balance - amount);
        const dest = input.own ? user.accounts.find((account) => account.number === input.beneficiaryAccount) : undefined;
        set({
          folioSeq: folioNum,
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            dailyStamp: day,
            dailyUsed: roundMoney(baseUsed + amount),
            accounts: current.accounts.map((account) => {
              if (account.id === origin.id) return { ...account, balance: nextOriginBalance };
              if (dest && account.id === dest.id) return { ...account, balance: roundMoney(account.balance + amount) };
              return account;
            }),
            movements: [
              {
                id: uid("mov"),
                accountId: origin.id,
                direction: "cargo" as const,
                concept: "Transferencia realizada",
                amount,
                balanceAfter: nextOriginBalance,
                folio,
                at: nowIso,
                reference,
                counterparty: input.beneficiaryName,
              },
              ...(dest
                ? [
                    {
                      id: uid("mov"),
                      accountId: dest.id,
                      direction: "abono" as const,
                      concept: "Transferencia recibida",
                      amount,
                      balanceAfter: roundMoney(dest.balance + amount),
                      folio,
                      at: nowIso,
                      reference,
                      counterparty: "Cuenta propia",
                    },
                  ]
                : []),
              ...current.movements,
            ],
            audit: [
              {
                id: uid("aud"),
                at: nowIso,
                event: "Transferencia aplicada",
                detail: `Cargo ${amount.toFixed(2)} de ${origin.number} a ${input.beneficiaryAccount}. Comisión 0.00. Clave dinámica validada.`,
                folio: `BT-${folioNum}`,
              },
              ...current.audit,
            ],
            notices: [
              {
                id: uid("nt"),
                at: nowIso,
                channel: "SMS" as const,
                title: "Transferencia enviada",
                body: `Mifos: cargo por ${amount.toFixed(2)}. Folio ${folio}. Comisión $0.00. Si no reconoce la operación, llame al 477 461 4700.`,
                read: false,
              },
              ...current.notices,
            ],
          })),
        });
        get().touch();
        return {
          ok: true,
          receipt: {
            kind: "aplicada",
            at: nowIso,
            amount,
            originMask: origin.number,
            beneficiary: input.beneficiaryName,
            destMask: input.beneficiaryAccount,
            concept: concept.toUpperCase(),
            reference,
            folio,
            commission: 0,
          },
        };
      },

      resolvePending: (pendingId, approve) => {
        const id = get().sessionUserId;
        const user = get().users.find((item) => item.id === id);
        if (!user) return { ok: false, error: "Sesión no válida." };
        const item = user.pending.find((row) => row.id === pendingId && row.status === "pendiente_segunda_firma");
        if (!item) return { ok: false, error: "La operación ya no está pendiente." };
        const origin = user.accounts.find((account) => account.id === item.fromAccountId);
        if (!origin) return { ok: false, error: "La cuenta origen ya no existe." };
        const nowIso = new Date().toISOString();
        const folioNum = get().folioSeq + 1;

        if (!approve) {
          set({
            folioSeq: folioNum,
            users: mapUser(get().users, user.id, (current) => ({
              ...current,
              pending: current.pending.map((row) =>
                row.id === pendingId ? { ...row, status: "rechazada" as const } : row,
              ),
              audit: [
                {
                  id: uid("aud"),
                  at: nowIso,
                  event: "Transferencia rechazada",
                  detail: `El facultado autorizador rechazó el folio ${item.folio}.`,
                  folio: `BT-${folioNum}`,
                },
                ...current.audit,
              ],
            })),
          });
          get().touch();
          return { ok: true };
        }

        if (item.amount > origin.balance) return { ok: false, error: "Saldo insuficiente para autorizar." };
        const used = dailyUsedNow(user);
        if (used + item.amount > user.dailyLimit) return { ok: false, error: "Supera el límite diario disponible." };
        const day = mexicoDay();
        const baseUsed = user.dailyStamp === day ? user.dailyUsed : 0;
        const nextBalance = roundMoney(origin.balance - item.amount);
        const opFolio = String(960000 + (folioNum % 1000)).padStart(6, "0");
        set({
          folioSeq: folioNum,
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            dailyStamp: day,
            dailyUsed: roundMoney(baseUsed + item.amount),
            accounts: current.accounts.map((account) =>
              account.id === origin.id ? { ...account, balance: nextBalance } : account,
            ),
            pending: current.pending.filter((row) => row.id !== pendingId),
            movements: [
              {
                id: uid("mov"),
                accountId: origin.id,
                direction: "cargo" as const,
                concept: "Transferencia realizada",
                amount: item.amount,
                balanceAfter: nextBalance,
                folio: opFolio,
                at: nowIso,
                reference: item.reference,
                counterparty: item.beneficiaryName,
              },
              ...current.movements,
            ],
            audit: [
              {
                id: uid("aud"),
                at: nowIso,
                event: "Segunda firma aplicada",
                detail: `Se autorizó ${item.folio} con la clave dinámica del facultado autorizador. Folio de cargo ${opFolio}.`,
                folio: `BT-${folioNum}`,
              },
              ...current.audit,
            ],
            notices: [
              {
                id: uid("nt"),
                at: nowIso,
                channel: "Correo" as const,
                title: "Transferencia autorizada",
                body: `Se aplicó el cargo por ${item.amount.toFixed(2)} a ${item.beneficiaryName}. Folio ${opFolio}.`,
                read: false,
              },
              ...current.notices,
            ],
          })),
        });
        get().touch();
        return {
          ok: true,
          receipt: {
            kind: "aplicada",
            at: nowIso,
            amount: item.amount,
            originMask: origin.number,
            beneficiary: item.beneficiaryName,
            destMask: item.beneficiaryAccount,
            concept: item.concept,
            reference: item.reference,
            folio: opFolio,
            commission: 0,
          },
        };
      },

      requestProduct: ({ product, amount, termMonths }) => {
        const id = get().sessionUserId;
        const user = get().users.find((item) => item.id === id);
        if (!user) return { ok: false, error: "Sesión no válida." };
        if (!product) return { ok: false, error: "Seleccione un producto." };
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Indique un monto." };
        const folioNum = get().folioSeq + 1;
        const folio = `SL-${folioNum}`;
        const nowIso = new Date().toISOString();
        set({
          folioSeq: folioNum,
          users: mapUser(get().users, user.id, (current) => ({
            ...current,
            requests: [
              {
                id: uid("sol"),
                at: nowIso,
                product,
                amount: roundMoney(amount),
                termMonths,
                folio,
                status: "recibida",
              },
              ...current.requests,
            ],
            audit: [
              {
                id: uid("aud"),
                at: nowIso,
                event: "Solicitud de producto",
                detail: `${product}. No constituye contrato ni aprobación de crédito.`,
                folio: `BT-${folioNum}`,
              },
              ...current.audit,
            ],
          })),
        });
        get().touch();
        return { ok: true };
      },

      markNoticesRead: () => {
        const id = get().sessionUserId;
        if (!id) return;
        set({
          users: mapUser(get().users, id, (current) => ({
            ...current,
            notices: current.notices.map((notice) => ({ ...notice, read: true })),
          })),
        });
      },
    }),
    {
      name: "avantthya-banca-web",
      version: 1,
      skipHydration: true,
      partialize: (state) => ({
        users: state.users,
        sessionUserId: state.sessionUserId,
        sessionExpiresAt: state.sessionExpiresAt,
        pendingUserId: state.pendingUserId,
        screen: state.screen,
        folioSeq: state.folioSeq,
      }),
    },
  ),
);

export function useSessionUser() {
  return useBanca((state) => state.users.find((user) => user.id === state.sessionUserId) ?? null);
}

export function usePendingUser() {
  return useBanca((state) => state.users.find((user) => user.id === state.pendingUserId) ?? null);
}
