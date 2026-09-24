"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { agentsPath } from "@/lib/agents/routes";

const ITEMS = [
  { label: "Agents", path: "/", match: (p: string) => p === "/" || p.startsWith("/nominations") },
  { label: "Share link", path: "/#share-link", match: () => false },
];

/** In-tool navigation. Highlights "Agents" on the list and on any agent's detail page. */
export function AgentsNav({ canExport }: { canExport: boolean }) {
  // The visible path is bare on agents.votelanky.com and /agents-prefixed in local dev.
  const raw = usePathname() ?? "/";
  const pathname = raw.replace(/^\/agents(?=\/|$)/, "") || "/";

  const cls = (active: boolean) =>
    `whitespace-nowrap rounded-brand px-3.5 py-2 text-sm transition-colors ${
      active ? "bg-surface text-text" : "text-text-muted hover:text-text"
    }`;

  return (
    <nav aria-label="Agents tool" className="flex items-center gap-1.5 overflow-x-auto">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.label}
            href={agentsPath(item.path)}
            aria-current={active ? "page" : undefined}
            className={cls(active)}
          >
            {item.label}
          </Link>
        );
      })}
      {canExport && (
        <a href={agentsPath("/export")} className={cls(false)}>
          Export ZIP
        </a>
      )}
    </nav>
  );
}
