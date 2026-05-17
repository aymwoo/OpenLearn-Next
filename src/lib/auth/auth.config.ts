import type { NextAuthConfig } from "next-auth";

export function isAuthorizedRouteAccess({
  isLoggedIn,
  pathname,
  roles,
}: {
  isLoggedIn: boolean;
  pathname: string;
  roles?: string[];
}) {
  const isTeacherRoute = pathname.startsWith("/teacher");
  const isStudentRoute = pathname.startsWith("/student");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtected =
    isTeacherRoute || isStudentRoute || pathname.startsWith("/classroom") || isAdminRoute;

  if (!isProtected) {
    return true;
  }

  if (!isLoggedIn) {
    return false;
  }

  // Proxy runs with the edge-safe auth config and may not receive custom role fields.
  // Let the route layout/DAL enforce role-specific access once the user is authenticated.
  if (!roles || roles.length === 0) {
    return true;
  }

  if (isTeacherRoute) {
    return roles?.includes("teacher") ?? false;
  }

  if (isStudentRoute) {
    return roles?.includes("student") ?? false;
  }

  if (isAdminRoute) {
    return roles?.includes("admin") ?? false;
  }

  return true;
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
        roles: auth?.user?.roles,
      });
    },
  },
} satisfies NextAuthConfig;
