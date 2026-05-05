import "server-only";

import { db } from "@/db";
import { themeTokenRegistries, themeAuditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ThemeTokenRegistrySchema, ThemeTokenRegistry, ThemeRegistryDTO } from "@/lib/dto/resource-ai";
import { validateThemeTokens, compileThemeTokensToCssVariables } from "@/server/themes/tokens";

export async function registerThemeTokens(schoolId: string, name: string, tokenJson: any) {
  const parsedTokens = ThemeTokenRegistrySchema.parse(tokenJson);
  const isValid = validateThemeTokens(parsedTokens);
  
  const validationStatus = isValid ? "valid" : "invalid";

  const [record] = await db.insert(themeTokenRegistries).values({
    schoolId,
    name,
    tokenJson: parsedTokens,
    validationStatus,
  }).returning();

  await recordThemeAudit(record.id, "register", { validationStatus, tokens: parsedTokens });

  return record;
}

export async function getThemeRegistryDTO(themeId: string): Promise<ThemeRegistryDTO | null> {
  const record = await db.query.themeTokenRegistries.findFirst({
    where: eq(themeTokenRegistries.id, themeId),
  });

  if (!record) return null;

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

export async function recordThemeAudit(themeId: string, action: string, payloadJson: any, actorId?: string | null) {
  const [record] = await db.insert(themeAuditLogs).values({
    themeId,
    action,
    payloadJson,
    actorId: actorId || null,
  }).returning();
  
  return record;
}
