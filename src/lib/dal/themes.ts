import "server-only";

import { db } from "@/db";
import { themeTokenRegistries, themeAuditLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { ThemeTokenRegistrySchema, ThemeTokenRegistry, ThemeRegistryDTO } from "@/lib/dto/resource-ai";
import { validateThemeTokens } from "@/server/themes/tokens";

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

export async function registerThemeTokens(schoolId: string, name: string, tokenJson: unknown, actorId?: string) {
  const parsedTokens = ThemeTokenRegistrySchema.parse(tokenJson);
  const isValid = validateThemeTokens(parsedTokens);
  const validationStatus = isValid ? "valid" : "invalid";

  const existing = await db.query.themeTokenRegistries.findFirst({
    where: and(eq(themeTokenRegistries.schoolId, schoolId), eq(themeTokenRegistries.name, name)),
  });

  if (existing) {
    const [record] = await db
      .update(themeTokenRegistries)
      .set({
        tokenJson: parsedTokens,
        validationStatus,
        updatedAt: new Date(),
      })
      .where(eq(themeTokenRegistries.id, existing.id))
      .returning();

    await recordThemeAudit(record.id, "register", { validationStatus, tokens: parsedTokens }, actorId);

    return record;
  }

  const [record] = await db.insert(themeTokenRegistries).values({
    schoolId,
    name,
    tokenJson: parsedTokens,
    validationStatus,
  }).returning();

  await recordThemeAudit(record.id, "register", { validationStatus, tokens: parsedTokens }, actorId);

  return record;
}

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

export async function recordThemeAudit(
  themeId: string,
  action: string,
  payloadJson: Record<string, unknown>,
  actorId?: string | null,
) {
  const [record] = await db.insert(themeAuditLogs).values({
    themeId,
    action,
    payloadJson,
    actorId: actorId || null,
  }).returning();
  
  return record;
}
