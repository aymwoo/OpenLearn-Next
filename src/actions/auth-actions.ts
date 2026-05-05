"use server";

import { signIn, signOut } from "@/lib/auth/auth";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function signInAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  const parsed = credentialsSchema.safeParse({ email, password });

  if (!parsed.success) {
    return { error: "Invalid credentials format" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "CredentialsSignin"
    ) {
      return { error: "Invalid credentials" };
    }
    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
