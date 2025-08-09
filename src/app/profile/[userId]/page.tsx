import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { UserProfile } from "~/app/_components/user-profile";
import { PageLayout } from "~/app/_components/page-layout";

interface UserProfilePageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { userId } = await params;

  if (!userId) {
    notFound();
  }

  const session = await auth();

  // Prefetch user profile data for authenticated users
  if (session?.user) {
    void api.user.getProfile.prefetch({ userId });
    void api.user.getUserQuotes.prefetch({ userId, page: 1, limit: 10 });
  }

  return (
    <HydrateClient>
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
              </div>
            }
          >
            <UserProfile userId={userId} />
          </Suspense>
        </div>
      </PageLayout>
    </HydrateClient>
  );
}
