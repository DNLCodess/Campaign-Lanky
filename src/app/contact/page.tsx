import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { ContactForm } from "@/components/forms/contact-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Lanky campaign — WhatsApp, email, campaign office, and the campaign team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        image="/consituency/7.jpeg"
        eyebrow="Contact"
        title="Let's talk"
        intro="Reach the campaign directly. We are listening — to your ideas, your concerns, and how we can serve the constituency better."
      />

      <section className="tone-navy px-5 py-20">
        <div className="mx-auto max-w-7xl sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Channels */}
          <div className="space-y-5">
            <Reveal className="rounded-brand border border-border bg-surface/40 p-7">
              <h2 className="font-heading text-2xl text-text">WhatsApp</h2>
              <p className="mt-2 text-text-muted">
                The fastest way to reach the campaign for high-engagement
                conversations.
              </p>
              {/* TODO(client): real WhatsApp Business number + wa.me link. */}
              <p className="mt-4 font-medium text-accent">To be announced</p>
            </Reveal>

            <Reveal delay={0.05} className="rounded-brand border border-border bg-surface/40 p-7">
              <h2 className="font-heading text-2xl text-text">Email</h2>
              {/* TODO(client): campaign email address. */}
              <p className="mt-4 font-medium text-accent">To be announced</p>
            </Reveal>

            <Reveal delay={0.1} className="rounded-brand border border-border bg-surface/40 p-7">
              <h2 className="font-heading text-2xl text-text">Campaign office</h2>
              {/* TODO(client): office address. */}
              <p className="mt-4 text-text-muted">Address to be announced</p>
            </Reveal>

            <Reveal delay={0.15} className="rounded-brand border border-border bg-surface/40 p-7">
              <h2 className="font-heading text-2xl text-text">Campaign team</h2>
              <ul className="mt-4 space-y-4">
                {site.team.map((t) => (
                  <li key={t.role}>
                    <p className="text-sm text-text-muted">{t.role}</p>
                    <p className="font-medium text-text">{t.name}</p>
                    {t.phone ? (
                      <a
                        href={`tel:${t.phone.replace(/\s/g, "")}`}
                        className="text-sm text-accent hover:text-accent-hover"
                      >
                        {t.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-text-muted/70">
                        Contact details coming soon
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.2} className="rounded-brand border border-border bg-surface/40 p-7">
              <h2 className="font-heading text-2xl text-text">Follow the campaign</h2>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {site.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="text-text-muted transition-colors hover:text-accent"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Message form */}
          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
        </div>
      </section>
    </>
  );
}
