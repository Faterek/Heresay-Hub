import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { AdminPanel } from "~/app/_components/admin-panel";
import { PageLayout } from "~/app/_components/page-layout";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Check if user has permission to access admin panel
  if (!["ADMIN", "OWNER"].includes(session.user.role)) {
    redirect("/");
  }

  // Prefetch admin data
  void api.admin.getAllUsers.prefetch();
  void api.admin.getStats.prefetch();

  return (
    <HydrateClient>
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          <AdminPanel
            userRole={session.user.role}
            currentUserId={session.user.id}
          />
        </div>
      </PageLayout>
    </HydrateClient>
  );
}
