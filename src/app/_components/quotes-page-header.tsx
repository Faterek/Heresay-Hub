"use client";

import Link from "next/link";
import { useTranslation } from "~/hooks/useI18n";

export function QuotesPageHeader() {
  const { t } = useTranslation();

  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="mb-2 text-4xl font-bold">{t("quotes.allQuotes")}</h1>
        <p className="text-gray-300">{t("common.browseMemorable")}</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/submit"
          className="rounded-lg bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700"
        >
          {t("navigation.submitQuote")}
        </Link>
      </div>
    </div>
  );
}
