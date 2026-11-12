import JSZip from "jszip";
import { getAdminUser } from "@/lib/admin-auth";
import {
  downloadStoredFile,
  fullNameOf,
  getFilePaths,
  listAdminCandidates,
  listAllAdminNominations,
  nominationFileBase,
  pickCandidate,
} from "@/lib/agents/admin-nominations";
import { rowsToCsv } from "@/lib/admin-tables";

export const dynamic = "force-dynamic";

/**
 * Every signature PNG for one candidate in a ZIP, one folder per ward, plus
 * an index.csv mapping each file back to the agent.
 */
export async function GET(req: Request) {
  if (!(await getAdminUser())) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const candidate = pickCandidate(await listAdminCandidates(), url.searchParams.get("candidate") ?? undefined);
  if (!candidate) return new Response("No candidates", { status: 404 });

  const wardParam = Number(url.searchParams.get("ward"));
  let rows = await listAllAdminNominations(candidate.id);
  if (url.searchParams.get("ward") && Number.isInteger(wardParam)) rows = rows.filter((r) => r.ward === wardParam);

  const paths = await getFilePaths(rows.map((r) => r.id), "specimen_signature");
  const zip = new JSZip();
  const index: Record<string, unknown>[] = [];

  const CONCURRENCY = 8;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(
      rows.slice(i, i + CONCURRENCY).map(async (r) => {
        const path = paths.get(r.id);
        const bytes = path ? await downloadStoredFile(path) : null;
        const file = `Ward ${String(r.ward).padStart(2, "0")}/${nominationFileBase(r)}_signature.png`;
        if (bytes) zip.file(file, bytes);
        index.push({
          file: bytes ? file : "(missing)",
          form_no: r.form_no,
          reference_id: r.reference_id,
          name: fullNameOf(r),
          phone: r.phone,
          ward: r.ward,
          polling_unit_code: r.polling_unit_code,
          polling_unit_name: r.polling_unit_name,
        });
      }),
    );
  }

  index.sort((a, b) => Number(a.ward) - Number(b.ward) || String(a.file).localeCompare(String(b.file)));
  zip.file(
    "index.csv",
    rowsToCsv(["file", "form_no", "reference_id", "name", "phone", "ward", "polling_unit_code", "polling_unit_name"], index),
  );

  const bytes = await zip.generateAsync({ type: "uint8array" });
  const suffix = url.searchParams.get("ward") ? `-ward${wardParam}` : "";
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${candidate.slug}${suffix}-signatures.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
