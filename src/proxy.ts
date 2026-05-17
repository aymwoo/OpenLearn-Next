import NextAuth from "next-auth";
import { authConfig } from "./lib/auth/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/teacher/:path*",
    "/student/:path*",
    "/classroom/:path*",
    "/admin/:path*",
    "/api/classroom/:path*",
  ],
};
