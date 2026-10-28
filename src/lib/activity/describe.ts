import { translateWith, type Locale } from "../../i18n";
import { ACTIVITY_TYPES, type ActivityItem, type ActivityType } from "../selfservice/activity";

/** The chips of the filter. Each one is a set of activity types, sent to the server as `type=`. */
export type ActivityGroup = "access" | "money" | "account" | "verification";

export const ACTIVITY_GROUPS: Record<ActivityGroup, readonly ActivityType[]> = {
  access: ["LOGIN", "LOGIN_FAILED", "LOGIN_NEW_DEVICE", "LOGOUT", "PASSWORD_RESET"],
  money: ["TRANSFER_CONFIRMED", "BENEFICIARY_ADDED", "BENEFICIARY_UPDATED", "BENEFICIARY_DELETED"],
  account: [
    "PASSWORD_CHANGED",
    "PROFILE_IMAGE_CHANGED",
    "PROFILE_IMAGE_REMOVED",
    "SINPE_SUBSCRIPTION_CHANGED",
    "AUTHENTICATOR_ENROLLED",
    "AUTHENTICATOR_REMOVED",
    "AUTHENTICATOR_RESET",
    "RECOVERY_CODES_REGENERATED",
  ],
  verification: [
    "STEP_UP_REQUESTED",
    "STEP_UP_VERIFIED",
    "STEP_UP_LOCKED",
    "AUTHENTICATOR_LOCKED",
    "RECOVERY_CODE_USED",
  ],
};

export function groupOf(type: ActivityType): ActivityGroup {
  const found = (Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).find((group) =>
    ACTIVITY_GROUPS[group].includes(type),
  );
  // Every type belongs to a group (checked by a test); this keeps an unknown future type visible.
  return found ?? "account";
}

export const KNOWN_TYPES: ReadonlySet<string> = new Set(ACTIVITY_TYPES);

/** The Spanish source strings are the translation catalog keys (see `src/i18n`). */
const ACTION_NAMES: Record<string, string> = {
  TPT_TRANSFER: "Transferencia a terceros",
  OWN_TRANSFER: "Transferencia entre cuentas",
  CONFIRM_TRANSFER: "Confirmación de transferencia",
  CHANGE_PASSWORD: "Cambio de contraseña",
  MANAGE_AUTHENTICATOR: "Cambio de la app de autenticación",
};

const PLAIN_TITLES: Partial<Record<ActivityType, string>> = {
  LOGIN: "Iniciaste sesión",
  LOGIN_FAILED: "Intento de acceso fallido",
  LOGIN_NEW_DEVICE: "Iniciaste sesión desde un dispositivo nuevo",
  LOGOUT: "Cerraste sesión",
  PASSWORD_CHANGED: "Cambiaste tu contraseña",
  PASSWORD_RESET: "Restableciste tu contraseña",
  PROFILE_IMAGE_CHANGED: "Cambiaste tu foto de perfil",
  PROFILE_IMAGE_REMOVED: "Quitaste tu foto de perfil",
  SINPE_SUBSCRIPTION_CHANGED: "Cambiaste tu suscripción SINPE Móvil",
  STEP_UP_REQUESTED: "Solicitaste un código de verificación",
  STEP_UP_VERIFIED: "Verificaste un código",
  STEP_UP_LOCKED: "Verificación bloqueada por demasiados intentos",
  AUTHENTICATOR_ENROLLED: "Vinculaste una app de autenticación",
  AUTHENTICATOR_REMOVED: "Quitaste tu app de autenticación",
  AUTHENTICATOR_RESET: "Tu institución quitó tu app de autenticación",
  AUTHENTICATOR_LOCKED: "App de autenticación bloqueada por demasiados intentos",
  RECOVERY_CODES_REGENERATED: "Generaste códigos de recuperación nuevos",
  RECOVERY_CODE_USED: "Usaste un código de recuperación",
};

const TRANSFER_TITLES = {
  full: "Transferencia confirmada de {amount} a {name}",
  amountOnly: "Transferencia confirmada de {amount}",
  plain: "Transferencia confirmada",
};
const TRANSFER_EXTRA = "Cuenta destino terminada en {last4}";
const STEP_UP_EXTRA = "Para: {action}";
const UNKNOWN_TITLE = "Actividad en tu cuenta";

/** `[with a name, without]` for the beneficiary types. */
const BENEFICIARY_TITLES: Partial<Record<ActivityType, [string, string]>> = {
  BENEFICIARY_ADDED: ["Agregaste al beneficiario {name}", "Agregaste un beneficiario"],
  BENEFICIARY_UPDATED: ["Actualizaste al beneficiario {name}", "Actualizaste un beneficiario"],
  BENEFICIARY_DELETED: ["Eliminaste al beneficiario {name}", "Eliminaste un beneficiario"],
};

/** An amount such as `1250.50` in the user's language; the currency only when the server knew it. */
export function formatActivityAmount(
  amount: string,
  currency: string | undefined,
  locale: Locale,
): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  try {
    return new Intl.NumberFormat(
      locale,
      currency && /^[A-Za-z]{3}$/.test(currency)
        ? { style: "currency", currency: currency.toUpperCase() }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    ).format(value);
  } catch {
    return amount;
  }
}

/** Every Spanish source text this file can produce: all of them must be in both catalogs. */
export const ACTIVITY_SOURCE_TEXTS: readonly string[] = [
  ...Object.values(PLAIN_TITLES),
  ...Object.values(BENEFICIARY_TITLES).flat(),
  ...Object.values(TRANSFER_TITLES),
  ...Object.values(ACTION_NAMES),
  TRANSFER_EXTRA,
  STEP_UP_EXTRA,
  UNKNOWN_TITLE,
];

export type ActivityDescription = {
  title: string;
  /** A second line (what the verification was for, the destination account), or `null`. */
  extra: string | null;
  /** `true` when the action did not go through or is worth a second look. */
  warning: boolean;
};

export function describeActivity(item: ActivityItem, locale: Locale): ActivityDescription {
  const { details } = item;
  let title = PLAIN_TITLES[item.type] ?? UNKNOWN_TITLE;
  let extra: string | null = null;

  if (item.type === "TRANSFER_CONFIRMED") {
    const destination = details.toName ?? details.name;
    if (details.amount && destination) {
      title = TRANSFER_TITLES.full;
    } else if (details.amount) {
      title = TRANSFER_TITLES.amountOnly;
    } else {
      title = TRANSFER_TITLES.plain;
    }
    if (details.toAccountLast4) extra = TRANSFER_EXTRA;
  }

  const beneficiary = BENEFICIARY_TITLES[item.type];
  if (beneficiary) title = details.name ? beneficiary[0] : beneficiary[1];

  if (item.type.startsWith("STEP_UP_") && details.action && ACTION_NAMES[details.action]) {
    extra = STEP_UP_EXTRA;
  }

  const values = {
    amount: details.amount ? formatActivityAmount(details.amount, details.currency, locale) : "",
    name: details.toName ?? details.name ?? "",
    last4: details.toAccountLast4 ?? "",
    action:
      details.action && ACTION_NAMES[details.action]
        ? translateWith(ACTION_NAMES[details.action], {}, locale)
        : "",
  };

  return {
    title: translateWith(title, values, locale),
    extra: extra ? translateWith(extra, values, locale) : null,
    warning:
      item.outcome === "FAILURE" ||
      item.type === "LOGIN_NEW_DEVICE" ||
      item.type === "STEP_UP_LOCKED" ||
      item.type === "AUTHENTICATOR_LOCKED" ||
      // done by someone else, or a way in that is meant for emergencies: worth a second look
      item.type === "AUTHENTICATOR_RESET" ||
      item.type === "RECOVERY_CODE_USED",
  };
}
