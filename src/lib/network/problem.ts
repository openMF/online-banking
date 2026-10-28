/**
 * What went wrong with a request, in the words a person needs. One classification and one set of
 * messages for the whole app, so a 503 reads the same on every screen and the text of the server
 * (which can hold anything) is never shown.
 */

export type ProblemKind =
  /** The device has no connection. */
  | "offline"
  /** The server did not answer in time. */
  | "timeout"
  /** The server could not be reached for another reason. */
  | "network"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  /** The server refused what was sent (400, 422). */
  | "invalid"
  | "conflict"
  | "rateLimited"
  /** 502, 503, 504: the service is down or restarting. Worth another try later. */
  | "unavailable"
  /** Any other 5xx: a fault on the institution side. */
  | "server"
  | "unknown";

/** The kind of problem an HTTP status stands for. */
export function problemOfStatus(status: number): ProblemKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 400 || status === 422) return "invalid";
  if (status === 408) return "timeout";
  if (status === 409) return "conflict";
  if (status === 429) return "rateLimited";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  if (status >= 500) return "server";
  return "unknown";
}

/** Spanish source strings: they are the keys of the translation catalogs (see `src/i18n`). */
export const PROBLEM_MESSAGES: Record<ProblemKind, string> = {
  offline: "Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Inténtalo de nuevo.",
  network: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  unauthorized: "Tu sesión terminó. Inicia sesión de nuevo.",
  forbidden: "Tu institución no permite esta operación.",
  notFound: "No encontramos lo que buscas.",
  invalid: "Revisa los datos e inténtalo de nuevo.",
  conflict: "Esto ya cambió. Actualiza la pantalla e inténtalo de nuevo.",
  rateLimited: "Hay demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  unavailable: "El servicio no está disponible por ahora. Inténtalo en unos minutos.",
  server: "Algo salió mal de nuestro lado. Inténtalo más tarde.",
  unknown: "No pudimos completar la operación. Inténtalo más tarde.",
};

/** Problems where trying again, as is, can work. Not 4xx: the same request would be refused again. */
export const RETRYABLE_PROBLEMS: ReadonlySet<ProblemKind> = new Set<ProblemKind>([
  "offline",
  "timeout",
  "network",
  "rateLimited",
  "unavailable",
  "server",
]);
