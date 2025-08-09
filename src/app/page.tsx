import Link from "next/link";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { PageLayout } from "~/app/_components/page-layout";
import { RecentQuotes } from "~/app/_components/recent-quotes";
import { QuickSearch } from "~/app/_components/quick-search";

export default async function Home() {
  const session = await auth();

  // Only prefetch quotes for authenticated users
  if (session?.user) {
    void api.quote.getAll.prefetch({ limit: 6, page: 1 });
  }

  return (
    <HydrateClient>
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-[6rem]">
              <span className="text-[hsl(280,100%,70%)]">Hearsay</span> Hub
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
              Share memorable quotes from your friends, colleagues, or anyone
              whose words deserve to be remembered.
            </p>

            {session?.user ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-lg">
                  Welcome back,{" "}
                  <span className="font-medium">{session.user.name}</span>!
                </p>

                {/* Quick Search */}
                <div className="mb-4 w-full max-w-md">
                  <QuickSearch placeholder="Quick search quotes..." />
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/submit"
                    className="rounded-lg bg-purple-600 px-6 py-3 font-medium transition-colors hover:bg-purple-700"
                  >
                    Submit a Quote
                  </Link>
                  <Link
                    href="/quotes"
                    className="rounded-lg bg-white/10 px-6 py-3 font-medium transition-colors hover:bg-white/20"
                  >
                    Browse All Quotes
                  </Link>
                  <Link
                    href="/search"
                    className="rounded-lg bg-white/10 px-6 py-3 font-medium transition-colors hover:bg-white/20"
                  >
                    Advanced Search
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-lg text-gray-300">
                  Sign in to start sharing quotes!
                </p>
                <Link
                  href="/api/auth/signin"
                  className="rounded-lg bg-purple-600 px-8 py-3 font-medium transition-colors hover:bg-purple-700"
                >
                  Sign in with Discord
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
    </HydrateClient>
  );
}
