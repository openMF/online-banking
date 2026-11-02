import type { AccountsFailure } from "./client";
export const accountsMessages: Record<AccountsFailure, string> = {
  expired: "Tu sesión ha expirado. Inicia sesión de nuevo.",
  denied: "Tu institución no autorizó esta consulta. No se muestran datos protegidos.",
  unavailable: "No pudimos consultar tus cuentas de ahorro. Intenta la consulta de nuevo.",
  offline: "Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.",
  malformed: "No pudimos verificar la respuesta de tu institución.",
};
