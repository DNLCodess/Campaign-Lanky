/**
 * Seeds one test account per portal role so each tier can be manually tested.
 * Idempotent: re-running resets passwords + must_change_password on existing
 * seed accounts rather than erroring.
 *
 *   node scripts/seed-portal-test-accounts.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the env
 * (load .env.local first, e.g. `node --env-file=.env.local scripts/...`).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, { auth: { persistSession: false } });

// Override with SEED_PASSWORD=... for anything beyond throwaway local testing.
// These are test accounts on the live project — deactivate or delete them
// (test.admin/test.lga/test.ward/test.pu @votelanky.com) before the portal
// goes public.
const PASSWORD = process.env.SEED_PASSWORD ?? "TestPortal@2026";

async function pickGeo() {
  const { data, error } = await db
    .from("constituency_geo")
    .select("lga, ward, pu_code, pu_name")
    .order("ward")
    .order("pu_code");
  if (error) throw error;
  const nw = data.find((r) => r.lga === "Ibadan North-West");
  const sw = data.find((r) => r.lga === "Ibadan South-West");
  return { nw, sw, all: data };
}

async function upsertAccount({ email, full_name, role, lga, ward, polling_unit, parent }) {
  // find existing auth user
  let userId;
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    userId = found.id;
    await db.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
  } else {
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = created.user.id;
  }

  const row = {
    id: userId,
    email: email.toLowerCase(),
    full_name,
    role,
    lga: lga ?? null,
    ward: ward ?? null,
    polling_unit: polling_unit ?? null,
    is_active: true,
    must_change_password: false,
    created_by: parent ?? null,
    parent_account_id: parent ?? null,
  };
  const { error: upErr } = await db.from("portal_accounts").upsert(row, { onConflict: "id" });
  if (upErr) throw upErr;
  return userId;
}

const { nw, sw } = await pickGeo();
if (!nw || !sw) throw new Error("constituency_geo not seeded");

// constituency_admin — keep the real one if present, else make a test one
let adminId;
{
  const { data: existing } = await db
    .from("portal_accounts")
    .select("id, email")
    .eq("role", "constituency_admin")
    .limit(1)
    .maybeSingle();
  if (existing) {
    adminId = existing.id;
    console.log(`constituency_admin  : ${existing.email}  (existing — password unchanged)`);
  } else {
    adminId = await upsertAccount({
      email: "test.admin@votelanky.com",
      full_name: "Test Constituency Admin",
      role: "constituency_admin",
    });
    console.log(`constituency_admin  : test.admin@votelanky.com  /  ${PASSWORD}`);
  }
}

const lgaId = await upsertAccount({
  email: "test.lga@votelanky.com",
  full_name: "Test LGA Coordinator",
  role: "lga_coordinator",
  lga: nw.lga,
  parent: adminId,
});
console.log(`lga_coordinator     : test.lga@votelanky.com  /  ${PASSWORD}   (${nw.lga})`);

const wardId = await upsertAccount({
  email: "test.ward@votelanky.com",
  full_name: "Test Ward Agent",
  role: "ward_agent",
  lga: nw.lga,
  ward: nw.ward,
  parent: lgaId,
});
console.log(`ward_agent          : test.ward@votelanky.com  /  ${PASSWORD}   (${nw.lga}, Ward ${nw.ward})`);

await upsertAccount({
  email: "test.pu@votelanky.com",
  full_name: "Test Polling Unit Agent",
  role: "pu_agent",
  lga: nw.lga,
  ward: nw.ward,
  polling_unit: nw.pu_code,
  parent: wardId,
});
console.log(
  `pu_agent            : test.pu@votelanky.com  /  ${PASSWORD}   (${nw.lga}, Ward ${nw.ward}, PU ${nw.pu_code} — ${nw.pu_name})`,
);

console.log("\nDone. All test accounts have must_change_password = false.");
