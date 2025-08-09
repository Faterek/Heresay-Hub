import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { ManageSpeakersForm } from "~/app/_components/manage-speakers-form";
import { PageLayout } from "~/app/_components/page-layout";

export default async function ManagePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Check if user has permission to manage speakers
  if (!["MODERATOR", "ADMIN", "OWNER"].includes(session.user.role)) {
    redirect("/");
  }

  // Prefetch speakers for the form
  void api.speaker.getAll.prefetch();

  return (
    <HydrateClient>
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold">Manage Speakers</h1>
            <p className="text-gray-300">
              Add and manage speakers for quote attribution
            </p>
          </div>

          {/* Manage Form */}
          <div className="mx-auto max-w-4xl">
            <ManageSpeakersForm userRole={session.user.role} />
          </div>
        </div>
      </PageLayout>
    </HydrateClient>
  );
}
