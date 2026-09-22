import "server-only";
import JSZip from "jszip";
import { requireCandidateSession } from "@/lib/agents/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const session = await requireCandidateSession();
  const admin = createAdminSupabase();

  const { data: nominations } = await admin
    .from("agent_nominations")
    .select("id, reference_id, first_name, surname")
    .eq("candidate_id", session.id)
    .order("created_at", { ascending: true });

  const zip = new JSZip();
  for (const n of nominations ?? []) {
    const { data: fileRow } = await admin
      .from("agent_nomination_files")
      .select("storage_path")
      .eq("nomination_id", n.id)
      .eq("file_type", "generated_pdf")
      .maybeSingle();
    if (!fileRow) continue; // defensive: shouldn't happen post-fix, but never fail the whole export over one nominee

    const { data: blob } = await admin.storage.from("agent-nominations").download(fileRow.storage_path);
    if (!blob) continue;

    const safeName = `${n.reference_id}-${n.surname}-${n.first_name}`.replace(/[^a-zA-Z0-9-]/g, "_");
    zip.file(`${safeName}.pdf`, await blob.arrayBuffer());
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  return new Response(Buffer.from(zipBytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${session.slug}-nominations.zip"`,
    },
  });
}
