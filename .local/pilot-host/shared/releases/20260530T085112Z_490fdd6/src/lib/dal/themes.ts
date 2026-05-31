import "server-only";

import { db } from "@/db";
import { themeTokenRegistries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import {
  ThemeLayoutRuntime,
  ThemeRegistryDTO,
  ThemeRegistryDTOSchema,
  ThemeResolvedRuntimeDTO,
  ThemeResolvedRuntimeDTOSchema,
  ThemeTokenRegistry,
} from "@/lib/dto/resource-ai";
import { getActiveThemeId } from "@/lib/theme-cookie";
import { recordThemeAudit, registerThemeTokens } from "@/server/themes/registry";
import {
  compileThemeLayoutRuntime,
  compileThemeTokensToCssVariables,
  DEFAULT_THEME_LAYOUT_RUNTIME,
} from "@/server/themes/tokens";

export type CurrentActorThemeRuntimeState = {
  requestedThemeId: string | null;
  activeThemeId: string | null;
  themeRuntime: ThemeResolvedRuntimeDTO | null;
  layoutRuntime: ThemeLayoutRuntime;
  themeSource: "default" | "active-theme";
};

function toThemeDTO(record: typeof themeTokenRegistries.$inferSelect): ThemeRegistryDTO {
  const tokenJson = record.tokenJson as ThemeTokenRegistry;
  const layoutRuntime = compileThemeLayoutRuntime(tokenJson);

  return ThemeRegistryDTOSchema.parse({
    id: record.id,
    schoolId: record.schoolId,
    name: record.name,
    tokenJson,
    validationStatus: record.validationStatus as "valid" | "invalid" | "pending",
    layoutRuntime,
    layoutSummary: layoutRuntime.summary,
    createdAt: record.createdAt?.getTime() || Date.now(),
    updatedAt: record.updatedAt?.getTime() || Date.now(),
  });
}

export { registerThemeTokens, recordThemeAudit };

export async function getThemeRegistryDTO(themeId: string): Promise<ThemeRegistryDTO | null> {
  const record = await db.query.themeTokenRegistries.findFirst({
    where: eq(themeTokenRegistries.id, themeId),
  });

  return record ? toThemeDTO(record) : null;
}

export async function getValidThemesForSchool(schoolId: string): Promise<ThemeRegistryDTO[]> {
  const rows = await db.query.themeTokenRegistries.findMany({
    where: and(eq(themeTokenRegistries.schoolId, schoolId), eq(themeTokenRegistries.validationStatus, "valid")),
  });

  return rows
    .map(toThemeDTO)
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

export async function getActiveThemeForCurrentActor(themeId: string): Promise<ThemeRegistryDTO | null> {
  const user = await getCurrentUserDTO();
  if (!user) {
    return null;
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships.filter((membership) => membership.status === "active").map((membership) => membership.schoolId);

  if (schoolIds.length === 0) {
    return null;
  }

  const theme = await getThemeRegistryDTO(themeId);
  if (!theme || theme.validationStatus !== "valid") {
    return null;
  }

  return schoolIds.includes(theme.schoolId) ? theme : null;
}

export async function getActiveThemeRuntimeForCurrentActor(themeId: string): Promise<ThemeResolvedRuntimeDTO | null> {
  const theme = await getActiveThemeForCurrentActor(themeId);
  if (!theme) {
    return null;
  }

  const layoutRuntime = theme.layoutRuntime ?? compileThemeLayoutRuntime(theme.tokenJson);
  return ThemeResolvedRuntimeDTOSchema.parse({
    theme: {
      ...theme,
      layoutRuntime,
      layoutSummary: layoutRuntime.summary,
    },
    cssVariables: compileThemeTokensToCssVariables(theme.tokenJson),
    layoutRuntime,
    layoutSummary: layoutRuntime.summary,
  });
}

export async function getCurrentActorThemeRuntimeState(): Promise<CurrentActorThemeRuntimeState> {
  const requestedThemeId = await getActiveThemeId();
  const themeRuntime = requestedThemeId ? await getActiveThemeRuntimeForCurrentActor(requestedThemeId) : null;

  return {
    requestedThemeId,
    activeThemeId: themeRuntime?.theme.id ?? null,
    themeRuntime,
    layoutRuntime: themeRuntime?.layoutRuntime ?? DEFAULT_THEME_LAYOUT_RUNTIME,
    themeSource: themeRuntime ? "active-theme" : "default",
  };
}
