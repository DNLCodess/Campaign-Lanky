/**
 * Base path for every in-app portal link.
 *
 * Production: the portal is served from `portal.votelanky.com`, where the proxy
 * (`src/proxy.ts`) rewrites `/*` -> `/portal/*` transparently. Links stay bare
 * (`/admin`, `/lga`, ...) and the URL bar shows the short form. So the default
 * here is `""`.
 *
 * Local dev on plain `http://localhost:3000` has no portal subdomain and no
 * rewrite, so bare `/admin` would resolve to the *campaign* admin. Setting
 * `NEXT_PUBLIC_PORTAL_BASE=/portal` in `.env.local` makes every portal link
 * point at the real route, so the portal is fully usable without the subdomain.
 *
 * NEXT_PUBLIC_ vars are inlined at build time, so this works in both server and
 * client components. Leave it unset in Vercel to keep production behaviour.
 */
export const PORTAL_BASE = process.env.NEXT_PUBLIC_PORTAL_BASE ?? "";

/** Prefixes a portal route with the configured base (e.g. `/admin/coverage`). */
export function portalPath(path: string): string {
  return `${PORTAL_BASE}${path}`;
}
