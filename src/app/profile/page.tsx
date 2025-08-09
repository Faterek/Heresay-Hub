import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { MyProfile } from "~/app/_components/my-profile";
import { PageLayout } from "~/app/_components/page-layout";

export default async function MyProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Prefetch user profile data
  void api.user.getMyProfile.prefetch();
  void api.user.getMyQuotes.prefetch({ page: 1, limit: 10 });

  return (
    <HydrateClient>
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          <MyProfile />
        </div>
      </PageLayout>
    </HydrateClient>
  );
}
