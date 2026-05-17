import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { authConfig } from "./auth.config";

type RoleIntent = "teacher" | "student";

function normalizeRoleIntent(value: unknown): RoleIntent | null {
  return value === "teacher" || value === "student" ? value : null;
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
    .where(
      roleIntent === "student"
        ? eq(users.studentNumber, loginId)
        : eq(users.email, loginId)
    )
    .limit(1);
  const user = userRecords[0];

  if (!user || !user.password) {
    return null;
  }

  const activeMemberships = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, user.id),
        eq(memberships.role, roleIntent),
        eq(memberships.status, "active")
      )
    )
    .limit(1);

  if (activeMemberships.length === 0) {
    return null;
  }

  const isValid = await bcrypt.compare(String(credentials.password), user.password);

  if (!isValid) {
    return null;
  }

  return { id: user.id, name: user.name, email: user.email, roles: [roleIntent] };
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

      return token;
    },
    async session({ session, token }) {
      const userId = token.id ?? token.sub;

      if (session.user && userId) {
        session.user.id = String(userId);
        session.user.roles = Array.isArray(token.roles) ? token.roles : [];
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
