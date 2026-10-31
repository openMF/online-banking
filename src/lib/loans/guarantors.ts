import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { positiveId, record } from "../savings/client";
import { parseLoan } from "./client";

export type GuarantorFailure = "expired" | "denied" | "missing" | "malformed" | "unavailable";
export class GuarantorError extends Error {
  constructor(readonly code: GuarantorFailure) {
    super(code);
    this.name = "GuarantorError";
  }
}
export interface Guarantor {
  id: number;
  loanId: number;
  name?: string;
  typeId?: number;
  relationship?: string;
  active?: boolean;
}
function optionalText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string" || value.length > 500) throw new GuarantorError("malformed");
  return value.trim() || undefined;
}

/** Allowlist only workflow fields. Never retain contact, identity or funding data. */
export function parseGuarantors(data: unknown, loanId: number): Guarantor[] {
  if (!positiveId(loanId) || !Array.isArray(data)) throw new GuarantorError("malformed");
  const seen = new Set<number>();
  return data.map((item) => {
    if (!record(item) || !positiveId(item.id) || item.loanId !== loanId || seen.has(item.id))
      throw new GuarantorError("malformed");
    seen.add(item.id);
    if (
      item.guarantorType != null &&
      (!record(item.guarantorType) || !positiveId(item.guarantorType.id))
    )
      throw new GuarantorError("malformed");
    if (
      item.clientRelationshipType != null &&
      (!record(item.clientRelationshipType) || !positiveId(item.clientRelationshipType.id))
    )
      throw new GuarantorError("malformed");
    if (item.status != null && typeof item.status !== "boolean")
      throw new GuarantorError("malformed");
    const name = [optionalText(item.firstname), optionalText(item.lastname)]
      .filter(Boolean)
      .join(" ");
    return {
      id: item.id,
      loanId,
      name: name || undefined,
      typeId: record(item.guarantorType) ? Number(item.guarantorType.id) : undefined,
      relationship: record(item.clientRelationshipType)
        ? optionalText(item.clientRelationshipType.name)
        : undefined,
      active: typeof item.status === "boolean" ? item.status : undefined,
    };
  });
}

/** Details come from the authorized collection: the plugin has no individual GET. */
export function selectGuarantor(list: readonly Guarantor[], loanId: number, id: number): Guarantor {
  if (!positiveId(loanId) || !positiveId(id)) throw new GuarantorError("missing");
  const result = list.find((g) => g.id === id && g.loanId === loanId);
  if (!result) throw new GuarantorError("missing");
  return result;
}

export function createGuarantorClient(session: CustomerSession) {
  async function read(path: string, signal?: AbortSignal) {
    try {
      const response = await session.request(path, { method: "GET", signal });
      if (response.status === 401) throw new GuarantorError("expired");
      if (response.status === 403) throw new GuarantorError("denied");
      if (response.status === 404) throw new GuarantorError("missing");
      if (!response.ok) throw new GuarantorError("unavailable");
      return response.data;
    } catch (error) {
      if (error instanceof GuarantorError) throw error;
      if (error instanceof AuthenticationError && error.code === "expired")
        throw new GuarantorError("expired");
      throw new GuarantorError("unavailable");
    }
  }
  return {
    async list(loanId: number, signal?: AbortSignal): Promise<Guarantor[]> {
      if (!positiveId(loanId)) throw new GuarantorError("denied");
      // Revalidate with the server on every load/refresh. Browser loan IDs confer no access.
      const data = await read(`loans/${loanId}`, signal);
      if (
        !record(data) ||
        !positiveId(data.clientId) ||
        !session.identity.clients.includes(data.clientId)
      )
        throw new GuarantorError("denied");
      try {
        parseLoan(data, session.identity.clients, loanId);
      } catch {
        throw new GuarantorError("malformed");
      }
      if (signal?.aborted) throw new GuarantorError("unavailable");
      return parseGuarantors(await read(`loans/${loanId}/guarantors`, signal), loanId);
    },
  };
}
export type GuarantorClient = ReturnType<typeof createGuarantorClient>;

export const guarantorMessages: Record<GuarantorFailure, string> = {
  expired: "Tu sesión ha caducado. Inicia sesión de nuevo.",
  denied: "No tienes permiso para consultar los garantes de este préstamo.",
  missing: "No se encontró el préstamo o el garante solicitado.",
  malformed: "La respuesta de garantes no es válida. Vuelve a consultar.",
  unavailable: "No pudimos cargar los garantes. Inténtalo de nuevo.",
};
export function guarantorTypeLabel(id?: number): string {
  switch (id) {
    case 1:
      return "Cliente existente";
    case 2:
      return "Personal de la institución";
    case 3:
      return "Garante externo";
    case 4:
      return "Grupo existente";
    default:
      return "Tipo no disponible";
  }
}
