import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * The front door.
 *
 * Next 16 renamed this file convention from `middleware` to `proxy`; the
 * mechanism is unchanged. Naming it `middleware.ts` would compile, deploy and
 * silently never run, which is a bad way to discover a hole in an auth gate.
 *
 * This is the *optimistic* check the Next.js auth guide describes: it reads the
 * session cookie and redirects, and nothing more. It is not the only line of
 * defence — `getWorkspaceSnapshot()` in the data layer refuses to return
 * anything without a session, so a route that slipped past this matcher still
 * renders nothing.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const signedIn = Boolean(req.auth);
  const isLogin = pathname === "/login";

  if (!signedIn && !isLogin) {
    const url = new URL("/login", req.nextUrl);
    // Preserve where they were heading so sign-in returns them to it.
    if (pathname !== "/") url.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (signedIn && isLogin) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  /**
   * Everything except the auth endpoints themselves (redirecting the OAuth
   * callback would break the handshake), Next's build output, and static
   * assets — those are excluded so an unauthenticated visitor still gets a
   * styled login page rather than a redirect loop over its CSS.
   */
  matcher: [
    "/((?!auth/|healthz|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
