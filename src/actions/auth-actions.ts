"use server";

import { eq, and } from "drizzle-orm";
import { signIn, signOut } from "@/lib/auth/auth";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { z } from "zod";
import { WorkspaceRoleSchema } from "@/lib/dto/membership";

const credentialsSchema = z.object({
  email: z.string().trim().min(1, "请输入账号。"),
  password: z.string().min(1, "请输入密码。"),
  roleIntent: WorkspaceRoleSchema.default("student"),
});

export type SignInActionState = {
  error?: string;
};

function resolveWorkspaceEntry(roleIntent: z.infer<typeof WorkspaceRoleSchema>) {
  if (roleIntent === "student") {
    return "/student";
  }

  if (roleIntent === "admin") {
    return "/admin";
  }

  return "/teacher";
}

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

async function findRoleMismatchMessage(
  loginId: string,
  roleIntent: z.infer<typeof WorkspaceRoleSchema>
) {
  const alternateLookupField =
    roleIntent === "student" ? users.email : users.studentNumber;

  const alternateUserRecords = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(alternateLookupField, loginId))
    .limit(1);

  const alternateUser = alternateUserRecords[0];
  if (!alternateUser) {
    return null;
  }

  const alternateMemberships = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, alternateUser.id),
        eq(memberships.status, "active")
      )
    );

  const activeRoles = new Set(alternateMemberships.map((membership) => membership.role));

  if (roleIntent === "student" && activeRoles.has("teacher")) {
    return "该账号是教师账号，请切换到教师登录。";
  }

  if (roleIntent === "teacher" && activeRoles.has("student")) {
    return "该账号是学生账号，请切换到学生登录。";
  }

  return null;
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
    .where(
      parsed.data.roleIntent === "student"
        ? eq(users.studentNumber, parsed.data.email)
        : eq(users.email, parsed.data.email)
    )
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
            : parsed.data.roleIntent === "student"
              ? "该账号没有学生权限，请切换到教师登录或使用学生账号。"
              : "该账号没有管理后台权限，请使用管理员账号。",
      };
    }
  } else {
    const roleMismatchMessage = await findRoleMismatchMessage(
      parsed.data.email,
      parsed.data.roleIntent
    );

    if (roleMismatchMessage) {
      return { error: roleMismatchMessage };
    }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      roleIntent: parsed.data.roleIntent,
      redirectTo: resolveWorkspaceEntry(parsed.data.roleIntent),
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
