import Link from "next/link";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { QuotesList } from "~/app/_components/quotes-list";
import { PageLayout } from "~/app/_components/page-layout";

export default async function QuotesPage() {
  const session = await auth();

  // Only prefetch quotes for authenticated users
  if (session?.user) {
    void api.quote.getAll.prefetch({ limit: 20, page: 1 });
  }

  return (
    <HydrateClient>
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          {session?.user ? (
            <>
              {/* Header */}
              <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="mb-2 text-4xl font-bold">All Quotes</h1>
                  <p className="text-gray-300">
                    Browse memorable quotes from the community
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href="/submit"
                    className="rounded-lg bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700"
                  >
                    Submit Quote
                  </Link>
                </div>
              </div>

              {/* Quotes List */}
              <QuotesList />
            </>
          ) : (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <h1 className="mb-4 text-4xl font-bold">Sign In Required</h1>
              <p className="mb-8 text-xl text-gray-300">
                You need to sign in to view quotes.
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
      </PageLayout>
    </HydrateClient>
  );
}
