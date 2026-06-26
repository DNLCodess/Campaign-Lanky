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

/** "I Stand With Lanky" DP generator — captures supporter name + email. */
export async function submitDpSupporter(data: {
  name: string;
  email: string;
}): Promise<FormState> {
  const name = data.name?.trim() ?? "";
  const email = data.email?.trim() ?? "";

  if (!name) return { status: "error", message: "Please enter your name." };
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from("dp_supporters")
      .insert({ name: name.slice(0, 120), email });
    if (error) {
      console.error("[submitDpSupporter]", error);
      return { status: "error", message: GENERIC_ERROR };
    }
    await notifyCampaign(
      "New 'I Stand With' supporter",
      `Name: ${name}\nEmail: ${email}`,
    );
    return { status: "success" };
  } catch (err) {
    console.error("[submitDpSupporter]", err);
    return { status: "error", message: GENERIC_ERROR };
  }
}

/** Voter card registration assistance. Stores sensitive PII (server-only reads). */
export async function submitVoterRegistration(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const f = {
    surname: str(formData, "surname"),
    first_name: str(formData, "first_name"),
    middle_name: str(formData, "middle_name"),
    date_of_birth: str(formData, "date_of_birth"),
    mobile: str(formData, "mobile"),
    email: str(formData, "email"),
    nin: str(formData, "nin"),
    state_of_origin: str(formData, "state_of_origin"),
    place_of_birth: str(formData, "place_of_birth"),
    state_of_residence: str(formData, "state_of_residence"),
    lga_of_residence: str(formData, "lga_of_residence"),
    residential_address: str(formData, "residential_address"),
    ward: str(formData, "ward"),
    polling_unit: str(formData, "polling_unit"),
  };

  // Required fields (middle name + email are optional).
  const required: [keyof typeof f, string][] = [
    ["surname", "surname"],
    ["first_name", "first name"],
    ["date_of_birth", "date of birth"],
    ["mobile", "mobile number"],
    ["nin", "NIN"],
    ["state_of_origin", "state of origin"],
    ["place_of_birth", "place of birth"],
    ["state_of_residence", "state of residence"],
    ["lga_of_residence", "local government of residence"],
    ["residential_address", "residential address"],
    ["ward", "ward"],
    ["polling_unit", "polling unit"],
  ];
  for (const [key, label] of required) {
    if (!f[key]) return { status: "error", message: `Please enter your ${label}.` };
  }
  if (!/^\d{11}$/.test(f.nin)) {
    return { status: "error", message: "NIN must be exactly 11 digits." };
  }
  if (f.email && !f.email.includes("@")) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  // Validate date of birth: real date, not in the future, and 18+ (voting age).
  const dob = new Date(f.date_of_birth);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date_of_birth) || Number.isNaN(dob.getTime())) {
    return { status: "error", message: "Please enter a valid date of birth." };
  }
  const eighteenAgo = new Date();
  eighteenAgo.setFullYear(eighteenAgo.getFullYear() - 18);
  if (dob > new Date()) {
    return { status: "error", message: "Date of birth cannot be in the future." };
  }
  if (dob > eighteenAgo) {
    return { status: "error", message: "You must be at least 18 to register to vote." };
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase.from("voter_registrations").insert({
      ...f,
      middle_name: f.middle_name || null,
      email: f.email || null,
    });
    if (error) {
      console.error("[submitVoterRegistration]", error);
      return { status: "error", message: GENERIC_ERROR };
    }
    // Notify without the NIN (kept out of email for privacy; full data in admin).
    await notifyCampaign(
      "New voter registration",
      `Name: ${f.surname} ${f.first_name}\nMobile: ${f.mobile}\nWard: ${f.ward}\nPolling unit: ${f.polling_unit}\nLGA: ${f.lga_of_residence}\n\nFull details (incl. NIN) are in the admin dashboard.`,
    );
    return { status: "success" };
  } catch (err) {
    console.error("[submitVoterRegistration]", err);
    return { status: "error", message: GENERIC_ERROR };
  }
}
