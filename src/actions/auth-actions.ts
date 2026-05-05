"use server";

import { signIn, signOut } from "@/lib/auth/auth";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "请输入密码。"),
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

  const parsed = credentialsSchema.safeParse({ email, password });

  if (!parsed.success) {
    return { error: "请输入有效邮箱和密码。" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/teacher/editor",
    });
  } catch (error: unknown) {
    if (isCredentialsSigninError(error)) {
      return { error: "邮箱或密码不正确。" };
    }
    throw error;
  }

  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
