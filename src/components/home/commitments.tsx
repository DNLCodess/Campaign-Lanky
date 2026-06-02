import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";

const stats = [
  { value: 1, suffix: "", label: "Constituency, one voice" },
  { value: 2, suffix: "", label: "Local Governments — Ibadan SW & NW" },
  { value: 5, suffix: "", label: "Policy pillars" },
  { value: 8, suffix: "", label: "Commitments to the people" },
];

const commitments = [
  "Build a Constituency Town Hall App for direct citizen engagement",
  "Establish a Technology and Innovation Hub",
  "Train youths in high-demand digital skills",
  "Connect graduates with remote job opportunities",
  "Promote robotics and coding education in public schools",
  "Launch the Grooming Hub Initiative for student mentorship",
  "Create pathways to entrepreneurship and global competitiveness",
  "Foster transparency, accountability, and citizen participation",
];

function Check() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-5 w-5 flex-none text-accent"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 10.5l4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Commitments() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      {/* Stat band */}
      <div className="grid grid-cols-2 gap-6 border-y border-border/60 py-10 lg:grid-cols-4">
        {stats.map((s) => (
          <Reveal key={s.label} className="text-center">
            <div className="font-heading text-5xl text-text sm:text-6xl">
              <CountUp value={s.value} suffix={s.suffix} />
            </div>
            <p className="mx-auto mt-2 max-w-[12rem] text-sm text-text-muted">
              {s.label}
            </p>
          </Reveal>
        ))}
      </div>

      {/* Commitment checklist */}
      <div className="mt-16 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Our Commitment
          </p>
          <h2 className="mt-3 font-heading text-4xl leading-tight text-text sm:text-5xl">
            What we will do
          </h2>
          <p className="mt-4 max-w-sm text-text-muted">
            A practical, people-first agenda — not promises for a season, but a
            blueprint for lasting opportunity.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {commitments.map((c) => (
              <li key={c} className="flex gap-3">
                <Check />
                <span className="text-text-muted">{c}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
