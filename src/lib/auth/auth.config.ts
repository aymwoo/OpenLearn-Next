import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith('/teacher') ||
        nextUrl.pathname.startsWith('/student') ||
        nextUrl.pathname.startsWith('/classroom') ||
        nextUrl.pathname.startsWith('/admin');

      if (isProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect to login page
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
