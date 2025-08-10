import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { QuotesList } from "~/app/_components/quotes-list";
import { PageLayout } from "~/app/_components/page-layout";
import { QuotesPageHeader } from "~/app/_components/quotes-page-header";
import { SignInRequired } from "~/app/_components/sign-in-required";

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
              <QuotesPageHeader />

              {/* Quotes List */}
              <QuotesList />
            </>
          ) : (
            <SignInRequired />
          )}
        </div>
      </PageLayout>
    </HydrateClient>
  );
}
