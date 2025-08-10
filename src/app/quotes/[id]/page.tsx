import { auth } from "~/server/auth";
import { QuoteDetail } from "~/app/_components/quote-detail";
import { PageLayout } from "~/app/_components/page-layout";
import { SignInRequired } from "~/app/_components/sign-in-required";

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
        <SignInRequired />
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
