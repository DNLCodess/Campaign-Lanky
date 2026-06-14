import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllPosts, formatDate } from "@/lib/blog";
import type { Post } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  await requireAdmin();
  const posts = await getAllPosts();

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <Link href="/admin" className="text-sm text-text-muted/60 hover:text-text-muted">
            ← Campaign Admin
          </Link>
          <h1 className="mt-2 font-heading text-2xl text-text">Blog posts</h1>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-text-muted">No posts yet.</p>
          <Link
            href="/admin/blog/new"
            className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Create your first post
          </Link>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border/40">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostRow({ post }: { post: Post }) {
  const statusStyles: Record<string, string> = {
    published: "bg-green-500/15 text-green-300",
    draft: "bg-white/10 text-text-muted",
    archived: "bg-white/10 text-text-muted",
  };

  return (
    <div className="flex items-start justify-between gap-4 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[post.status] ?? "bg-white/10 text-text-muted"}`}
          >
            {post.status}
          </span>
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-xs text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
        <h2 className="mt-1.5 truncate font-heading text-lg text-text">{post.title}</h2>
        <p className="mt-0.5 text-xs text-text-muted/60">
          {post.published_at
            ? `Published ${formatDate(post.published_at)}`
            : `Updated ${formatDate(post.updated_at)}`}
          {" · "}
          /news/{post.slug}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {post.status === "published" && (
          <a
            href={`/news/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-brand border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            View ↗
          </a>
        )}
        <Link
          href={`/admin/blog/${post.id}/edit`}
          className="rounded-brand bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
