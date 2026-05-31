"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { getCurrentUserDTO, getCurrentUserSchoolIds } from "@/lib/dal/auth";
import { registerThemeTokens } from "@/lib/dal/themes";
import { cacheTags } from "@/lib/cache-policy";
import { ThemeTokenRegistrySchema } from "@/lib/dto/resource-ai";
import { clearActiveThemeId, setActiveThemeId } from "@/lib/theme-cookie";

const SetActiveThemeSchema = z.object({
  themeId: z.string().optional(),
});

const RegisterThemeSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(1),
  tokenJson: ThemeTokenRegistrySchema,
});

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }

  return Object.fromEntries(input.entries());
}

async function requireCurrentThemeActor() {
  const user = await getCurrentUserDTO();
  if (!user?.id) {
    throw new Error("AUTH_REQUIRED");
  }

  return user.id;
}

export async function setActiveThemeAction(input: FormData | Record<string, unknown>) {
  const parsed = SetActiveThemeSchema.safeParse(normalizeInput(input));
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const themeId = parsed.data.themeId?.trim();

  try {
    if (!themeId) {
      await clearActiveThemeId();
      revalidatePath("/", "layout");
      return { success: true, data: { themeId: null } };
    }

    const schoolIds = await getCurrentUserSchoolIds();
    if (schoolIds.length === 0) {
      throw new Error("AUTH_REQUIRED");
    }

    await setActiveThemeId(themeId);
    revalidatePath("/", "layout");

    return { success: true, data: { themeId } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "THEME_SET_FAILED" };
  }
}

export async function registerThemeTokensAction(input: FormData | Record<string, unknown>) {
  const parsed = RegisterThemeSchema.safeParse(normalizeInput(input));
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const actorId = await requireCurrentThemeActor();
    const schoolIds = await getCurrentUserSchoolIds();
    if (!schoolIds.includes(parsed.data.schoolId)) {
      throw new Error("THEME_SCOPE_REQUIRED");
    }

    const theme = await registerThemeTokens(parsed.data.schoolId, parsed.data.name, parsed.data.tokenJson, actorId);
    updateTag(cacheTags.themeRegistry);
    updateTag(cacheTags.theme(theme.id));
    revalidatePath("/", "layout");
    return { success: true, data: theme };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "THEME_REGISTER_FAILED" };
  }
}
