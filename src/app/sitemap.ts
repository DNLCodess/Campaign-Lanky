import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * sitemap.xml — generated at build time.
 *
 * Lists every public, indexable route. Admin/API/payment-callback routes are
 * intentionally omitted (and disallowed in robots.ts). Update this list when a
 * new public page is added.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const lastModified = new Date();

  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/register", changeFrequency: "monthly", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.9 },
    { path: "/manifesto", changeFrequency: "monthly", priority: 0.9 },
    { path: "/wards", changeFrequency: "monthly", priority: 0.7 },
    { path: "/news", changeFrequency: "weekly", priority: 0.8 },
    { path: "/get-involved", changeFrequency: "monthly", priority: 0.8 },
    { path: "/donate", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
