import "server-only";
import JSZip from "jszip";
import { requireCandidateSession } from "@/lib/agents/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentNominationPdf } from "@/lib/agents/pdf-regenerate";

export async function GET() {
  const session = await requireCandidateSession();
  const admin = createAdminSupabase();

  const { data: nominations } = await admin
    .from("agent_nominations")
    .select("id, reference_id, first_name, surname")
    .eq("candidate_id", session.id)
    .order("created_at", { ascending: true });

  const zip = new JSZip();
  const list = nominations ?? [];

  // A few at a time: each one may need repairing (see pdf-regenerate.ts), and
  // doing 200+ strictly one-by-one would be slow while all at once would spike memory.
  const CONCURRENCY = 5;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    await Promise.all(
      list.slice(i, i + CONCURRENCY).map(async (n) => {
        const { data: fileRow } = await admin
          .from("agent_nomination_files")
          .select("storage_path")
          .eq("nomination_id", n.id)
          .eq("file_type", "generated_pdf")
          .maybeSingle();
        if (!fileRow) return; // never fail the whole export over one nominee

        const pdf = await getCurrentNominationPdf(admin, n.id, fileRow.storage_path);
        if (!pdf) return;

        const safeName = `${n.reference_id}-${n.surname}-${n.first_name}`.replace(/[^a-zA-Z0-9-]/g, "_");
        zip.file(`${safeName}.pdf`, pdf);
      }),
    );
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  return new Response(Buffer.from(zipBytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${session.slug}-nominations.zip"`,
    },
  });
}
