import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support the Lanky campaign. Secure giving for supporters within Nigeria and in the diaspora.",
};

const amounts = ["₦5,000", "₦10,000", "₦25,000", "₦50,000", "₦100,000"];

export default function DonatePage() {
  return (
    <>
      <PageHeader
        eyebrow="Support the Campaign"
        title="Power the movement"
        intro="Your contribution funds ward-to-ward consultations, town halls, and the programs that will transform our constituency. Every naira moves us forward."
      />

      <section className="tone-steel px-5 py-20">
        <div className="mx-auto max-w-3xl sm:px-8">
        <Reveal className="rounded-brand border border-border bg-surface/40 p-8 sm:p-10">
          {/* TODO(client): integrate Paystack or Flutterwave (decision pending). */}
          <h2 className="font-heading text-2xl text-text">Choose an amount</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {amounts.map((a) => (
              <button
                key={a}
                type="button"
                className="rounded-brand border border-border bg-bg px-4 py-3.5 font-medium text-text transition-colors hover:border-accent hover:text-accent"
              >
                {a}
              </button>
            ))}
            <button
              type="button"
              className="rounded-brand border border-dashed border-border bg-bg px-4 py-3.5 font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Custom
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-text">Full name</span>
              <input
                type="text"
                className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text">Email</span>
              <input
                type="email"
                className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          <button
            type="button"
            className="mt-7 w-full rounded-brand bg-primary px-6 py-4 text-lg font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Donate Securely
          </button>
          <p className="mt-3 text-center text-sm text-text-muted">
            Secure payment gateway integration coming soon — for local and diaspora
            supporters.
          </p>
        </Reveal>

        {/* Transparency */}
        <Reveal delay={0.1} className="mt-8 rounded-brand border border-border bg-surface/20 p-7">
          <h3 className="font-heading text-xl text-text">A note on transparency</h3>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Contributions are processed in compliance with applicable financial and
            campaign-finance regulations. The campaign is committed to accountability
            and the responsible stewardship of every donation. Detailed contribution
            guidelines will be published here.
          </p>
        </Reveal>
        </div>
      </section>
    </>
  );
}
