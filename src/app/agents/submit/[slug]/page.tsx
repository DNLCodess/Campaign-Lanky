import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAllConstituencyGeo } from "@/lib/portal/geo";
import { ELECTION_TYPE_LABELS, type ElectionType } from "@/lib/agents/constants";
import { NominationWizard } from "@/app/agents/submit/[slug]/nomination-wizard";

export const dynamic = "force-dynamic";

export default async function SubmitNominationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminSupabase();
  const { data: candidate } = await admin
    .from("nomination_candidates")
    .select("id, full_name, office, election_type, slug, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!candidate || !candidate.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="max-w-sm text-center">
          <h1 className="font-heading text-xl text-text">This link isn&apos;t active</h1>
          <p className="mt-2 text-sm text-text-muted">
            Check the link you were given, or contact the person who shared it with you.
          </p>
        </div>
      </div>
    );
  }

  const geo = await getAllConstituencyGeo();

  return (
    <NominationWizard
      slug={candidate.slug}
      candidateOffice={candidate.office}
      electionTypeLabel={ELECTION_TYPE_LABELS[candidate.election_type as ElectionType]}
      geo={geo}
    />
  );
}
