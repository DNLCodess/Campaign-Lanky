import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/blog";
import { formatDate, readingTime } from "@/lib/blog";

export function PostCard({ post }: { post: Post }) {
  const mins = readingTime(post.body);
  const date = post.published_at ? formatDate(post.published_at) : "";

  return (
    <Link
      href={`/news/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-brand border border-border bg-surface/40 transition-colors hover:border-accent/60 hover:bg-surface/70"
    >
      {/* Cover image */}
      {post.cover_image ? (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-surface/60">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-border" fill="none" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          </svg>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-heading text-xl leading-snug text-text transition-colors group-hover:text-accent">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-muted">
            {post.excerpt}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3 text-xs text-text-muted/70">
          {date && <span>{date}</span>}
          <span aria-hidden>·</span>
          <span>{mins} min read</span>
        </div>
      </div>
    </Link>
  );
}
