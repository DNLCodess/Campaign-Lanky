"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { initiatePayment, flwConfig } from "@/lib/flutterwave";
import { markAbandonedIfPending } from "@/lib/donations";

export type DonateState = {
  status: "idle" | "error";
  message?: string;
  link?: string;
};

const MIN = 100;
const MAX = 10_000_000;

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Create a pending donation (idempotent unique tx_ref) and return a Flutterwave
 * hosted-checkout link. The client redirects to it. Validation happens here
 * (never trust the client amount), and config is checked before any DB write.
 */
export async function initiateDonation(
  _prev: DonateState,
  formData: FormData,
): Promise<DonateState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount")));

  if (!name) return { status: "error", message: "Please enter your name." };
  if (!email || !email.includes("@"))
    return { status: "error", message: "Please enter a valid email address." };
  if (!Number.isFinite(amount) || amount < MIN)
    return { status: "error", message: `Minimum donation is ₦${MIN.toLocaleString()}.` };
  if (amount > MAX)
    return {
      status: "error",
      message: "For donations above ₦10,000,000, please contact the campaign directly.",
    };

  if (!flwConfig().configured) {
    return {
      status: "error",
      message: "Online donations aren't available just yet — please check back soon.",
    };
  }

  const txRef = `lanky-${randomUUID()}`;

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("donations").insert({
      tx_ref: txRef,
      amount,
      currency: "NGN",
      donor_name: name,
      donor_email: email,
      donor_phone: phone || null,
      status: "pending",
    });
    if (error) {
      console.error("[initiateDonation] insert", error);
      return { status: "error", message: "Could not start the donation. Please try again." };
    }

    const origin = await siteOrigin();
    const { link } = await initiatePayment({
      txRef,
      amount,
      currency: "NGN",
      customer: { email, name, phone: phone || undefined },
      redirectUrl: `${origin}/donate/callback`,
      logo: `${origin}/brand/labour-party-logo.png`,
      meta: { source: "website" },
    });

    return { status: "idle", link };
  } catch (err) {
    console.error("[initiateDonation]", err);
    await markAbandonedIfPending(txRef);
    return {
      status: "error",
      message:
        "We couldn't reach the payment service. Your card was not charged — please try again.",
    };
  }
}
