import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      const userId = token.id ?? token.sub;

      if (session.user && userId) {
        session.user.id = String(userId);
      }

      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "账号密码登录",
      credentials: {
        email: { label: "邮箱", type: "email", placeholder: "请输入登录邮箱" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailStr = String(credentials.email);
        const userRecords = await db.select().from(users).where(eq(users.email, emailStr)).limit(1);
        const user = userRecords[0];

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(String(credentials.password), user.password);
        if (isValid) {
          return { id: user.id, name: user.name, email: user.email };
        }

        return null;
      }
    })
  ]
});
