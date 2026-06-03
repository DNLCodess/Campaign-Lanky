import { Hero } from "@/components/home/hero";
import { Journey } from "@/components/home/journey";
import { PartyBanner } from "@/components/home/party-banner";
import { Bridge } from "@/components/home/bridge";
import { Commitments } from "@/components/home/commitments";
import { PromiseQuote } from "@/components/home/promise";
import { GetInvolvedTeaser } from "@/components/home/get-involved-teaser";
import { Reveal } from "@/components/motion/reveal";
import { CtaButton } from "@/components/ui/cta-button";
import { JoinForm } from "@/components/forms/join-form";
import { site } from "@/lib/site";

const pillars = [
  {
    n: "01",
    title: "Digital Town Hall",
    body: "A Constituency Town Hall App connecting every resident directly with their representative — feedback, polls, project monitoring, and online meetings.",
  },
  {
    n: "02",
    title: "Technology & Innovation Hub",
    body: "Training youths in software, AI, design, and digital skills — then connecting graduates to remote work and global income. A pipeline from learning to earning.",
  },
  {
    n: "03",
    title: "Robotics in Public Schools",
    body: "Coding clubs, computer labs, and a digital-literacy curriculum in government schools — closing the gap between public and private education.",
  },
  {
    n: "04",
    title: "Grooming Hub Initiative",
    body: "Professionals mentoring students in leadership, character, financial literacy, and civic responsibility — preparing children for life, not just exams.",
  },
  {
    n: "05",
    title: "Accountable Representation",
    body: "Transparent, people-first governance where constituents engage their representative and see the direct impact of constituency projects.",
  },
];

export default function Home() {
  return (
    <>
      <Hero />

      {/* Meet Lanky — Portrait Journey */}
      <Journey />

      {/* Bold Labour Party + Oyo State statement */}
      <PartyBanner />

      {/* The Vision — pillars */}
      <section className="tone-deep border-t border-border/60 px-5 py-20" id="pillars">
        <div className="mx-auto max-w-7xl sm:px-8">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            The Vision
          </p>
          <h2 className="mt-3 max-w-2xl font-heading text-4xl leading-tight text-text sm:text-5xl">
            Five pillars for a digitally empowered constituency
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p, i) => (
            <Reveal
              key={p.n}
              delay={i * 0.05}
              className="group rounded-brand border border-border bg-surface/40 p-7 transition-colors hover:border-accent/60 hover:bg-surface/70"
            >
              <span className="font-heading text-3xl text-accent/70">{p.n}</span>
              <h3 className="mt-4 font-heading text-2xl text-text">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">{p.body}</p>
            </Reveal>
          ))}

          <Reveal
            delay={pillars.length * 0.05}
            className="flex flex-col justify-center rounded-brand border border-border bg-linear-to-br from-surface to-navy p-7"
          >
            <p className="font-heading text-xl leading-snug text-text">
              &ldquo;{site.guidingPrinciple}&rdquo;
            </p>
            <span className="mt-4 text-sm text-accent">— {site.shortName}</span>
          </Reveal>
        </div>
        </div>
      </section>

      {/* The Bridge-Builder — signature scroll-draw */}
      <Bridge />

      {/* Stats + commitment checklist */}
      <Commitments />

      {/* The Promise — pull quote */}
      <PromiseQuote />

      {/* Get Involved teaser */}
      <GetInvolvedTeaser />

      {/* Join the Movement — email/phone capture */}
      <section className="tone-red border-y border-border/60">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
          <Reveal>
            <h2 className="font-heading text-4xl text-text sm:text-5xl">
              Join the Movement
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-text-muted">
              Real change starts with a single vote and a shared vision. Add your
              voice — we&apos;ll keep you updated on town halls, tours, and how to help.
            </p>
            <JoinForm />
          </Reveal>

          <Reveal delay={0.1} className="mt-12">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <CtaButton href={site.cta.donate.href} variant="primary" size="lg">
                {site.cta.donate.label}
              </CtaButton>
              <CtaButton href="/manifesto" variant="outline" size="lg">
                Read the Manifesto
              </CtaButton>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
