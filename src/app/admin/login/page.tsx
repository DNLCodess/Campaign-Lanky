import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { LoginForm } from "@/app/admin/login/login-form";

export const dynamic = "force-dynamic";

function safeNext(raw: string | undefined): string | null {
  return raw && raw.startsWith("/admin") && raw !== "/admin/login" ? raw : null;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  // Already signed in (e.g. followed a bookmark/back button to /admin/login
  // with a live session) — go straight to where they were headed instead of
  // showing the form again.
  const user = await getAdminUser();
  if (user) redirect(next ?? "/admin");

  return <LoginForm next={next} />;
}
