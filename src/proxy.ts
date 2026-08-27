import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Named `proxy` — Next.js 16 renamed the "middleware" file convention to
 * "proxy". The exported function must match. It must live in `src/`
 * (alongside `src/app`), not the project root, or it is silently never
 * invoked — see node_modules/next/dist/docs/.../proxy.md.
 *
 * Two independent responsibilities:
 * 1. Refresh the Supabase auth session cookie on /admin routes so server
 *    components always see a valid session. Page-level `requireAdmin()`
 *    still enforces access.
 * 2. Rewrite requests to portal.votelanky.com (the election results portal,
 *    same deployment as the public site) to /portal/*. Locally,
 *    `portal.localhost:3000` works the same way for dev/testing.
 */
const PORTAL_HOSTS = ["portal.votelanky.com", "portal.localhost"];

export async function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0];

  if (PORTAL_HOSTS.includes(hostname) && !request.nextUrl.pathname.startsWith("/portal")) {
    const url = request.nextUrl.clone();
    url.pathname = `/portal${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next.js internals —
     * broad enough to catch the portal-host rewrite on any path, while the
     * session-refresh logic above still only touches /admin.
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon_io|brand|consituency).*)",
  ],
};
