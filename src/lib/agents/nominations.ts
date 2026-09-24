import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sanitizeSearch } from "@/lib/admin-tables";

export type NominationListItem = {
  id: string;
  form_no: number;
  reference_id: string;
  first_name: string;
  other_names: string | null;
  surname: string;
  phone: string;
  ward: number;
  polling_unit_code: string;
  polling_unit_name: string;
  is_possible_duplicate: boolean;
  created_at: string;
};

export type NominationSort = "newest" | "oldest" | "name" | "unit";

export type NominationDetail = {
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
  is_possible_duplicate: boolean;
  created_at: string;
};

export type NominationFile = {
  file_type: string;
  url: string | null;
};

const SEARCH_COLUMNS = ["first_name", "other_names", "surname", "phone", "email", "reference_id"];

/** Paginated, searchable list of one candidate's own nominations, newest first. */
export async function listCandidateNominations(
  candidateId: string,
  options: {
    q?: string;
    duplicatesOnly?: boolean;
    ward?: number;
    sort?: NominationSort;
    page: number;
    pageSize: number;
  },
): Promise<{ rows: NominationListItem[]; total: number }> {
  const admin = createAdminSupabase();
  let query = admin
    .from("agent_nominations")
    .select(
      "id, form_no, reference_id, first_name, other_names, surname, phone, ward, polling_unit_code, polling_unit_name, is_possible_duplicate, created_at",
      { count: "exact" },
    )
    .eq("candidate_id", candidateId)
    .range((options.page - 1) * options.pageSize, options.page * options.pageSize - 1);

  switch (options.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "name":
      query = query.order("surname", { ascending: true }).order("first_name", { ascending: true });
      break;
    case "unit":
      query = query.order("polling_unit_code", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  if (options.ward !== undefined) query = query.eq("ward", options.ward);

  const q = sanitizeSearch(options.q ?? "");
  if (q) {
    const expr = SEARCH_COLUMNS.map((c) => `${c}.ilike.%${q}%`).join(",");
    query = query.or(expr);
  }
  if (options.duplicatesOnly) {
    query = query.eq("is_possible_duplicate", true);
  }

  const { data, count } = await query;
  return { rows: (data ?? []) as NominationListItem[], total: count ?? 0 };
}

/** A single nomination, re-scoped to candidateId in the query itself — never fetched then trusted. */
export async function getCandidateNomination(
  candidateId: string,
  nominationId: string,
): Promise<NominationDetail | null> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("agent_nominations")
    .select(
      "id, candidate_id, form_no, reference_id, first_name, other_names, surname, gender, phone, email, means_of_id, lga, ward, polling_unit_code, polling_unit_name, status, is_possible_duplicate, created_at",
    )
    .eq("id", nominationId)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  return (data as NominationDetail) ?? null;
}

/**
 * Signed URLs (1 hour) for every file on record for a nomination.
 * Takes candidateId and re-verifies ownership itself (not just trusting the
 * caller already checked) — this function must be safe to call on its own,
 * not only safe because the one current call site happens to check first.
 */
export async function getNominationFiles(
  candidateId: string,
  nominationId: string,
): Promise<NominationFile[]> {
  const admin = createAdminSupabase();
  const { data: owned } = await admin
    .from("agent_nominations")
    .select("id")
    .eq("id", nominationId)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  if (!owned) return [];

  const { data: files } = await admin
    .from("agent_nomination_files")
    .select("file_type, storage_path")
    .eq("nomination_id", nominationId);
  if (!files || files.length === 0) return [];

  return Promise.all(
    files.map(async (f) => {
      const { data: signed } = await admin.storage
        .from("agent-nominations")
        .createSignedUrl(f.storage_path, 3600);
      return { file_type: f.file_type as string, url: signed?.signedUrl ?? null };
    }),
  );
}

/** True total of a candidate's nominations, ignoring any search/duplicate filter — used to decide whether to show export/bulk actions. */
export async function countCandidateNominations(candidateId: string): Promise<number> {
  const admin = createAdminSupabase();
  const { count } = await admin
    .from("agent_nominations")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId);
  return count ?? 0;
}

export type NominationStats = {
  total: number;
  duplicates: number;
  pollingUnits: number;
  wards: number[];
};

/** Whole-candidacy numbers for the summary strip and ward filter, ignoring any active search/filter. */
export async function getCandidateNominationStats(candidateId: string): Promise<NominationStats> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("agent_nominations")
    .select("ward, polling_unit_code, is_possible_duplicate")
    .eq("candidate_id", candidateId)
    .range(0, 9999);
  const rows = data ?? [];
  return {
    total: rows.length,
    duplicates: rows.filter((r) => r.is_possible_duplicate).length,
    pollingUnits: new Set(rows.map((r) => r.polling_unit_code)).size,
    wards: Array.from(new Set(rows.map((r) => r.ward as number))).sort((a, b) => a - b),
  };
}
