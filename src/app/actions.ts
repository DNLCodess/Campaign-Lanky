"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { notifyCampaign } from "@/lib/email";
import type { FormState } from "@/lib/form-state";

const GENERIC_ERROR =
  "Sorry, something went wrong. Please try again in a moment.";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Homepage "Join the Movement" email/phone capture. */
export async function submitLead(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = str(formData, "email");
  const phone = str(formData, "phone");

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from("leads")
      .insert({ email, phone: phone || null, source: "homepage" });
    if (error) {
      console.error("[submitLead]", error);
      return { status: "error", message: GENERIC_ERROR };
    }
    await notifyCampaign(
      "New supporter joined",
      `Email: ${email}\nPhone: ${phone || "—"}`,
    );
    return { status: "success" };
  } catch (err) {
    console.error("[submitLead]", err);
    return { status: "error", message: GENERIC_ERROR };
  }
}

/** Get Involved volunteer sign-up. */
export async function submitVolunteer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const ward = str(formData, "ward");
  const interests = formData
    .getAll("interests")
    .map((v) => String(v))
    .slice(0, 10);

  if (!name) return { status: "error", message: "Please enter your name." };
  if (!phone)
    return { status: "error", message: "Please enter a phone number." };

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase.from("volunteers").insert({
      name,
      phone,
      email: email || null,
      ward: ward || null,
      interests,
    });
    if (error) {
      console.error("[submitVolunteer]", error);
      return { status: "error", message: GENERIC_ERROR };
    }
    await notifyCampaign(
      "New volunteer sign-up",
      `Name: ${name}\nPhone: ${phone}\nEmail: ${email || "—"}\nWard: ${
        ward || "—"
      }\nInterests: ${interests.join(", ") || "—"}`,
    );
    return { status: "success" };
  } catch (err) {
    console.error("[submitVolunteer]", err);
    return { status: "error", message: GENERIC_ERROR };
  }
}

/** Contact page message. */
export async function submitContact(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = str(formData, "name");
  const contact = str(formData, "contact");
  const message = str(formData, "message");

  if (!name || !contact || !message) {
    return { status: "error", message: "Please fill in all fields." };
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from("messages")
      .insert({ name, contact, message });
    if (error) {
      console.error("[submitContact]", error);
      return { status: "error", message: GENERIC_ERROR };
    }
    await notifyCampaign(
      "New contact message",
      `Name: ${name}\nContact: ${contact}\n\n${message}`,
    );
    return { status: "success" };
  } catch (err) {
    console.error("[submitContact]", err);
    return { status: "error", message: GENERIC_ERROR };
  }
}
