import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Commitments } from "@/components/home/commitments";
import { CtaButton } from "@/components/ui/cta-button";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Campaign Agenda & Manifesto",
  description:
    "The vision for a digitally empowered, educated, and prosperous Ibadan Southwest / Northwest — five pillars from the Digital Town Hall to the Grooming Hub Initiative.",
  alternates: { canonical: "/manifesto" },
};

/* ------------------------------------------------------------------ */
/* Bespoke civic illustrations — line-art, brand-coloured, no cliché   */
/* icons (no zap / sparkle / robot). Each riffs on the window-pane mark.*/
/* ------------------------------------------------------------------ */
const svgBase = {
  viewBox: "0 0 200 200",
  fill: "none",
  className: "h-full w-full",
} as const;
const lineProps = {
  stroke: "var(--accent)",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function TownHall() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M36 86 L100 50 L164 86" {...lineProps} />
      <path d="M52 86 V140 M84 86 V140 M116 86 V140 M148 86 V140" {...lineProps} />
      <path d="M40 140 H160 M32 152 H168" {...lineProps} />
      <circle cx="100" cy="44" r="5" fill="var(--primary)" />
      {/* connectivity arcs */}
      <path d="M150 36 a26 26 0 0 1 18 18" stroke="var(--steel)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M144 24 a40 40 0 0 1 30 30" stroke="var(--steel)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

function InnovationHub() {
  return (
    <svg {...svgBase} aria-hidden>
      <circle cx="100" cy="100" r="16" fill="var(--primary)" />
      {[
        [44, 56],
        [156, 56],
        [40, 140],
        [160, 140],
        [100, 36],
      ].map(([x, y], i) => (
        <g key={i}>
          <line x1="100" y1="100" x2={x} y2={y} {...lineProps} strokeWidth={2} />
          <circle cx={x} cy={y} r="10" fill="none" stroke="var(--steel)" strokeWidth="3" />
        </g>
      ))}
    </svg>
  );
}

function SchoolTech() {
  return (
    <svg {...svgBase} aria-hidden>
      {/* mortarboard */}
      <path d="M100 44 L160 70 L100 96 L40 70 Z" {...lineProps} />
      <path d="M100 96 V118 M70 82 V112 a30 14 0 0 0 60 0 V82" {...lineProps} />
      <circle cx="160" cy="70" r="4" fill="var(--primary)" />
      <path d="M160 70 V96" stroke="var(--steel)" strokeWidth="3" strokeLinecap="round" />
      {/* circuit grid */}
      {[60, 100, 140].map((x) =>
        [150, 170].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="var(--steel)" />
        )),
      )}
      <path d="M60 150 H140 M60 170 H140" stroke="var(--steel)" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

function Mentorship() {
  return (
    <svg {...svgBase} aria-hidden>
      {/* mentor */}
      <circle cx="74" cy="70" r="20" {...lineProps} />
      <path d="M40 150 a34 34 0 0 1 68 0" {...lineProps} />
      {/* mentee */}
      <circle cx="134" cy="84" r="15" stroke="var(--steel)" strokeWidth="3" fill="none" />
      <path d="M108 150 a26 26 0 0 1 52 0" stroke="var(--steel)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="104" cy="60" r="4" fill="var(--primary)" />
    </svg>
  );
}

function FutureGrowth() {
  // Echoes the Lanky window-pane / ascending-bars mark.
  return (
    <svg {...svgBase} aria-hidden>
      <rect x="40" y="120" width="32" height="40" rx="3" fill="var(--steel)" />
      <rect x="84" y="92" width="32" height="68" rx="3" fill="var(--accent)" />
      <rect x="128" y="56" width="32" height="104" rx="3" fill="var(--primary)" />
      <path d="M40 100 L96 64 L160 36" {...lineProps} />
      <path d="M160 36 h-22 M160 36 v22" {...lineProps} />
    </svg>
  );
}

const pillars = [
  {
    n: "01",
    title: "Digital Town Hall Initiative",
    lead: "A Constituency Town Hall App connecting every resident directly with their representative, anytime, anywhere.",
    items: [
      "Direct communication with constituents",
      "Community feedback and opinion polls",
      "Project monitoring and reporting",
      "Complaints and suggestions",
      "Emergency community alerts",
      "Online town hall meetings",
    ],
    note: "Governance becomes more inclusive, accessible, and responsive — a permanent channel between citizens and their representative.",
    Art: TownHall,
    tone: "tone-navy",
  },
  {
    n: "02",
    title: "Technology & Innovation Hub",
    lead: "Training young people in high-demand skills, then connecting them to income — a pipeline from learning to earning.",
    items: [
      "Software & mobile development",
      "Artificial Intelligence & robotics",
      "Cybersecurity & cloud computing",
      "UI/UX, design & video production",
      "Entrepreneurship & start-ups",
      "Remote & global employment",
    ],
    note: "Reduces unemployment, creates wealth, and positions our youths as global digital professionals.",
    Art: InnovationHub,
    tone: "tone-steel",
  },
  {
    n: "03",
    title: "Robotics & Tech in Public Schools",
    lead: "Closing the gap between public and private education through legislation and programs in government-owned schools.",
    items: [
      "Robotics education",
      "Coding clubs",
      "Computer laboratories",
      "AI awareness programs",
      "Digital literacy curriculum",
    ],
    note: "Improved STEM education and innovation — creating future scientists, engineers, and technology leaders.",
    Art: SchoolTech,
    tone: "tone-deep",
  },
  {
    n: "04",
    title: "Grooming Hub Initiative",
    lead: "Bringing professionals into schools to mentor students beyond academics — in character, confidence, and leadership.",
    items: [
      "Leadership development",
      "Career guidance",
      "Financial literacy",
      "Communication skills",
      "Emotional intelligence",
      "Civic responsibility",
    ],
    note: "Mentorship by doctors, engineers, lawyers and entrepreneurs — inspiring students to dream bigger.",
    Art: Mentorship,
    tone: "tone-gradient",
  },
  {
    n: "05",
    title: "Preparing Our People for the Future",
    lead: "Equipping every young person with the tools, skills, and opportunities to compete in the global economy.",
    items: [
      "Empowerment through opportunity",
      "Legislative advocacy",
      "Accountable representation",
      "Human capital & well-being",
    ],
    note: "Preparing our children not only for examinations, but for life, leadership, innovation, and opportunity.",
    Art: FutureGrowth,
    tone: "tone-red",
  },
];

export default function ManifestoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Campaign Agenda"
        title="The Vision"
        intro="A constituency where every citizen has a voice, every young person has an opportunity, and every child is equipped with the skills needed to compete globally. Technology, education, and human development as the foundations of sustainable progress."
      />

      {/* Vision & Mission */}
      <section className="tone-deep px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 sm:px-8 lg:grid-cols-2">
          <Reveal className="rounded-brand border border-border bg-surface/40 p-8">
            <h2 className="font-heading text-2xl text-accent">Vision</h2>
            <p className="mt-4 font-heading text-xl leading-snug text-text">
              “To build a digitally empowered, educated, innovative, and prosperous
              constituency where every citizen has a voice, every youth has an
              opportunity, and every child is prepared to compete and succeed.”
            </p>
          </Reveal>
          <Reveal
            delay={0.08}
            className="rounded-brand border border-border bg-surface/40 p-8"
          >
            <h2 className="font-heading text-2xl text-accent">Mission</h2>
            <p className="mt-4 leading-relaxed text-text-muted">
              To provide effective, inclusive, and accountable representation by
              working hand in hand with communities, stakeholders, and development
              partners — championing policies that improve quality of life for all:
              youths, women, professionals, artisans, entrepreneurs, students, and the
              elderly.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Pillars — alternating, illustrated, tone-varied bands */}
      {pillars.map((p, i) => {
        const flip = i % 2 === 1;
        const Art = p.Art;
        return (
          <section
            key={p.n}
            className={cn(p.tone, "border-t border-border/60 px-5 py-20")}
          >
            <Reveal
              className={cn(
                "mx-auto grid max-w-7xl items-center gap-10 sm:px-8 lg:grid-cols-2 lg:gap-16",
              )}
            >
              {/* Illustration panel */}
              <div className={cn("relative", flip && "lg:order-2")}>
                <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-brand border border-border bg-bg/40 p-12">
                  <span className="absolute left-6 top-4 font-heading text-7xl text-accent/15">
                    {p.n}
                  </span>
                  <Art />
                  {/* window-pane corner motif */}
                  <div className="absolute bottom-4 right-4 grid h-9 w-9 grid-cols-2 grid-rows-2 gap-1 opacity-80">
                    <span className="rounded-xs bg-transparent ring-1 ring-border" />
                    <span className="rounded-xs bg-navy" />
                    <span className="rounded-xs bg-steel" />
                    <span className="rounded-xs bg-primary" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className={cn(flip && "lg:order-1")}>
                <p className="font-heading text-sm uppercase tracking-widest text-accent">
                  Pillar {p.n}
                </p>
                <h2 className="mt-3 font-heading text-3xl leading-tight text-text sm:text-4xl">
                  {p.title}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-text-muted">
                  {p.lead}
                </p>
                <ul className="mt-6 flex flex-wrap gap-2.5">
                  {p.items.map((it) => (
                    <li
                      key={it}
                      className="rounded-full border border-border bg-surface/50 px-4 py-1.5 text-sm text-text-muted"
                    >
                      {it}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 border-l-2 border-primary pl-4 text-text-muted">
                  {p.note}
                </p>
              </div>
            </Reveal>
          </section>
        );
      })}

      {/* Commitment checklist + stats */}
      <Commitments />

      {/* Guiding principle + CTA */}
      <section className="tone-red px-5 py-24 text-center">
        <div className="mx-auto max-w-3xl sm:px-8">
          <Reveal>
            <p className="font-heading text-2xl leading-snug text-text sm:text-3xl">
              “{site.guidingPrinciple}”
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <CtaButton href={site.cta.donate.href} variant="primary" size="lg">
                {site.cta.donate.label}
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
