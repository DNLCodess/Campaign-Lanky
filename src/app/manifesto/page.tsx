import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Commitments } from "@/components/home/commitments";
import { CtaButton } from "@/components/ui/cta-button";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Campaign Agenda & Manifesto",
  description:
    "The vision for a digitally empowered, educated, and prosperous Ibadan Southwest / Northwest — five pillars from the Digital Town Hall to the Grooming Hub Initiative.",
};

const pillars = [
  {
    n: "01",
    title: "Digital Town Hall Initiative",
    lead: "A Constituency Town Hall App connecting every resident directly with their representative, anytime, anywhere.",
    items: [
      "Direct communication with constituents",
      "Community feedback and opinion polls",
      "Project monitoring and reporting",
      "Submission of complaints and suggestions",
      "Constituency development updates",
      "Emergency community alerts",
      "Youth and women engagement programs",
      "Online town hall meetings",
    ],
    note: "Governance becomes more inclusive, accessible, and responsive — a permanent channel between citizens and their representative.",
  },
  {
    n: "02",
    title: "Constituency Technology & Innovation Hub",
    lead: "Training young people in high-demand skills, then connecting them to income — a pipeline from learning to earning.",
    items: [
      "Software & mobile app development",
      "Artificial Intelligence & robotics",
      "Cybersecurity & cloud computing",
      "UI/UX, graphic design & video production",
      "Digital marketing & data analytics",
      "Entrepreneurship & start-up management",
      "Freelancing & remote work",
      "Connection to global employment",
    ],
    note: "Reduces unemployment, creates wealth, improves household incomes, and positions our youths as global digital professionals.",
  },
  {
    n: "03",
    title: "Robotics & Technology Education in Public Schools",
    lead: "Closing the gap between public and private education through legislation and programs in government-owned schools.",
    items: [
      "Robotics education",
      "Coding clubs",
      "Computer laboratories",
      "AI awareness programs",
      "Digital literacy curriculum",
    ],
    note: "Improved STEM education and increased innovation — creating future scientists, engineers, and technology leaders.",
  },
  {
    n: "04",
    title: "Grooming Hub Initiative",
    lead: "Bringing professionals into schools to mentor students beyond academics — in character, confidence, and leadership.",
    items: [
      "Leadership development",
      "Career guidance",
      "Communication skills",
      "Financial literacy",
      "Entrepreneurship",
      "Emotional intelligence",
      "Civic responsibility",
      "Mentorship by doctors, engineers, lawyers & more",
    ],
    note: "Exposure that inspires students to dream bigger and achieve their full potential.",
  },
  {
    n: "05",
    title: "Preparing Our People for the Future",
    lead: "Equipping every young person with the tools, skills, and opportunities to compete in the global economy.",
    items: [
      "Empowerment through opportunity",
      "Legislative advocacy for infrastructure & healthcare",
      "Accountability in representation",
      "Human capital & well-being for elders and families",
    ],
    note: "Preparing our children not only for examinations, but for life, leadership, innovation, and opportunity.",
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
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal className="rounded-brand border border-border bg-surface/40 p-8">
            <h2 className="font-heading text-2xl text-accent">Vision</h2>
            <p className="mt-4 font-heading text-xl leading-snug text-text">
              “To build a digitally empowered, educated, innovative, and prosperous
              constituency where every citizen has a voice, every youth has an
              opportunity, and every child is prepared to compete and succeed in a
              rapidly evolving global world.”
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
              partners — listening to constituents, understanding their needs, and
              championing policies that improve quality of life for all: youths,
              women, professionals, artisans, entrepreneurs, students, and the elderly.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {pillars.map((p) => (
            <Reveal
              key={p.n}
              className="grid gap-8 border-b border-border/60 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"
            >
              <div>
                <span className="font-heading text-5xl text-accent/60">{p.n}</span>
                <h2 className="mt-4 font-heading text-3xl leading-tight text-text sm:text-4xl">
                  {p.title}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-text-muted">
                  {p.lead}
                </p>
              </div>
              <div className="lg:pt-4">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {p.items.map((it) => (
                    <li
                      key={it}
                      className="rounded-brand border border-border bg-surface/40 px-4 py-3 text-sm text-text-muted"
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
          ))}
        </div>
      </section>

      {/* Commitment checklist + stats */}
      <Commitments />

      {/* Guiding principle + CTA */}
      <section className="mx-auto max-w-3xl px-5 pb-24 text-center sm:px-8">
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
      </section>
    </>
  );
}
