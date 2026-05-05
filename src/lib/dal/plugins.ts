import "server-only";

import { db } from "@/db";
import { pluginRegistrations, pluginHookRuns, pluginActionAudits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { PluginManifestSchema, PluginActionInput, PluginManifest } from "@/lib/dto/resource-ai";
import { dispatchPluginAction } from "@/server/plugins/registry";

export async function registerPluginManifest(schoolId: string, name: string, manifestJson: any) {
  const parsedManifest = PluginManifestSchema.parse(manifestJson);
  
  const [record] = await db.insert(pluginRegistrations).values({
    schoolId,
    name,
    manifestJson: parsedManifest,
    enabled: false,
    killSwitchEnabled: false,
  }).returning();

  return record;
}

export async function setPluginKillSwitch(pluginId: string, killSwitchEnabled: boolean) {
  const [record] = await db.update(pluginRegistrations)
    .set({ killSwitchEnabled, updatedAt: new Date() })
    .where(eq(pluginRegistrations.id, pluginId))
    .returning();
    
  return record;
}

export async function recordPluginActionAudit(pluginId: string, action: string, payloadJson: any, actorId?: string | null) {
  const [record] = await db.insert(pluginActionAudits).values({
    pluginId,
    action,
    payloadJson,
    actorId: actorId || null,
  }).returning();
  
  return record;
}

export async function runPluginHook(pluginId: string, hookAnchor: string, input: PluginActionInput, actorId?: string | null) {
  const start = Date.now();
  
  const plugin = await db.query.pluginRegistrations.findFirst({
    where: eq(pluginRegistrations.id, pluginId),
  });

  if (!plugin || !plugin.enabled || plugin.killSwitchEnabled) {
    await db.insert(pluginHookRuns).values({
      pluginId,
      hookAnchor,
      status: "failed",
      durationMs: Date.now() - start,
    });
    const deniedPayload = { ...input.payload, denied: true, reason: !plugin ? "not_found" : (!plugin.enabled ? "disabled" : "kill_switch") };
    await recordPluginActionAudit(pluginId, input.action, deniedPayload, actorId);
    return null;
  }

  const manifest = PluginManifestSchema.parse(plugin.manifestJson);
  if (!manifest.anchors.includes(hookAnchor as any) || !manifest.actions.includes(input.action as any)) {
    await db.insert(pluginHookRuns).values({
      pluginId,
      hookAnchor,
      status: "failed",
      durationMs: Date.now() - start,
    });
    const deniedPayload = { ...input.payload, denied: true, reason: "not_allowed" };
    await recordPluginActionAudit(pluginId, input.action, deniedPayload, actorId);
    return null;
  }

  const result = dispatchPluginAction(input);

  await db.insert(pluginHookRuns).values({
    pluginId,
    hookAnchor,
    status: "success",
    durationMs: Date.now() - start,
  });

  await recordPluginActionAudit(pluginId, input.action, { ...input.payload, result }, actorId);

  return result;
}
