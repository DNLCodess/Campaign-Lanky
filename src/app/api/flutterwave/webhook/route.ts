import { timingSafeEqual } from "node:crypto";
import { flwConfig, verifyTransaction } from "@/lib/flutterwave";
import { finalizeDonation } from "@/lib/donations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FlwWebhook = {
  event?: string;
  data?: { id?: number | string; tx_ref?: string; status?: string };
};

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Flutterwave webhook — the source of truth that finalizes a donation even if
 * the donor never returns to the redirect callback (e.g. paid via bank app and
 * closed the tab). Authenticated by the `verif-hash` header (secret hash),
 * then re-verified against the API before any state change.
 */
export async function POST(req: Request): Promise<Response> {
  const { secretHash } = flwConfig();
  const signature = req.headers.get("verif-hash") ?? "";

  if (!secretHash || !signature || !safeEqual(signature, secretHash)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: FlwWebhook;
  try {
    payload = (await req.json()) as FlwWebhook;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const txRef = payload.data?.tx_ref;
  const txId = payload.data?.id;
  if (!txRef || !txId) {
    return new Response("ignored", { status: 200 }); // ack non-charge events
  }

  try {
    const verified = await verifyTransaction(txId);
    await finalizeDonation(txRef, verified);
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[flutterwave webhook]", err);
    // 500 lets Flutterwave retry the delivery later (transient failure).
    return new Response("retry", { status: 500 });
  }
}
