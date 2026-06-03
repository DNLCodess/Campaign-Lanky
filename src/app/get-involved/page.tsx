import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { VolunteerForm } from "@/components/forms/volunteer-form";

export const metadata: Metadata = {
  title: "Get Involved",
  description:
    "Volunteer with the Lanky campaign — door-to-door canvassing, social media advocacy, polling unit agents, and event planning.",
  alternates: { canonical: "/get-involved" },
};

export default function GetInvolvedPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get Involved"
        title="Join the movement"
        intro="Real change starts with a single vote and a shared vision. Choose how you want to help — every hand makes the movement stronger."
      />

      <section className="tone-steel px-5 py-20">
        <div className="mx-auto max-w-7xl sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Volunteer form */}
          <Reveal>
            <h2 className="font-heading text-3xl text-text sm:text-4xl">
              Volunteer sign-up
            </h2>
            <p className="mt-3 text-text-muted">
              Tell us a little about you and how you&apos;d like to contribute.
            </p>
            <VolunteerForm />
          </Reveal>

          {/* Endorsements */}
          <Reveal delay={0.1}>
            <h2 className="font-heading text-3xl text-text sm:text-4xl">
              Endorsements
            </h2>
            <p className="mt-3 text-text-muted">
              Respected community leaders, traditional elders, and local associations
              standing with Lanky.
            </p>

            {/* TODO(client): add real endorsement quotes, names, and photos. */}
            <div className="mt-8 space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-brand border border-dashed border-border bg-surface/30 p-6"
                >
                  <p className="font-heading text-lg text-text-muted">
                    “Endorsement quote coming soon.”
                  </p>
                  <p className="mt-3 text-sm text-text-muted/70">
                    Community leader · Title
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-brand border border-border bg-linear-to-br from-surface to-navy p-6">
              <p className="font-heading text-xl text-text">
                Want to endorse the campaign?
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Community associations and leaders can reach the campaign team
                directly to add their voice.
              </p>
            </div>
          </Reveal>
        </div>
        </div>
      </section>
    </>
  );
}
