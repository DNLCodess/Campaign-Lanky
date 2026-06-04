import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { SetupForm } from "@/app/admin/setup/setup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin setup",
  robots: { index: false, follow: false },
};

type State = "form" | "done" | "no-token" | "no-config";

export default async function AdminSetupPage() {
  let state: State = "form";

  if (!process.env.ADMIN_SETUP_TOKEN) {
    state = "no-token";
  } else {
    try {
      const supabase = createAdminSupabase();
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw error;
      if ((data?.users?.length ?? 0) > 0) state = "done";
    } catch {
      state = "no-config";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-brand border border-border bg-surface/40 p-8">
        <Image src="/brand/logo-white.png" alt="Lanky" width={132} height={36} className="h-7 w-auto" />
        <h1 className="mt-6 font-heading text-3xl text-text">First-time setup</h1>

        {state === "form" && (
          <>
            <p className="mt-2 text-sm text-text-muted">
              Create the first admin account. This page disables itself once an
              admin exists.
            </p>
            <SetupForm />
            <p className="mt-5 text-xs text-text-muted/70">
              Tip: remove <code>ADMIN_SETUP_TOKEN</code> after setup (or delete this
              route) to fully close it.
            </p>
          </>
        )}

        {state === "done" && (
          <>
            <p className="mt-2 text-text-muted">
              Setup is already complete — an admin account exists. Manage the team
              from the dashboard.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/admin/login"
                className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Go to login
              </Link>
            </div>
          </>
        )}

        {state === "no-token" && (
          <p className="mt-3 rounded-brand border border-primary/40 bg-primary/10 p-4 text-sm text-text">
            Setup is disabled. Set <code>ADMIN_SETUP_TOKEN</code> in your environment
            to enable this page, then reload.
          </p>
        )}

        {state === "no-config" && (
          <p className="mt-3 rounded-brand border border-primary/40 bg-primary/10 p-4 text-sm text-text">
            Supabase is not configured. Set <code>SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            (and the Supabase URL/anon key), then reload.
          </p>
        )}
      </div>
    </div>
  );
}
