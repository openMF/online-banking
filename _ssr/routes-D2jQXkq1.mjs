import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { _ as CircleHelp, a as ShieldCheck, b as ArrowLeftRight, c as Menu, d as Landmark, f as Info, g as EyeOff, h as Eye, i as Smartphone, l as LogOut, m as FilePlus2, n as UserRound, o as Settings, p as House, s as ScrollText, t as X, u as LockKeyhole, v as Building2, y as Bell } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { i as enUS, n as parseISO, r as format, t as es } from "../_libs/date-fns.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D2jQXkq1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var dictionaries = {
	"es-MX": {
		app: {
			"name": "MIFOS",
			"tagline": "Banca Web",
			"subtitle": "Crédito · Ahorro · Inversión",
			"channel": "CANAL ELECTRÓNICO",
			"hero": "Su dinero, con los controles de una banca electrónica formal.",
			"footerLocation": "León, Guanajuato · 477 461 4700",
			"footerDisclaimer": "Prototipo de demostración. No realiza operaciones reales.",
			"regulatory": "COMPANY NAME , S.A. DE C.V., S.F.P. Entidad autorizada, regulada y supervisada por la CNBV. Los depósitos están protegidos por el Fondo de Protección hasta por 25,000 UDIS por ahorrador.",
			"wordmarkAlt": "Mifos. Crédito, ahorro e inversión"
		},
		features: {
			"balances": "Consulta de saldos y movimientos",
			"ownTransfers": "Transferencias entre cuentas propias",
			"thirdParty": "Transferencias a terceros Mifos",
			"receipts": "Comprobante, límites y bitácora"
		},
		landing: {
			"clientNumber": "Número de cliente",
			"clientHint": "Identificador único de usuario, de 6 a 12 dígitos.",
			"continue": "Continuar",
			"register": "Registrarse",
			"demoPersonas": "Demo personas",
			"demoEmpresas": "Demo empresas",
			"demoPassword": "Contraseña de demostración: {{password}}"
		},
		login: {
			"clientFallback": "Cliente",
			"passwordPrompt": "Si las iniciales son correctas, ingrese su contraseña. Si no las reconoce, cancele: podría no estar en el sitio de Mifos.",
			"password": "Contraseña",
			"showPassword": "Mostrar contraseña",
			"hidePassword": "Ocultar contraseña",
			"submit": "Iniciar sesión",
			"cancel": "Cancelar",
			"factorNote": "Factor categoría 2. Después de 3 errores el acceso se bloquea 10 minutos.",
			"welcome": "Bienvenido. Sesión segura iniciada."
		},
		register: {
			"title": "Contratar Banca Web",
			"acceptTerms": "Debe aceptar los términos del servicio y el aviso de privacidad.",
			"clientDigits": "El número de cliente debe tener entre 6 y 12 dígitos. Se obtiene en sucursal.",
			"passwordNeeds": "La contraseña necesita {{issues}}.",
			"passwordMismatch": "La confirmación no coincide.",
			"phoneDigits": "Capture un celular de 10 dígitos. Ahí enviaremos avisos de operaciones.",
			"activationCode": "Código de activación",
			"terms": "Términos del servicio",
			"privacy": "Aviso de privacidad",
			"termsLink": "términos de Banca Web",
			"privacyLink": "aviso de privacidad",
			"privacyBody": "Aviso de privacidad: los datos se usan para identificarle, autenticarle, operar el canal y enviarle alertas."
		},
		nav: {
			"dashboard": "Inicio",
			"transfer": "Transferencias",
			"movements": "Movimientos",
			"approvals": "Autorizaciones",
			"request": "Solicitar",
			"settings": "Ajustes",
			"audit": "Bitácora",
			"notices": "Avisos",
			"about": "Nosotros",
			"help": "Ayuda"
		},
		screens: {
			"landing": "Banca Web",
			"login": "Iniciar sesión",
			"register": "Contratar Banca Web",
			"dashboard": "Inicio",
			"transfer": "Transferir",
			"movements": "Movimientos",
			"request": "Solicitar",
			"settings": "Ajustes",
			"audit": "Bitácora",
			"notices": "Avisos",
			"about": "Nosotros",
			"help": "Ayuda",
			"approvals": "Autorizaciones"
		},
		session: {
			"closed": "Sesión cerrada.",
			"inactivity": "Cerramos la sesión por 5 minutos sin actividad.",
			"expiring": "La sesión está por cerrarse",
			"continue": "Continuar",
			"hello": "Hola, {{name}}",
			"lastLogin": "Último ingreso: {{when}} · Banca Web",
			"remaining": "Sesión {{time}}"
		},
		dashboard: {
			"products": "Productos contratados",
			"creditAccounts": "Cuentas de crédito",
			"businessAccounts": "Cuentas empresariales",
			"savingsAccounts": "Cuentas de captación",
			"creditSummary": "Resumen de crédito",
			"savingsSummary": "Resumen de captación",
			"transfer": "Transferir"
		},
		password: {
			"minLength": "mínimo 8 caracteres",
			"lowercase": "una minúscula",
			"uppercase": "una mayúscula",
			"digit": "un dígito",
			"symbol": "un símbolo",
			"noClientNumber": "no puede contener el número de cliente"
		},
		common: {
			"logout": "Cerrar sesión",
			"cancel": "Cancelar",
			"confirm": "Confirmar",
			"save": "Guardar",
			"back": "Regresar",
			"loading": "Cargando…",
			"error": "Error",
			"success": "Éxito"
		},
		segment: {
			"personas": "Personas",
			"empresas": "Empresas"
		}
	},
	"en-US": {
		app: {
			"name": "MIFOS",
			"tagline": "Online Banking",
			"subtitle": "Credit · Savings · Investment",
			"channel": "ELECTRONIC CHANNEL",
			"hero": "Your money, with the controls of formal electronic banking.",
			"footerLocation": "León, Guanajuato · 477 461 4700",
			"footerDisclaimer": "Demonstration prototype. Does not perform real operations.",
			"regulatory": "COMPANY NAME, S.A. DE C.V., S.F.P. Entity authorized, regulated and supervised by the CNBV. Deposits are protected by the Protection Fund up to 25,000 UDIS per saver.",
			"wordmarkAlt": "Mifos. Credit, savings and investment"
		},
		features: {
			"balances": "Balance and transaction inquiries",
			"ownTransfers": "Transfers between own accounts",
			"thirdParty": "Transfers to Mifos third parties",
			"receipts": "Receipts, limits and audit log"
		},
		landing: {
			"clientNumber": "Client number",
			"clientHint": "Unique user identifier, 6 to 12 digits.",
			"continue": "Continue",
			"register": "Register",
			"demoPersonas": "Demo personal",
			"demoEmpresas": "Demo business",
			"demoPassword": "Demo password: {{password}}"
		},
		login: {
			"clientFallback": "Client",
			"passwordPrompt": "If the initials are correct, enter your password. If you do not recognize them, cancel: you may not be on the Mifos site.",
			"password": "Password",
			"showPassword": "Show password",
			"hidePassword": "Hide password",
			"submit": "Sign in",
			"cancel": "Cancel",
			"factorNote": "Category 2 factor. After 3 errors access is locked for 10 minutes.",
			"welcome": "Welcome. Secure session started."
		},
		register: {
			"title": "Enroll in Online Banking",
			"acceptTerms": "You must accept the terms of service and privacy notice.",
			"clientDigits": "The client number must have between 6 and 12 digits. Obtained at a branch.",
			"passwordNeeds": "The password needs {{issues}}.",
			"passwordMismatch": "Confirmation does not match.",
			"phoneDigits": "Enter a 10-digit mobile number. We will send operation alerts there.",
			"activationCode": "Activation code",
			"terms": "Terms of service",
			"privacy": "Privacy notice",
			"termsLink": "Online Banking terms",
			"privacyLink": "privacy notice",
			"privacyBody": "Privacy notice: data is used to identify you, authenticate you, operate the channel and send you alerts."
		},
		nav: {
			"dashboard": "Home",
			"transfer": "Transfers",
			"movements": "Transactions",
			"approvals": "Approvals",
			"request": "Request",
			"settings": "Settings",
			"audit": "Audit log",
			"notices": "Notices",
			"about": "About us",
			"help": "Help"
		},
		screens: {
			"landing": "Online Banking",
			"login": "Sign in",
			"register": "Enroll in Online Banking",
			"dashboard": "Home",
			"transfer": "Transfer",
			"movements": "Transactions",
			"request": "Request",
			"settings": "Settings",
			"audit": "Audit log",
			"notices": "Notices",
			"about": "About us",
			"help": "Help",
			"approvals": "Approvals"
		},
		session: {
			"closed": "Session closed.",
			"inactivity": "We closed the session due to 5 minutes of inactivity.",
			"expiring": "The session is about to close",
			"continue": "Continue",
			"hello": "Hello, {{name}}",
			"lastLogin": "Last login: {{when}} · Online Banking",
			"remaining": "Session {{time}}"
		},
		dashboard: {
			"products": "Contracted products",
			"creditAccounts": "Credit accounts",
			"businessAccounts": "Business accounts",
			"savingsAccounts": "Deposit accounts",
			"creditSummary": "Credit summary",
			"savingsSummary": "Deposit summary",
			"transfer": "Transfer"
		},
		password: {
			"minLength": "minimum 8 characters",
			"lowercase": "a lowercase letter",
			"uppercase": "an uppercase letter",
			"digit": "a digit",
			"symbol": "a symbol",
			"noClientNumber": "cannot contain the client number"
		},
		common: {
			"logout": "Sign out",
			"cancel": "Cancel",
			"confirm": "Confirm",
			"save": "Save",
			"back": "Back",
			"loading": "Loading…",
			"error": "Error",
			"success": "Success"
		},
		segment: {
			"personas": "Personal",
			"empresas": "Business"
		}
	}
};
var currentLocale = "es-MX";
function setLocale(locale) {
	currentLocale = locale;
	if (typeof document !== "undefined") document.documentElement.lang = locale;
}
function getLocale() {
	return currentLocale;
}
function getByPath(obj, path) {
	const parts = path.split(".");
	let current = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return void 0;
		current = current[part];
	}
	return typeof current === "string" ? current : void 0;
}
/**
* Translate a key. Supports simple {{var}} interpolation.
* Falls back to the key itself if missing.
*/
function t(key, params) {
	let value = getByPath(dictionaries[currentLocale] ?? dictionaries["es-MX"], key) ?? getByPath(dictionaries["es-MX"], key) ?? key;
	if (params) for (const [k, v] of Object.entries(params)) value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
	return value;
}
var SESSION_MS = 3e5;
var LOCK_MS = 6e5;
var ACTIVATION_MS = 3e4;
var REAL_ACTIVATION_LABEL = "30 minutos";
var SECOND_SIGN_AT = 5e4;
var PERSONA_DAILY_CAP = 8e4;
var EMPRESA_DAILY_CAP = 1e6;
var DEMO_PASSWORD = "Mifos#26";
var PRIVATE_SCREENS = [
	"dashboard",
	"transfer",
	"movements",
	"request",
	"settings",
	"audit",
	"notices",
	"about",
	"help",
	"approvals"
];
function mexicoDay(now = /* @__PURE__ */ new Date()) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Mexico_City",
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(now);
}
function roundMoney(n) {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
function formatMoney(n) {
	return new Intl.NumberFormat("es-MX", {
		style: "currency",
		currency: "MXN"
	}).format(n);
}
function formatWhen(iso) {
	const locale = getLocale() === "en-US" ? enUS : es;
	return format(parseISO(iso), "d MMM yyyy, h:mm a", { locale });
}
function maskAccount(number) {
	const last = number.slice(-4);
	return `${"•".repeat(Math.max(number.length - 4, 4))}${last}`;
}
function dailyUsedNow(user, now = /* @__PURE__ */ new Date()) {
	return user.dailyStamp === mexicoDay(now) ? user.dailyUsed : 0;
}
function capFor(segment) {
	return segment === "empresas" ? EMPRESA_DAILY_CAP : PERSONA_DAILY_CAP;
}
function otpAt(offsetSteps = 0, now = Date.now()) {
	const step = Math.floor(now / 3e4) + offsetSteps;
	let h = 2166136261;
	const s = `MIFOS-TOKEN-v1:${step}`;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return String((h >>> 0) % 1e6).padStart(6, "0");
}
function otpValid(input, now = Date.now()) {
	const code = input.replace(/\D/g, "");
	return code.length === 6 && (code === otpAt(0, now) || code === otpAt(-1, now));
}
function passwordIssues(password, clientNumber) {
	const issues = [];
	if (password.length < 8) issues.push(t("password.minLength"));
	if (!/[a-z]/.test(password)) issues.push(t("password.lowercase"));
	if (!/[A-Z]/.test(password)) issues.push(t("password.uppercase"));
	if (!/\d/.test(password)) issues.push(t("password.digit"));
	if (!/[^A-Za-z0-9]/.test(password)) issues.push(t("password.symbol"));
	if (clientNumber && password.includes(clientNumber)) issues.push(t("password.noClientNumber"));
	return issues;
}
function isBeneficiaryActive(b, now = Date.now()) {
	return b.activatesAt <= now;
}
function getNav() {
	return [
		{
			screen: "dashboard",
			label: t("nav.dashboard")
		},
		{
			screen: "transfer",
			label: t("nav.transfer")
		},
		{
			screen: "movements",
			label: t("nav.movements")
		},
		{
			screen: "approvals",
			label: t("nav.approvals"),
			empresasOnly: true
		},
		{
			screen: "request",
			label: t("nav.request")
		},
		{
			screen: "settings",
			label: t("nav.settings")
		},
		{
			screen: "audit",
			label: t("nav.audit")
		},
		{
			screen: "notices",
			label: t("nav.notices")
		},
		{
			screen: "about",
			label: t("nav.about")
		},
		{
			screen: "help",
			label: t("nav.help")
		}
	];
}
getNav();
function getScreenTitle(screen) {
	return t(`screens.${screen}`);
}
t("screens.landing"), t("screens.login"), t("screens.register"), t("screens.dashboard"), t("screens.transfer"), t("screens.movements"), t("screens.request"), t("screens.settings"), t("screens.audit"), t("screens.notices"), t("screens.about"), t("screens.help"), t("screens.approvals");
var DAY = mexicoDay(/* @__PURE__ */ new Date("2026-10-12T12:00:00-06:00"));
function seedUsers() {
	return [{
		id: "p-noe",
		segment: "personas",
		clientNumber: "344988355",
		password: DEMO_PASSWORD,
		displayName: "Noé López Guzmán",
		loginHint: "N** L**** G*****",
		email: "noe.lopez@correo.demo",
		phone: "4771234580",
		extraId: "",
		roleLabel: "Titular",
		previousLogin: "2026-10-11T18:42:00-06:00",
		currentLogin: null,
		failedAttempts: 0,
		lockedUntil: null,
		dailyLimit: 5e4,
		perOpLimit: 15e3,
		dailyUsed: 0,
		dailyStamp: DAY,
		accounts: [{
			id: "acc-vista",
			alias: "Ahorro a la vista",
			number: "82616806117",
			product: "Cuenta de ahorro a la vista",
			balance: 2742
		}, {
			id: "acc-ahorro",
			alias: "Ahorro Mifos",
			number: "86812044751",
			product: "Cuenta de ahorro",
			balance: 1e3
		}],
		beneficiaries: [{
			id: "ben-carmen",
			name: "Carmen Solís Rentería",
			account: "83679983062",
			alias: "Carmen",
			limit: 15e3,
			activatesAt: 0
		}],
		movements: [
			{
				id: "mov-1",
				accountId: "acc-vista",
				direction: "cargo",
				concept: "Transferencia realizada",
				amount: 500,
				balanceAfter: 2742,
				folio: "960002",
				at: "2026-09-28T12:48:54-06:00",
				reference: "1234",
				counterparty: "Carmen Solís Rentería"
			},
			{
				id: "mov-2",
				accountId: "acc-vista",
				direction: "abono",
				concept: "Depósito en sucursal",
				amount: 1500,
				balanceAfter: 3242,
				folio: "960001",
				at: "2026-09-15T10:12:00-06:00"
			},
			{
				id: "mov-3",
				accountId: "acc-vista",
				direction: "abono",
				concept: "Apertura de cuenta",
				amount: 1742,
				balanceAfter: 1742,
				folio: "959880",
				at: "2026-09-01T09:00:00-06:00"
			},
			{
				id: "mov-4",
				accountId: "acc-ahorro",
				direction: "abono",
				concept: "Apertura de cuenta",
				amount: 1e3,
				balanceAfter: 1e3,
				folio: "959881",
				at: "2026-09-01T09:05:00-06:00"
			}
		],
		audit: [
			{
				id: "aud-1",
				at: "2026-09-01T09:00:00-06:00",
				event: "Contratación del canal",
				detail: "Alta de Banca Web para el identificador 344988355. Aceptación de términos registrada.",
				folio: "BT-100001"
			},
			{
				id: "aud-2",
				at: "2026-10-11T18:42:00-06:00",
				event: "Inicio de sesión",
				detail: "Acceso correcto en Banca Web. Factor categoría 2.",
				folio: "BT-100014"
			},
			{
				id: "aud-3",
				at: "2026-09-28T12:48:54-06:00",
				event: "Transferencia aplicada",
				detail: "Cargo de $500.00 a cuenta 82616806117. Folio de operación 960002. Clave dinámica validada.",
				folio: "BT-100009"
			}
		],
		notices: [{
			id: "nt-1",
			at: "2026-10-11T18:42:00-06:00",
			channel: "SMS",
			title: "Inicio de sesión",
			body: "Se ingresó a Banca Web Mifos el 11 oct 2026, 6:42 p. m. Si no fue usted, comuníquese al 477 461 4700.",
			read: true
		}, {
			id: "nt-2",
			at: "2026-09-28T12:48:54-06:00",
			channel: "Correo",
			title: "Transferencia enviada",
			body: "Se aplicó una transferencia por $500.00 a Carmen Solís Rentería. Folio 960002. Comisión $0.00.",
			read: true
		}],
		pending: [],
		requests: [],
		signerName: null
	}, {
		id: "e-taller",
		segment: "empresas",
		clientNumber: "880214001",
		password: DEMO_PASSWORD,
		displayName: "Taller Industrial del Bajío, S.A. de C.V.",
		loginHint: "M** E**** R*** · Taller Industrial del Bajío",
		email: "tesoreria@taller.demo",
		phone: "4772201188",
		extraId: "TIB850101AB3",
		roleLabel: "Facultado de captura · María Elena Ríos Campos",
		previousLogin: "2026-10-10T11:05:00-06:00",
		currentLogin: null,
		failedAttempts: 0,
		lockedUntil: null,
		dailyLimit: 5e5,
		perOpLimit: 25e4,
		dailyUsed: 0,
		dailyStamp: DAY,
		signerName: "Héctor Saldaña Vega",
		accounts: [{
			id: "acc-eje",
			alias: "Cuenta eje",
			number: "55012200884",
			product: "Cuenta empresarial de cheques",
			balance: 186450.32
		}, {
			id: "acc-nomina",
			alias: "Concentradora de nómina",
			number: "55012200990",
			product: "Cuenta concentradora",
			balance: 42800
		}],
		beneficiaries: [{
			id: "ben-prov",
			name: "Proveedora del Centro, S.A. de C.V.",
			account: "80112233445",
			alias: "Proveedora",
			limit: 25e4,
			activatesAt: 0
		}],
		movements: [{
			id: "mov-e1",
			accountId: "acc-eje",
			direction: "abono",
			concept: "Depósito de clientes",
			amount: 86450.32,
			balanceAfter: 186450.32,
			folio: "771204",
			at: "2026-10-08T16:40:00-06:00",
			reference: "8841"
		}, {
			id: "mov-e2",
			accountId: "acc-nomina",
			direction: "cargo",
			concept: "Dispersión de nómina",
			amount: 22e3,
			balanceAfter: 42800,
			folio: "771118",
			at: "2026-10-01T08:30:00-06:00"
		}],
		audit: [{
			id: "aud-e1",
			at: "2026-08-12T09:00:00-06:00",
			event: "Contratación del canal",
			detail: "Banca Web empresarial. Mandato mancomunado: captura María Elena Ríos Campos; autorización Héctor Saldaña Vega en operaciones mayores a $50,000.00.",
			folio: "BT-200001"
		}],
		notices: [{
			id: "nt-e1",
			at: "2026-10-10T11:20:00-06:00",
			channel: "Correo",
			title: "Operación pendiente de segunda firma",
			body: "Hay una transferencia por $75,000.00 a Proveedora del Centro pendiente de la clave del facultado autorizador. Folio BW-100881.",
			read: false
		}],
		pending: [{
			id: "pend-1",
			fromAccountId: "acc-eje",
			beneficiaryName: "Proveedora del Centro, S.A. de C.V.",
			beneficiaryAccount: "80112233445",
			amount: 75e3,
			concept: "FACTURA A-1022",
			reference: "1022",
			createdAt: "2026-10-10T11:20:00-06:00",
			status: "pendiente_segunda_firma",
			folio: "BW-100881"
		}],
		requests: []
	}];
}
var DEMO_ACTIVATION_CODE = "482915";
function initialData() {
	return {
		users: seedUsers(),
		sessionUserId: null,
		sessionExpiresAt: null,
		pendingUserId: null,
		screen: "landing",
		folioSeq: 1200
	};
}
function uid(prefix) {
	return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}
function mapUser(users, id, fn) {
	return users.map((user) => user.id === id ? fn(user) : user);
}
function accountTaken(users, number) {
	return users.some((user) => user.accounts.some((account) => account.number === number));
}
function makeAccountNumber(seq, users) {
	let n = 8e10 + seq;
	let value = String(n);
	while (accountTaken(users, value)) {
		n += 1;
		value = String(n);
	}
	return value;
}
var useBanca = create()(persist((set, get) => ({
	...initialData(),
	boot: () => {
		const { sessionExpiresAt, sessionUserId, screen } = get();
		if (sessionUserId && sessionExpiresAt && sessionExpiresAt <= Date.now()) {
			get().endSession("inactividad");
			return;
		}
		if (!sessionUserId && PRIVATE_SCREENS.includes(screen)) set({ screen: "landing" });
	},
	go: (screen) => {
		const session = get().sessionUserId;
		if (!session && PRIVATE_SCREENS.includes(screen)) return;
		if (session) get().touch();
		set({ screen });
	},
	touch: () => {
		if (!get().sessionUserId) return;
		set({ sessionExpiresAt: Date.now() + SESSION_MS });
	},
	continueClient: (clientNumber) => {
		const clean = clientNumber.replace(/\s/g, "");
		if (!/^\d{6,12}$/.test(clean)) return {
			ok: false,
			error: "El identificador de usuario debe tener entre 6 y 12 dígitos."
		};
		const user = get().users.find((item) => item.clientNumber === clean);
		if (!user) return {
			ok: false,
			error: "Los datos no corresponden a un cliente con Banca Web contratada. Verifique su número o regístrese."
		};
		if (user.lockedUntil && user.lockedUntil > Date.now()) return {
			ok: false,
			error: `Acceso bloqueado por intentos fallidos. Podrá intentar de nuevo en ${Math.ceil((user.lockedUntil - Date.now()) / 6e4)} min. Se notificó al medio registrado.`
		};
		set({
			pendingUserId: user.id,
			screen: "login"
		});
		return { ok: true };
	},
	login: (password) => {
		const pendingId = get().pendingUserId;
		const user = get().users.find((item) => item.id === pendingId);
		if (!user) return {
			ok: false,
			error: "Vuelva a capturar su número de cliente."
		};
		if (user.lockedUntil && user.lockedUntil > Date.now()) return {
			ok: false,
			error: "El acceso sigue bloqueado temporalmente."
		};
		if (password !== user.password) {
			const attempts = user.failedAttempts + 1;
			const lock = attempts >= 3;
			const folio = `BT-${get().folioSeq + 1}`;
			set({
				folioSeq: get().folioSeq + 1,
				users: mapUser(get().users, user.id, (current) => ({
					...current,
					failedAttempts: lock ? 0 : attempts,
					lockedUntil: lock ? Date.now() + LOCK_MS : current.lockedUntil,
					audit: [{
						id: uid("aud"),
						at: (/* @__PURE__ */ new Date()).toISOString(),
						event: lock ? "Bloqueo temporal" : "Intento de acceso fallido",
						detail: lock ? `Tres autenticaciones incorrectas. Factor categoría 2 bloqueado 10 minutos.` : `Contraseña incorrecta. Intento ${attempts} de 3.`,
						folio
					}, ...current.audit],
					notices: lock ? [{
						id: uid("nt"),
						at: (/* @__PURE__ */ new Date()).toISOString(),
						channel: "SMS",
						title: "Acceso bloqueado",
						body: "Se bloqueó temporalmente Banca Web por intentos fallidos. Si no fue usted, comuníquese al 477 461 4700.",
						read: false
					}, ...current.notices] : current.notices
				}))
			});
			return {
				ok: false,
				error: lock ? "Por su seguridad el acceso quedó bloqueado 10 minutos." : `Contraseña incorrecta. Le quedan ${3 - attempts} intento(s).`
			};
		}
		const nowIso = (/* @__PURE__ */ new Date()).toISOString();
		const folio = `BT-${get().folioSeq + 1}`;
		set({
			folioSeq: get().folioSeq + 1,
			pendingUserId: null,
			sessionUserId: user.id,
			sessionExpiresAt: Date.now() + SESSION_MS,
			screen: "dashboard",
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				failedAttempts: 0,
				lockedUntil: null,
				previousLogin: current.currentLogin ?? current.previousLogin,
				currentLogin: nowIso,
				audit: [{
					id: uid("aud"),
					at: nowIso,
					event: "Inicio de sesión",
					detail: "Acceso correcto a Banca Web. Se validó identificador de usuario y factor de autenticación categoría 2.",
					folio
				}, ...current.audit],
				notices: [{
					id: uid("nt"),
					at: nowIso,
					channel: "SMS",
					title: "Inicio de sesión",
					body: "Detectamos un acceso a Banca Web Mifos. Si no fue usted, cierre la sesión y comuníquese al 477 461 4700.",
					read: false
				}, ...current.notices]
			}))
		});
		return { ok: true };
	},
	endSession: (reason) => {
		const id = get().sessionUserId;
		const folio = `BT-${get().folioSeq + 1}`;
		set({
			folioSeq: get().folioSeq + 1,
			sessionUserId: null,
			sessionExpiresAt: null,
			pendingUserId: null,
			screen: "landing",
			users: id ? mapUser(get().users, id, (current) => ({
				...current,
				audit: [{
					id: uid("aud"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					event: reason === "inactividad" ? "Cierre por inactividad" : "Cierre de sesión",
					detail: reason === "inactividad" ? "La sesión se terminó de forma automática al cumplir 5 minutos sin actividad." : "El usuario cerró la sesión de Banca Web.",
					folio
				}, ...current.audit]
			})) : get().users
		});
	},
	enroll: (draft) => {
		const clean = draft.clientNumber.replace(/\s/g, "");
		if (get().users.some((user) => user.clientNumber === clean)) return {
			ok: false,
			error: "Ese número de cliente ya tiene Banca Web contratada."
		};
		const seq = get().folioSeq + 1;
		const number = makeAccountNumber(seq, get().users);
		const nowIso = (/* @__PURE__ */ new Date()).toISOString();
		const persona = draft.segment === "personas";
		const user = {
			id: uid("u"),
			segment: draft.segment,
			clientNumber: clean,
			password: draft.password,
			displayName: draft.displayName.trim(),
			loginHint: persona ? draft.displayName.trim().split(/\s+/).map((word) => word.charAt(0).toUpperCase() + "*".repeat(Math.max(word.length - 1, 2))).join(" ") : draft.displayName.trim(),
			email: draft.email.trim(),
			phone: draft.phone.replace(/\D/g, ""),
			extraId: draft.extraId.trim().toUpperCase(),
			roleLabel: persona ? "Titular" : "Representante legal",
			previousLogin: nowIso,
			currentLogin: null,
			failedAttempts: 0,
			lockedUntil: null,
			dailyLimit: persona ? 2e4 : 2e5,
			perOpLimit: persona ? 1e4 : 5e4,
			dailyUsed: 0,
			dailyStamp: mexicoDay(),
			accounts: [{
				id: uid("acc"),
				alias: persona ? "Ahorro a la vista" : "Cuenta eje",
				number,
				product: persona ? "Cuenta de ahorro a la vista" : "Cuenta empresarial",
				balance: 0
			}],
			beneficiaries: [],
			movements: [],
			audit: [{
				id: uid("aud"),
				at: nowIso,
				event: "Contratación del canal",
				detail: "El cliente aceptó los términos de Banca Web y activó el servicio con el código enviado a su correo.",
				folio: `BT-${seq}`
			}],
			notices: [{
				id: uid("nt"),
				at: nowIso,
				channel: "Correo",
				title: "Banca Web activada",
				body: "Su servicio quedó activo. Las operaciones monetarias pedirán la clave dinámica de su banca móvil.",
				read: false
			}],
			pending: [],
			requests: [],
			signerName: persona ? null : "Facultado autorizador por registrar en sucursal"
		};
		set({
			users: [...get().users, user],
			folioSeq: seq,
			pendingUserId: user.id,
			screen: "login"
		});
		return { ok: true };
	},
	resetDemo: () => {
		set({ ...initialData() });
	},
	addBeneficiary: ({ name, account, alias, limit }) => {
		const id = get().sessionUserId;
		const user = get().users.find((item) => item.id === id);
		if (!user) return {
			ok: false,
			error: "Sesión no válida."
		};
		const clean = account.replace(/\s/g, "");
		if (!/^\d{11}$/.test(clean)) return {
			ok: false,
			error: "Capture la cuenta Mifos de 11 dígitos. SPEI a otros bancos no está habilitado en este prototipo."
		};
		if (user.accounts.some((item) => item.number === clean)) return {
			ok: false,
			error: "Esa cuenta es propia. Transfiérala desde Cuentas propias, sin darla de alta."
		};
		if (user.beneficiaries.some((item) => item.account === clean)) return {
			ok: false,
			error: "Ese beneficiario ya está registrado."
		};
		if (!name.trim()) return {
			ok: false,
			error: "Indique el nombre del beneficiario."
		};
		const cap = user.perOpLimit;
		const safeLimit = roundMoney(Math.min(Math.max(limit, 1), cap));
		const folio = `BT-${get().folioSeq + 1}`;
		const activatesAt = Date.now() + ACTIVATION_MS;
		set({
			folioSeq: get().folioSeq + 1,
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				beneficiaries: [...current.beneficiaries, {
					id: uid("ben"),
					name: name.trim(),
					account: clean,
					alias: alias.trim() || name.trim(),
					limit: safeLimit,
					activatesAt
				}],
				audit: [{
					id: uid("aud"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					event: "Alta de beneficiario",
					detail: `${name.trim()} · ${clean}. Periodo de activación iniciado. Clave dinámica validada.`,
					folio
				}, ...current.audit]
			}))
		});
		get().touch();
		return { ok: true };
	},
	removeBeneficiary: (beneficiaryId) => {
		const id = get().sessionUserId;
		const user = get().users.find((item) => item.id === id);
		if (!user) return {
			ok: false,
			error: "Sesión no válida."
		};
		const target = user.beneficiaries.find((item) => item.id === beneficiaryId);
		if (!target) return {
			ok: false,
			error: "Beneficiario no encontrado."
		};
		const folio = `BT-${get().folioSeq + 1}`;
		set({
			folioSeq: get().folioSeq + 1,
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				beneficiaries: current.beneficiaries.filter((item) => item.id !== beneficiaryId),
				audit: [{
					id: uid("aud"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					event: "Baja de beneficiario",
					detail: `${target.name} · ${target.account}. Clave dinámica validada.`,
					folio
				}, ...current.audit]
			}))
		});
		get().touch();
		return { ok: true };
	},
	updateLimits: (daily, perOp) => {
		const id = get().sessionUserId;
		const user = get().users.find((item) => item.id === id);
		if (!user) return {
			ok: false,
			error: "Sesión no válida."
		};
		const cap = capFor(user.segment);
		const nextDaily = roundMoney(daily);
		const nextOp = roundMoney(perOp);
		if (nextDaily < 100 || nextOp < 100) return {
			ok: false,
			error: "El límite mínimo es de $100.00."
		};
		if (nextDaily > cap) return {
			ok: false,
			error: `El límite diario institucional de su perfil es ${cap.toLocaleString("es-MX", {
				style: "currency",
				currency: "MXN"
			})}.`
		};
		if (nextOp > nextDaily) return {
			ok: false,
			error: "El límite por operación no puede exceder el límite diario."
		};
		const folio = `BT-${get().folioSeq + 1}`;
		set({
			folioSeq: get().folioSeq + 1,
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				dailyLimit: nextDaily,
				perOpLimit: nextOp,
				beneficiaries: current.beneficiaries.map((item) => ({
					...item,
					limit: Math.min(item.limit, nextOp)
				})),
				audit: [{
					id: uid("aud"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					event: "Cambio de límites",
					detail: `Diario ${nextDaily.toFixed(2)} · por operación ${nextOp.toFixed(2)}.`,
					folio
				}, ...current.audit],
				notices: [{
					id: uid("nt"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					channel: "Correo",
					title: "Límites actualizados",
					body: "Se modificaron los límites de Banca Web. Si usted no lo solicitó, comuníquese de inmediato.",
					read: false
				}, ...current.notices]
			}))
		});
		get().touch();
		return { ok: true };
	},
	changePassword: (currentPassword, next) => {
		const id = get().sessionUserId;
		const user = get().users.find((item) => item.id === id);
		if (!user) return {
			ok: false,
			error: "Sesión no válida."
		};
		if (currentPassword !== user.password) return {
			ok: false,
			error: "La contraseña actual no coincide."
		};
		if (next === user.password) return {
			ok: false,
			error: "La nueva contraseña debe ser distinta."
		};
		const folio = `BT-${get().folioSeq + 1}`;
		set({
			folioSeq: get().folioSeq + 1,
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				password: next,
				audit: [{
					id: uid("aud"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					event: "Cambio de contraseña",
					detail: "Se actualizó el factor de autenticación categoría 2, con confirmación de clave dinámica.",
					folio
				}, ...current.audit],
				notices: [{
					id: uid("nt"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					channel: "Correo",
					title: "Contraseña modificada",
					body: "Su contraseña de Banca Web cambió. Si usted no lo hizo, llame al 477 461 4700.",
					read: false
				}, ...current.notices]
			}))
		});
		get().touch();
		return { ok: true };
	},
	changeContact: (kind, value) => {
		const id = get().sessionUserId;
		const user = get().users.find((item) => item.id === id);
		if (!user) return {
			ok: false,
			error: "Sesión no válida."
		};
		const folio = `BT-${get().folioSeq + 1}`;
		const email = value.trim();
		const phone = value.replace(/\D/g, "");
		if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {
			ok: false,
			error: "Capture un correo válido."
		};
		if (kind === "phone" && !/^\d{10}$/.test(phone)) return {
			ok: false,
			error: "El celular debe tener 10 dígitos."
		};
		set({
			folioSeq: get().folioSeq + 1,
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				email: kind === "email" ? email : current.email,
				phone: kind === "phone" ? phone : current.phone,
				audit: [{
					id: uid("aud"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					event: kind === "email" ? "Cambio de correo" : "Cambio de teléfono",
					detail: "Medio de notificación actualizado con clave dinámica.",
					folio
				}, ...current.audit],
				notices: [{
					id: uid("nt"),
					at: (/* @__PURE__ */ new Date()).toISOString(),
					channel: kind === "email" ? "Correo" : "SMS",
					title: "Medio de contacto actualizado",
					body: "Los avisos de operaciones se enviarán al nuevo medio registrado.",
					read: false
				}, ...current.notices]
			}))
		});
		get().touch();
		return { ok: true };
	},
	transfer: (input) => {
		const id = get().sessionUserId;
		const user = get().users.find((item) => item.id === id);
		if (!user) return {
			ok: false,
			error: "Sesión no válida."
		};
		const amount = roundMoney(input.amount);
		const concept = input.concept.trim();
		const reference = input.reference.trim();
		if (!Number.isFinite(amount) || amount <= 0) return {
			ok: false,
			error: "Capture un monto mayor a cero."
		};
		if (!/^\d{1,7}$/.test(reference)) return {
			ok: false,
			error: "La referencia debe ser numérica, de 1 a 7 dígitos."
		};
		if (concept.length < 3 || concept.length > 40) return {
			ok: false,
			error: "El concepto debe tener entre 3 y 40 caracteres."
		};
		const origin = user.accounts.find((account) => account.id === input.fromAccountId);
		if (!origin) return {
			ok: false,
			error: "Seleccione la cuenta origen."
		};
		if (origin.number === input.beneficiaryAccount) return {
			ok: false,
			error: "La cuenta destino debe ser distinta de la origen."
		};
		if (!input.own) {
			const saved = user.beneficiaries.find((item) => item.account === input.beneficiaryAccount);
			if (!saved || !isBeneficiaryActive(saved)) return {
				ok: false,
				error: "El beneficiario no está activo. Debe concluir el periodo de activación."
			};
			if (amount > saved.limit) return {
				ok: false,
				error: "El monto supera el límite registrado para ese beneficiario."
			};
		}
		if (amount > origin.balance) return {
			ok: false,
			error: "Saldo insuficiente en la cuenta origen."
		};
		const used = dailyUsedNow(user);
		if (amount > user.perOpLimit) return {
			ok: false,
			error: "El monto supera su límite por operación. Puede ajustarlo en Ajustes."
		};
		if (used + amount > user.dailyLimit) return {
			ok: false,
			error: "El monto supera el límite diario disponible."
		};
		const needsSecond = user.segment === "empresas" && !input.own && amount > 5e4;
		const folioNum = get().folioSeq + 1;
		const folio = needsSecond ? `BW-${folioNum}` : String(96e4 + folioNum % 1e3).padStart(6, "0");
		const nowIso = (/* @__PURE__ */ new Date()).toISOString();
		const day = mexicoDay();
		const baseUsed = user.dailyStamp === day ? user.dailyUsed : 0;
		if (needsSecond) {
			set({
				folioSeq: folioNum,
				users: mapUser(get().users, user.id, (current) => ({
					...current,
					pending: [{
						id: uid("pend"),
						fromAccountId: origin.id,
						beneficiaryName: input.beneficiaryName,
						beneficiaryAccount: input.beneficiaryAccount,
						amount,
						concept: concept.toUpperCase(),
						reference,
						createdAt: nowIso,
						status: "pendiente_segunda_firma",
						folio
					}, ...current.pending],
					audit: [{
						id: uid("aud"),
						at: nowIso,
						event: "Transferencia en espera de segunda firma",
						detail: `${amount.toFixed(2)} a ${input.beneficiaryName}. Supera $50,000.00 y requiere al facultado autorizador.`,
						folio: `BT-${folioNum}`
					}, ...current.audit],
					notices: [{
						id: uid("nt"),
						at: nowIso,
						channel: "Correo",
						title: "Pendiente de autorización",
						body: `Se capturó una transferencia por ${amount.toFixed(2)} pendiente de la clave del autorizador. Folio ${folio}.`,
						read: false
					}, ...current.notices]
				}))
			});
			get().touch();
			return {
				ok: true,
				receipt: {
					kind: "pendiente",
					at: nowIso,
					amount,
					originMask: origin.number,
					beneficiary: input.beneficiaryName,
					destMask: input.beneficiaryAccount,
					concept: concept.toUpperCase(),
					reference,
					folio,
					commission: 0
				}
			};
		}
		const nextOriginBalance = roundMoney(origin.balance - amount);
		const dest = input.own ? user.accounts.find((account) => account.number === input.beneficiaryAccount) : void 0;
		set({
			folioSeq: folioNum,
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				dailyStamp: day,
				dailyUsed: roundMoney(baseUsed + amount),
				accounts: current.accounts.map((account) => {
					if (account.id === origin.id) return {
						...account,
						balance: nextOriginBalance
					};
					if (dest && account.id === dest.id) return {
						...account,
						balance: roundMoney(account.balance + amount)
					};
					return account;
				}),
				movements: [
					{
						id: uid("mov"),
						accountId: origin.id,
						direction: "cargo",
						concept: "Transferencia realizada",
						amount,
						balanceAfter: nextOriginBalance,
						folio,
						at: nowIso,
						reference,
						counterparty: input.beneficiaryName
					},
					...dest ? [{
						id: uid("mov"),
						accountId: dest.id,
						direction: "abono",
						concept: "Transferencia recibida",
						amount,
						balanceAfter: roundMoney(dest.balance + amount),
						folio,
						at: nowIso,
						reference,
						counterparty: "Cuenta propia"
					}] : [],
					...current.movements
				],
				audit: [{
					id: uid("aud"),
					at: nowIso,
					event: "Transferencia aplicada",
					detail: `Cargo ${amount.toFixed(2)} de ${origin.number} a ${input.beneficiaryAccount}. Comisión 0.00. Clave dinámica validada.`,
					folio: `BT-${folioNum}`
				}, ...current.audit],
				notices: [{
					id: uid("nt"),
					at: nowIso,
					channel: "SMS",
					title: "Transferencia enviada",
					body: `Mifos: cargo por ${amount.toFixed(2)}. Folio ${folio}. Comisión $0.00. Si no reconoce la operación, llame al 477 461 4700.`,
					read: false
				}, ...current.notices]
			}))
		});
		get().touch();
		return {
			ok: true,
			receipt: {
				kind: "aplicada",
				at: nowIso,
				amount,
				originMask: origin.number,
				beneficiary: input.beneficiaryName,
				destMask: input.beneficiaryAccount,
				concept: concept.toUpperCase(),
				reference,
				folio,
				commission: 0
			}
		};
	},
	resolvePending: (pendingId, approve) => {
		const id = get().sessionUserId;
		const user = get().users.find((item) => item.id === id);
		if (!user) return {
			ok: false,
			error: "Sesión no válida."
		};
		const item = user.pending.find((row) => row.id === pendingId && row.status === "pendiente_segunda_firma");
		if (!item) return {
			ok: false,
			error: "La operación ya no está pendiente."
		};
		const origin = user.accounts.find((account) => account.id === item.fromAccountId);
		if (!origin) return {
			ok: false,
			error: "La cuenta origen ya no existe."
		};
		const nowIso = (/* @__PURE__ */ new Date()).toISOString();
		const folioNum = get().folioSeq + 1;
		if (!approve) {
			set({
				folioSeq: folioNum,
				users: mapUser(get().users, user.id, (current) => ({
					...current,
					pending: current.pending.map((row) => row.id === pendingId ? {
						...row,
						status: "rechazada"
					} : row),
					audit: [{
						id: uid("aud"),
						at: nowIso,
						event: "Transferencia rechazada",
						detail: `El facultado autorizador rechazó el folio ${item.folio}.`,
						folio: `BT-${folioNum}`
					}, ...current.audit]
				}))
			});
			get().touch();
			return { ok: true };
		}
		if (item.amount > origin.balance) return {
			ok: false,
			error: "Saldo insuficiente para autorizar."
		};
		if (dailyUsedNow(user) + item.amount > user.dailyLimit) return {
			ok: false,
			error: "Supera el límite diario disponible."
		};
		const day = mexicoDay();
		const baseUsed = user.dailyStamp === day ? user.dailyUsed : 0;
		const nextBalance = roundMoney(origin.balance - item.amount);
		const opFolio = String(96e4 + folioNum % 1e3).padStart(6, "0");
		set({
			folioSeq: folioNum,
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				dailyStamp: day,
				dailyUsed: roundMoney(baseUsed + item.amount),
				accounts: current.accounts.map((account) => account.id === origin.id ? {
					...account,
					balance: nextBalance
				} : account),
				pending: current.pending.filter((row) => row.id !== pendingId),
				movements: [{
					id: uid("mov"),
					accountId: origin.id,
					direction: "cargo",
					concept: "Transferencia realizada",
					amount: item.amount,
					balanceAfter: nextBalance,
					folio: opFolio,
					at: nowIso,
					reference: item.reference,
					counterparty: item.beneficiaryName
				}, ...current.movements],
				audit: [{
					id: uid("aud"),
					at: nowIso,
					event: "Segunda firma aplicada",
					detail: `Se autorizó ${item.folio} con la clave dinámica del facultado autorizador. Folio de cargo ${opFolio}.`,
					folio: `BT-${folioNum}`
				}, ...current.audit],
				notices: [{
					id: uid("nt"),
					at: nowIso,
					channel: "Correo",
					title: "Transferencia autorizada",
					body: `Se aplicó el cargo por ${item.amount.toFixed(2)} a ${item.beneficiaryName}. Folio ${opFolio}.`,
					read: false
				}, ...current.notices]
			}))
		});
		get().touch();
		return {
			ok: true,
			receipt: {
				kind: "aplicada",
				at: nowIso,
				amount: item.amount,
				originMask: origin.number,
				beneficiary: item.beneficiaryName,
				destMask: item.beneficiaryAccount,
				concept: item.concept,
				reference: item.reference,
				folio: opFolio,
				commission: 0
			}
		};
	},
	requestProduct: ({ product, amount, termMonths }) => {
		const id = get().sessionUserId;
		const user = get().users.find((item) => item.id === id);
		if (!user) return {
			ok: false,
			error: "Sesión no válida."
		};
		if (!product) return {
			ok: false,
			error: "Seleccione un producto."
		};
		if (!Number.isFinite(amount) || amount <= 0) return {
			ok: false,
			error: "Indique un monto."
		};
		const folioNum = get().folioSeq + 1;
		const folio = `SL-${folioNum}`;
		const nowIso = (/* @__PURE__ */ new Date()).toISOString();
		set({
			folioSeq: folioNum,
			users: mapUser(get().users, user.id, (current) => ({
				...current,
				requests: [{
					id: uid("sol"),
					at: nowIso,
					product,
					amount: roundMoney(amount),
					termMonths,
					folio,
					status: "recibida"
				}, ...current.requests],
				audit: [{
					id: uid("aud"),
					at: nowIso,
					event: "Solicitud de producto",
					detail: `${product}. No constituye contrato ni aprobación de crédito.`,
					folio: `BT-${folioNum}`
				}, ...current.audit]
			}))
		});
		get().touch();
		return { ok: true };
	},
	markNoticesRead: () => {
		const id = get().sessionUserId;
		if (!id) return;
		set({ users: mapUser(get().users, id, (current) => ({
			...current,
			notices: current.notices.map((notice) => ({
				...notice,
				read: true
			}))
		})) });
	}
}), {
	name: "avantthya-banca-web",
	version: 1,
	skipHydration: true,
	partialize: (state) => ({
		users: state.users,
		sessionUserId: state.sessionUserId,
		sessionExpiresAt: state.sessionExpiresAt,
		pendingUserId: state.pendingUserId,
		screen: state.screen,
		folioSeq: state.folioSeq
	})
}));
function useSessionUser() {
	return useBanca((state) => state.users.find((user) => user.id === state.sessionUserId) ?? null);
}
function usePendingUser() {
	return useBanca((state) => state.users.find((user) => user.id === state.pendingUserId) ?? null);
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonStyles = cva("inline-flex items-center justify-center gap-2 rounded-md px-4 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50", {
	variants: {
		variant: {
			primary: "bg-brand text-on-brand hover:bg-brand-deep",
			ink: "bg-ink text-on-ink hover:bg-ink-soft",
			ghost: "border border-line bg-card text-ink hover:bg-paper",
			quiet: "bg-transparent text-ink hover:bg-paper"
		},
		size: {
			md: "h-11 text-sm",
			sm: "h-10 text-sm"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ variant, size, className, type = "button", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: cn(buttonStyles({
			variant,
			size
		}), className),
		...props
	});
}
function Field({ label, hint, error, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mb-1.5 block text-sm font-medium text-ink",
				children: label
			}),
			children,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1 block text-xs text-brand",
				children: error
			}) : null,
			hint && !error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1 block text-xs text-muted",
				children: hint
			}) : null
		]
	});
}
var inputClass = "h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink outline-none transition-shadow placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";
function Mark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 64 64",
		className,
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "32",
				cy: "32",
				r: "32",
				className: "fill-brand"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "32",
				cy: "32",
				r: "28.5",
				fill: "none",
				className: "stroke-on-brand",
				strokeWidth: "1.25"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				className: "fill-on-brand",
				d: "M16.5 50.5 32 12.5 47.5 50.5h-7.2L32 29.8 23.7 50.5z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				className: "fill-brand",
				d: "M28.2 40.2h7.6L32 30.6z"
			})
		]
	});
}
function Modal({ title, onClose, children, footer, wide }) {
	const closeRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		closeRef.current?.focus();
		const onKey = (event) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-3 sm:items-center",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "dialog",
			"aria-modal": "true",
			"aria-label": title,
			className: cn("max-h-[92vh] w-full overflow-auto rounded-lg bg-card shadow-2xl", wide ? "max-w-lg" : "max-w-md"),
			onClick: (event) => event.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center justify-between bg-ink px-4 py-3 text-on-ink",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-semibold tracking-wide",
						children: title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						ref: closeRef,
						type: "button",
						onClick: onClose,
						"aria-label": "Cerrar",
						className: "rounded-md p-1 text-on-ink hover:bg-ink-soft",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-5",
					children
				}),
				footer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap justify-end gap-2 px-5 pb-5",
					children: footer
				}) : null
			]
		})
	});
}
function Panel({ title, action, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("rounded-lg border border-line bg-card", className),
		children: [title ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-center justify-between gap-3 border-b border-line px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-semibold",
				children: title
			}), action]
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-4",
			children
		})]
	});
}
var OtpContext = (0, import_react.createContext)(null);
function useAskOtp() {
	const ask = (0, import_react.useContext)(OtpContext);
	if (!ask) throw new Error("Clave dinámica no disponible");
	return ask;
}
function OtpProvider({ children }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [digits, setDigits] = (0, import_react.useState)(Array(6).fill(""));
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const pending = (0, import_react.useRef)(null);
	const inputs = (0, import_react.useRef)([]);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const id = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(id);
	}, [open]);
	const code = otpAt(0, now);
	const remain = 30 - Math.floor(now / 1e3) % 30;
	function ask(onSuccess) {
		pending.current = onSuccess;
		setDigits(Array(6).fill(""));
		setError("");
		setNow(Date.now());
		setOpen(true);
	}
	function close() {
		pending.current = null;
		setOpen(false);
	}
	function accept(next = digits) {
		if (!otpValid(next.join(""))) {
			setError("La clave dinámica no es válida o acaba de expirar. Use la clave vigente del token.");
			return;
		}
		const fn = pending.current;
		pending.current = null;
		setOpen(false);
		fn?.();
	}
	function fillDemo() {
		const next = code.split("");
		setDigits(next);
		setError("");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(OtpContext.Provider, {
		value: ask,
		children: [children, open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
			title: "Clave dinámica",
			onClose: close,
			footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				onClick: close,
				children: "Cancelar"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => accept(),
				children: "Aceptar"
			})] }),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-paper text-ink",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Esta operación requiere un segundo factor de autenticación categoría 3, distinto del que usó para entrar. En producción la clave se genera en su banca móvil y no aparece en este canal."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 rounded-lg border border-line bg-paper p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-wide text-muted",
							children: "Token de demostración"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "num mt-1 text-3xl font-semibold tracking-widest text-ink",
							children: code
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 h-1 overflow-hidden rounded-full bg-line",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full bg-brand",
								style: { width: `${remain / 30 * 100}%` }
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex items-center justify-between text-xs text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"Cambia en ",
								remain,
								"s"
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "font-semibold text-brand",
								onClick: fillDemo,
								children: "Usar esta clave"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 flex justify-center gap-2",
					children: digits.map((digit, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: (node) => {
							inputs.current[index] = node;
						},
						inputMode: "numeric",
						autoComplete: "one-time-code",
						"aria-label": `Dígito ${index + 1} de la clave dinámica`,
						maxLength: 1,
						value: digit,
						className: "num size-11 rounded-md border border-line text-center text-lg font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20",
						onChange: (event) => {
							const value = event.target.value.replace(/\D/g, "").slice(-1);
							const next = digits.slice();
							next[index] = value;
							setDigits(next);
							if (value && index < 5) inputs.current[index + 1]?.focus();
						},
						onKeyDown: (event) => {
							if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
							if (event.key === "Enter") accept();
						},
						onPaste: (event) => {
							const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
							if (!pasted) return;
							event.preventDefault();
							const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
							setDigits(next);
							inputs.current[Math.min(pasted.length, 5)]?.focus();
						}
					}, index))
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-center text-xs text-brand",
					children: error
				}) : null
			]
		}) : null]
	});
}
var logo_wordmark_default = "/assets/logo-wordmark-sa8Ra9YS.png";
var FEATURE_KEYS = [
	"features.balances",
	"features.ownTransfers",
	"features.thirdParty",
	"features.receipts"
];
function PublicScreens() {
	const screen = useBanca((state) => state.screen);
	const [, force] = (0, import_react.useState)(0);
	function switchLocale(next) {
		setLocale(next);
		force((n) => n + 1);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen flex-col bg-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1 bg-brand" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center justify-between gap-4 px-4 py-4 text-on-ink sm:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-10" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-bold tracking-wide",
						children: t("app.name")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-on-ink/70",
						children: t("app.tagline")
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hidden text-xs text-on-ink/70 sm:block",
						children: t("app.subtitle")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `rounded px-2 py-1 ${getLocale() === "es-MX" ? "bg-brand text-on-brand" : "text-on-ink/70 hover:text-on-ink"}`,
							onClick: () => switchLocale("es-MX"),
							children: "ES"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `rounded px-2 py-1 ${getLocale() === "en-US" ? "bg-brand text-on-brand" : "text-on-ink/70 hover:text-on-ink"}`,
							onClick: () => switchLocale("en-US"),
							children: "EN"
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "flex flex-1 items-center justify-center px-4 py-6 sm:px-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden text-on-ink lg:block",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold tracking-widest text-brand",
								children: t("app.channel")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-3 max-w-md text-4xl font-semibold leading-tight",
								children: t("app.hero")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-8 space-y-3 text-sm text-on-ink/85",
								children: FEATURE_KEYS.map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 rounded-full bg-brand" }), t(key)]
								}, key))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-10 max-w-sm text-xs leading-relaxed text-on-ink/60",
								children: t("app.regulatory")
							})
						]
					}), screen === "register" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RegisterCard, {}) : screen === "login" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginCard, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LandingCard, {})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "flex flex-col gap-2 px-4 py-4 text-xs text-on-ink/65 sm:flex-row sm:items-center sm:justify-between sm:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("app.footerLocation") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("app.footerDisclaimer") })]
			})
		]
	});
}
function LandingCard() {
	const continueClient = useBanca((state) => state.continueClient);
	const go = useBanca((state) => state.go);
	const [segment, setSegment] = (0, import_react.useState)("personas");
	const [client, setClient] = (0, import_react.useState)("344988355");
	const [error, setError] = (0, import_react.useState)("");
	function submit(event) {
		event.preventDefault();
		const result = continueClient(client);
		if (!result.ok) setError(result.error);
	}
	function demo(nextSegment, number) {
		setSegment(nextSegment);
		setClient(number);
		setError("");
		const result = continueClient(number);
		if (!result.ok) setError(result.error);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		action: "javascript:void(0)",
		onSubmit: submit,
		className: "rounded-lg bg-card p-6 shadow-xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: logo_wordmark_default,
				alt: t("app.wordmarkAlt"),
				className: "mx-auto mb-5 h-16 w-auto"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentSwitch, {
				value: segment,
				onChange: (next) => {
					setSegment(next);
					setClient(next === "personas" ? "344988355" : "880214001");
					setError("");
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t("landing.clientNumber"),
					error,
					hint: t("landing.clientHint"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserRound, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: `${inputClass} pl-10`,
							inputMode: "numeric",
							autoComplete: "username",
							value: client,
							onChange: (event) => {
								setClient(event.target.value.replace(/\D/g, "").slice(0, 12));
								setError("");
							}
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				className: "mt-4 w-full",
				children: t("landing.continue")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ink",
				className: "mt-2 w-full",
				onClick: () => {
					setError("");
					go("register");
				},
				children: t("landing.register")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 grid gap-2 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => demo("personas", "344988355"),
					className: "rounded-md border border-line px-3 py-2 text-left hover:border-brand",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-muted",
						children: t("landing.demoPersonas")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold",
						children: "Noé López Guzmán"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => demo("empresas", "880214001"),
					className: "rounded-md border border-line px-3 py-2 text-left hover:border-brand",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-muted",
						children: t("landing.demoEmpresas")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold",
						children: "Taller Industrial del Bajío"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-center text-xs text-muted",
				children: t("landing.demoPassword", { password: DEMO_PASSWORD })
			})
		]
	});
}
function LoginCard() {
	const user = usePendingUser();
	const login = useBanca((state) => state.login);
	const go = useBanca((state) => state.go);
	const [password, setPassword] = (0, import_react.useState)(DEMO_PASSWORD);
	const [show, setShow] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	function submit(event) {
		event.preventDefault();
		const result = login(password);
		if (!result.ok) setError(result.error);
		else toast.success(t("login.welcome"));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		action: "javascript:void(0)",
		onSubmit: submit,
		className: "rounded-lg bg-card p-6 shadow-xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-paper text-muted",
				children: user?.segment === "empresas" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Landmark, { className: "size-6" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserRound, { className: "size-6" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-center text-lg font-semibold",
				children: user?.loginHint ?? t("login.clientFallback")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-center text-sm text-muted",
				children: t("login.passwordPrompt")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t("login.password"),
					error,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative block",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockKeyhole, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: `${inputClass} pr-11 pl-10`,
								type: show ? "text" : "password",
								autoComplete: "current-password",
								value: password,
								onChange: (event) => {
									setPassword(event.target.value);
									setError("");
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "absolute top-1/2 right-3 -translate-y-1/2 text-muted",
								"aria-label": show ? t("login.hidePassword") : t("login.showPassword"),
								onClick: () => setShow((value) => !value),
								children: show ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" })
							})
						]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				className: "mt-4 w-full",
				children: t("login.submit")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ink",
				className: "mt-2 w-full",
				onClick: () => go("landing"),
				children: t("login.cancel")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-center text-xs text-muted",
				children: t("login.factorNote")
			})
		]
	});
}
function RegisterCard() {
	const go = useBanca((state) => state.go);
	const enroll = useBanca((state) => state.enroll);
	const [segment, setSegment] = (0, import_react.useState)("personas");
	const [show, setShow] = (0, import_react.useState)(false);
	const [termsOpen, setTermsOpen] = (0, import_react.useState)(false);
	const [accepted, setAccepted] = (0, import_react.useState)(false);
	const [activation, setActivation] = (0, import_react.useState)(false);
	const [code, setCode] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		paternal: "",
		maternal: "",
		company: "",
		rfc: "",
		email: "",
		client: "",
		password: "",
		confirm: "",
		phone: "",
		birth: ""
	});
	function set(key, value) {
		setForm((current) => ({
			...current,
			[key]: value
		}));
		setError("");
	}
	function submit(event) {
		event.preventDefault();
		if (!accepted) {
			setError(t("register.acceptTerms"));
			return;
		}
		const client = form.client.replace(/\D/g, "");
		if (!/^\d{6,12}$/.test(client)) {
			setError(t("register.clientDigits"));
			return;
		}
		const issues = passwordIssues(form.password, client);
		if (issues.length) {
			setError(t("register.passwordNeeds", { issues: issues.join(", ") }));
			return;
		}
		if (form.password !== form.confirm) {
			setError(t("register.passwordMismatch"));
			return;
		}
		if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) {
			setError(t("register.phoneDigits"));
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
			setError("Capture un correo válido.");
			return;
		}
		if (segment === "personas") {
			if (!form.name.trim() || !form.paternal.trim()) {
				setError("Nombre y apellido paterno son obligatorios.");
				return;
			}
			if (!form.birth) {
				setError("Indique su fecha de nacimiento.");
				return;
			}
			const born = new Date(form.birth);
			const adult = /* @__PURE__ */ new Date();
			adult.setFullYear(adult.getFullYear() - 18);
			if (Number.isNaN(born.getTime()) || born > adult) {
				setError("El titular debe ser mayor de edad.");
				return;
			}
		} else if (!form.company.trim() || !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(form.rfc.trim())) {
			setError("Capture la razón social y un RFC de persona moral válido.");
			return;
		}
		setActivation(true);
	}
	function confirmActivation() {
		if (code.trim() !== "482915") {
			setError("El código de activación no coincide.");
			return;
		}
		const displayName = segment === "personas" ? `${form.name} ${form.paternal} ${form.maternal}`.replace(/\s+/g, " ").trim() : form.company.trim();
		const result = enroll({
			segment,
			clientNumber: form.client,
			password: form.password,
			displayName,
			email: form.email,
			phone: form.phone,
			extraId: segment === "empresas" ? form.rfc : ""
		});
		if (!result.ok) {
			setError(result.error);
			setActivation(false);
			return;
		}
		setActivation(false);
		toast.success("Banca Web activada. Ya puede iniciar sesión.");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			action: "javascript:void(0)",
			onSubmit: submit,
			className: "max-h-[78vh] overflow-auto rounded-lg bg-card p-6 shadow-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-5 text-brand" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-semibold",
						children: "Contratar Banca Web"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "Solo si ya es cliente. El alta de cuenta se hace en sucursal."
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentSwitch, {
					value: segment,
					onChange: setSegment
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid gap-3",
					children: [
						segment === "personas" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Nombre",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									value: form.name,
									onChange: (event) => set("name", event.target.value)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3 sm:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Apellido paterno",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: inputClass,
										value: form.paternal,
										onChange: (event) => set("paternal", event.target.value)
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Apellido materno",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: inputClass,
										value: form.maternal,
										onChange: (event) => set("maternal", event.target.value)
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Fecha de nacimiento",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									type: "date",
									value: form.birth,
									onChange: (event) => set("birth", event.target.value)
								})
							})
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Razón social",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								value: form.company,
								onChange: (event) => set("company", event.target.value)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "RFC",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								value: form.rfc,
								onChange: (event) => set("rfc", event.target.value.toUpperCase())
							})
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Correo electrónico",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								type: "email",
								autoComplete: "email",
								value: form.email,
								onChange: (event) => set("email", event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Número de celular",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								inputMode: "numeric",
								value: form.phone,
								onChange: (event) => set("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Número de cliente",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								inputMode: "numeric",
								value: form.client,
								onChange: (event) => set("client", event.target.value.replace(/\D/g, "").slice(0, 12))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Contraseña",
							hint: "8 caracteres, mayúscula, minúscula, dígito y símbolo.",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "relative block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: `${inputClass} pr-11`,
									type: show ? "text" : "password",
									autoComplete: "new-password",
									value: form.password,
									onChange: (event) => set("password", event.target.value)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "absolute top-1/2 right-3 -translate-y-1/2 text-muted",
									onClick: () => setShow((value) => !value),
									"aria-label": "Mostrar contraseña",
									children: show ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" })
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Confirmar contraseña",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								type: "password",
								autoComplete: "new-password",
								value: form.confirm,
								onChange: (event) => set("confirm", event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-start gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "mt-1 size-4 accent-brand",
								checked: accepted,
								onChange: (event) => setAccepted(event.target.checked)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"Acepto los",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "font-semibold text-brand underline",
									onClick: () => setTermsOpen(true),
									children: "términos de Banca Web"
								}),
								" ",
								"y el aviso de privacidad."
							] })]
						}),
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-brand",
							children: error
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								children: "Registrar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ink",
								onClick: () => go("landing"),
								children: "Cancelar"
							})]
						})
					]
				})
			]
		}),
		termsOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
			title: "Términos de Banca Web",
			onClose: () => setTermsOpen(false),
			wide: true,
			footer: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => {
					setAccepted(true);
					setTermsOpen(false);
				},
				children: "Aceptar"
			}),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TermsBody, {})
		}) : null,
		activation ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
			title: "Solo un paso más",
			onClose: () => setActivation(false),
			footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				onClick: () => toast("En producción reenviaríamos el código. Use 482915."),
				children: "Reenviar"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: confirmActivation,
				children: "Aceptar"
			})] }),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Enviamos un código de activación a ",
					form.email || "su correo",
					". En este prototipo el código es",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-ink",
						children: DEMO_ACTIVATION_CODE
					}),
					"."
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: t("register.activationCode"),
					error: error && activation ? error : void 0,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: inputClass,
						value: code,
						onChange: (event) => setCode(event.target.value.toUpperCase())
					})
				})
			})]
		}) : null
	] });
}
function SegmentSwitch({ value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-2 rounded-md bg-paper p-1 text-sm font-semibold",
		children: [["personas", t("segment.personas")], ["empresas", t("segment.empresas")]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => onChange(id),
			className: value === id ? "h-10 rounded bg-ink text-on-ink" : "h-10 rounded text-muted",
			children: label
		}, id))
	});
}
function TermsBody() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3 text-sm leading-relaxed text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "El servicio de Banca Web de COMPANY NAME , S.A. DE C.V., S.F.P. (Mifos) permite consultar saldos y movimientos, y ordenar transferencias entre cuentas propias y a terceros de la misma entidad." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "El identificador de usuario es único. Para iniciar sesión se valida ese identificador y un factor de autenticación categoría 2 (contraseña). Las transferencias, el alta o baja de beneficiarios, el cambio de medios de aviso y el incremento de límites exigen además una clave dinámica de un solo uso, factor categoría 3." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "La sesión termina a los 5 minutos sin actividad. Tres autenticaciones fallidas bloquean el acceso 10 minutos. Un beneficiario nuevo no puede recibir fondos hasta concluir el periodo de activación. En empresas, los cargos mayores a $50,000.00 requieren la intervención del facultado autorizador." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Usted puede disminuir sus límites de inmediato. Incrementarlos pide clave dinámica y no puede rebasar el tope institucional del perfil. Cada operación monetaria genera comprobante con folio, y queda en la bitácora." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Aviso de privacidad: los datos se usan para identificarle, autenticarle, operar el canal y enviarle alertas. Puede ejercer sus derechos ARCO en Blvd. Paseo de los Insurgentes 301, Col. Los Paraísos, León, Gto., o al 477 461 4700. Este prototipo guarda la información solo en su navegador." })
		]
	});
}
var ICONS = {
	dashboard: House,
	transfer: ArrowLeftRight,
	movements: ScrollText,
	approvals: ShieldCheck,
	request: FilePlus2,
	settings: Settings,
	audit: ScrollText,
	notices: Bell,
	about: Info,
	help: CircleHelp
};
function AppShell() {
	const screen = useBanca((state) => state.screen);
	const go = useBanca((state) => state.go);
	const endSession = useBanca((state) => state.endSession);
	const touch = useBanca((state) => state.touch);
	const user = useSessionUser();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const expires = useBanca((state) => state.sessionExpiresAt);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, []);
	const remaining = Math.max(0, (expires ?? now) - now);
	const warn = Boolean(expires && remaining > 0 && remaining < 6e4);
	(0, import_react.useEffect)(() => {
		if (warn) return;
		const bump = () => touch();
		window.addEventListener("pointerdown", bump);
		window.addEventListener("keydown", bump);
		return () => {
			window.removeEventListener("pointerdown", bump);
			window.removeEventListener("keydown", bump);
		};
	}, [touch, warn]);
	if (!user) return null;
	const unread = user.notices.filter((notice) => !notice.read).length;
	const pendingCount = user.pending.filter((item) => item.status === "pendiente_segunda_firma").length;
	const items = getNav().filter((item) => !item.empresasOnly || user.segment === "empresas");
	function navigate(next) {
		go(next);
		setOpen(false);
		if (next === "notices") useBanca.getState().markNoticesRead();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1 bg-brand" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-[calc(100vh-4px)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
					className: "hidden w-64 shrink-0 flex-col bg-ink text-on-ink md:flex",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarBody, {
						name: user.displayName,
						role: user.roleLabel,
						items,
						screen,
						unread,
						pendingCount,
						onNavigate: navigate,
						onLogout: () => {
							endSession("voluntario");
							toast(t("session.closed"));
						}
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 flex-1 flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 text-on-ink",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "rounded-md p-2 md:hidden",
									"aria-label": "Abrir menú",
									onClick: () => setOpen(true),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-sm font-semibold tracking-wide",
									children: getScreenTitle(screen)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "num text-xs text-on-ink/75",
								children: ["Sesión ", formatClock(remaining)]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "border-b border-line bg-card px-4 py-2 text-xs text-muted",
							children: "Prototipo de demostración. No está conectado al núcleo de Mifos y no mueve dinero real."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex-1 p-4 md:p-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mx-auto max-w-5xl",
								children: [
									screen === "dashboard" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dashboard, {}) : null,
									screen === "transfer" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transfer, {}) : null,
									screen === "movements" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Movements, {}) : null,
									screen === "approvals" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Approvals, {}) : null,
									screen === "request" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequestProduct, {}) : null,
									screen === "settings" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsView, {}) : null,
									screen === "audit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuditView, {}) : null,
									screen === "notices" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Notices, {}) : null,
									screen === "about" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(About, {}) : null,
									screen === "help" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Help, {}) : null
								]
							})
						})
					]
				})]
			}),
			open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-40 bg-ink/60 md:hidden",
				onClick: () => setOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full w-72 flex-col bg-ink text-on-ink",
					onClick: (event) => event.stopPropagation(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "self-end p-4",
						"aria-label": "Cerrar menú",
						onClick: () => setOpen(false),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarBody, {
						name: user.displayName,
						role: user.roleLabel,
						items,
						screen,
						unread,
						pendingCount,
						onNavigate: navigate,
						onLogout: () => endSession("voluntario")
					})]
				})
			}) : null,
			warn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				title: t("session.expiring"),
				onClose: () => touch(),
				footer: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => touch(),
					children: t("session.continue")
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"Por inactividad, Banca Web se cerrará en ",
						formatClock(remaining),
						". Elija continuar si sigue en el canal."
					]
				})
			}) : null
		]
	});
}
function SidebarBody({ name, role, items, screen, unread, pendingCount, onNavigate, onLogout }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-b border-on-ink/10 px-4 py-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-9" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-bold",
						children: t("app.name")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-on-ink/65",
						children: t("app.tagline")
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm font-medium leading-snug",
					children: t("session.hello", { name })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-on-ink/65",
					children: role
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
			className: "flex-1 overflow-auto py-2",
			children: items.map((item) => {
				const Icon = ICONS[item.screen] ?? House;
				const badge = item.screen === "notices" ? unread : item.screen === "approvals" ? pendingCount : 0;
				const active = screen === item.screen;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onNavigate(item.screen),
					className: active ? "flex w-full items-center gap-3 border-l-4 border-brand bg-on-ink/10 px-4 py-3 text-left text-sm" : "flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-3 text-left text-sm text-on-ink/80 hover:bg-on-ink/5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex-1",
							children: item.label
						}),
						badge > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "num rounded-full bg-brand px-2 py-0.5 text-xs text-on-brand",
							children: badge
						}) : null
					]
				}, item.screen);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: onLogout,
			className: "flex items-center gap-3 px-4 py-4 text-left text-sm text-on-ink/80",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4" }), "Cerrar sesión"]
		})
	] });
}
function formatClock(ms) {
	const total = Math.ceil(ms / 1e3);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function Dashboard() {
	const user = useSessionUser();
	const go = useBanca((state) => state.go);
	if (!user) return null;
	const balance = user.accounts.reduce((sum, account) => sum + account.balance, 0);
	const used = dailyUsedNow(user);
	const recent = user.movements.slice(0, 4);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: t("session.lastLogin", { when: formatWhen(user.previousLogin) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: t("dashboard.products"),
						value: String(user.accounts.length)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: t("dashboard.creditAccounts"),
						value: "0"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: user.segment === "empresas" ? t("dashboard.businessAccounts") : t("dashboard.savingsAccounts"),
						value: String(user.accounts.length)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: t("dashboard.creditSummary"),
					value: formatMoney(0)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: t("dashboard.savingsSummary"),
					value: formatMoney(balance)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-[1.3fr_0.7fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Cuentas",
					action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => go("transfer"),
						children: t("dashboard.transfer")
					}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-3",
						children: user.accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-semibold",
									children: account.alias
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted",
									children: account.product
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "num text-xs text-muted",
									children: account.number
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "num text-lg font-semibold",
								children: formatMoney(account.balance)
							})]
						}, account.id))
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Límites de hoy",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Disponible"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "num text-2xl font-semibold",
							children: formatMoney(Math.max(user.dailyLimit - used, 0))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-xs text-muted",
							children: [
								"Tope diario ",
								formatMoney(user.dailyLimit),
								" · por operación ",
								formatMoney(user.perOpLimit)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "ghost",
							className: "mt-3",
							onClick: () => go("settings"),
							children: "Ajustar límites"
						})
					]
				})]
			}),
			user.segment === "empresas" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "Personas facultadas",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: ["Captura y autoriza hasta ", formatMoney(SECOND_SIGN_AT)]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: "María Elena Ríos Campos"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "Autoriza montos superiores"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: user.signerName
					})] })]
				}), user.pending.some((item) => item.status === "pendiente_segunda_firma") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-4",
					onClick: () => go("approvals"),
					children: "Revisar autorizaciones"
				}) : null]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "Últimos movimientos",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "quiet",
					onClick: () => go("movements"),
					children: "Ver todos"
				}),
				children: [recent.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Aún no hay movimientos."
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-3",
					children: recent.map((movement) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center justify-between gap-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: movement.concept
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: formatWhen(movement.at)
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: movement.direction === "cargo" ? "num font-semibold text-brand" : "num font-semibold",
							children: [movement.direction === "cargo" ? "−" : "+", formatMoney(movement.amount)]
						})]
					}, movement.id))
				})]
			})
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-line bg-card px-4 py-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-medium tracking-wide text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "num mt-2 text-2xl font-semibold text-ink",
			children: value
		})]
	});
}
function Transfer() {
	const user = useSessionUser();
	const transfer = useBanca((state) => state.transfer);
	const addBeneficiary = useBanca((state) => state.addBeneficiary);
	const removeBeneficiary = useBanca((state) => state.removeBeneficiary);
	const ask = useAskOtp();
	const [originId, setOriginId] = (0, import_react.useState)(user?.accounts[0]?.id ?? "");
	const [selected, setSelected] = (0, import_react.useState)("");
	const [query, setQuery] = (0, import_react.useState)("");
	const [amount, setAmount] = (0, import_react.useState)("500.00");
	const [reference, setReference] = (0, import_react.useState)("1234");
	const [concept, setConcept] = (0, import_react.useState)("PRESTAMO");
	const [benefOpen, setBenefOpen] = (0, import_react.useState)(false);
	const [receipt, setReceipt] = (0, import_react.useState)(null);
	const [tick, setTick] = (0, import_react.useState)(Date.now());
	const [draft, setDraft] = (0, import_react.useState)({
		name: "",
		account: "",
		alias: "",
		limit: "15000"
	});
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setTick(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, []);
	const destinations = (0, import_react.useMemo)(() => {
		if (!user) return [];
		const own = user.accounts.filter((account) => account.id !== originId).map((account) => ({
			id: `own-${account.id}`,
			name: "Cuenta propia",
			account: account.number,
			alias: account.alias,
			own: true,
			activatesAt: 0,
			limit: user.perOpLimit
		}));
		const third = user.beneficiaries.map((item) => ({
			...item,
			own: false
		}));
		return [...own, ...third].filter((item) => {
			return `${item.name} ${item.alias} ${item.account}`.toLowerCase().includes(query.trim().toLowerCase());
		});
	}, [
		user,
		originId,
		query
	]);
	(0, import_react.useEffect)(() => {
		if (!selected && destinations[0]) setSelected(destinations[0].id);
	}, [destinations, selected]);
	if (!user) return null;
	const current = destinations.find((item) => item.id === selected) ?? destinations[0];
	function confirmTransfer() {
		if (!current) {
			toast.error("Seleccione una cuenta destino.");
			return;
		}
		if (!current.own && !isBeneficiaryActive(current, tick)) {
			toast.error("Ese beneficiario sigue en periodo de activación.");
			return;
		}
		ask(() => {
			const result = transfer({
				fromAccountId: originId,
				beneficiaryName: current.name,
				beneficiaryAccount: current.account,
				own: current.own,
				amount: Number(amount),
				concept,
				reference
			});
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			if (result.receipt) setReceipt(result.receipt);
		});
	}
	function saveBenef(event) {
		event.preventDefault();
		ask(() => {
			const result = addBeneficiary({
				name: draft.name,
				account: draft.account,
				alias: draft.alias,
				limit: Number(draft.limit)
			});
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			setBenefOpen(false);
			setDraft({
				name: "",
				account: "",
				alias: "",
				limit: String(user?.perOpLimit ?? 15e3)
			});
			toast.success("Beneficiario registrado. Aún no puede recibir fondos.");
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-3 overflow-x-auto pb-1",
				children: user.accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setOriginId(account.id);
						setSelected("");
					},
					className: originId === account.id ? "min-w-56 rounded-lg border-2 border-brand bg-card p-4 text-left" : "min-w-56 rounded-lg border border-line bg-card p-4 text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: "MIFOS"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "num text-xl font-semibold",
							children: formatMoney(account.balance)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted",
							children: account.alias
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "num text-xs",
							children: ["Cta. ", account.number]
						})
					]
				}, account.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Cuenta destino",
					action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => setBenefOpen(true),
						children: "Agregar"
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: inputClass,
						placeholder: "Buscar beneficiario",
						value: query,
						onChange: (event) => setQuery(event.target.value)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 space-y-2",
						children: [destinations.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "No hay destinos con ese criterio."
						}) : null, destinations.map((item) => {
							const active = item.own || isBeneficiaryActive(item, tick);
							const left = Math.max(0, item.activatesAt - tick);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: current?.id === item.id ? "rounded-md border border-brand bg-paper p-3" : "rounded-md border border-transparent p-3 hover:bg-paper",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "w-full text-left",
									onClick: () => setSelected(item.id),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm font-semibold",
											children: item.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-muted",
											children: [
												item.alias,
												" · ",
												item.account
											]
										}),
										!active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 text-xs text-brand",
											children: [
												"Activo en ",
												formatClock(left),
												" · en producción el plazo es de ",
												REAL_ACTIVATION_LABEL
											]
										}) : null
									]
								}), !item.own ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "mt-2 text-xs font-semibold text-muted underline",
									onClick: () => ask(() => {
										const result = removeBeneficiary(item.id);
										if (!result.ok) toast.error(result.error);
										else {
											if (selected === item.id) setSelected("");
											toast.success("Beneficiario dado de baja.");
										}
									}),
									children: "Dar de baja"
								}) : null]
							}, item.id);
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Transferir",
					children: [current ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-3 text-sm text-muted",
						children: [
							"Beneficiario: ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-ink",
								children: current.name
							}),
							" (",
							current.account,
							")"
						]
					}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Monto",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									inputMode: "decimal",
									value: amount,
									onChange: (event) => setAmount(event.target.value)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Referencia",
								hint: "Numérica, hasta 7 dígitos.",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									inputMode: "numeric",
									value: reference,
									onChange: (event) => setReference(event.target.value.replace(/\D/g, "").slice(0, 7))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Concepto",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									maxLength: 40,
									value: concept,
									onChange: (event) => setConcept(event.target.value)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted",
								children: [
									"Comisión por transferencia entre cuentas Mifos: ",
									formatMoney(0),
									". Se mostrará de nuevo en el comprobante.",
									user.segment === "empresas" ? ` Arriba de ${formatMoney(SECOND_SIGN_AT)} a terceros queda pendiente de segunda firma.` : ""
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								className: "w-full",
								onClick: confirmTransfer,
								children: "Confirmar"
							})
						]
					})]
				})]
			}),
			benefOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				title: "Agregar beneficiario",
				onClose: () => setBenefOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					action: "javascript:void(0)",
					className: "space-y-3",
					onSubmit: saveBenef,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Cuenta Mifos",
							hint: "11 dígitos. Otros bancos, vía SPEI, no están en este prototipo.",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								inputMode: "numeric",
								value: draft.account,
								onChange: (event) => setDraft({
									...draft,
									account: event.target.value.replace(/\D/g, "").slice(0, 11)
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Nombre del beneficiario",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								value: draft.name,
								onChange: (event) => setDraft({
									...draft,
									name: event.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Alias",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								value: draft.alias,
								onChange: (event) => setDraft({
									...draft,
									alias: event.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Límite de transferencia",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								inputMode: "decimal",
								value: draft.limit,
								onChange: (event) => setDraft({
									...draft,
									limit: event.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								"Después de la clave dinámica el alta espera ",
								Math.round(ACTIVATION_MS / 1e3),
								" segundos en este prototipo, que representan el plazo real de ",
								REAL_ACTIVATION_LABEL,
								"."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-end gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								onClick: () => setBenefOpen(false),
								children: "Cancelar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								children: "Guardar"
							})]
						})
					]
				})
			}) : null,
			receipt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReceiptDialog, {
				receipt,
				onClose: () => setReceipt(null)
			}) : null
		]
	});
}
function ReceiptDialog({ receipt, onClose }) {
	const go = useBanca((state) => state.go);
	function download() {
		const text = [
			"MIFOS · Banca Web",
			"Comprobante de operación",
			`Fecha: ${formatWhen(receipt.at)}`,
			`Importe: ${formatMoney(receipt.amount)}`,
			`Comisión: ${formatMoney(receipt.commission)}`,
			`Estado: ${receipt.kind === "aplicada" ? "Aplicada" : "Pendiente de segunda firma"}`,
			`Cuenta origen: ${maskAccount(receipt.originMask)}`,
			`Beneficiario: ${receipt.beneficiary}`,
			`Cuenta destino: ${maskAccount(receipt.destMask)}`,
			`Concepto: ${receipt.concept}`,
			`Referencia: ${receipt.reference}`,
			`Número de movimiento: ${receipt.folio}`,
			"Prototipo de demostración. No es un comprobante fiscal ni una operación real."
		].join("\n");
		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `comprobante-${receipt.folio}.txt`;
		link.click();
		URL.revokeObjectURL(url);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		title: receipt.kind === "aplicada" ? "Transferencia exitosa" : "Pendiente de autorización",
		onClose,
		footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			variant: "ghost",
			onClick: download,
			children: "Descargar"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			onClick: () => {
				onClose();
				go(receipt.kind === "pendiente" ? "approvals" : "movements");
			},
			children: "Aceptar"
		})] }),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto mb-3 flex size-14 items-center justify-center rounded-full border border-ink text-xl font-semibold",
					children: receipt.kind === "aplicada" ? "✓" : "…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: formatWhen(receipt.at)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "num mt-1 text-3xl font-semibold",
					children: formatMoney(receipt.amount)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-muted",
					children: "Esta transferencia no genera comisión"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
			className: "mt-4 space-y-1 rounded-md bg-paper p-3 text-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					k: "Cuenta origen",
					v: maskAccount(receipt.originMask)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					k: "Beneficiario",
					v: receipt.beneficiary
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					k: "Cuenta destino",
					v: maskAccount(receipt.destMask)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					k: "Concepto",
					v: receipt.concept
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					k: "Referencia",
					v: receipt.reference
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					k: "Número de movimiento",
					v: receipt.folio
				})
			]
		})]
	});
}
function Row({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-muted",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "text-right font-medium",
			children: v
		})]
	});
}
function Movements() {
	const user = useSessionUser();
	const [accountId, setAccountId] = (0, import_react.useState)("all");
	if (!user) return null;
	const rows = user.movements.filter((movement) => accountId === "all" || movement.accountId === accountId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
					active: accountId === "all",
					onClick: () => setAccountId("all"),
					children: "Todas"
				}), user.accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
					active: accountId === account.id,
					onClick: () => setAccountId(account.id),
					children: account.alias
				}, account.id))]
			}),
			rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No hay movimientos en esta cuenta."
			}) }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden overflow-hidden rounded-lg border border-line bg-card md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-ink text-xs tracking-wide text-on-ink uppercase",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-3 font-medium",
								children: "Detalle"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-3 font-medium",
								children: "Monto"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-3 font-medium",
								children: "Saldo"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-3 font-medium",
								children: "Folio"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-3 font-medium",
								children: "Fecha"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((movement) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-4 py-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: movement.concept
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted",
									children: movement.counterparty ?? user.accounts.find((account) => account.id === movement.accountId)?.alias
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: movement.direction === "cargo" ? "num px-4 py-3 text-brand" : "num px-4 py-3",
								children: [movement.direction === "cargo" ? "−" : "+", formatMoney(movement.amount)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num px-4 py-3",
								children: formatMoney(movement.balanceAfter)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num px-4 py-3",
								children: movement.folio
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3 text-muted",
								children: formatWhen(movement.at)
							})
						]
					}, movement.id)) })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2 md:hidden",
				children: rows.map((movement) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-line bg-card p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: movement.concept
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: formatWhen(movement.at)
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: movement.direction === "cargo" ? "num font-semibold text-brand" : "num font-semibold",
							children: [movement.direction === "cargo" ? "−" : "+", formatMoney(movement.amount)]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "num mt-2 text-xs text-muted",
						children: [
							"Saldo ",
							formatMoney(movement.balanceAfter),
							" · Folio ",
							movement.folio
						]
					})]
				}, movement.id))
			})
		]
	});
}
function FilterChip({ active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: active ? "h-10 rounded-full bg-ink px-4 text-sm text-on-ink" : "h-10 rounded-full border border-line bg-card px-4 text-sm",
		children
	});
}
function Approvals() {
	const user = useSessionUser();
	const resolvePending = useBanca((state) => state.resolvePending);
	const ask = useAskOtp();
	const [receipt, setReceipt] = (0, import_react.useState)(null);
	if (!user) return null;
	if (user.segment !== "empresas") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Las autorizaciones con segunda firma aplican al perfil empresarial."
	}) });
	const rows = user.pending;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Las transferencias a terceros mayores a ",
					formatMoney(SECOND_SIGN_AT),
					" quedan capturadas hasta que el facultado autorizador (",
					user.signerName,
					") confirma con su clave dinámica."
				]
			}),
			rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No hay operaciones en bandeja."
			}) }) : null,
			rows.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: item.status === "pendiente_segunda_firma" ? "Pendiente de segunda firma" : "Rechazada"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "num text-2xl font-semibold",
						children: formatMoney(item.amount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm",
						children: item.beneficiaryName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							item.concept,
							" · Ref. ",
							item.reference,
							" · Folio ",
							item.folio
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: formatWhen(item.createdAt)
					})
				] }), item.status === "pendiente_segunda_firma" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: () => ask(() => {
							const result = resolvePending(item.id, false);
							if (!result.ok) toast.error(result.error);
							else toast("Operación rechazada. No hubo cargo.");
						}),
						children: "Rechazar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => ask(() => {
							const result = resolvePending(item.id, true);
							if (!result.ok) toast.error(result.error);
							else if (result.receipt) setReceipt(result.receipt);
						}),
						children: "Autorizar"
					})]
				}) : null]
			}) }, item.id)),
			receipt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReceiptDialog, {
				receipt,
				onClose: () => setReceipt(null)
			}) : null
		]
	});
}
function RequestProduct() {
	const user = useSessionUser();
	const requestProduct = useBanca((state) => state.requestProduct);
	const [product, setProduct] = (0, import_react.useState)("");
	const [amount, setAmount] = (0, import_react.useState)("");
	const [term, setTerm] = (0, import_react.useState)("12");
	if (!user) return null;
	const options = user.segment === "empresas" ? ["Crédito PyME", "Cuenta de inversión empresarial"] : [
		"Crédito personal",
		"Cuenta de inversión",
		"Pagaré Mifos"
	];
	function submit(event) {
		event.preventDefault();
		const result = requestProduct({
			product,
			amount: Number(amount),
			termMonths: Number(term)
		});
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		toast.success("Solicitud recibida. Un asesor dará seguimiento. No es un contrato.");
		setAmount("");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[1fr_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Solicitar un producto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				action: "javascript:void(0)",
				className: "space-y-3",
				onSubmit: submit,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Producto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: inputClass,
							value: product,
							onChange: (event) => setProduct(event.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Seleccione"
							}), options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: option }, option))]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Monto",
						hint: user.segment === "empresas" ? "Crédito PyME de referencia: desde $250,000 hasta $4,000,000, sujeto a análisis." : "Sujeto a evaluación. No es una oferta vinculante.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: inputClass,
							inputMode: "decimal",
							value: amount,
							onChange: (event) => setAmount(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Plazo en meses",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: inputClass,
							inputMode: "numeric",
							value: term,
							onChange: (event) => setTerm(event.target.value.replace(/\D/g, "").slice(0, 3))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						children: "Enviar solicitud"
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Solicitudes de esta sesión",
			children: [user.requests.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Todavía no envía solicitudes."
			}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-3",
				children: user.requests.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "border-b border-line pb-3 text-sm last:border-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold",
							children: item.product
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "num",
							children: [
								formatMoney(item.amount),
								" · ",
								item.termMonths,
								" meses"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								"Folio ",
								item.folio,
								" · ",
								formatWhen(item.at),
								" · Recibida"
							]
						})
					]
				}, item.id))
			})]
		})]
	});
}
function SettingsView() {
	const user = useSessionUser();
	const changePassword = useBanca((state) => state.changePassword);
	const changeContact = useBanca((state) => state.changeContact);
	const updateLimits = useBanca((state) => state.updateLimits);
	const ask = useAskOtp();
	const [current, setCurrent] = (0, import_react.useState)("");
	const [next, setNext] = (0, import_react.useState)("");
	const [confirm, setConfirm] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [daily, setDaily] = (0, import_react.useState)("");
	const [perOp, setPerOp] = (0, import_react.useState)("");
	const [passOk, setPassOk] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		setEmail(user.email);
		setPhone(user.phone);
		setDaily(String(user.dailyLimit));
		setPerOp(String(user.perOpLimit));
	}, [user]);
	if (!user) return null;
	const cap = capFor(user.segment);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid max-w-xl gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Cambiar contraseña",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Contraseña actual",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								type: "password",
								autoComplete: "current-password",
								value: current,
								onChange: (event) => setCurrent(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Nueva contraseña",
							hint: "8 caracteres, mayúscula, minúscula, dígito y símbolo.",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								type: "password",
								autoComplete: "new-password",
								value: next,
								onChange: (event) => setNext(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Confirmar nueva contraseña",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								type: "password",
								autoComplete: "new-password",
								value: confirm,
								onChange: (event) => setConfirm(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => {
								const issues = passwordIssues(next, user.clientNumber);
								if (issues.length) {
									toast.error(`La nueva contraseña necesita ${issues.join(", ")}.`);
									return;
								}
								if (next !== confirm) {
									toast.error("Las contraseñas no coinciden.");
									return;
								}
								ask(() => {
									const result = changePassword(current, next);
									if (!result.ok) toast.error(result.error);
									else {
										setCurrent("");
										setNext("");
										setConfirm("");
										setPassOk(true);
									}
								});
							},
							children: "Cambiar contraseña"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Medios de aviso",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Correo",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								type: "email",
								value: email,
								onChange: (event) => setEmail(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ink",
							onClick: () => ask(() => {
								const result = changeContact("email", email);
								if (!result.ok) toast.error(result.error);
								else toast.success("Correo actualizado. Revise el aviso en su bandeja.");
							}),
							children: "Guardar correo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Celular",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								inputMode: "numeric",
								value: phone,
								onChange: (event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ink",
							onClick: () => ask(() => {
								const result = changeContact("phone", phone);
								if (!result.ok) toast.error(result.error);
								else toast.success("Teléfono actualizado.");
							}),
							children: "Guardar teléfono"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Límites del canal",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Límite diario",
							hint: `Tope institucional ${formatMoney(cap)}. Bajarlo no pide clave; subirlo, sí.`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								inputMode: "decimal",
								value: daily,
								onChange: (event) => setDaily(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Límite por operación",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								inputMode: "decimal",
								value: perOp,
								onChange: (event) => setPerOp(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => {
								const nextDaily = Number(daily);
								const nextOp = Number(perOp);
								const raises = nextDaily > user.dailyLimit || nextOp > user.perOpLimit;
								const run = () => {
									const result = updateLimits(nextDaily, nextOp);
									if (!result.ok) toast.error(result.error);
									else toast.success("Límites actualizados.");
								};
								if (raises) ask(run);
								else run();
							},
							children: "Guardar límites"
						})
					]
				})
			}),
			passOk ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				title: "Cambio exitoso",
				onClose: () => setPassOk(false),
				footer: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setPassOk(false),
					children: "Aceptar"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockKeyhole, { className: "mx-auto size-8 text-ink" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm",
						children: "Su contraseña fue modificada. Úsela en el próximo ingreso."
					})]
				})
			}) : null
		]
	});
}
function AuditView() {
	const user = useSessionUser();
	if (!user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Bitácora del canal",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-sm text-muted",
			children: "Registro de accesos, bloqueos, cambios de seguridad y operaciones monetarias. Cada evento tiene folio."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-4",
			children: user.audit.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "border-b border-line pb-4 last:border-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-baseline justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold",
							children: event.event
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "num text-xs text-muted",
							children: event.folio
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [formatWhen(event.at), " · Banca Web"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm",
						children: event.detail
					})
				]
			}, event.id))
		})]
	});
}
function Notices() {
	const user = useSessionUser();
	if (!user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Avisos simulados a los medios que usted registró: SMS y correo."
		}), user.notices.map((notice) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "rounded-lg border border-line bg-card p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold tracking-wide text-brand",
						children: notice.channel
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: formatWhen(notice.at)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 font-semibold",
					children: notice.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: notice.body
				})
			]
		}, notice.id))]
	});
}
function About() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[1.2fr_0.8fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Mifos",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 text-sm leading-relaxed text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "COMPANY NAME , S.A. DE C.V., S.F.P. es una sociedad financiera popular fundada en 2007 por empresarios leoneses. Está autorizada, regulada y supervisada por la Comisión Nacional Bancaria y de Valores, y sus usuarios pueden acudir a la CONDUSEF." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Capta ahorro del público y coloca crédito para la actividad productiva de su zona, al amparo de la Ley de Ahorro y Crédito Popular. No es una institución de banca múltiple y sus depósitos no están cubiertos por el IPAB: los protege el Fondo de Protección de Sociedades Financieras Populares hasta 25,000 UDIS por ahorrador." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Banca Web adopta, como estándar de diseño de este canal, los controles de la banca electrónica previstos en la Circular Única de Bancos: identificador único, factores de autenticación, límites, sesión, comprobante y bitácora." })
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Dónde estamos",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "mt-0.5 size-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Matriz: Blvd. Paseo de los Insurgentes 301, Col. Los Paraísos, León, Guanajuato, C.P. 37328." })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Sucursal Oriental: Blvd. Mariano Escobedo 2805, Col. Oriental, León, Gto., C.P. 37510." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: "477 461 4700"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted",
						children: "avantthya.com.mx"
					})
				]
			})
		})]
	});
}
function Help() {
	const resetDemo = useBanca((state) => state.resetDemo);
	const [open, setOpen] = (0, import_react.useState)(0);
	const [terms, setTerms] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			[
				{
					q: "Si sospecho que alguien conoce mi información, ¿puedo cambiar la contraseña?",
					a: "Sí, en cualquier momento, desde Ajustes. Le pediremos la contraseña actual y la clave dinámica. Conviene cambiarla al menos cada tres meses y no reutilizarla en otros sitios."
				},
				{
					q: "¿Qué operaciones tiene este canal?",
					a: "Consulta de saldos y movimientos, transferencias entre cuentas propias y a terceros Mifos, alta de beneficiarios con periodo de activación, comprobantes y solicitud de productos. Las transferencias a otros bancos no están habilitadas en el prototipo."
				},
				{
					q: "¿Por qué una transferencia pide otra clave?",
					a: "Entrar usa un factor que solo usted conoce. Mover dinero, dar de alta un beneficiario o subir límites pide además la clave dinámica de un solo uso, que en la operación real vive en su banca móvil."
				},
				{
					q: "¿Dónde veo comisiones y aclaraciones?",
					a: "Antes de confirmar se informa la comisión, que en cuentas Mifos es de cero pesos. Para una aclaración acuda a la Unidad Especializada de Atención a Usuarios al 477 461 4700, o a CONDUSEF al 55 5340 0999 y 800 999 8080."
				}
			].map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "overflow-hidden rounded-lg border border-line bg-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-medium",
					onClick: () => setOpen(open === index ? -1 : index),
					children: [item.q, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: open === index ? "–" : "+"
					})]
				}), open === index ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-4 pb-4 text-sm text-muted",
					children: item.a
				}) : null]
			}, item.q)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "Controles del canal",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "space-y-2 text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Identificador único y contraseña para abrir sesión." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Clave dinámica en transferencias, beneficiarios, medios de aviso, contraseña e incremento de límites." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Cierre automático a los 5 minutos y bloqueo de 10 minutos tras 3 intentos." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Periodo de activación antes de usar un beneficiario nuevo." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							"En empresas, segunda firma arriba de ",
							formatMoney(SECOND_SIGN_AT),
							"."
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Comprobante con folio y bitácora de la sesión." })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					className: "mt-4",
					onClick: () => setTerms(true),
					children: "Leer términos y aviso de privacidad"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "Seguridad",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Mifos no pide su contraseña ni su clave dinámica por teléfono, correo o mensaje. El dominio de referencia es avantthya.com.mx. No comparta el token y revise siempre el último ingreso al entrar."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-4",
					variant: "ink",
					onClick: () => {
						resetDemo();
						toast.success("Volvimos a los datos de demostración.");
					},
					children: "Restablecer demostración"
				})]
			}),
			terms ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				title: "Términos de Banca Web",
				onClose: () => setTerms(false),
				wide: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TermsBody, {})
			}) : null
		]
	});
}
function BancaApp() {
	(0, import_react.useEffect)(() => {
		Promise.resolve(useBanca.persist.rehydrate()).then(() => {
			useBanca.getState().boot();
		});
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(OtpProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		position: "top-center",
		theme: "light"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gate, {})] });
}
function Gate() {
	const screen = useBanca((state) => state.screen);
	const sessionUserId = useBanca((state) => state.sessionUserId);
	const expires = useBanca((state) => state.sessionExpiresAt);
	(0, import_react.useEffect)(() => {
		if (!sessionUserId || !expires) return;
		const left = expires - Date.now();
		if (left <= 0) {
			useBanca.getState().endSession("inactividad");
			toast(t("session.inactivity"));
			return;
		}
		const id = window.setTimeout(() => {
			useBanca.getState().endSession("inactividad");
			toast(t("session.inactivity"));
		}, left);
		return () => window.clearTimeout(id);
	}, [sessionUserId, expires]);
	if (sessionUserId && PRIVATE_SCREENS.includes(screen)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PublicScreens, {});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BancaApp, {});
}
//#endregion
export { Home as component };
