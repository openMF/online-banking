import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

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
  return format(parseISO(iso), "d MMM yyyy, h:mm a", { locale: es });
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
  if (password.length < 8) issues.push("mínimo 8 caracteres");
  if (!/[a-z]/.test(password)) issues.push("una minúscula");
  if (!/[A-Z]/.test(password)) issues.push("una mayúscula");
  if (!/\d/.test(password)) issues.push("un dígito");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("un símbolo");
  if (clientNumber && password.includes(clientNumber)) issues.push("no puede contener el número de cliente");
  return issues;
}

export function isBeneficiaryActive(b: Beneficiary, now = Date.now()) {
  return b.activatesAt <= now;
}

export const NAV: { screen: Screen; label: string; empresasOnly?: boolean }[] = [
  { screen: "dashboard", label: "Inicio" },
  { screen: "transfer", label: "Transferencias" },
  { screen: "movements", label: "Movimientos" },
  { screen: "approvals", label: "Autorizaciones", empresasOnly: true },
  { screen: "request", label: "Solicitar" },
  { screen: "settings", label: "Ajustes" },
  { screen: "audit", label: "Bitácora" },
  { screen: "notices", label: "Avisos" },
  { screen: "about", label: "Nosotros" },
  { screen: "help", label: "Ayuda" },
];

export const SCREEN_TITLE: Record<Screen, string> = {
  landing: "Banca Web",
  login: "Iniciar sesión",
  register: "Contratar Banca Web",
  dashboard: "Inicio",
  transfer: "Transferir",
  movements: "Movimientos",
  request: "Solicitar",
  settings: "Ajustes",
  audit: "Bitácora",
  notices: "Avisos",
  about: "Nosotros",
  help: "Ayuda",
  approvals: "Autorizaciones",
};
