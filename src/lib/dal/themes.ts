import "server-only";

import { db } from "@/db";
import { themeTokenRegistries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { ThemeTokenRegistry, ThemeRegistryDTO } from "@/lib/dto/resource-ai";
import { recordThemeAudit, registerThemeTokens } from "@/server/themes/registry";

function toThemeDTO(record: typeof themeTokenRegistries.$inferSelect): ThemeRegistryDTO {
  return {
    id: record.id,
    schoolId: record.schoolId,
    name: record.name,
    tokenJson: record.tokenJson as ThemeTokenRegistry,
    validationStatus: record.validationStatus as "valid" | "invalid" | "pending",
    createdAt: record.createdAt?.getTime() || Date.now(),
    updatedAt: record.updatedAt?.getTime() || Date.now(),
  };
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
