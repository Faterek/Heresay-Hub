"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "~/hooks/useI18n";
import { PageLayout } from "~/app/_components/page-layout";
import { RecentQuotes } from "~/app/_components/recent-quotes";
import { QuickSearch } from "~/app/_components/quick-search";

export default function Home() {
  const { data: session } = useSession();
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-[6rem]">
            <span className="text-[hsl(280,100%,70%)]">Hearsay</span> Hub
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            {t("home.heroDescription")}
          </p>

          {session?.user ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg">
                {t("home.welcomeBack")}{" "}
                <span className="font-medium">{session.user.name}</span>!
              </p>

              {/* Quick Search */}
              <div className="mb-4 w-full max-w-md">
                <QuickSearch placeholder={t("home.quickSearchPlaceholder")} />
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/submit"
                  className="rounded-lg bg-purple-600 px-6 py-3 font-medium transition-colors hover:bg-purple-700"
                >
                  {t("navigation.submitQuote")}
                </Link>
                <Link
                  href="/quotes"
                  className="rounded-lg bg-white/10 px-6 py-3 font-medium transition-colors hover:bg-white/20"
                >
                  {t("home.browseAllQuotes")}
                </Link>
                <Link
                  href="/search"
                  className="rounded-lg bg-white/10 px-6 py-3 font-medium transition-colors hover:bg-white/20"
                >
                  {t("home.advancedSearch")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg text-gray-300">{t("home.signInToStart")}</p>
              <Link
                href="/api/auth/signin"
                className="rounded-lg bg-purple-600 px-8 py-3 font-medium transition-colors hover:bg-purple-700"
              >
                {t("home.signInWithDiscord")}
              </Link>
            </div>
          )}
        </div>

        {/* Recent Quotes Section - Only show for authenticated users */}
        {session?.user && (
          <div className="flex justify-center">
            <RecentQuotes />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
