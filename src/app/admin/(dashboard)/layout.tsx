import { requireAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/app/admin/(dashboard)/_components/admin-sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar email={user.email} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
