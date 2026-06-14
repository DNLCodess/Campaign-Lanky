import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getPostById } from "@/lib/blog";
import { BlogEditor } from "@/components/blog/blog-editor";

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  return (
    <BlogEditor
      postId={post.id}
      initialTitle={post.title}
      initialBody={post.body}
      initialExcerpt={post.excerpt ?? ""}
      initialCoverImage={post.cover_image ?? ""}
      initialSlug={post.slug}
      initialTags={post.tags}
      initialAuthor={post.author}
      initialStatus={post.status}
      initialMetaTitle={post.meta_title ?? ""}
      initialMetaDesc={post.meta_desc ?? ""}
    />
  );
}
