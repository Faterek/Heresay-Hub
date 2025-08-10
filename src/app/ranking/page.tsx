import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { QuoteRanking } from "~/app/_components/quote-ranking";
import { PageLayout } from "~/app/_components/page-layout";
import { RankingSignInRequired } from "~/app/_components/ranking-sign-in-required";

export default async function RankingPage() {
  const session = await auth();

  // Only prefetch data for authenticated users
  if (session?.user) {
    void api.quote.getAvailableYears.prefetch();
  }

  return (
    <HydrateClient>
      <PageLayout>
        {session?.user ? (
          <main className="container mx-auto max-w-4xl px-4 py-8">
            <QuoteRanking />
          </main>
        ) : (
          <main className="container mx-auto max-w-2xl px-4 py-8 text-center">
            <RankingSignInRequired />
          </main>
        )}
      </PageLayout>
    </HydrateClient>
  );
}
