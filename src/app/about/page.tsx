import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { CtaButton } from "@/components/ui/cta-button";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Meet Olanrewaju Okesooto",
  description:
    "Meet Olanrewaju Okesooto — community leader, technology consultant, and Labour Party candidate for Ibadan Southwest / Northwest, Oyo State.",
};

const values = [
  {
    title: "Integrity",
    body: "Honest, transparent leadership where constituents see the direct impact of every project.",
  },
  {
    title: "Innovation",
    body: "Using technology and fresh thinking to solve long-standing, real-world community challenges.",
  },
  {
    title: "Service",
    body: "Rooted in faith and community work — leadership felt at the grassroots, not from a distance.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Meet the Candidate"
        title="Olanrewaju Okesooto"
        intro="A neighbour, a listener, and a proactive leader who believes governance should be felt at the grassroots level — driven by a singular purpose: to give Ibadan Southwest / Northwest the representation it truly deserves."
      />

      {/* Biography */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-brand border border-border">
              <Image
                src="/brand/candidate-2.jpeg"
                alt={site.candidate}
                fill
                sizes="(max-width: 1024px) 90vw, 45vw"
                className="object-cover object-top"
              />
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h2 className="font-heading text-3xl text-text sm:text-4xl">
                Professional &amp; personal biography
              </h2>
              <div className="mt-6 space-y-4 text-lg leading-relaxed text-text-muted">
                <p>
                  Olanrewaju Okesooto is the CEO and Creative Director of{" "}
                  <span className="text-text">Lanky First Ideal Creativity</span>, a
                  technology-driven company specialising in digital solutions,
                  branding, mobile application development, and advanced web
                  technologies. He has spent years helping organisations leverage
                  innovation to solve real-world challenges.
                </p>
                <p>
                  He is the founder of the{" "}
                  <span className="text-text">Avoid Failed Future Initiative</span>{" "}
                  and serves as Lead Pastor at{" "}
                  <span className="text-text">Cross Life Christian Network</span> —
                  combining enterprise, mentorship, and faith-based community service.
                </p>
                {/* TODO(client): expand with full professional background, education,
                    achievements, and personal story (pending from client). */}
                <p>
                  His candidacy marries the rich, traditional values of the Okesooto
                  family with the technological advancement needed to empower the next
                  generation — built on integrity, digital inclusion, and radical
                  economic empowerment.
                </p>
              </div>
            </Reveal>

            <Reveal className="mt-12">
              <h3 className="font-heading text-2xl text-text">Constituency roots</h3>
              <p className="mt-4 text-lg leading-relaxed text-text-muted">
                Born and raised with the values of integrity, hard work, and
                community, he understands the unique challenges facing our streets —
                from the vibrant markets of the Northwest to the residential hubs of
                the Southwest. He is not just a candidate; he is a neighbour.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="tone-navy border-y border-border/60">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-widest text-accent">
              Values
            </p>
            <h2 className="mt-3 font-heading text-4xl text-text sm:text-5xl">
              What guides his leadership
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {values.map((v, i) => (
              <Reveal
                key={v.title}
                delay={i * 0.05}
                className="rounded-brand border border-border bg-surface/40 p-7"
              >
                <h3 className="font-heading text-2xl text-text">{v.title}</h3>
                <p className="mt-3 leading-relaxed text-text-muted">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="tone-red px-5 py-20 text-center">
        <div className="mx-auto max-w-3xl sm:px-8">
        <Reveal>
          <h2 className="font-heading text-4xl text-text sm:text-5xl">
            Stand with Lanky
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-text-muted">
            Explore the vision, then join the movement to build a digitally empowered
            constituency.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <CtaButton href="/manifesto" variant="primary" size="lg">
              Read the Manifesto
            </CtaButton>
            <CtaButton href={site.cta.volunteer.href} variant="outline" size="lg">
              {site.cta.volunteer.label}
            </CtaButton>
          </div>
        </Reveal>
        </div>
      </section>
    </>
  );
}
