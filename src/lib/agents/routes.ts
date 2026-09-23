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

/**
 * Validates a `?next=` redirect target before it's used (by
 * requireCandidateSession()'s login redirect, and again by loginCandidate()
 * before honouring it): must be a same-origin relative path, not the login
 * page itself.
 *
 * Unlike a fixed-prefix check (e.g. "/admin"), a bare-path check has nothing
 * to rule out values a browser will reinterpret as a different host, and a
 * simple `startsWith("//")` isn't enough: browsers treat "\" as "/" and strip
 * tabs/newlines when parsing a URL, so "/\evil.com" and "/\t/evil.com" both
 * become "//evil.com". So instead of pattern-matching known tricks, this
 * resolves the value the way a browser would and requires it to stay on the
 * same origin — plus rejects backslashes and control characters outright,
 * since no legitimate agents route contains them.
 */
export function safeAgentsNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (/[\\\u0000- \u007f]/.test(next)) return null;
  try {
    const base = "http://agents.invalid";
    if (new URL(next, base).origin !== base) return null;
  } catch {
    return null;
  }
  return next === agentsPath("/login") ? null : next;
}
