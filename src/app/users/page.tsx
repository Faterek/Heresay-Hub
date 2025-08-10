import { Suspense } from "react";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { UsersList } from "~/app/_components/users-list";
import { PageLayout } from "~/app/_components/page-layout";
import { UsersPageHeader } from "~/app/_components/users-page-header";

export default async function UsersPage() {
  const session = await auth();

  // Prefetch users data for authenticated users
  if (session?.user) {
    void api.user.getAll.prefetch({ page: 1, limit: 20 });
  }

  return (
    <HydrateClient>
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          <UsersPageHeader />

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
              </div>
            }
          >
            <UsersList />
          </Suspense>
        </div>
      </PageLayout>
    </HydrateClient>
  );
}
