import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { positiveId, record } from "../savings/client";
import { dateFrom, parseLoan } from "./client";

export type ChargeFailure =
  "expired" | "denied" | "missing" | "malformed" | "unavailable" | "cancelled";
export class ChargeError extends Error {
  constructor(readonly code: ChargeFailure) {
    super(code);
    this.name = "ChargeError";
  }
}
export type ChargeStatus = "paid" | "unpaid" | "partial" | "waived" | "unknown";
/** Validated subset of Fineract LoanChargeData; omitted JSON fields stay absent. */
interface ChargeDto {
  id: number;
  name: string;
  amount?: number;
  amountPaid?: number;
  amountWaived?: number;
  amountWrittenOff?: number;
  amountOutstanding?: number;
  paid?: boolean;
  waived?: boolean;
}
export interface LoanCharge {
  id: number;
  name: string;
  status: ChargeStatus;
  amount?: number;
  paidAmount?: number;
  waivedAmount?: number;
  writtenOffAmount?: number;
  outstanding?: number;
  currency?: string;
  dueDate?: string;
}
const malformed = (): never => {
  throw new ChargeError("malformed");
};
function amount(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value >= Number.MAX_SAFE_INTEGER
  )
    return malformed();
  // Avoid formatting a tiny decimal as zero with the display precision below.
  if (value > 0 && value < 1e-20) return malformed();
  return value;
}
function flag(value: unknown): boolean | undefined {
  if (value == null) return undefined;
  return typeof value === "boolean" ? value : malformed();
}
function status(c: ChargeDto): ChargeStatus {
  if (c.paid == null || c.waived == null || (c.paid && c.waived)) return "unknown";
  if (
    c.amount != null &&
    [c.amountPaid, c.amountWaived, c.amountWrittenOff, c.amountOutstanding].some(
      (value) => value != null && value > c.amount!,
    )
  )
    return "unknown";
  if (c.paid)
    return (c.amountOutstanding ?? 0) > 0 ||
      (c.amountWaived ?? 0) > 0 ||
      (c.amountWrittenOff ?? 0) > 0 ||
      (c.amount != null && c.amountPaid != null && c.amount !== c.amountPaid)
      ? "unknown"
      : "paid";
  if (c.waived) return (c.amountOutstanding ?? 0) > 0 ? "unknown" : "waived";
  // Zero balance can mean write-off or adjustment. It never proves payment.
  if (c.amountOutstanding === 0) return "unknown";
  if (c.amountPaid != null && c.amountPaid > 0)
    return c.amountOutstanding != null && c.amountOutstanding > 0 ? "partial" : "unknown";
  return "unpaid";
}
export function parseLoanCharges(data: unknown): LoanCharge[] {
  if (!Array.isArray(data)) return malformed();
  const seen = new Set<number>();
  return data.map((item) => {
    if (
      !record(item) ||
      !positiveId(item.id) ||
      seen.has(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 500
    )
      return malformed();
    seen.add(item.id);
    const dto: ChargeDto = {
      id: item.id,
      name: item.name.trim(),
      amount: amount(item.amount),
      amountPaid: amount(item.amountPaid),
      amountWaived: amount(item.amountWaived),
      amountWrittenOff: amount(item.amountWrittenOff),
      amountOutstanding: amount(item.amountOutstanding),
      paid: flag(item.paid),
      waived: flag(item.waived),
    };
    let currency: string | undefined;
    if (item.currency != null) {
      if (!record(item.currency)) return malformed();
      if (item.currency.code != null) {
        if (typeof item.currency.code !== "string" || !/^[A-Z]{3}$/.test(item.currency.code))
          return malformed();
        currency = item.currency.code;
      }
      if (
        item.currency.decimalPlaces != null &&
        (typeof item.currency.decimalPlaces !== "number" ||
          !Number.isInteger(item.currency.decimalPlaces) ||
          item.currency.decimalPlaces < 0 ||
          item.currency.decimalPlaces > 20)
      )
        return malformed();
    }
    let dueDate: string | undefined;
    try {
      dueDate = dateFrom(item.dueDate) || undefined;
    } catch {
      return malformed();
    }
    return {
      id: dto.id,
      name: dto.name,
      status: status(dto),
      amount: dto.amount,
      paidAmount: dto.amountPaid,
      waivedAmount: dto.amountWaived,
      writtenOffAmount: dto.amountWrittenOff,
      outstanding: dto.amountOutstanding,
      currency,
      dueDate,
    };
  });
}
export function createLoanChargesClient(session: CustomerSession) {
  async function read(path: string, signal?: AbortSignal) {
    try {
      if (signal?.aborted) throw new ChargeError("cancelled");
      const response = await session.request(path, { method: "GET", signal });
      if (signal?.aborted) throw new ChargeError("cancelled");
      if (response.status === 401) throw new ChargeError("expired");
      if (response.status === 403) throw new ChargeError("denied");
      if (response.status === 404) throw new ChargeError("missing");
      if (!response.ok) throw new ChargeError("unavailable");
      return response.data;
    } catch (e) {
      if (e instanceof ChargeError) throw e;
      if (e instanceof AuthenticationError && e.code === "expired")
        throw new ChargeError("expired");
      if (signal?.aborted || (e instanceof AuthenticationError && e.code === "cancelled"))
        throw new ChargeError("cancelled");
      throw new ChargeError("unavailable");
    }
  }
  return {
    async list(loanId: number, signal?: AbortSignal): Promise<LoanCharge[]> {
      if (!positiveId(loanId)) throw new ChargeError("denied");
      // Server enforces ownership on BOTH reads. Recheck the linked client on refresh too.
      const loan = await read(`loans/${loanId}`, signal);
      if (!record(loan) || !positiveId(loan.clientId)) throw new ChargeError("malformed");
      if (!session.identity.clients.includes(loan.clientId)) throw new ChargeError("denied");
      try {
        parseLoan(loan, session.identity.clients, loanId);
      } catch {
        throw new ChargeError("malformed");
      }
      // No fields projection: core's partial-response allowlist omits paid/waived/dueDate.
      return parseLoanCharges(await read(`loans/${loanId}/charges`, signal));
    },
  };
}
export type LoanChargesClient = ReturnType<typeof createLoanChargesClient>;
export const chargeStatusLabels: Record<ChargeStatus, string> = {
  paid: "Pagado",
  unpaid: "No pagado",
  partial: "Pagado parcialmente",
  waived: "Condonado",
  unknown: "Estado no disponible",
};
export const chargeMessages: Record<ChargeFailure, string> = {
  expired: "Tu sesión ha caducado. Inicia sesión de nuevo.",
  denied: "No tienes permiso para consultar los cargos de este préstamo.",
  missing: "No se encontró el préstamo solicitado.",
  malformed: "La respuesta de cargos no es válida. Vuelve a consultar.",
  unavailable: "No pudimos cargar los cargos. Inténtalo de nuevo.",
  cancelled: "La consulta de cargos fue cancelada. Vuelve a consultar.",
};
