"use client";

import { useTranslation } from "~/hooks/useI18n";
import { SubmitQuoteForm } from "./submit-quote-form";

export function SubmitQuoteClient() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">{t("quotes.submitQuote")}</h1>
        <p className="text-gray-300">{t("quotes.shareMemorableQuote")}</p>
      </div>

      {/* Submit Form */}
      <div className="mx-auto max-w-2xl">
        <SubmitQuoteForm />
      </div>
    </div>
  );
}
