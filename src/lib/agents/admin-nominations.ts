import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sanitizeSearch } from "@/lib/admin-tables";

/**
 * Admin-side (campaign /admin) read access to Party Agent nominations.
 *
 * Unlike src/lib/agents/nominations.ts (scoped to the signed-in candidate),
 * these helpers can read any candidate's data, so every caller MUST have
 * already passed requireAdmin()/getAdminUser().
 */

/** Our own candidate. The admin agents page opens on this one by default. */
export const OUR_CANDIDATE_SLUG = "olanrewaju-okesooto";

const BUCKET = "agent-nominations";

export type AdminCandidate = { id: string; slug: string; full_name: string; office: string };

export type AdminNominationRow = {
  id: string;
  candidate_id: string;
  form_no: number;
  reference_id: string;
  first_name: string;
  other_names: string | null;
  surname: string;
  gender: "male" | "female";
  phone: string;
  email: string | null;
  means_of_id: string;
  lga: string;
  ward: number;
  polling_unit_code: string;
  polling_unit_name: string;
  status: string;
  flag_reason: string | null;
  is_possible_duplicate: boolean;
  is_outside_area: boolean;
  countersigned_at: string | null;
  countersign_decision: string | null;
  rejection_reason: string | null;
  created_at: string;
};

const ROW_COLUMNS =
  "id, candidate_id, form_no, reference_id, first_name, other_names, surname, gender, phone, email, means_of_id, lga, ward, polling_unit_code, polling_unit_name, status, flag_reason, is_possible_duplicate, is_outside_area, countersigned_at, countersign_decision, rejection_reason, created_at";

const SEARCH_COLUMNS = ["first_name", "other_names", "surname", "phone", "email", "reference_id", "polling_unit_name"];

export const fullNameOf = (r: { first_name: string; other_names: string | null; surname: string }) =>
  [r.first_name, r.other_names, r.surname].filter(Boolean).join(" ");

/** All candidates, ours first, then alphabetical. */
export async function listAdminCandidates(): Promise<AdminCandidate[]> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("nomination_candidates")
    .select("id, slug, full_name, office")
    .order("full_name", { ascending: true });
  const list = (data ?? []) as AdminCandidate[];
  return list.sort((a, b) => Number(b.slug === OUR_CANDIDATE_SLUG) - Number(a.slug === OUR_CANDIDATE_SLUG));
}

/** Picks the candidate named by slug, else ours, else the first one. */
export function pickCandidate(candidates: AdminCandidate[], slug?: string): AdminCandidate | null {
  return (
    candidates.find((c) => c.slug === slug) ??
    candidates.find((c) => c.slug === OUR_CANDIDATE_SLUG) ??
    candidates[0] ??
    null
  );
}

/** Paginated list for one candidate, ordered ward → polling unit → surname. */
export async function listAdminNominations(
  candidateId: string,
  options: { q?: string; ward?: number; page: number; pageSize: number },
): Promise<{ rows: AdminNominationRow[]; total: number }> {
  const admin = createAdminSupabase();
  let query = admin
    .from("agent_nominations")
    .select(ROW_COLUMNS, { count: "exact" })
    .eq("candidate_id", candidateId)
    .order("ward", { ascending: true })
    .order("polling_unit_code", { ascending: true })
    .order("surname", { ascending: true })
    .range((options.page - 1) * options.pageSize, options.page * options.pageSize - 1);

  if (options.ward !== undefined) query = query.eq("ward", options.ward);
  const q = sanitizeSearch(options.q ?? "");
  if (q) query = query.or(SEARCH_COLUMNS.map((c) => `${c}.ilike.%${q}%`).join(","));

  const { data, count } = await query;
  return { rows: (data ?? []) as unknown as AdminNominationRow[], total: count ?? 0 };
}

/** Every nomination for one candidate (for exports), same ordering as the list. */
export async function listAllAdminNominations(candidateId: string): Promise<AdminNominationRow[]> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("agent_nominations")
    .select(ROW_COLUMNS)
    .eq("candidate_id", candidateId)
    .order("ward", { ascending: true })
    .order("polling_unit_code", { ascending: true })
    .order("surname", { ascending: true })
    .range(0, 9999);
  return (data ?? []) as unknown as AdminNominationRow[];
}

export type AdminNominationStats = {
  total: number;
  pollingUnits: number;
  wards: number[];
  duplicates: number;
  outsideArea: number;
};

export async function getAdminNominationStats(candidateId: string): Promise<AdminNominationStats> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("agent_nominations")
    .select("ward, polling_unit_code, is_possible_duplicate, is_outside_area")
    .eq("candidate_id", candidateId)
    .range(0, 9999);
  const rows = data ?? [];
  return {
    total: rows.length,
    pollingUnits: new Set(rows.map((r) => r.polling_unit_code)).size,
    wards: Array.from(new Set(rows.map((r) => r.ward as number))).sort((a, b) => a - b),
    duplicates: rows.filter((r) => r.is_possible_duplicate).length,
    outsideArea: rows.filter((r) => r.is_outside_area).length,
  };
}

export async function getAdminNomination(id: string): Promise<AdminNominationRow | null> {
  const admin = createAdminSupabase();
  const { data } = await admin.from("agent_nominations").select(ROW_COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as AdminNominationRow) ?? null;
}

/** nomination id → storage path of its file of the given type. */
export async function getFilePaths(nominationIds: string[], fileType: string): Promise<Map<string, string>> {
  if (nominationIds.length === 0) return new Map();
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("agent_nomination_files")
    .select("nomination_id, storage_path")
    .eq("file_type", fileType)
    .in("nomination_id", nominationIds);
  return new Map((data ?? []).map((f) => [f.nomination_id as string, f.storage_path as string]));
}

/** Short-lived signed URLs (for <img> previews) keyed by nomination id. */
export async function signedUrlsFor(paths: Map<string, string>, seconds = 3600): Promise<Map<string, string>> {
  const entries = Array.from(paths.entries());
  if (entries.length === 0) return new Map();
  const admin = createAdminSupabase();
  const { data } = await admin.storage.from(BUCKET).createSignedUrls(
    entries.map(([, p]) => p),
    seconds,
  );
  const out = new Map<string, string>();
  (data ?? []).forEach((d, i) => {
    if (d.signedUrl) out.set(entries[i][0], d.signedUrl);
  });
  return out;
}

/** Signed URLs for every file on one nomination, keyed by file_type. */
export async function getAdminNominationFiles(nominationId: string): Promise<Record<string, string>> {
  const admin = createAdminSupabase();
  const { data: files } = await admin
    .from("agent_nomination_files")
    .select("file_type, storage_path")
    .eq("nomination_id", nominationId);
  const out: Record<string, string> = {};
  await Promise.all(
    (files ?? []).map(async (f) => {
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(f.storage_path, 3600);
      if (data?.signedUrl) out[f.file_type as string] = data.signedUrl;
    }),
  );
  return out;
}

/** Raw bytes of a stored file, or null if it's missing. */
export async function downloadStoredFile(path: string): Promise<Uint8Array | null> {
  const admin = createAdminSupabase();
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/** Descriptive, filesystem-safe base name, e.g. "W03_30-08-03-007_ADEYEMI_Tunde". */
export function nominationFileBase(r: Pick<AdminNominationRow, "ward" | "polling_unit_code" | "surname" | "first_name">): string {
  const ward = `W${String(r.ward).padStart(2, "0")}`;
  return `${ward}_${r.polling_unit_code}_${r.surname}_${r.first_name}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}
