/**
 * Shared config for the admin submission tables — drives search columns,
 * CSV columns, and tab labels for both the dashboard and the CSV export route.
 */
export type AdminTableKey =
  | "voter_registrations"
  | "donations"
  | "volunteers"
  | "leads"
  | "dp_supporters"
  | "messages";

export const ADMIN_TABLES: Record<
  AdminTableKey,
  { label: string; search: string[]; csv: string[] }
> = {
  voter_registrations: {
    label: "Voter Cards",
    search: ["surname", "first_name", "mobile", "ward", "polling_unit", "lga_of_residence"],
    csv: [
      "created_at",
      "surname",
      "first_name",
      "middle_name",
      "date_of_birth",
      "mobile",
      "email",
      "nin",
      "state_of_origin",
      "place_of_birth",
      "state_of_residence",
      "lga_of_residence",
      "residential_address",
      "ward",
      "polling_unit",
    ],
  },
  donations: {
    label: "Donations",
    search: ["donor_name", "donor_email", "status", "tx_ref"],
    csv: [
      "created_at",
      "donor_name",
      "donor_email",
      "donor_phone",
      "amount",
      "currency",
      "status",
      "payment_type",
      "tx_ref",
      "flw_transaction_id",
    ],
  },
  volunteers: {
    label: "Volunteers",
    search: ["name", "phone", "email", "ward"],
    csv: ["created_at", "name", "phone", "email", "ward", "interests"],
  },
  leads: {
    label: "Supporters",
    search: ["email", "phone", "source"],
    csv: ["created_at", "email", "phone", "source"],
  },
  dp_supporters: {
    label: "DP Supporters",
    search: ["name", "email"],
    csv: ["created_at", "name", "email"],
  },
  messages: {
    label: "Messages",
    search: ["name", "contact", "message"],
    csv: ["created_at", "name", "contact", "message"],
  },
};

export const ADMIN_TABLE_ORDER: AdminTableKey[] = [
  "voter_registrations",
  "donations",
  "volunteers",
  "leads",
  "dp_supporters",
  "messages",
];

export function isAdminTable(v: string): v is AdminTableKey {
  return v in ADMIN_TABLES;
}

/** Sanitises a user search term for safe use inside a PostgREST .or() filter. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%,()*]/g, " ").trim().slice(0, 80);
}

/** Builds a PostgREST `.or()` expression across a table's search columns. */
export function searchExpression(table: AdminTableKey, q: string): string | null {
  const safe = sanitizeSearch(q);
  if (!safe) return null;
  return ADMIN_TABLES[table].search.map((c) => `${c}.ilike.%${safe}%`).join(",");
}

/** Serialise a value into a CSV-safe cell. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function rowsToCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.join(",");
  const lines = rows.map((r) => columns.map((c) => csvCell(r[c])).join(","));
  return [header, ...lines].join("\r\n");
}
