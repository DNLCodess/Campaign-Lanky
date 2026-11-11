import type { Metadata } from "next";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCandidateGeo, needsConstituency } from "@/lib/agents/geo";
import { ELECTION_TYPE_LABELS, type ElectionType } from "@/lib/agents/constants";
import { NominationWizard } from "@/app/agents/submit/[slug]/nomination-wizard";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

async function getCandidate(slug: string) {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("nomination_candidates")
    .select("id, full_name, office, election_type, constituency_id, slug, is_active")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const candidate = await getCandidate(slug);
  if (!candidate || !candidate.is_active) {
    return { title: "Party Agent Nominations" };
  }

  const title = `Nominate a Polling Unit Agent for ${candidate.full_name}`;
  const description = `${candidate.full_name} is nominating Polling Unit Agents for ${candidate.office}. Use this link if you've been asked to serve as one.`;

  // openGraph/twitter are shallow-merged per Next.js metadata rules: whichever
  // segment defines them last wins wholesale, so this object must carry every
  // field this page wants shown, not just the ones that changed from the
  // agents layout's defaults.
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: `${site.shortName} Party Agent Nominations`,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SubmitNominationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const candidate = await getCandidate(slug);

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

  const electionType = candidate.election_type as ElectionType;
  const constituencyId = candidate.constituency_id as number | null;
  if (needsConstituency(electionType, constituencyId)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="max-w-sm text-center">
          <h1 className="font-heading text-xl text-text">This link isn&apos;t ready yet</h1>
          <p className="mt-2 text-sm text-text-muted">
            The constituency for this nomination hasn&apos;t been set up. Contact the person who
            shared it with you and try again later.
          </p>
        </div>
      </div>
    );
  }

  const geo = await getCandidateGeo(electionType, constituencyId);

  return (
    <NominationWizard
      slug={candidate.slug}
      candidateOffice={candidate.office}
      electionTypeLabel={ELECTION_TYPE_LABELS[electionType]}
      geo={geo}
    />
  );
}
