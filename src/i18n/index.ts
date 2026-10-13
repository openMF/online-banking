import esMX from "./locales/es-MX.json";
import enUS from "./locales/en-US.json";

export type Locale = "es-MX" | "en-US";

const dictionaries: Record<Locale, typeof esMX> = {
  "es-MX": esMX,
  "en-US": enUS,
};

let currentLocale: Locale = "es-MX";

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof esMX>;

function getByPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Translate a key. Supports simple {{var}} interpolation.
 * Falls back to the key itself if missing.
 */
export function t(key: TranslationKey | string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale] ?? dictionaries["es-MX"];
  let value = getByPath(dict as unknown as Record<string, unknown>, key) ??
    getByPath(dictionaries["es-MX"] as unknown as Record<string, unknown>, key) ??
    key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }
  }
  return value;
}

/** Hook-friendly: returns the t function bound to current locale. */
export function useI18n() {
  return { t, locale: currentLocale, setLocale };
}

export { esMX, enUS };
