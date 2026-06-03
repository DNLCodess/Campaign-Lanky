import { Reveal } from "@/components/motion/reveal";
import { CtaButton } from "@/components/ui/cta-button";
import { site } from "@/lib/site";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ways = [
  {
    title: "Door-to-door canvassing",
    body: "Walk the wards, meet neighbours, and carry the message street to street.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Social media advocacy",
    body: "Amplify the vision online — share, comment, and rally the diaspora.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <path d="M4 9v6h3l6 4V5L7 9H4Z" />
        <path d="M17 8a5 5 0 0 1 0 8" />
      </svg>
    ),
  },
  {
    title: "Polling unit agents",
    body: "Protect the vote on election day as a trained, vigilant unit agent.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <path d="M4 8h16v11H4z" />
        <path d="M9 8V5h6v3" />
        <path d="M9.5 13.5l1.8 1.8L15 11.5" />
      </svg>
    ),
  },
  {
    title: "Event planning",
    body: "Help organise town halls, rallies, and community consultations.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 9h16M8 3v4M16 3v4" />
      </svg>
    ),
  },
];

export function GetInvolvedTeaser() {
  return (
    <section className="tone-deep border-t border-border/60 px-5 py-20">
      <div className="mx-auto max-w-7xl sm:px-8">
      <Reveal className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          Get Involved
        </p>
        <h2 className="mt-3 font-heading text-4xl leading-tight text-text sm:text-5xl">
          Real change starts with you
        </h2>
        <p className="mt-4 text-text-muted">
          Choose how you want to help. Every hand makes the movement stronger.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ways.map((w, i) => (
          <Reveal
            key={w.title}
            delay={i * 0.05}
            className="rounded-brand border border-border bg-surface/40 p-7 transition-colors hover:border-accent/60 hover:bg-surface/70"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-brand border border-border text-accent">
              {w.icon}
            </div>
            <h3 className="mt-5 font-heading text-xl text-text">{w.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{w.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.15} className="mt-12 flex flex-wrap gap-4">
        <CtaButton href={site.cta.volunteer.href} variant="primary" size="lg">
          Volunteer Today
        </CtaButton>
        <CtaButton href={site.cta.donate.href} variant="outline" size="lg">
          {site.cta.donate.label}
        </CtaButton>
      </Reveal>
      </div>
    </section>
  );
}
