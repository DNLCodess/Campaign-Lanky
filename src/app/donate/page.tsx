import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { DonateForm } from "@/components/forms/donate-form";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support the Lanky campaign. Secure giving for supporters within Nigeria and in the diaspora.",
};

export default function DonatePage() {
  return (
    <>
      <PageHeader
        eyebrow="Support the Campaign"
        title="Power the movement"
        intro="Your contribution funds ward-to-ward consultations, town halls, and the programs that will transform our constituency. Every naira moves us forward."
      />

      <section className="tone-steel px-5 py-20">
        <div className="mx-auto max-w-2xl sm:px-8">
          <Reveal className="rounded-brand border border-border bg-surface/40 p-8 sm:p-10">
            <h2 className="font-heading text-2xl text-text">Make a donation</h2>
            <p className="mt-2 text-sm text-text-muted">
              Secure giving for supporters in Nigeria and the diaspora.
            </p>
            <div className="mt-6">
              <DonateForm />
            </div>
          </Reveal>

          {/* Transparency */}
          <Reveal
            delay={0.1}
            className="mt-8 rounded-brand border border-border bg-surface/20 p-7"
          >
            <h3 className="font-heading text-xl text-text">A note on transparency</h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Contributions are processed securely in compliance with applicable
              financial and campaign-finance regulations. The campaign is committed
              to accountability and the responsible stewardship of every donation.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
