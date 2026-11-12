import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import {
  fullNameOf,
  getAdminNomination,
  getAdminNominationFiles,
  listAdminCandidates,
  OUR_CANDIDATE_SLUG,
} from "@/lib/agents/admin-nominations";
import { ensureCurrentNominationPdf } from "@/lib/agents/pdf-regenerate";
import { formatPollingUnitCode } from "@/lib/agents/format";

export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const nomination = await getAdminNomination(id);

  if (!nomination) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <BackLink href="/admin/agent-nominations/agents" />
        <p className="mt-6 text-text-muted">Nomination not found.</p>
      </div>
    );
  }

  await ensureCurrentNominationPdf(nomination.id);
  const [files, candidates] = await Promise.all([getAdminNominationFiles(nomination.id), listAdminCandidates()]);
  const candidate = candidates.find((c) => c.id === nomination.candidate_id);
  const backHref =
    candidate && candidate.slug !== OUR_CANDIDATE_SLUG
      ? `/admin/agent-nominations/agents?candidate=${candidate.slug}`
      : "/admin/agent-nominations/agents";
  const name = fullNameOf(nomination);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <BackLink href={backHref} />

      <header className="mt-4 flex flex-col gap-5 border-b border-border/60 pb-6 sm:flex-row sm:items-start">
        {files.passport_photo && (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img
            src={files.passport_photo}
            alt={`Passport photo of ${name}`}
            className="h-32 w-28 shrink-0 rounded-brand border border-border object-cover"
          />
        )}
        <div>
          <h1 className="font-heading text-2xl text-text">{name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            Form No. {nomination.form_no} · Reference {nomination.reference_id} · Submitted {when(nomination.created_at)}
          </p>
          {candidate && (
            <p className="mt-1 text-sm text-text-muted">
              Agent for {candidate.full_name} ({candidate.office})
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs capitalize text-text">
              Status: {nomination.status}
            </span>
            {nomination.is_possible_duplicate && (
              <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs text-yellow-300">
                Possible duplicate
              </span>
            )}
            {nomination.is_outside_area && (
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary">Outside area</span>
            )}
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <Section title="Personal details">
            <Field label="Surname" value={nomination.surname} />
            <Field label="First name" value={nomination.first_name} />
            <Field label="Other names" value={nomination.other_names ?? "None"} />
            <Field label="Gender" value={nomination.gender === "male" ? "Male" : "Female"} />
            <Field label="Means of ID" value={nomination.means_of_id} />
          </Section>

          <Section title="Contact">
            <Field label="Phone" value={nomination.phone} />
            <Field label="Email" value={nomination.email ?? "Not provided"} />
          </Section>

          <Section title="Polling unit">
            <Field label="LGA" value={nomination.lga} />
            <Field label="Ward" value={String(nomination.ward)} />
            <Field label="PU code" value={formatPollingUnitCode(nomination.polling_unit_code)} />
            <Field label="PU name" value={nomination.polling_unit_name} />
          </Section>

          {(nomination.flag_reason ||
            nomination.countersign_decision ||
            nomination.rejection_reason) && (
            <Section title="Review">
              {nomination.flag_reason && <Field label="Flag reason" value={nomination.flag_reason} />}
              {nomination.countersign_decision && (
                <Field
                  label="Countersign"
                  value={`${nomination.countersign_decision}${
                    nomination.countersigned_at ? ` · ${when(nomination.countersigned_at)}` : ""
                  }`}
                />
              )}
              {nomination.rejection_reason && <Field label="Rejection reason" value={nomination.rejection_reason} />}
            </Section>
          )}
        </div>

        <aside className="space-y-6">
          <div>
            <h2 className="font-heading text-lg text-text">Signature</h2>
            {files.specimen_signature ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                <img
                  src={files.specimen_signature}
                  alt={`Signature of ${name}`}
                  className="mt-3 h-36 w-full rounded-brand border border-border bg-white object-contain p-3"
                />
                <a
                  href={`/admin/agent-files/signature/${nomination.id}`}
                  className="mt-3 block rounded-brand bg-primary px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  Download signature (PNG)
                </a>
                <p className="mt-2 text-xs text-text-muted">Transparent background, as the agent drew it.</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-text-muted">No signature on record.</p>
            )}
          </div>

          <div>
            <h2 className="font-heading text-lg text-text">Documents</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <FileLink label="ID document" url={files.pvc_copy} />
              <FileLink label="Passport photo" url={files.passport_photo} />
              <FileLink label="Nomination form (PDF)" url={files.generated_pdf} />
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm text-text-muted hover:text-text">
      ← Back to agents
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-lg text-text">{title}</h2>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 rounded-brand border border-border bg-surface/30 p-4 text-sm sm:grid-cols-2">
        {children}
      </dl>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted/70">{label}</dt>
      <dd className="mt-0.5 break-words text-text">{value}</dd>
    </div>
  );
}

function FileLink({ label, url }: { label: string; url?: string }) {
  return (
    <li className="flex items-center justify-between rounded-brand border border-border bg-surface/40 px-4 py-2.5">
      <span className="text-text">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
          Open
        </a>
      ) : (
        <span className="text-text-muted">Unavailable</span>
      )}
    </li>
  );
}
