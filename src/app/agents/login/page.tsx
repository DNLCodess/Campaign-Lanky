import { redirect } from "next/navigation";
import { getCandidateSession } from "@/lib/agents/session";
import { agentsPath, safeAgentsNext } from "@/lib/agents/routes";
import { LoginForm } from "@/app/agents/login/login-form";

export const dynamic = "force-dynamic";

export default async function AgentsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeAgentsNext(sp.next);

  // Already signed in (e.g. followed a bookmark/back button to /login with a
  // live session) — go straight to where they were headed instead of
  // showing the form again.
  const session = await getCandidateSession();
  if (session) redirect(next ?? agentsPath("/"));

  return <LoginForm next={next} />;
}
