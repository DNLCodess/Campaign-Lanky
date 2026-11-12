import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { PostCard } from "@/components/blog/post-card";
import { GalleryTeaser } from "@/components/gallery/gallery-teaser";
import { getPublishedPosts } from "@/lib/blog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "News & Media",
  description:
    "Press releases, campaign updates, and media from Lanky's ward-to-ward consultations and community engagements.",
  alternates: { canonical: "/news" },
};

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

      <GalleryTeaser />
    </>
  );
}
