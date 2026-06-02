import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Wards & Local Government Focus",
  description:
    "Our focus across Ibadan Southwest and Northwest Local Governments — and how to find and verify your polling unit through INEC.",
};

const lgas = [
  {
    name: "Ibadan North-West",
    body: "Home to vibrant commercial hubs and markets. Our focus: digital skills, support for traders and small businesses, and accountable, project-driven representation.",
  },
  {
    name: "Ibadan South-West",
    body: "Anchored by residential communities and key arteries like Ring Road and Eleyele. Our focus: youth opportunity, education, and community well-being.",
  },
];

export default function WardsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Wards & Local Government"
        title="Where we focus, ward by ward"
        intro="From the markets of the Northwest to the residential hubs of the Southwest — a ward-to-ward commitment to consultation, presence, and measurable impact."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {lgas.map((lg, i) => (
            <Reveal
              key={lg.name}
              delay={i * 0.05}
              className="rounded-brand border border-border bg-surface/40 p-8"
            >
              <h2 className="font-heading text-2xl text-text sm:text-3xl">
                {lg.name}
              </h2>
              <p className="mt-4 leading-relaxed text-text-muted">{lg.body}</p>
            </Reveal>
          ))}
        </div>

        {/* TODO(client/INEC): add a full ward-by-ward breakdown and any
            confirmed polling-unit data. */}

        {/* Find your polling unit */}
        <Reveal className="mt-12 overflow-hidden rounded-brand border border-border bg-linear-to-br from-surface to-navy p-8 sm:p-12">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Election Readiness
          </p>
          <h2 className="mt-3 max-w-xl font-heading text-3xl leading-tight text-text sm:text-4xl">
            Find &amp; verify your polling unit
          </h2>
          <p className="mt-4 max-w-2xl text-text-muted">
            Confirm where you are registered to vote using the Independent National
            Electoral Commission (INEC) official tools. Your vote is your voice —
            make sure it counts on election day.
          </p>
          <a
            href="https://www.inecnigeria.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-brand bg-primary px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Visit the INEC Portal
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
              <path
                d="M5 15L15 5M15 5H7M15 5v8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <p className="mt-4 text-xs text-text-muted/70">
            You will be redirected to the official INEC website in a new tab.
          </p>
        </Reveal>
      </section>
    </>
  );
}
