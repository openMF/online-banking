import type { AccountsFailure } from "./client";
export const accountsMessages: Record<AccountsFailure, string> = {
  expired: "Tu sesión ha expirado. Inicia sesión de nuevo.",
  denied: "Tu institución no autorizó esta consulta. No se muestran datos protegidos.",
  unavailable: "No pudimos consultar tus cuentas de ahorro. Intenta la consulta de nuevo.",
  offline: "Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.",
  malformed: "No pudimos verificar la respuesta de tu institución.",
};
export const detailsMessages: Record<AccountsFailure, string> = {
  ...accountsMessages,
  unavailable: "No pudimos consultar esta cuenta. Intenta la consulta de nuevo.",
};
export const movementMessages: Record<AccountsFailure, string> = {
  ...accountsMessages,
  unavailable: "No pudimos consultar este movimiento. Intenta la consulta de nuevo.",
};
// The label of each SavingsAccountStatusType id. An id that is not here shows the server's label.
export const savingsStatusLabels: Record<number, string> = {
  100: "Pendiente de aprobación",
  200: "Aprobada",
  300: "Activa",
  303: "Transferencia en curso",
  304: "Transferencia en espera",
  400: "Retirada por el solicitante",
  500: "Rechazada",
  600: "Cerrada",
  700: "Cerrada anticipadamente",
  800: "Vencida",
};
