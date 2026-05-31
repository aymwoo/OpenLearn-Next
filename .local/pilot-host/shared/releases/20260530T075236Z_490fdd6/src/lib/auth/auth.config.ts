import type { NextAuthConfig } from "next-auth";

export const protectedRouteFamilies = [
  "/teacher",
  "/student",
  "/classroom",
  "/admin",
  "/api/classroom",
] as const;

export function isProtectedRouteFamily(pathname: string) {
  return protectedRouteFamilies.some((routeFamily) => pathname.startsWith(routeFamily));
}

export function isAuthorizedRouteAccess({
  isLoggedIn,
  pathname,
}: {
  isLoggedIn: boolean;
  pathname: string;
}) {
  if (!isProtectedRouteFamily(pathname)) {
    return true;
  }

  return isLoggedIn;
}

export const authConfig = {
  providers: [],
  trustHost: true,
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      return isAuthorizedRouteAccess({
        isLoggedIn: !!auth?.user,
        pathname: nextUrl.pathname,
      });
    },
  },
} satisfies NextAuthConfig;
