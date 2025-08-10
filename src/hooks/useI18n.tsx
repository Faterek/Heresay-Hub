"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import {
  type Locale,
  type Dictionary,
  getDictionary,
  defaultLocale,
  locales,
} from "../dictionaries";

interface I18nContextType {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_COOKIE_NAME = "hearsay-hub-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(
    getDictionary(defaultLocale),
  );

  // Initialize locale from cookie or browser preference
  useEffect(() => {
    const savedLocale = Cookies.get(LOCALE_COOKIE_NAME) as Locale;
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale);
      setDictionary(getDictionary(savedLocale));
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split("-")[0] as Locale;
      if (locales.includes(browserLang)) {
        setLocaleState(browserLang);
        setDictionary(getDictionary(browserLang));
        Cookies.set(LOCALE_COOKIE_NAME, browserLang, { expires: 365 });
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setDictionary(getDictionary(newLocale));
    Cookies.set(LOCALE_COOKIE_NAME, newLocale, { expires: 365 });

    // Update document language
    document.documentElement.lang = newLocale;
  };

  // Translation function with nested key support
  const t = (key: string): string => {
    const keys = key.split(".");
    let value: unknown = dictionary;

    for (const k of keys) {
      if (typeof value === "object" && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key itself if translation is not found
      }
    }

    return typeof value === "string" ? value : key;
  };

  return (
    <I18nContext.Provider value={{ locale, dictionary, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useTranslation() {
  const { t } = useI18n();
  return { t };
}
