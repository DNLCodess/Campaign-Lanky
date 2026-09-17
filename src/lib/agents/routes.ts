/**
 * Base path for every in-app agents-platform link.
 *
 * Production: served from `agents.votelanky.com`, where the proxy
 * (`src/proxy.ts`) rewrites `/*` -> `/agents/*` transparently. Links stay
 * bare (`/login`, `/dev`, ...) and the URL bar shows the short form. So the
 * default here is `""`.
 *
 * Local dev on plain `http://localhost:3000` has no agents subdomain and no
 * rewrite, so bare `/login` would resolve to the wrong route. Setting
 * `NEXT_PUBLIC_AGENTS_BASE=/agents` in `.env.local` makes every agents link
 * point at the real route, so the platform is fully usable without the
 * subdomain.
 *
 * NEXT_PUBLIC_ vars are inlined at build time, so this works in both server
 * and client components. Leave it unset in Vercel to keep production
 * behaviour.
 */
export const AGENTS_BASE = process.env.NEXT_PUBLIC_AGENTS_BASE ?? "";

/** Prefixes an agents-platform route with the configured base. */
export function agentsPath(path: string): string {
  return `${AGENTS_BASE}${path}`;
}
