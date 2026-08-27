import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("missing env");

const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || "Constituency Admin";
if (!email || !password) {
  console.error("usage: node bootstrap-portal-admin.mjs <email> <password> [full name]");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await supabase
  .from("portal_accounts")
  .select("id")
  .eq("role", "constituency_admin")
  .maybeSingle();
if (existing) {
  console.error("A constituency_admin account already exists. Aborting.");
  process.exit(1);
}

const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (authError) {
  console.error("Auth creation failed:", authError.message);
  process.exit(1);
}

const { error: insertError } = await supabase.from("portal_accounts").insert({
  id: authUser.user.id,
  email,
  full_name: fullName,
  role: "constituency_admin",
  must_change_password: true,
});
if (insertError) {
  console.error("Insert failed:", insertError.message);
  await supabase.auth.admin.deleteUser(authUser.user.id);
  process.exit(1);
}

console.log("Constituency admin created:", email);
