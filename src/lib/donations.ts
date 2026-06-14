import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { notifyCampaign, sendDonorReceipt } from "@/lib/email";
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
 * On a fresh successful finalization, fires three best-effort side effects:
 *   1. Donor receipt email
 *   2. Campaign team notification
 *   3. ISR revalidation of /donate and / so the goal meter updates site-wide
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

  if (!success) return { ok: false, status: "failed" };

  const amount = Number(donation.amount);
  const naira = `₦${amount.toLocaleString("en-NG")}`;

  // Best-effort side effects — never block or fail the finalization result.
  void Promise.all([
    sendDonorReceipt({
      name: donation.donor_name,
      email: donation.donor_email,
      amount,
      txRef,
    }),
    notifyCampaign(
      `New donation: ${naira} from ${donation.donor_name}`,
      [
        `Donor:  ${donation.donor_name}`,
        `Email:  ${donation.donor_email}`,
        `Phone:  ${donation.donor_phone ?? "—"}`,
        `Amount: ${naira}`,
        `Ref:    ${txRef}`,
        `Date:   ${new Date().toISOString()}`,
      ].join("\n"),
    ),
  ]).catch((err) => console.error("[finalizeDonation] side effects:", err));

  revalidatePath("/donate");
  revalidatePath("/");

  return { ok: true, status: "successful", already: false, amount };
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

export async function getDonationTotals(): Promise<{ total: number; count: number }> {
  try {
    const supabase = createAdminSupabase();
    const { data } = await supabase
      .from("donations")
      .select("amount")
      .eq("status", "successful");
    const rows = data ?? [];
    return {
      total: rows.reduce((sum, d) => sum + Number(d.amount), 0),
      count: rows.length,
    };
  } catch {
    return { total: 0, count: 0 };
  }
}
