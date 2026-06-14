import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { PostCard } from "@/components/blog/post-card";
import { getPublishedPosts } from "@/lib/blog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "News & Media",
  description:
    "Press releases, campaign updates, and media from Lanky's ward-to-ward consultations and community engagements.",
  alternates: { canonical: "/news" },
};

const gallery = [
  { src: "/brand/candidate-4.png", label: "On the campaign" },
  { src: "/brand/candidate-6.png", label: "With the community" },
  { src: "/brand/candidate-5.png", label: "In conversation" },
];

export default async function NewsPage() {
  const posts = await getPublishedPosts(9);
  return (
    <>
      <PageHeader
        image="/consituency/1.jpeg"
        eyebrow="News & Media"
        title="Updates from the movement"
        intro="Ward-to-ward consultation tours, town hall meetings, community engagements, and official statements — straight from the campaign."
      />

      {/* Featured press release */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Press Release
          </p>
        </Reveal>
        <Reveal className="mt-5 rounded-brand border border-border bg-surface/40 p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            For Immediate Release · June 1, 2026 · Ibadan, Oyo State
          </p>
          <h2 className="mt-4 max-w-3xl font-heading text-3xl leading-tight text-text sm:text-4xl">
            Olanrewaju Okesooto announces candidacy for the Federal House of
            Representatives under the Labour Party
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-text-muted">
            <p>
              Olanrewaju Okesooto — a seasoned community leader, tech consultant, and
              founder of the “Avoid Failed Future Initiative” — has officially
              announced his candidacy to represent the people of Ibadan Southwest and
              Northwest. His platform is built on the pillars of integrity, digital
              inclusion, and radical economic empowerment.
            </p>
            <blockquote className="border-l-2 border-primary pl-5 font-heading text-xl text-text">
              “The people of Ibadan Southwest and Northwest deserve a representative
              who is not just a politician, but a practitioner — someone who has built
              businesses, mentored students, and served the community in the trenches.
              I am that candidate.”
            </blockquote>
            <p>
              Key policy pillars include Digital Hubs for Economic Growth,
              Accountability in Representation through digital town halls, and scaling
              the Avoid Failed Future Initiative to combat unemployment through
              vocational and digital skill training.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Campaign blog */}
      <section className="tone-navy border-y border-border/60">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-3xl text-text sm:text-4xl">
                Campaign blog
              </h2>
              <p className="mt-4 max-w-xl text-text-muted">
                Regular updates on consultation tours, town halls, and community
                engagements.
              </p>
            </div>
            <Link
              href="/news/rss.xml"
              className="shrink-0 rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-text"
              title="RSS feed"
            >
              RSS
            </Link>
          </Reveal>

          {posts.length === 0 ? (
            <Reveal className="mt-10 rounded-brand border border-dashed border-border bg-surface/30 p-12 text-center">
              <p className="font-heading text-xl text-text-muted">Coming soon</p>
              <p className="mt-2 text-sm text-text-muted/70">
                Check back for updates from the campaign trail
              </p>
            </Reveal>
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {posts.map((post, i) => (
                <Reveal key={post.id} delay={i * 0.04}>
                  <PostCard post={post} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <Reveal>
          <h2 className="font-heading text-3xl text-text sm:text-4xl">
            Gallery &amp; videos
          </h2>
          <p className="mt-4 max-w-xl text-text-muted">
            Moments with market women, community elders, and youth groups.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((g, i) => (
            <Reveal
              key={g.label}
              delay={i * 0.05}
              className="group relative aspect-4/5 overflow-hidden rounded-brand border border-border"
            >
              {/* Branded backdrop behind the transparent cut-out */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundColor: "#0b2a3d",
                  backgroundImage:
                    "radial-gradient(110% 75% at 50% 12%, rgba(103,156,188,0.28), transparent 62%)",
                }}
              />
              <Image
                src={g.src}
                alt={g.label}
                fill
                sizes="(max-width: 1024px) 90vw, 30vw"
                className="object-contain object-bottom transition-transform duration-500 group-hover:scale-105"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(7,26,38,0.9), rgba(7,26,38,0) 55%)",
                }}
              />
              <span className="absolute bottom-4 left-4 font-heading text-lg text-white">
                {g.label}
              </span>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
