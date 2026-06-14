"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { generateSlug } from "@/lib/slug";

type DraftPayload = {
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string | null;
  body: Record<string, unknown>;
  author: string;
  tags: string[];
  meta_title: string | null;
  meta_desc: string | null;
};

export async function createDraftPost(): Promise<string> {
  await requireAdmin();
  const supabase = createAdminSupabase();
  const slug = `draft-${Date.now()}`;
  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: "Untitled post",
      slug,
      body: { type: "doc", content: [] },
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function saveDraft(id: string, payload: DraftPayload): Promise<void> {
  await requireAdmin();
  const supabase = createAdminSupabase();

  // Ensure slug uniqueness — if a conflicting slug exists on a different post, append a suffix
  const cleanSlug = payload.slug || generateSlug(payload.title);
  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("slug", cleanSlug)
    .neq("id", id)
    .maybeSingle();

  const finalSlug = existing
    ? `${cleanSlug}-${Date.now().toString(36)}`
    : cleanSlug;

  const { error } = await supabase
    .from("posts")
    .update({
      title: payload.title,
      slug: finalSlug,
      excerpt: payload.excerpt || null,
      cover_image: payload.cover_image,
      body: payload.body,
      author: payload.author,
      tags: payload.tags,
      meta_title: payload.meta_title,
      meta_desc: payload.meta_desc,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function publishPost(id: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminSupabase();

  const { data: post, error } = await supabase
    .from("posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/news");
  if (post?.slug) revalidatePath(`/news/${post.slug}`);
}

export async function unpublishPost(id: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminSupabase();

  const { data: post, error } = await supabase
    .from("posts")
    .update({ status: "archived" })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/news");
  if (post?.slug) revalidatePath(`/news/${post.slug}`);
}

export async function deletePost(id: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminSupabase();

  const { data: post } = await supabase
    .from("posts")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("posts").delete().eq("id", id);

  revalidatePath("/news");
  if (post?.slug) revalidatePath(`/news/${post.slug}`);

  redirect("/admin/blog");
}
