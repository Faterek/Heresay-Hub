import Link from "next/link";
import { auth } from "~/server/auth";
import { QuoteDetail } from "~/app/_components/quote-detail";
import { PageLayout } from "~/app/_components/page-layout";

interface QuotePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { id } = await params;
  const quoteId = parseInt(id);
  const session = await auth();

  if (isNaN(quoteId)) {
    return (
      <PageLayout>
        <div className="py-12 text-center">
          <p className="text-red-400">Invalid quote ID.</p>
        </div>
      </PageLayout>
    );
  }

  if (!session?.user) {
    return (
      <PageLayout>
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
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="py-8">
        <div className="mx-auto flex min-h-[calc(100vh-300px)] w-full max-w-4xl items-center">
          <div className="w-full">
            <QuoteDetail quoteId={quoteId} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
