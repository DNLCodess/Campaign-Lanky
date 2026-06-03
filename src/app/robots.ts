import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * robots.txt — generated at build time.
 *
 * This is a public campaign site, so we *want* to be fully crawlable, including
 * by AI/LLM crawlers (they surface the candidate's positions in answers). We
 * therefore allow everyone and only fence off the non-public surfaces: the
 * admin area, API routes, and the post-payment callback page.
 */
export default function robots(): MetadataRoute.Robots {
  const base = site.url;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/donate/callback"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
