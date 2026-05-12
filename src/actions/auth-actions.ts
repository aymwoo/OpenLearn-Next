"use server";

import { eq, and } from "drizzle-orm";
import { signIn, signOut } from "@/lib/auth/auth";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().trim().min(1, "请输入账号。"),
  password: z.string().min(1, "请输入密码。"),
  roleIntent: z.enum(["teacher", "student"]).default("student"),
});

export type SignInActionState = {
  error?: string;
};

function isCredentialsSigninError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { type?: unknown; code?: unknown; message?: unknown };
  return (
    candidate.type === "CredentialsSignin" ||
    candidate.code === "credentials" ||
    (typeof candidate.message === "string" &&
      candidate.message.includes("CredentialsSignin"))
  );
}

export async function signInAction(
  _prevState: SignInActionState,
  formData: FormData
): Promise<SignInActionState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const roleIntent = formData.get("roleIntent");

  const parsed = credentialsSchema.safeParse({ email, password, roleIntent });

  if (!parsed.success) {
      return { error: "请输入有效账号和密码。" };
  }

  const userRecords = await db
    .select({ id: users.id })
    .from(users)
    .where(parsed.data.roleIntent === "student" ? eq(users.studentNumber, parsed.data.email) : eq(users.email, parsed.data.email))
    .limit(1);

  const user = userRecords[0];

  if (user) {
    const roleMemberships = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, user.id),
          eq(memberships.role, parsed.data.roleIntent),
          eq(memberships.status, "active")
        )
      )
      .limit(1);

    if (roleMemberships.length === 0) {
      return {
        error:
          parsed.data.roleIntent === "teacher"
            ? "该账号没有教师权限，请切换到学生登录或使用教师账号。"
            : "该账号没有学生权限，请切换到教师登录或使用学生账号。",
      };
    }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.roleIntent === "student" ? "/student" : "/teacher",
    });
  } catch (error: unknown) {
    if (isCredentialsSigninError(error)) {
      return { error: "账号或密码不正确。" };
    }
    throw error;
  }

  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
