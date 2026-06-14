import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getPublishedPosts } from "@/lib/blog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/manifesto`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/wards`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/news`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/get-involved`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/donate`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
  ];

  const posts = await getPublishedPosts();
  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/news/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}
