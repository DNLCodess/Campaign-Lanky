import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { GalleryFeed } from "@/components/gallery/gallery-feed";
import { getFeedPage } from "@/lib/gallery/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos and videos from Lanky's campaign trail — market visits, town halls, and community engagements across Ibadan Southwest and Northwest.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery",
    description:
      "Photos and videos from Lanky's campaign trail — market visits, town halls, and community engagements across Ibadan Southwest and Northwest.",
    url: "/gallery",
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gallery",
    description:
      "Photos and videos from Lanky's campaign trail — market visits, town halls, and community engagements across Ibadan Southwest and Northwest.",
  },
};

export default async function GalleryPage() {
  const initial = await getFeedPage(null);
  return (
    <>
      <PageHeader
        image="/consituency/4.jpeg"
        eyebrow="Gallery"
        title="On the campaign trail"
        intro="Moments from ward-to-ward visits, town halls, and community engagements — newest first."
      />

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        {initial.entries.length === 0 ? (
          <Reveal className="rounded-brand border border-dashed border-border bg-surface/30 p-12 text-center">
            <p className="font-heading text-xl text-text-muted">
              Photos from the campaign trail are coming soon.
            </p>
          </Reveal>
        ) : (
          <GalleryFeed initial={initial} />
        )}
      </section>
    </>
  );
}
