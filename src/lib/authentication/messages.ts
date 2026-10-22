import type { AuthenticationFailure } from "./client";

export const authenticationMessages: Record<AuthenticationFailure, string> = {
  invalidCredentials: "Usuario o contraseña incorrectos.",
  pending:
    "No se completó el acceso. Tu cuenta puede estar pendiente de confirmación o deshabilitada. Contacta a tu institución.",
  additional:
    "Tu institución requiere autenticación adicional. Continúa por sus canales oficiales; este acceso aún no admite ese paso.",
  passwordRenewal:
    "Debes renovar tu contraseña por los canales oficiales de tu institución antes de continuar.",
  expired: "Tu sesión ha expirado. Inicia sesión de nuevo.",
  network: "No pudimos conectar con tu institución. Inténtalo de nuevo.",
  server: "El servicio de acceso no está disponible. Inténtalo más tarde.",
  timeout: "Se agotó el tiempo de espera. Inténtalo de nuevo.",
  configuration: "El acceso a clientes no está configurado. La demostración sigue disponible.",
  malformed: "No pudimos verificar la respuesta de acceso. Contacta a tu institución.",
  denied: "Tu institución no autorizó el acceso. Contacta a tu institución.",
  cancelled: "Se canceló el acceso. Inténtalo de nuevo.",
};
