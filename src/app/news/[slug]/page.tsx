import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPostBySlug, getAdjacentPosts, formatDate, readingTime } from "@/lib/blog";
import { PostBody } from "@/components/blog/post-body";
import { site } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const title = post.meta_title || post.title;
  const description = post.meta_desc || post.excerpt || "";

  return {
    title,
    description,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `${site.url}/news/${post.slug}`,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      images: post.cover_image ? [{ url: post.cover_image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.cover_image ? [post.cover_image] : [],
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, adjacent] = await Promise.all([
    getPostBySlug(slug),
    getPostBySlug(slug).then((p) =>
      p?.published_at ? getAdjacentPosts(p.published_at) : { prev: null, next: null },
    ),
  ]);

  if (!post) notFound();

  const mins = readingTime(post.body);
  const postUrl = `${site.url}/news/${post.slug}`;

  return (
    <article className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
      {/* Back link */}
      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted/70 transition-colors hover:text-text"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        News & updates
      </Link>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-accent/20 bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="mt-4 font-heading text-4xl leading-tight text-text sm:text-5xl">
        {post.title}
      </h1>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-muted/70">
        {post.published_at && <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>}
        <span aria-hidden>·</span>
        <span>{mins} min read</span>
        <span aria-hidden>·</span>
        <span>{post.author}</span>
      </div>

      {/* Cover image */}
      {post.cover_image && (
        <div className="relative mt-10 aspect-video w-full overflow-hidden rounded-brand border border-border">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      )}

      {/* Body */}
      <div className="mt-12">
        <PostBody body={post.body} />
      </div>

      {/* Social sharing */}
      <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-border/60 pt-8">
        <span className="text-sm text-text-muted">Share this post:</span>
        <a
          href={`https://x.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          X / Twitter
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Facebook
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${postUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          WhatsApp
        </a>
      </div>

      {/* Prev / next nav */}
      {(adjacent.prev || adjacent.next) && (
        <nav className="mt-8 grid gap-4 border-t border-border/60 pt-8 sm:grid-cols-2">
          {adjacent.prev && (
            <Link
              href={`/news/${adjacent.prev.slug}`}
              className="group flex flex-col gap-1 rounded-brand border border-border p-5 transition-colors hover:border-accent/60"
            >
              <span className="text-xs text-text-muted/60">← Previous</span>
              <span className="font-heading text-lg leading-snug text-text transition-colors group-hover:text-accent">
                {adjacent.prev.title}
              </span>
            </Link>
          )}
          {adjacent.next && (
            <Link
              href={`/news/${adjacent.next.slug}`}
              className={`group flex flex-col gap-1 rounded-brand border border-border p-5 transition-colors hover:border-accent/60 ${!adjacent.prev ? "sm:col-start-2" : ""}`}
            >
              <span className="text-xs text-text-muted/60 sm:text-right">Next →</span>
              <span className="font-heading text-lg leading-snug text-text transition-colors group-hover:text-accent sm:text-right">
                {adjacent.next.title}
              </span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
