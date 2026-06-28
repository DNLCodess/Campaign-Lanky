"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type LeaderState = { error?: string; success?: string };

type LeaderInput = {
  name: string;
  position: string;
  unit: string | null;
  phone: string | null;
  email: string | null;
  display_order: number;
  is_published: boolean;
};

function parseForm(formData: FormData): LeaderInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const order = Number(formData.get("display_order"));
  const is_published = formData.get("is_published") != null;

  if (!name) return { error: "Name is required." };
  if (!position) return { error: "Position is required." };
  if (email && !email.includes("@")) return { error: "Enter a valid email address." };

  return {
    name,
    position,
    unit: unit || null,
    phone: phone || null,
    email: email || null,
    display_order: Number.isFinite(order) ? order : 0,
    is_published,
  };
}

export async function createUnitLeader(
  _prev: LeaderState,
  formData: FormData,
): Promise<LeaderState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if ("error" in parsed) return parsed;

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("unit_leaders").insert(parsed);
    if (error) return { error: error.message };
    revalidatePath("/admin/unit-leaders");
    return { success: `${parsed.name} added.` };
  } catch (err) {
    console.error("[createUnitLeader]", err);
    return { error: "Could not add the unit leader." };
  }
}

export async function updateUnitLeader(
  _prev: LeaderState,
  formData: FormData,
): Promise<LeaderState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing record id." };
  const parsed = parseForm(formData);
  if ("error" in parsed) return parsed;

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("unit_leaders").update(parsed).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/unit-leaders");
    return { success: `${parsed.name} updated.` };
  } catch (err) {
    console.error("[updateUnitLeader]", err);
    return { error: "Could not update the unit leader." };
  }
}

export async function deleteUnitLeader(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const supabase = createAdminSupabase();
    await supabase.from("unit_leaders").delete().eq("id", id);
    revalidatePath("/admin/unit-leaders");
  } catch (err) {
    console.error("[deleteUnitLeader]", err);
  }
}
