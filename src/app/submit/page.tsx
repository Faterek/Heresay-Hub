import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { SubmitQuoteClient } from "~/app/_components/submit-quote-client";
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
        <SubmitQuoteClient />
      </PageLayout>
    </HydrateClient>
  );
}
