import en from "./en.json";
import pl from "./pl.json";

export const dictionaries = {
  en,
  pl,
} as const;

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof en;

export const defaultLocale: Locale = "en";
export const locales: Locale[] = ["en", "pl"];

export const localeNames: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
};

export function getDictionary(locale: Locale): Dictionary {
  return (dictionaries[locale] || dictionaries[defaultLocale]) as Dictionary;
}
