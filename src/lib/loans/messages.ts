import type { Failure } from "./client";
export const loanMessages: Record<Failure, string> = {
  expired: "Tu sesión terminó. Inicia sesión nuevamente.",
  denied: "No tienes acceso a esta solicitud de préstamo.",
  unavailable: "No pudimos consultar los préstamos. Intenta consultar nuevamente.",
  malformed: "La institución devolvió datos de préstamo incompletos o inválidos.",
  invalid: "Revisa los campos indicados y las condiciones del producto.",
  unsupported: "Este producto requiere condiciones adicionales. Solicítalo con tu institución.",
  changed:
    "El estado o las condiciones cambiaron. Consulta la solicitud y revisa los datos nuevamente.",
  uncertain:
    "No pudimos confirmar la operación. No la envíes de nuevo. Consulta las solicitudes o contacta a tu institución.",
  locked: "Esta operación está en curso o requiere verificar su resultado con tu institución.",
};
export function statusLabel(code: string, value: string) {
  if (code === "loanStatusType.submitted.and.pending.approval") return "Pendiente de aprobación";
  if (code === "loanStatusType.withdrawn.by.client") return "Retirada por el solicitante";
  return value;
}
