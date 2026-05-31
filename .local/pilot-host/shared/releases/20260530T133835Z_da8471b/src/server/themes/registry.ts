import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { themeAuditLogs, themeTokenRegistries } from "@/db/schema";
import { ThemeTokenRegistrySchema } from "@/lib/dto/resource-ai";
import { validateThemeTokens } from "@/server/themes/tokens";

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
