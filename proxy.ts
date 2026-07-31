import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "resumecandy_session";

/** Pages reachable without an account. Everything else needs one. */
const PUBLIC_PATHS = ["/login", "/signup"];

/**
 * Optimistic route protection.
 *
 * This only looks for the presence of the session cookie — it never touches
 * the database. Proxy runs on every request including prefetches, so a query
 * here would multiply into the hot path; the authoritative check lives in the
 * DAL (`requireUser`) next to the data it guards, which is what actually
 * enforces access. This layer exists to redirect early and avoid rendering a
 * page the user will only be bounced out of.
 *
 * A forged cookie therefore gets past this and straight into the DAL, where it
 * resolves to no session and is rejected.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.nextUrl);
    // Remember where they were headed so sign-in can return them there.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next's internals and static assets; the print route is exercised by
  // a hidden iframe that carries the same cookies, so it stays protected.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pdf-fonts|.*\\.(?:png|jpg|svg|ico|ttf)$).*)"],
};
