import { NextResponse } from "next/server";
import { getPublishedPosts } from "@/lib/blog";
import { site } from "@/lib/site";

export const revalidate = 300; // 5 minutes

export async function GET() {
  const posts = await getPublishedPosts(20);

  const items = posts
    .map((post) => {
      const link = `${site.url}/news/${post.slug}`;
      const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : "";
      const escapedTitle = post.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedDesc = (post.excerpt ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `    <item>
      <title>${escapedTitle}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapedDesc}</description>
      <pubDate>${pubDate}</pubDate>
      <author>${post.author}</author>
      ${post.tags.map((t) => `<category>${t}</category>`).join("\n      ")}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vote Lanky — News &amp; Updates</title>
    <link>${site.url}/news</link>
    <description>Campaign updates, press releases, and community news from Lanky's bid to represent Ibadan Southwest and Northwest.</description>
    <language>en-NG</language>
    <atom:link href="${site.url}/news/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
    },
  });
}
