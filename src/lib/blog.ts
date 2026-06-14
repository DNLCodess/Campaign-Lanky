import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
export { generateSlug } from "@/lib/slug";

export type Post = {
  id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  body: Record<string, unknown>;
  author: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  published_at: string | null;
  meta_title: string | null;
  meta_desc: string | null;
};

export async function getPublishedPosts(limit?: number): Promise<Post[]> {
  try {
    const supabase = createAdminSupabase();
    let q = supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (limit) q = q.limit(limit);
    const { data } = await q;
    return (data ?? []) as Post[];
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const supabase = createAdminSupabase();
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return data as Post | null;
  } catch {
    return null;
  }
}

export async function getAllPosts(): Promise<Post[]> {
  try {
    const supabase = createAdminSupabase();
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("updated_at", { ascending: false });
    return (data ?? []) as Post[];
  } catch {
    return [];
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  try {
    const supabase = createAdminSupabase();
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data as Post | null;
  } catch {
    return null;
  }
}

export async function getAdjacentPosts(
  publishedAt: string,
): Promise<{ prev: Post | null; next: Post | null }> {
  try {
    const supabase = createAdminSupabase();
    const [prevRes, nextRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id,slug,title")
        .eq("status", "published")
        .lt("published_at", publishedAt)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("id,slug,title")
        .eq("status", "published")
        .gt("published_at", publishedAt)
        .order("published_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      prev: (prevRes.data as Post | null) ?? null,
      next: (nextRes.data as Post | null) ?? null,
    };
  } catch {
    return { prev: null, next: null };
  }
}

// ── Utilities ────────────────────────────────────────────────────────

function extractText(node: Record<string, unknown>): string {
  if (node.type === "text") return (node.text as string) || "";
  const content = node.content as Record<string, unknown>[] | undefined;
  if (!content) return "";
  return content.map(extractText).join(" ");
}

export function readingTime(body: Record<string, unknown>): number {
  const text = extractText(body);
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
