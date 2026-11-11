// Loads docs/oyo-polling-units-inec-2023.csv into public.oyo_polling_units, then
// recomputes every nomination's is_outside_area flag.
// Run after docs/superpowers/specs/2026-11-11-oyo-polling-units.sql:
//   node --env-file=.env.local scripts/seed-oyo-polling-units.mjs
// Idempotent: upserts on pu_code.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), "../docs/oyo-polling-units-inec-2023.csv");
const EXPECTED = { pus: 6390, lgas: 33, wards: 351 };

/** RFC 4180-ish: quoted fields may contain commas, quotes ("") and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/**
 * INEC "IBADAN NORTH WEST" -> "Ibadan North-West", "ONA-ARA" -> "Ona-Ara".
 * Must reproduce constituency_geo's existing spellings for Ibadan NW/SW, since
 * nominations already store those strings in agent_nominations.lga.
 */
function lgaDisplayName(raw) {
  const titled = raw
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep, c) => sep + c.toUpperCase());
  return titled.replace(/^Ibadan (North|South)[ -](East|West)$/, "Ibadan $1-$2");
}

const clean = (s) => s.replace(/\s+/g, " ").trim();

const records = parseCsv(fs.readFileSync(CSV, "utf8")).map((r) => ({
  pu_code: r.pu_code,
  lga: lgaDisplayName(clean(r.lga)),
  lga_code: r.lga_code,
  ward: Number(r.ward_code),
  ward_name: clean(r.ward),
  pu_name: clean(r.pu_name),
  state_constituency_id: Number(r.state_constituency_id),
  federal_constituency_id: Number(r.federal_constituency_id),
  senatorial_district_id: Number(r.senatorial_district_id),
}));

const lgas = new Set(records.map((r) => r.lga));
const wards = new Set(records.map((r) => `${r.lga}|${r.ward}`));
if (records.length !== EXPECTED.pus || lgas.size !== EXPECTED.lgas || wards.size !== EXPECTED.wards) {
  throw new Error(`Unexpected CSV shape: ${records.length} PUs, ${lgas.size} LGAs, ${wards.size} wards`);
}
for (const r of records) {
  if (!/^30-\d{2}-\d{2}-\d{3}$/.test(r.pu_code) || !r.ward || !r.pu_name || !r.state_constituency_id) {
    throw new Error(`Bad row: ${JSON.stringify(r)}`);
  }
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Guard: Ibadan NW/SW must line up exactly with constituency_geo (same codes,
// same LGA spelling, same ward), or existing nominations would disagree with
// the new table.
const { data: geo, error: geoError } = await db.from("constituency_geo").select("lga, ward, pu_code");
if (geoError) throw geoError;
const byCode = new Map(records.map((r) => [r.pu_code, r]));
const mismatched = geo.filter((g) => {
  const r = byCode.get(g.pu_code);
  return !r || r.lga !== g.lga || r.ward !== g.ward;
});
if (mismatched.length) {
  throw new Error(`${mismatched.length} constituency_geo rows disagree, e.g. ${JSON.stringify(mismatched[0])}`);
}

for (let i = 0; i < records.length; i += 500) {
  const { error } = await db.from("oyo_polling_units").upsert(records.slice(i, i + 500), { onConflict: "pu_code" });
  if (error) throw error;
}
const { count } = await db.from("oyo_polling_units").select("pu_code", { count: "exact", head: true });
console.log(`oyo_polling_units: ${count} rows (${lgas.size} LGAs, ${wards.size} wards)`);

const { data: flagged, error: flagError } = await db.rpc("refresh_outside_area_flags", { p_candidate_id: null });
if (flagError) throw flagError;
console.log(`Nominations flagged as outside their candidate's area: ${flagged}`);
