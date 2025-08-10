"use client";

import { useState } from "react";
import { useI18n } from "~/hooks/useI18n";
import { locales, localeNames } from "~/dictionaries";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-base">{locale === "en" ? "🇺🇸" : "🇵🇱"}</span>
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-32 rounded-md bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc);
                setIsOpen(false);
              }}
              className={`flex w-full items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                locale === loc
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <span>{loc === "en" ? "🇺🇸" : "🇵🇱"}</span>
              <span>{localeNames[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
