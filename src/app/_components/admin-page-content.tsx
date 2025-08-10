"use client";

import { useTranslation } from "~/hooks/useI18n";
import { AdminPanel } from "./admin-panel";

interface AdminPageContentProps {
  userRole: string;
  currentUserId: string;
}

export function AdminPageContent({
  userRole,
  currentUserId,
}: AdminPageContentProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">{t("admin.adminPanel")}</h1>
        <p className="text-gray-300">{t("admin.manageUsersAndStats")}</p>
      </div>

      {/* Admin Panel */}
      <AdminPanel userRole={userRole} currentUserId={currentUserId} />
    </>
  );
}
