"use client";

import Link from "next/link";
import { useTranslation } from "~/hooks/useI18n";

export function SignInRequiredEdit() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-4xl font-bold">{t("errors.signInRequired")}</h1>
      <p className="mb-8 text-xl text-gray-300">
        {t("errors.needToSignIn")} {t("errors.editQuotes")}.
      </p>
      <Link
        href="/api/auth/signin"
        className="rounded-lg bg-purple-600 px-8 py-3 font-medium transition-colors hover:bg-purple-700"
      >
        {t("navigation.signIn")}
      </Link>
    </div>
  );
}
