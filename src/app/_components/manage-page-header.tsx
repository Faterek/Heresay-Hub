"use client";

import { useTranslation } from "~/hooks/useI18n";

export function ManagePageHeader() {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="mb-2 text-4xl font-bold">
        {t("speakers.manageSpeakers")}
      </h1>
      <p className="text-gray-300">{t("common.addManageSpeakers")}</p>
    </div>
  );
}
