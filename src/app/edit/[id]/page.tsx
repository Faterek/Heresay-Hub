import { auth } from "~/server/auth";
import { EditQuoteForm } from "~/app/_components/edit-quote-form";
import { PageLayout } from "~/app/_components/page-layout";
import { SignInRequiredEdit } from "~/app/_components/sign-in-required-edit";

interface EditQuotePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditQuotePage({
  params,
  searchParams,
}: EditQuotePageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
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
        <SignInRequiredEdit />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <EditQuoteForm
            quoteId={quoteId}
            searchParams={resolvedSearchParams}
          />
        </div>
      </div>
    </PageLayout>
  );
}
