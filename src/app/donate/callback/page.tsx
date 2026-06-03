import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FormSuccess } from "@/components/forms/form-success";
import { CtaButton } from "@/components/ui/cta-button";
import { verifyTransaction } from "@/lib/flutterwave";
import {
  finalizeDonation,
  getDonationByRef,
  markAbandonedIfPending,
} from "@/lib/donations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Donation status",
  robots: { index: false },
};

type View = "success" | "failed" | "cancelled" | "pending" | "invalid";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export default async function DonationCallback({
  searchParams,
}: {
  searchParams: Promise<{ tx_ref?: string; status?: string; transaction_id?: string }>;
}) {
  const sp = await searchParams;
  const txRef = sp.tx_ref;
  const txId = sp.transaction_id;
  const flwStatus = sp.status;

  let view: View = "invalid";
  let amount = 0;

  if (txRef) {
    try {
      const donation = await getDonationByRef(txRef);
      if (!donation) {
        view = "invalid";
      } else if (donation.status === "successful") {
        view = "success";
        amount = Number(donation.amount);
      } else if (flwStatus === "cancelled" || !txId) {
        await markAbandonedIfPending(txRef);
        view = "cancelled";
        amount = Number(donation.amount);
      } else {
        // Verify server-side (source of truth). If verification itself fails
        // transiently, leave it pending — the webhook will finalize.
        amount = Number(donation.amount);
        try {
          const v = await verifyTransaction(txId);
          const result = await finalizeDonation(txRef, v);
          view = result.ok ? "success" : "failed";
        } catch {
          view = "pending";
        }
      }
    } catch (err) {
      // DB/config error — never show a false failure; the webhook reconciles.
      console.error("[donation callback]", err);
      view = "pending";
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Donation"
        title={
          view === "success"
            ? "Thank you!"
            : view === "pending"
              ? "Confirming your donation"
              : "Donation status"
        }
      />
      <section className="tone-steel px-5 py-20">
        <div className="mx-auto max-w-xl sm:px-8">
          <div className="rounded-brand border border-border bg-surface/40 p-8 text-center sm:p-10">
            {view === "success" && (
              <FormSuccess
                title="Your donation is in!"
                message={`Thank you for contributing ${naira(amount)} to the movement. Your support powers real change across the constituency.`}
              />
            )}

            {view === "pending" && (
              <Result
                title="Almost there…"
                body="We're confirming your payment with the bank. This can take a moment — if you completed payment, it will reflect shortly and we'll email your receipt. You can safely refresh this page."
                primary={{ label: "Refresh status", href: txRef ? `?tx_ref=${txRef}&transaction_id=${txId ?? ""}` : "/donate" }}
                secondary={{ label: "Back to site", href: "/" }}
              />
            )}

            {view === "cancelled" && (
              <Result
                title="Donation cancelled"
                body="No charge was made. Whenever you're ready, you can try again — it only takes a minute."
                primary={{ label: "Try again", href: "/donate" }}
                secondary={{ label: "Back to site", href: "/" }}
              />
            )}

            {view === "failed" && (
              <Result
                title="Payment not completed"
                body="Your payment could not be confirmed and you have not been charged. Please try again, or use a different method on the checkout page."
                primary={{ label: "Try again", href: "/donate" }}
                secondary={{ label: "Contact us", href: "/contact" }}
              />
            )}

            {view === "invalid" && (
              <Result
                title="We couldn't find that donation"
                body="This donation link looks invalid or has expired. Please start a new donation."
                primary={{ label: "Go to donate", href: "/donate" }}
                secondary={{ label: "Back to site", href: "/" }}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Result({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}) {
  return (
    <div>
      <h2 className="font-heading text-3xl text-text">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-text-muted">{body}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <CtaButton href={primary.href} variant="primary" size="lg">
          {primary.label}
        </CtaButton>
        <Link
          href={secondary.href}
          className="inline-flex items-center justify-center rounded-brand border border-border px-6 py-3 text-text-muted transition-colors hover:text-text"
        >
          {secondary.label}
        </Link>
      </div>
    </div>
  );
}
