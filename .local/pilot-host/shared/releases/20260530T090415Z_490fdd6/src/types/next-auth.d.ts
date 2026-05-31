import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      roles?: string[];
      workspaceRole?: string;
    };
  }

  interface User {
    roles?: string[];
    workspaceRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: string[];
    workspaceRole?: string;
  }
}
