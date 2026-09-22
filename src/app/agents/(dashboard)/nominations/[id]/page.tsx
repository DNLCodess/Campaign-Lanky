import Link from "next/link";
import { requireCandidateSession } from "@/lib/agents/session";
import { getCandidateNomination, getNominationFiles } from "@/lib/agents/nominations";
import { agentsPath } from "@/lib/agents/routes";

export const dynamic = "force-dynamic";

const FILE_LABELS: Record<string, string> = {
  pvc_copy: "PVC copy",
  passport_photo: "Passport photo",
  specimen_signature: "Signature",
  generated_pdf: "Generated form (PDF)",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function NominationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCandidateSession();
  const { id } = await params;
  const nomination = await getCandidateNomination(session.id, id);

  if (!nomination) {
    return (
      <div className="rounded-brand border border-border bg-surface/30 px-4 py-12 text-center text-text-muted">
        Nomination not found.
        <div className="mt-3">
          <Link href={agentsPath("/")} className="text-accent underline underline-offset-2">
            ← Back to nominations
          </Link>
        </div>
      </div>
    );
  }

  const files = await getNominationFiles(session.id, nomination.id);
  const fullName = [nomination.first_name, nomination.other_names, nomination.surname]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <Link href={agentsPath("/")} className="text-sm text-text-muted hover:text-text">
        ← Back to nominations
      </Link>

      <header className="mt-4 border-b border-border/60 pb-6">
        <h1 className="font-heading text-2xl text-text">{fullName}</h1>
        <p className="mt-1 text-sm text-text-muted">
          Form No. {nomination.form_no} · Reference {nomination.reference_id} · Submitted{" "}
          {when(nomination.created_at)}
        </p>
        {nomination.is_possible_duplicate && (
          <span className="mt-2 inline-block rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs text-yellow-300">
            Possible duplicate — matches an existing phone or email under this candidacy
          </span>
        )}
      </header>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Field label="Gender" value={nomination.gender === "male" ? "Male" : "Female"} />
        <Field label="Phone" value={nomination.phone} />
        <Field label="Email" value={nomination.email ?? "—"} />
        <Field label="Means of ID" value={nomination.means_of_id} />
        <Field label="LGA" value={nomination.lga} />
        <Field label="Ward" value={String(nomination.ward)} />
        <Field
          label="Polling Unit"
          value={`${nomination.polling_unit_code} — ${nomination.polling_unit_name}`}
        />
      </dl>

      <section className="mt-8">
        <h2 className="font-heading text-lg text-text">Uploaded files</h2>
        <div className="mt-3 space-y-2">
          {files.length === 0 && <p className="text-sm text-text-muted">No files on record.</p>}
          {files.map((f) => (
            <div
              key={f.file_type}
              className="flex items-center justify-between rounded-brand border border-border bg-surface/40 px-4 py-3 text-sm"
            >
              <span className="text-text">{FILE_LABELS[f.file_type] ?? f.file_type}</span>
              {f.url ? (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline underline-offset-2 hover:text-text"
                >
                  View
                </a>
              ) : (
                <span className="text-text-muted">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted/70">{label}</dt>
      <dd className="mt-0.5 text-text">{value}</dd>
    </div>
  );
}
