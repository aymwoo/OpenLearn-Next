import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedRouteAccess } from "./lib/auth/auth.config";

function hasAuthSessionCookie(request: NextRequest) {
  return Boolean(
    request.cookies.get("authjs.session-token")?.value
    || request.cookies.get("__Secure-authjs.session-token")?.value
    || request.cookies.get("next-auth.session-token")?.value
    || request.cookies.get("__Secure-next-auth.session-token")?.value,
  );
}

export function proxy(request: NextRequest) {
  const isLoggedIn = hasAuthSessionCookie(request);
  const allowed = isAuthorizedRouteAccess({
    isLoggedIn,
    pathname: request.nextUrl.pathname,
  });

  if (allowed) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    "/teacher/:path*",
    "/student/:path*",
    "/classroom/:path*",
    "/admin/:path*",
    "/api/classroom/:path*",
  ],
};
