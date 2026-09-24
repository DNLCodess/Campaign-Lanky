import { AGENTS_BASE } from "@/lib/agents/routes";

const PROD_ORIGIN = "https://agents.votelanky.com";

/**
 * Full, shareable URL for an agents-platform page. Client-only (dev needs
 * window.location). In production AGENTS_BASE is "" so links use the agents
 * subdomain; in local dev the base is "/agents" on the current origin.
 */
export function agentLink(slug: string, path = "/submit/"): string {
  const tail = path.endsWith("/") ? `${path}${slug}` : path;
  if (AGENTS_BASE === "") return `${PROD_ORIGIN}${tail}`;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${AGENTS_BASE}${tail}`;
}
