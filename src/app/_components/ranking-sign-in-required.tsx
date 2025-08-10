"use client";

import { useTranslation } from "~/hooks/useI18n";

export function RankingSignInRequired() {
  const { t } = useTranslation();

  return (
    <>
      <h1 className="mb-4 text-4xl font-bold text-white">
        {t("quotes.ranking")}
      </h1>
      <p className="mb-8 text-gray-400">{t("ranking.signInToView")}</p>
    </>
  );
}
