import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { SubmitQuoteForm } from "~/app/_components/submit-quote-form";
import { PageLayout } from "~/app/_components/page-layout";

export default async function SubmitPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Prefetch speakers for the form
  void api.speaker.getAll.prefetch();

  return (
    <HydrateClient>
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold">Submit a Quote</h1>
            <p className="text-gray-300">
              Share a memorable quote with attribution
            </p>
          </div>

          {/* Submit Form */}
          <div className="mx-auto max-w-2xl">
            <SubmitQuoteForm />
          </div>
        </div>
      </PageLayout>
    </HydrateClient>
  );
}
