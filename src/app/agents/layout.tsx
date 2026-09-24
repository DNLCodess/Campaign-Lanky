import type { Metadata } from "next";
import { BrandWatermark } from "@/components/brand-watermark";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Party Agent Nominations",
  robots: { index: false, follow: false },
};

// Absolute, because this tool is served from agents.votelanky.com, not the main site.
const PUBLIC_LINKS = [
  { label: "Manifesto", href: `${site.url}/manifesto` },
  { label: "Get involved", href: `${site.url}/get-involved` },
  { label: "Results", href: `${site.url}/results` },
];

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-bg">
      {/*
        This is a tool, not the public site: hide the marketing header and
        footer that the root layout wraps around every page. On
        agents.votelanky.com the visible path is bare ("/", "/login"), so
        SiteChrome can't tell it apart from the public site by pathname —
        hiding them from here is server-rendered, so there is no flash.
      */}
      <style>{"body > header, body > footer { display: none; }"}</style>
      <BrandWatermark />
      <div className="flex-1">{children}</div>
      <footer className="px-5 py-5 text-center text-xs text-text-muted">
        <a href={site.url} className="hover:text-text">
          {site.shortName} · {site.slogan}
        </a>
        <span className="mx-2 hidden text-border sm:inline" aria-hidden>
          |
        </span>
        <span className="mt-1 block sm:mt-0 sm:inline">
          {PUBLIC_LINKS.map((l, i) => (
            <span key={l.href}>
              {i > 0 && <span className="mx-1.5 text-border" aria-hidden>·</span>}
              <a href={l.href} className="hover:text-text">
                {l.label}
              </a>
            </span>
          ))}
        </span>
      </footer>
    </div>
  );
}
