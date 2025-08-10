"use client";

import { useTranslation } from "~/hooks/useI18n";

export function UsersPageHeader() {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold">{t("common.communityMembers")}</h1>
      <p className="mt-2 text-gray-400">{t("common.discoverUsers")}</p>
    </div>
  );
}
