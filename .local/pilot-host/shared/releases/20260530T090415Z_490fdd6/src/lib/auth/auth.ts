import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import {
  type MembershipRole,
  WorkspaceRoleSchema,
  type WorkspaceRole,
} from "@/lib/dto/membership";
import { authConfig } from "./auth.config";

function normalizeRoleIntent(value: unknown): WorkspaceRole | null {
  const result = WorkspaceRoleSchema.safeParse(value);
  return result.success ? result.data : null;
}

function resolveLoginField(roleIntent: WorkspaceRole) {
  return roleIntent === "student" ? users.studentNumber : users.email;
}

export async function authorizeCredentials(credentials: Record<string, unknown> | undefined) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const roleIntent = normalizeRoleIntent(credentials.roleIntent);

  if (!roleIntent) {
    return null;
  }

  const loginId = String(credentials.email).trim();
  const userRecords = await db
    .select()
    .from(users)
    .where(eq(resolveLoginField(roleIntent), loginId))
    .limit(1);
  const user = userRecords[0];

  if (!user || !user.password) {
    return null;
  }

  const activeMemberships = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, user.id),
        eq(memberships.status, "active")
      )
    );

  const activeRoles = [...new Set(activeMemberships.map((membership) => membership.role as MembershipRole))];

  if (!activeRoles.includes(roleIntent)) {
    return null;
  }

  const isValid = await bcrypt.compare(String(credentials.password), user.password);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: activeRoles,
    workspaceRole: roleIntent,
  };
}

const nodeAuthConfig = {
  ...authConfig,
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (Array.isArray(user?.roles)) {
        token.roles = user.roles;
      }

      if (typeof user?.workspaceRole === "string") {
        token.workspaceRole = user.workspaceRole;
      }

      return token;
    },
    async session({ session, token }) {
      const userId = token.id ?? token.sub;

      if (session.user && userId) {
        session.user.id = String(userId);
        session.user.roles = Array.isArray(token.roles) ? token.roles : [];
        session.user.workspaceRole =
          typeof token.workspaceRole === "string" ? token.workspaceRole : undefined;
      }

      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "账号密码登录",
      credentials: {
        email: { label: "账号", type: "text", placeholder: "请输入教师邮箱或学生学号" },
        password: { label: "密码", type: "password" },
        roleIntent: { label: "角色", type: "text" },
      },
      async authorize(credentials) {
        return authorizeCredentials(credentials as Record<string, unknown> | undefined);
      }
    })
  ]
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(nodeAuthConfig);
