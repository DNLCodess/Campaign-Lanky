import "server-only";

/**
 * Flutterwave (v3) server client. Hosted "Standard" checkout — robust for flows
 * where the user leaves to their banking app (bank transfer / USSD) and returns,
 * with a webhook as the source of truth if they never come back.
 *
 * All requests: timeout + bounded retries on transient failures (network, 5xx,
 * 429) and never retry on 4xx (which are deterministic).
 */
const FLW_BASE = "https://api.flutterwave.com/v3";

export type FlwVerifyData = {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  charged_amount?: number;
  amount_settled?: number;
  status: string; // "successful" | "failed" | "pending"
  payment_type?: string;
  customer?: { email?: string; name?: string; phone_number?: string };
};

export function flwConfig() {
  const secretKey = process.env.FLW_SECRET_KEY ?? "";
  const secretHash = process.env.FLW_SECRET_HASH ?? "";
  return {
    secretKey,
    secretHash,
    configured: secretKey.length > 0,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function flwFetch(
  path: string,
  init: RequestInit,
  { retries = 2, timeoutMs = 15000 }: { retries?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const { secretKey } = flwConfig();
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${FLW_BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      // Retry only on transient server-side / rate-limit responses.
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`Flutterwave responded ${res.status}`);
        if (attempt < retries) {
          await sleep(Math.min(2000, 300 * 2 ** attempt));
          continue;
        }
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err; // network error / abort (timeout)
      if (attempt < retries) {
        await sleep(Math.min(2000, 300 * 2 ** attempt));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Flutterwave request failed");
}

export async function initiatePayment(params: {
  txRef: string;
  amount: number;
  currency: string;
  customer: { email: string; name: string; phone?: string };
  redirectUrl: string;
  logo?: string;
  meta?: Record<string, unknown>;
}): Promise<{ link: string }> {
  const res = await flwFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: {
        email: params.customer.email,
        name: params.customer.name,
        phonenumber: params.customer.phone,
      },
      customizations: {
        title: "Lanky Campaign",
        description: "Campaign donation — Olanrewaju Okesooto",
        logo: params.logo,
      },
      meta: params.meta,
      payment_options: "card,banktransfer,ussd,account,opay,barter",
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== "success" || !json?.data?.link) {
    throw new Error(json?.message || `Could not initialise payment (${res.status})`);
  }
  return { link: json.data.link as string };
}

export async function verifyTransaction(transactionId: number | string): Promise<FlwVerifyData> {
  const res = await flwFetch(`/transactions/${transactionId}/verify`, { method: "GET" });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== "success" || !json?.data) {
    throw new Error(json?.message || `Verification failed (${res.status})`);
  }
  return json.data as FlwVerifyData;
}

export async function verifyByReference(txRef: string): Promise<FlwVerifyData> {
  const res = await flwFetch(
    `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { method: "GET" },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== "success" || !json?.data) {
    throw new Error(json?.message || `Verification failed (${res.status})`);
  }
  return json.data as FlwVerifyData;
}
