import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Get Involved",
  description:
    "Volunteer with the Lanky campaign — door-to-door canvassing, social media advocacy, polling unit agents, and event planning.",
};

const categories = [
  "Door-to-door canvassing",
  "Social media advocacy",
  "Polling unit agent",
  "Event planning",
];

export default function GetInvolvedPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get Involved"
        title="Join the movement"
        intro="Real change starts with a single vote and a shared vision. Choose how you want to help — every hand makes the movement stronger."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Volunteer form */}
          <Reveal>
            <h2 className="font-heading text-3xl text-text sm:text-4xl">
              Volunteer sign-up
            </h2>
            <p className="mt-3 text-text-muted">
              Tell us a little about you and how you&apos;d like to contribute.
            </p>

            {/* TODO: wire submission to Supabase (volunteers table). */}
            <form className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" name="name" required />
                <Field label="Phone (WhatsApp)" name="phone" type="tel" required />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Email" name="email" type="email" />
                <Field label="Ward / area" name="ward" />
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-text">
                  How would you like to help?
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {categories.map((c) => (
                    <label
                      key={c}
                      className="flex cursor-pointer items-center gap-3 rounded-brand border border-border bg-surface/40 px-4 py-3 text-sm text-text-muted transition-colors hover:border-accent/60"
                    >
                      <input
                        type="checkbox"
                        name="interests"
                        value={c}
                        className="h-4 w-4 accent-primary"
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                className="w-full rounded-brand bg-primary px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Sign Me Up
              </button>
              <p className="text-xs text-text-muted/70">
                By signing up you agree to be contacted by the campaign about
                volunteering opportunities.
              </p>
            </form>
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
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-text">
        {label}
        {required && <span className="text-primary"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
      />
    </label>
  );
}
