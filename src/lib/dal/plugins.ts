import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { pluginActionAudits, pluginHookRuns, pluginRegistrations } from "@/db/schema";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { PluginActionInput, PluginActionResult, PluginManifest, PluginManifestSchema, PluginRegistrationDTO, PluginRegistrationDTOSchema } from "@/lib/dto/resource-ai";
import { dispatchPluginAction, PLUGIN_ACTION_PERMISSION_REQUIREMENTS } from "@/server/plugins/registry";
import { registerThemeTokens } from "@/lib/dal/themes";

type PluginManagerScopeInput = {
  actorId: string;
  schoolId: string;
};

type RegisterPluginManifestInput = PluginManagerScopeInput & {
  name: string;
  manifestJson: PluginManifest;
};

type SetPluginEnabledInput = PluginManagerScopeInput & {
  pluginId: string;
  enabled: boolean;
};

type PluginBySchoolInput = PluginManagerScopeInput & {
  pluginId: string;
};

type EnabledPluginsForAnchorInput = PluginManagerScopeInput & {
  hookAnchor: "dashboard.widget" | "lesson.sidebar";
};

type RunPluginHookInput = {
  actorId: string;
  pluginId: string;
  schoolId: string;
  hookAnchor: "dashboard.widget" | "lesson.sidebar";
  input: PluginActionInput;
};

function assertActorId(actorId: string) {
  if (!actorId.trim()) {
    throw new Error("PLUGIN_ACTOR_REQUIRED");
  }
}

async function assertTeacherManagerScope(input: PluginManagerScopeInput) {
  assertActorId(input.actorId);

  const scope = await assertActiveTeacher();
  if (scope.userId !== input.actorId || !scope.schoolIds.includes(input.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return scope;
}

async function hasActiveSchoolMembership(actorId: string, schoolId: string) {
  assertActorId(actorId);

  const memberships = await getUserMembershipsDTO(actorId);
  return memberships.some((membership) => membership.schoolId === schoolId && membership.status === "active");
}

function toPluginDTO(record: typeof pluginRegistrations.$inferSelect): PluginRegistrationDTO {
  const manifest = PluginManifestSchema.parse(record.manifestJson);

  return PluginRegistrationDTOSchema.parse({
    id: record.id,
    schoolId: record.schoolId,
    name: record.name,
    manifestJson: manifest,
    enabled: record.enabled,
    killSwitchEnabled: record.killSwitchEnabled,
    builtIn: manifest.builtIn,
    defaultEnabled: manifest.defaultEnabled,
    nonDeletable: manifest.nonDeletable,
  });
}

async function createPluginAudit(pluginId: string, action: string, payloadJson: Record<string, unknown>, actorId: string) {
  const [record] = await db
    .insert(pluginActionAudits)
    .values({
      pluginId,
      action,
      payloadJson,
      actorId,
    })
    .returning();

  return record;
}

async function createHookRun(pluginId: string, hookAnchor: string, status: "success" | "failed", durationMs: number) {
  const [record] = await db
    .insert(pluginHookRuns)
    .values({
      pluginId,
      hookAnchor,
      status,
      durationMs,
    })
    .returning();

  return record;
}

async function denyHook(input: {
  pluginId: string;
  hookAnchor: string;
  action: string;
  payload: Record<string, unknown>;
  actorId: string;
  reason: "disabled" | "kill_switch" | "not_allowed" | "school_mismatch" | "permission_denied";
  requiredPermission?: string;
  startedAt: number;
}) {
  await createHookRun(input.pluginId, input.hookAnchor, "failed", Date.now() - input.startedAt);
  await createPluginAudit(
    input.pluginId,
    input.action,
    {
      ...input.payload,
      denied: true,
      reason: input.reason,
      ...(input.requiredPermission ? { requiredPermission: input.requiredPermission } : {}),
    },
    input.actorId,
  );

  return null;
}

export async function registerPluginManifest(input: RegisterPluginManifestInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });

  const parsedManifest = PluginManifestSchema.parse(input.manifestJson);

  const [record] = await db
    .insert(pluginRegistrations)
    .values({
      schoolId: input.schoolId,
      name: input.name,
      manifestJson: parsedManifest,
      enabled: parsedManifest.defaultEnabled,
      killSwitchEnabled: false,
    })
    .returning();

  return toPluginDTO(record);
}

export async function setPluginEnabled(input: SetPluginEnabledInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });

  const plugin = await db.query.pluginRegistrations.findFirst({
    where: eq(pluginRegistrations.id, input.pluginId),
  });

  if (!plugin || plugin.schoolId !== input.schoolId) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  let registeredThemeId: string | null = null;

  if (input.enabled) {
    const manifest = PluginManifestSchema.parse(plugin.manifestJson);

    if (manifest.theme) {
      const themeRecord = await registerThemeTokens(plugin.schoolId, `${plugin.name} theme`, manifest.theme, input.actorId);
      registeredThemeId = themeRecord.id;
    }
  }

  const [record] = await db
    .update(pluginRegistrations)
    .set({ enabled: input.enabled, updatedAt: new Date() })
    .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
    .returning();

  if (!record) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  return {
    ...toPluginDTO(record),
    registeredThemeId,
  };
}

export async function setPluginKillSwitch(input: { pluginId: string; actorId: string; killSwitchEnabled: boolean }) {
  assertActorId(input.actorId);

  const plugin = await db.query.pluginRegistrations.findFirst({
    where: eq(pluginRegistrations.id, input.pluginId),
  });

  if (!plugin) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: plugin.schoolId });

  const [record] = await db
    .update(pluginRegistrations)
    .set({ killSwitchEnabled: input.killSwitchEnabled, updatedAt: new Date() })
    .where(eq(pluginRegistrations.id, input.pluginId))
    .returning();

  if (!record) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  return toPluginDTO(record);
}

export async function listPluginsForSchool(input: PluginManagerScopeInput) {
  await assertTeacherManagerScope(input);

  const rows = await db.query.pluginRegistrations.findMany({
    where: eq(pluginRegistrations.schoolId, input.schoolId),
  });

  return rows.map(toPluginDTO);
}

export async function getPluginForSchool(input: PluginBySchoolInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });

  const row = await db.query.pluginRegistrations.findFirst({
    where: and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)),
  });

  return row ? toPluginDTO(row) : null;
}

export async function deletePluginForSchool(input: PluginBySchoolInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });

  const plugin = await db.query.pluginRegistrations.findFirst({
    where: and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)),
  });

  if (!plugin) {
    return null;
  }

  const manifest = PluginManifestSchema.parse(plugin.manifestJson);
  if (manifest.builtIn || manifest.nonDeletable) {
    throw new Error("PLUGIN_BUILT_IN_NOT_DELETABLE");
  }

  const [record] = await db
    .delete(pluginRegistrations)
    .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
    .returning();

  return record ? toPluginDTO(record) : null;
}

export async function getEnabledPluginsForAnchor(input: EnabledPluginsForAnchorInput) {
  assertActorId(input.actorId);

  const hasMembership = await hasActiveSchoolMembership(input.actorId, input.schoolId);
  if (!hasMembership) {
    throw new Error("PLUGIN_SCOPE_REQUIRED");
  }

  const rows = await db.query.pluginRegistrations.findMany({
    where: and(
      eq(pluginRegistrations.schoolId, input.schoolId),
      eq(pluginRegistrations.enabled, true),
      eq(pluginRegistrations.killSwitchEnabled, false),
    ),
  });

  return rows
    .map(toPluginDTO)
    .filter((plugin) => plugin.manifestJson.anchors.includes(input.hookAnchor));
}

export async function runPluginHook(input: RunPluginHookInput) {
  assertActorId(input.actorId);

  const startedAt = Date.now();
  const plugin = await db.query.pluginRegistrations.findFirst({
    where: eq(pluginRegistrations.id, input.pluginId),
  });

  if (!plugin) {
    return null;
  }

  if (!plugin.enabled) {
    return denyHook({
      pluginId: plugin.id,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "disabled",
      startedAt,
    });
  }

  if (plugin.killSwitchEnabled) {
    return denyHook({
      pluginId: plugin.id,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "kill_switch",
      startedAt,
    });
  }

  if (plugin.schoolId !== input.schoolId) {
    return denyHook({
      pluginId: plugin.id,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "school_mismatch",
      startedAt,
    });
  }

  const hasMembership = await hasActiveSchoolMembership(input.actorId, plugin.schoolId);
  if (!hasMembership) {
    return denyHook({
      pluginId: plugin.id,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "school_mismatch",
      startedAt,
    });
  }

  const manifest = PluginManifestSchema.parse(plugin.manifestJson);
  if (!manifest.anchors.includes(input.hookAnchor) || !manifest.actions.includes(input.input.action)) {
    return denyHook({
      pluginId: plugin.id,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "not_allowed",
      startedAt,
    });
  }

  const requiredPermission = PLUGIN_ACTION_PERMISSION_REQUIREMENTS[input.input.action];
  if (!manifest.permissions.includes(requiredPermission)) {
    return denyHook({
      pluginId: plugin.id,
      hookAnchor: input.hookAnchor,
      action: input.input.action,
      payload: input.input.payload,
      actorId: input.actorId,
      reason: "permission_denied",
      requiredPermission,
      startedAt,
    });
  }

  const actionInput: PluginActionInput = manifest.builtIn
    ? {
        ...input.input,
        payload: {
          ...input.input.payload,
          pluginName: plugin.name,
        },
      }
    : input.input;

  const result = dispatchPluginAction(actionInput);

  await createHookRun(plugin.id, input.hookAnchor, "success", Date.now() - startedAt);
  await createPluginAudit(
    plugin.id,
    input.input.action,
    {
      ...input.input.payload,
      result,
    },
    input.actorId,
  );

  return result;
}

const BUILT_IN_TEMPLATE_ACTION = "insertBuiltInTeachingStepTemplate" as const;

function canResolveBuiltInTemplate(plugin: PluginRegistrationDTO) {
  return plugin.builtIn && plugin.enabled && plugin.manifestJson.actions.includes(BUILT_IN_TEMPLATE_ACTION);
}

export async function listBuiltInTeachingStepTemplates(input: PluginManagerScopeInput) {
  const plugins = await listPluginsForSchool(input);

  const templates = await Promise.all(
    plugins.filter(canResolveBuiltInTemplate).map(async (plugin) => {
      const result = await runPluginHook({
        actorId: input.actorId,
        pluginId: plugin.id,
        schoolId: input.schoolId,
        hookAnchor: "lesson.sidebar",
        input: {
          pluginId: plugin.id,
          action: BUILT_IN_TEMPLATE_ACTION,
          payload: {},
        },
      });

      if (!result || result.proposalType !== "builtInTeachingStepTemplate") {
        return null;
      }

      return {
        id: plugin.id,
        pluginId: plugin.id,
        ...result.payload,
      };
    }),
  );

  return templates.filter((template): template is NonNullable<typeof template> => Boolean(template));
}

export async function getBuiltInTeachingStepTemplateForSchool(input: PluginBySchoolInput) {
  const plugin = await getPluginForSchool(input);
  if (!plugin || !canResolveBuiltInTemplate(plugin)) {
    return null;
  }

  const result = await runPluginHook({
    actorId: input.actorId,
    pluginId: plugin.id,
    schoolId: input.schoolId,
    hookAnchor: "lesson.sidebar",
    input: {
      pluginId: plugin.id,
      action: BUILT_IN_TEMPLATE_ACTION,
      payload: {},
    },
  });

  if (!result || result.proposalType !== "builtInTeachingStepTemplate") {
    return null;
  }

  return result.payload;
}

export async function listBuiltInTeachingStepSuggestions(input: PluginManagerScopeInput) {
  const templates = await listBuiltInTeachingStepTemplates(input);

  return templates.map((template) => ({
    pluginId: template.pluginId,
    pluginName: template.pluginName,
    builtInKey: template.builtInKey,
    title: template.title,
    summary: template.summary,
    stepType: template.stepType,
  }));
}

export type BuiltInTeachingStepTemplateResult = Awaited<ReturnType<typeof getBuiltInTeachingStepTemplateForSchool>>;
export type BuiltInTeachingStepSuggestionResult = Awaited<ReturnType<typeof listBuiltInTeachingStepSuggestions>>[number];
export type PluginHookResult = PluginActionResult;
