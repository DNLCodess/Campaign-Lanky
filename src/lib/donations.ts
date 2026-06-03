import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { FlwVerifyData } from "@/lib/flutterwave";

export type FinalizeResult =
  | { ok: true; status: "successful"; already: boolean; amount: number }
  | { ok: false; status: "failed" | "not_found" };

/**
 * Idempotently finalize a donation from a verified Flutterwave transaction.
 * Safe to call from BOTH the redirect callback and the webhook — the
 * `tx_ref` unique row + the `status != 'successful'` guard ensure a single
 * successful transition regardless of ordering or duplicates.
 *
 * Verifies authenticity by matching tx_ref, currency, and that the paid
 * amount is at least the amount we recorded (guards client tampering).
 */
export async function finalizeDonation(
  txRef: string,
  v: FlwVerifyData,
): Promise<FinalizeResult> {
  const supabase = createAdminSupabase();

  const { data: donation } = await supabase
    .from("donations")
    .select("*")
    .eq("tx_ref", txRef)
    .maybeSingle();

  if (!donation) return { ok: false, status: "not_found" };
  if (donation.status === "successful") {
    return { ok: true, status: "successful", already: true, amount: Number(donation.amount) };
  }

  const success =
    v.status === "successful" &&
    v.tx_ref === txRef &&
    v.currency === donation.currency &&
    Number(v.amount) >= Number(donation.amount);

  await supabase
    .from("donations")
    .update({
      status: success ? "successful" : "failed",
      flw_transaction_id: v.id ?? null,
      flw_ref: v.flw_ref ?? null,
      payment_type: v.payment_type ?? null,
      amount_settled: v.amount_settled ?? null,
      verified_at: new Date().toISOString(),
      meta: {
        ...(donation.meta ?? {}),
        verify: { amount: v.amount, currency: v.currency, status: v.status },
      },
    })
    .eq("tx_ref", txRef)
    .neq("status", "successful"); // idempotency guard against races

  return success
    ? { ok: true, status: "successful", already: false, amount: Number(donation.amount) }
    : { ok: false, status: "failed" };
}

export async function getDonationByRef(txRef: string) {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("donations")
    .select("*")
    .eq("tx_ref", txRef)
    .maybeSingle();
  return data;
}

export async function markAbandonedIfPending(txRef: string) {
  try {
    const supabase = createAdminSupabase();
    await supabase
      .from("donations")
      .update({ status: "abandoned" })
      .eq("tx_ref", txRef)
      .eq("status", "pending");
  } catch {
    // best-effort
  }
}
