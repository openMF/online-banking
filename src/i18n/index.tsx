import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import esMX from "./locales/es-MX.json";
import enUS from "./locales/en-US.json";

export type Locale = "es-MX" | "en-US";
type Messages = Record<string, string>;

const catalogs: Record<Locale, { name: string; messages: Messages }> = {
  "es-MX": esMX,
  "en-US": enUS,
};
const translatedEnglish = new Set(Object.values(enUS.messages));
const spanishSignal =
  /[¿¡áéíóúüñ]|\b(ahorro|banca|beneficiario|cerrar|comienza|consulta|cuenta|demostración|empresa|ingresa|movimientos|siguiente|transferencia|todos|para|por|con|sin|del|el|la|las|los|una|un)\b/i;

let activeLocale: Locale = "es-MX";
const missingMessages = new Set<string>();

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getLocale() {
  return activeLocale;
}

export function translate(value: string, locale = activeLocale) {
  const key = normalize(value);
  if (!key) return value;
  const translated = catalogs[locale].messages[key];
  if (!translated) {
    if (locale === "en-US" && translatedEnglish.has(key)) return value;
    if (locale === "en-US" && spanishSignal.test(key)) {
      missingMessages.add(key);
      if (typeof window !== "undefined") {
        (window as Window & { __missingI18n?: string[] }).__missingI18n = [
          ...missingMessages,
        ];
      }
    }
    return value;
  }
  const start = value.match(/^\s*/)?.[0] ?? "";
  const end = value.match(/\s*$/)?.[0] ?? "";
  return `${start}${translated}${end}`;
}

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (value: string) => string;
};

const I18nContext = createContext<I18nValue>({
  locale: "es-MX",
  setLocale: () => undefined,
  t: (value) => value,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(() => {
    const stored = window.localStorage.getItem("mifos-locale");
    return stored === "en-US" || stored === "es-MX" ? stored : "es-MX";
  });
  activeLocale = locale;

  const setLocale = (next: Locale) => {
    activeLocale = next;
    window.localStorage.setItem("mifos-locale", next);
    updateLocale(next);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate("MIFOS | Siempre hacia adelante", locale);
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        translate(
          "MIFOS. Siempre hacia adelante. Descubre una nueva experiencia de banca digital para tus ahorros, inversiones y proyectos. Vista previa demostrativa.",
          locale,
        ),
      );
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute(
        "content",
        translate("MIFOS | Siempre hacia adelante", locale),
      );
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute(
        "content",
        translate(
          "Tu dinero, tus metas, tu siguiente paso. Una experiencia digital de tu lado.",
          locale,
        ),
      );
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: (message) => translate(message, locale) }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

const translatableProps = new Set([
  "aria-label",
  "aria-description",
  "alt",
  "placeholder",
  "title",
]);

function localizeNode(node: ReactNode, locale: Locale): ReactNode {
  if (typeof node === "string") return translate(node, locale);
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const nextProps: Record<string, unknown> = {};
  for (const prop of translatableProps) {
    const value = element.props[prop];
    if (typeof value === "string") nextProps[prop] = translate(value, locale);
  }
  if ("children" in element.props) {
    nextProps.children = Children.map(
      element.props.children as ReactNode,
      (child) => localizeNode(child, locale),
    );
  }
  return cloneElement(element, nextProps);
}

export function LocalizedTree({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return <>{Children.map(children, (child) => localizeNode(child, locale))}</>;
}

export function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      className={`locale-toggle ${compact ? "locale-toggle-compact" : ""}`}
      role="group"
      aria-label={t("Idioma")}
    >
      <button
        aria-pressed={locale === "es-MX"}
        onClick={() => setLocale("es-MX")}
      >
        ES
      </button>
      <span aria-hidden="true">/</span>
      <button
        aria-pressed={locale === "en-US"}
        onClick={() => setLocale("en-US")}
      >
        EN
      </button>
    </div>
  );
}
