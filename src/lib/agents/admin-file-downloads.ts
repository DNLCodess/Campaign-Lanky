import "server-only";
import JSZip from "jszip";
import { rowsToCsv } from "@/lib/admin-tables";
import {
  downloadStoredFile,
  fullNameOf,
  getAdminNomination,
  getFilePaths,
  listAdminCandidates,
  listAllAdminNominations,
  nominationFileBase,
  pickCandidate,
  type AdminNominationRow,
} from "@/lib/agents/admin-nominations";

/**
 * Admin downloads of agents' uploaded files. Callers MUST have already
 * checked getAdminUser() — these read any candidate's files.
 */

export const FILE_KINDS = {
  signature: { fileType: "specimen_signature", label: "signatures", suffix: () => "signature" },
  id: { fileType: "pvc_copy", label: "ID documents", suffix: (r: AdminNominationRow) => r.means_of_id || "ID" },
  photo: { fileType: "passport_photo", label: "passport photos", suffix: () => "photo" },
} as const;

export type FileKind = keyof typeof FILE_KINDS;

export function isFileKind(v: string): v is FileKind {
  return Object.hasOwn(FILE_KINDS, v);
}

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
};

/** Extension of a storage path, restricted to the formats the bucket accepts. */
function extOf(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ext in CONTENT_TYPES ? ext : "bin";
}

function fileNameFor(kind: FileKind, r: AdminNominationRow, path: string): string {
  const suffix = FILE_KINDS[kind].suffix(r).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${nominationFileBase(r)}_${suffix}.${extOf(path)}`;
}

/**
 * Streams the ZIP out as it's built rather than buffering it whole: ID
 * photos run to ~2.7 MB each, so a full ZIP easily passes the size limit
 * hosts put on a single buffered function response. Images and PDFs are
 * already compressed, so entries are stored as-is (STORE) rather than
 * re-deflated.
 */
function zipStream(zip: JSZip): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      zip
        .generateInternalStream({ type: "uint8array", compression: "STORE", streamFiles: true })
        .on("data", (chunk: Uint8Array) => controller.enqueue(chunk))
        .on("error", (err: Error) => controller.error(err))
        .on("end", () => controller.close())
        .resume();
    },
  });
}

/** One agent's file in its original format, as an attachment. */
export async function singleFileResponse(kind: FileKind, nominationId: string): Promise<Response> {
  const nomination = await getAdminNomination(nominationId);
  if (!nomination) return new Response("Not found", { status: 404 });

  const path = (await getFilePaths([nominationId], FILE_KINDS[kind].fileType)).get(nominationId);
  const bytes = path ? await downloadStoredFile(path) : null;
  if (!path || !bytes) return new Response("File not found", { status: 404 });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[extOf(path)] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileNameFor(kind, nomination, path)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * Every file of one kind for a candidate (optionally one ward) as a ZIP:
 * one folder per ward plus an index.csv mapping each file to its agent.
 */
export async function zipResponse(kind: FileKind, searchParams: URLSearchParams): Promise<Response> {
  const candidate = pickCandidate(await listAdminCandidates(), searchParams.get("candidate") ?? undefined);
  if (!candidate) return new Response("No candidates", { status: 404 });

  const wardRaw = searchParams.get("ward");
  const ward = Number(wardRaw);
  const hasWard = Boolean(wardRaw) && Number.isInteger(ward);

  let rows = await listAllAdminNominations(candidate.id);
  if (hasWard) rows = rows.filter((r) => r.ward === ward);

  const paths = await getFilePaths(rows.map((r) => r.id), FILE_KINDS[kind].fileType);
  const zip = new JSZip();
  const index: Record<string, unknown>[] = [];

  const CONCURRENCY = 8;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(
      rows.slice(i, i + CONCURRENCY).map(async (r) => {
        const path = paths.get(r.id);
        const bytes = path ? await downloadStoredFile(path) : null;
        const file = path ? `Ward ${String(r.ward).padStart(2, "0")}/${fileNameFor(kind, r, path)}` : "";
        if (bytes) zip.file(file, bytes);
        index.push({
          file: bytes ? file : "(missing)",
          form_no: r.form_no,
          reference_id: r.reference_id,
          name: fullNameOf(r),
          means_of_id: r.means_of_id,
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
    rowsToCsv(
      ["file", "form_no", "reference_id", "name", "means_of_id", "phone", "ward", "polling_unit_code", "polling_unit_name"],
      index,
    ),
  );

  const name = `${candidate.slug}${hasWard ? `-ward${ward}` : ""}-${FILE_KINDS[kind].label.replace(/\s+/g, "-").toLowerCase()}.zip`;
  return new Response(zipStream(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
