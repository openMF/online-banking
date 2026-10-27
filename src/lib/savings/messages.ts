import type { SavingsFailure } from "./client";
export const savingsMessages: Record<SavingsFailure, string> = {
  expired: "Tu sesión ha expirado. Inicia sesión de nuevo.",
  denied: "Tu institución no autorizó esta solicitud. No se muestran datos protegidos.",
  unavailable: "No pudimos consultar los productos o cuentas. Intenta la consulta de nuevo.",
  malformed: "No pudimos verificar la respuesta de tu institución.",
  invalid: "Revisa los campos indicados. Tu institución no aceptó la solicitud.",
  changed:
    "Las condiciones del producto cambiaron. Selecciona el producto de nuevo y revisa sus condiciones.",
  unsupported:
    "Este producto requiere información adicional. Solicítalo directamente con tu institución.",
  uncertain:
    "No pudimos confirmar el resultado. No vuelvas a enviar la solicitud. Consulta tus cuentas o contacta a tu institución antes de intentar otra solicitud.",
  locked:
    "Esta solicitud ya fue enviada o está en proceso. Consulta su resultado antes de continuar.",
};
