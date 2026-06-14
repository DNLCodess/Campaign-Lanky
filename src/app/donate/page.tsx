import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { DonateForm } from "@/components/forms/donate-form";
import { DonationProgress } from "@/components/donation-progress";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support the Lanky campaign. Secure giving for supporters within Nigeria and in the diaspora.",
  alternates: { canonical: "/donate" },
};

function MeterSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-3 divide-x divide-border/60 overflow-hidden rounded-brand border border-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="px-6 py-7 text-center">
            <div className="mx-auto h-10 w-24 rounded bg-border/30" />
            <div className="mx-auto mt-2 h-3 w-12 rounded bg-border/20" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-2 w-full rounded-full bg-border/20" />
        <div className="h-5 w-full rounded-full bg-border/30" />
        <div className="h-3 w-1/2 rounded bg-border/20" />
      </div>
    </div>
  );
}

export default function DonatePage() {
  return (
    <>
      <PageHeader
        image="/consituency/9.jpeg"
        eyebrow="Support the Campaign"
        title="Power the movement"
        intro="Your contribution funds ward-to-ward consultations, town halls, and the programs that will transform our constituency. Every naira moves us forward."
      />

      <section className="tone-steel px-5 py-20">
        <div className="mx-auto max-w-7xl sm:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">

            {/* Left column — goal meter + supporting notes */}
            <div className="space-y-5">

              {/* Meter card */}
              <Reveal>
                <div
                  className="overflow-hidden rounded-brand border border-border bg-surface/40 p-8 sm:p-10"
                  style={{
                    backgroundImage:
                      "radial-gradient(ellipse at 100% 0%, rgba(103,156,188,0.08) 0%, transparent 55%), radial-gradient(ellipse at 0% 110%, rgba(224,33,43,0.07) 0%, transparent 55%)",
                  }}
                >
                {/* Header with live badge */}
                <div className="mb-6 flex items-center gap-3">
                  <p className="text-sm font-medium uppercase tracking-widest text-accent">
                    Campaign Goal
                  </p>
                  <span className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
                    Live
                  </span>
                </div>

                <Suspense fallback={<MeterSkeleton />}>
                  <DonationProgress variant="full" />
                </Suspense>
                </div>
              </Reveal>

              {/* Bank transfer notice */}
              <Reveal delay={0.12}>
                <div className="flex gap-3 rounded-brand border border-border/50 bg-surface/20 px-5 py-4">
                  <svg
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    fill="none"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M12 8v4m0 4h.01"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="text-sm text-text-muted">
                    <span className="font-medium text-text">Completing a bank transfer?</span>{" "}
                    Your donation will reflect automatically once your bank confirms the
                    transfer — there&apos;s no need to return to this page.
                  </p>
                </div>
              </Reveal>

              {/* Transparency note */}
              <Reveal delay={0.16} className="rounded-brand border border-border bg-surface/20 p-7">
                <h3 className="font-heading text-xl text-text">A note on transparency</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  Contributions are processed securely in compliance with applicable
                  financial and campaign-finance regulations. The campaign is committed
                  to accountability and the responsible stewardship of every donation.
                </p>
              </Reveal>
            </div>

            {/* Right column — donation form, sticky on desktop */}
            <div className="lg:sticky lg:top-24">
              <Reveal delay={0.05} className="rounded-brand border border-border bg-surface/40 p-8 sm:p-10">
                <h2 className="font-heading text-2xl text-text">Make a donation</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Secure giving for supporters in Nigeria and the diaspora.
                </p>
                <div className="mt-6">
                  <DonateForm />
                </div>
              </Reveal>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
