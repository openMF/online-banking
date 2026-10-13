import { format, parseISO } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { t, getLocale } from "@/i18n";

export const SESSION_MS = 5 * 60 * 1000;
export const WARN_MS = 60 * 1000;
export const LOCK_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 3;
export const ACTIVATION_MS = 30 * 1000;
export const REAL_ACTIVATION_LABEL = "30 minutos";
export const SECOND_SIGN_AT = 50_000;
export const PERSONA_DAILY_CAP = 80_000;
export const EMPRESA_DAILY_CAP = 1_000_000;
export const DEMO_PASSWORD = "Mifos#26";

export type Segment = "personas" | "empresas";

export type Screen =
  | "landing"
  | "login"
  | "register"
  | "dashboard"
  | "transfer"
  | "movements"
  | "request"
  | "settings"
  | "audit"
  | "notices"
  | "about"
  | "help"
  | "approvals";

export const PRIVATE_SCREENS: Screen[] = [
  "dashboard",
  "transfer",
  "movements",
  "request",
  "settings",
  "audit",
  "notices",
  "about",
  "help",
  "approvals",
];

export type Account = {
  id: string;
  alias: string;
  number: string;
  product: string;
  balance: number;
};

export type Beneficiary = {
  id: string;
  name: string;
  account: string;
  alias: string;
  limit: number;
  activatesAt: number;
};

export type Movement = {
  id: string;
  accountId: string;
  direction: "cargo" | "abono";
  concept: string;
  amount: number;
  balanceAfter: number;
  folio: string;
  at: string;
  reference?: string;
  counterparty?: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  event: string;
  detail: string;
  folio: string;
};

export type Notice = {
  id: string;
  at: string;
  channel: "SMS" | "Correo";
  title: string;
  body: string;
  read: boolean;
};

export type PendingTransfer = {
  id: string;
  fromAccountId: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  amount: number;
  concept: string;
  reference: string;
  createdAt: string;
  status: "pendiente_segunda_firma" | "rechazada";
  folio: string;
};

export type ServiceRequest = {
  id: string;
  at: string;
  product: string;
  amount: number;
  termMonths: number;
  folio: string;
  status: "recibida";
};

export type User = {
  id: string;
  segment: Segment;
  clientNumber: string;
  password: string;
  displayName: string;
  loginHint: string;
  email: string;
  phone: string;
  extraId: string;
  roleLabel: string;
  previousLogin: string;
  currentLogin: string | null;
  failedAttempts: number;
  lockedUntil: number | null;
  dailyLimit: number;
  perOpLimit: number;
  dailyUsed: number;
  dailyStamp: string;
  accounts: Account[];
  beneficiaries: Beneficiary[];
  movements: Movement[];
  audit: AuditEvent[];
  notices: Notice[];
  pending: PendingTransfer[];
  requests: ServiceRequest[];
  signerName: string | null;
};

export type Receipt = {
  kind: "aplicada" | "pendiente";
  at: string;
  amount: number;
  originMask: string;
  beneficiary: string;
  destMask: string;
  concept: string;
  reference: string;
  folio: string;
  commission: number;
};

export type EnrollDraft = {
  segment: Segment;
  clientNumber: string;
  password: string;
  displayName: string;
  email: string;
  phone: string;
  extraId: string;
};

export function mexicoDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);
}

export function formatWhen(iso: string) {
  const locale = getLocale() === "en-US" ? enUS : es;
  return format(parseISO(iso), "d MMM yyyy, h:mm a", { locale });
}

export function maskAccount(number: string) {
  const last = number.slice(-4);
  return `${"•".repeat(Math.max(number.length - 4, 4))}${last}`;
}

export function maskPersonName(full: string) {
  return full
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + "*".repeat(Math.max(word.length - 1, 2)))
    .join(" ");
}

export function dailyUsedNow(user: User, now = new Date()) {
  return user.dailyStamp === mexicoDay(now) ? user.dailyUsed : 0;
}

export function capFor(segment: Segment) {
  return segment === "empresas" ? EMPRESA_DAILY_CAP : PERSONA_DAILY_CAP;
}

export function otpAt(offsetSteps = 0, now = Date.now()) {
  const step = Math.floor(now / 30000) + offsetSteps;
  let h = 2166136261;
  const s = `MIFOS-TOKEN-v1:${step}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String((h >>> 0) % 1_000_000).padStart(6, "0");
}

export function otpValid(input: string, now = Date.now()) {
  const code = input.replace(/\D/g, "");
  return code.length === 6 && (code === otpAt(0, now) || code === otpAt(-1, now));
}

export function passwordIssues(password: string, clientNumber: string) {
  const issues: string[] = [];
  if (password.length < 8) issues.push(t("password.minLength"));
  if (!/[a-z]/.test(password)) issues.push(t("password.lowercase"));
  if (!/[A-Z]/.test(password)) issues.push(t("password.uppercase"));
  if (!/\d/.test(password)) issues.push(t("password.digit"));
  if (!/[^A-Za-z0-9]/.test(password)) issues.push(t("password.symbol"));
  if (clientNumber && password.includes(clientNumber)) issues.push(t("password.noClientNumber"));
  return issues;
}

export function isBeneficiaryActive(b: Beneficiary, now = Date.now()) {
  return b.activatesAt <= now;
}

export function getNav(): { screen: Screen; label: string; empresasOnly?: boolean }[] {
  return [
    { screen: "dashboard", label: t("nav.dashboard") },
    { screen: "transfer", label: t("nav.transfer") },
    { screen: "movements", label: t("nav.movements") },
    { screen: "approvals", label: t("nav.approvals"), empresasOnly: true },
    { screen: "request", label: t("nav.request") },
    { screen: "settings", label: t("nav.settings") },
    { screen: "audit", label: t("nav.audit") },
    { screen: "notices", label: t("nav.notices") },
    { screen: "about", label: t("nav.about") },
    { screen: "help", label: t("nav.help") },
  ];
}

/** @deprecated Prefer getNav() so labels respect the active locale. */
export const NAV = getNav();

export function getScreenTitle(screen: Screen): string {
  return t(`screens.${screen}` as const);
}

/** @deprecated Prefer getScreenTitle() so titles respect the active locale. */
export const SCREEN_TITLE: Record<Screen, string> = {
  landing: t("screens.landing"),
  login: t("screens.login"),
  register: t("screens.register"),
  dashboard: t("screens.dashboard"),
  transfer: t("screens.transfer"),
  movements: t("screens.movements"),
  request: t("screens.request"),
  settings: t("screens.settings"),
  audit: t("screens.audit"),
  notices: t("screens.notices"),
  about: t("screens.about"),
  help: t("screens.help"),
  approvals: t("screens.approvals"),
};
