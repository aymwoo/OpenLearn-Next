"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { dispatchPluginGovernanceCommand } from "@/features/platform-core/commands/producers/plugin-governance";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import {
  getPluginForSchool,
  listPluginsForSchool,
  runPluginHook,
} from "@/lib/dal/plugins";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { cacheTags } from "@/lib/cache-policy";
import { PluginActionInputSchema, PluginManifestSchema } from "@/lib/dto/resource-ai";

// Phase 50 boundary freeze: Server Actions are future PlatformCommand producer adapters; keep updateTag() at the entrypoint.
const RegisterPluginSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(1),
  manifestJson: PluginManifestSchema,
});

const SetEnabledSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  enabled: z.boolean(),
});

const TransitionPluginLifecycleSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  targetState: z.enum(["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"]),
  reason: z.string().min(1),
});

const KillSwitchSchema = z.object({
  pluginId: z.string().min(1),
  killSwitchEnabled: z.boolean(),
});

const PluginBySchoolSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
});

const PluginListSchema = z.object({
  schoolId: z.string().min(1),
});

const RunHookSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  hookAnchor: z.enum(["dashboard.widget", "lesson.sidebar"]),
  input: PluginActionInputSchema,
});

function getPluginActionError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function requireCurrentActorId() {
  const user = await getCurrentUserDTO();
  if (!user?.id) {
    throw new Error("AUTH_REQUIRED");
  }

  return user.id;
}

async function resolvePluginSchoolId(actorId: string, pluginId: string) {
  const memberships = await getUserMembershipsDTO(actorId);

  for (const membership of memberships) {
    if (membership.status !== "active") {
      continue;
    }

    const plugin = await getPluginForSchool({
      actorId,
      schoolId: membership.schoolId,
      pluginId,
    });

    if (plugin) {
      return membership.schoolId;
    }
  }

  throw new Error("PLUGIN_NOT_FOUND");
}

function updateInferredTags(tags: string[]) {
  for (const tag of tags) {
    updateTag(tag);
  }
}

export async function registerPluginManifestAction(data: z.infer<typeof RegisterPluginSchema>) {
  const parsed = RegisterPluginSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await dispatchPluginGovernanceCommand({
      type: "plugin.install",
      actor: { actorId, actorScope: "teacher" },
      scope: {
        schoolId: parsed.data.schoolId,
        pluginId: parsed.data.manifestJson.id,
      },
      payload: {
        schoolId: parsed.data.schoolId,
        pluginId: parsed.data.manifestJson.id,
        name: parsed.data.name,
        installSource: "manual",
        manifestJson: parsed.data.manifestJson,
      },
      source: "server-action",
      correlation: { producer: "plugin-actions.register" },
    });
    updateTag(cacheTags.pluginRegistry);
    const pluginId = String((result.data as { pluginId?: string; id?: string } | null)?.pluginId ?? (result.data as { id?: string } | null)?.id ?? parsed.data.manifestJson.id);
    updateTag(cacheTags.plugin(pluginId));
    updateInferredTags(result.invalidationTags.filter((tag) => tag !== cacheTags.pluginRegistry && tag !== cacheTags.plugin(pluginId)));
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_REGISTER_FAILED") };
  }
}

export async function setPluginEnabledAction(data: z.infer<typeof SetEnabledSchema>) {
  const parsed = SetEnabledSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = parsed.data.enabled
      ? await dispatchPluginGovernanceCommand({
          type: "plugin.enable",
          actor: { actorId, actorScope: "teacher" },
          scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
          payload: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId, enabledBy: actorId },
          source: "server-action",
          correlation: { producer: "plugin-actions.toggle" },
        })
      : await dispatchPluginGovernanceCommand({
          type: "plugin.disable",
          actor: { actorId, actorScope: "teacher" },
          scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
          payload: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId, disabledBy: actorId },
          source: "server-action",
          correlation: { producer: "plugin-actions.toggle" },
        });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));

    const registeredThemeId = (result.data as { registeredThemeId?: string | null } | null)?.registeredThemeId;

    if (registeredThemeId) {
      updateTag(cacheTags.themeRegistry);
      updateTag(cacheTags.theme(registeredThemeId));
    }

    updateInferredTags(result.invalidationTags.filter((tag) => {
      if (tag === cacheTags.pluginRegistry || tag === cacheTags.plugin(parsed.data.pluginId)) return false;
      if (registeredThemeId && (tag === cacheTags.themeRegistry || tag === cacheTags.theme(registeredThemeId))) return false;
      return true;
    }));

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_SET_ENABLED_FAILED") };
  }
}

export async function transitionPluginLifecycleAction(data: z.infer<typeof TransitionPluginLifecycleSchema>) {
  const parsed = TransitionPluginLifecycleSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const commandType = parsed.data.targetState === "suspended"
      ? "plugin.suspend"
      : parsed.data.targetState === "enabled" || parsed.data.targetState === "mounted" || parsed.data.targetState === "ready"
        ? "plugin.resume"
        : "plugin.disable";
    const result = commandType === "plugin.disable"
      ? await dispatchPluginGovernanceCommand({
          type: "plugin.disable",
          actor: { actorId, actorScope: "teacher" },
          scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
          payload: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId, disabledBy: actorId },
          source: "server-action",
          correlation: { producer: "plugin-actions.transition" },
        })
      : commandType === "plugin.suspend"
        ? await dispatchPluginGovernanceCommand({
            type: "plugin.suspend",
            actor: { actorId, actorScope: "teacher" },
            scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
            payload: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId, reason: parsed.data.reason },
            source: "server-action",
            correlation: { producer: "plugin-actions.transition" },
          })
        : await dispatchPluginGovernanceCommand({
            type: "plugin.resume",
            actor: { actorId, actorScope: "teacher" },
            scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
            payload: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId, reason: parsed.data.reason },
            source: "server-action",
            correlation: { producer: "plugin-actions.transition" },
          });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    updateInferredTags(result.invalidationTags.filter((tag) => tag !== cacheTags.pluginRegistry && tag !== cacheTags.plugin(parsed.data.pluginId)));
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_LIFECYCLE_TRANSITION_FAILED") };
  }
}

export async function setPluginKillSwitchAction(data: z.infer<typeof KillSwitchSchema>) {
  const parsed = KillSwitchSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const schoolId = await resolvePluginSchoolId(actorId, parsed.data.pluginId);
    const result = await dispatchPluginGovernanceCommand({
      type: "plugin.kill_switch.set",
      actor: { actorId, actorScope: "teacher" },
      scope: { schoolId, pluginId: parsed.data.pluginId },
      payload: {
        schoolId,
        pluginId: parsed.data.pluginId,
        enabled: parsed.data.killSwitchEnabled,
        reason: parsed.data.killSwitchEnabled ? "kill-switch-enabled" : "kill-switch-disabled",
      },
      source: "server-action",
      correlation: { producer: "plugin-actions.kill-switch" },
    });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    updateInferredTags(result.invalidationTags.filter((tag) => tag !== cacheTags.pluginRegistry && tag !== cacheTags.plugin(parsed.data.pluginId)));
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_KILL_SWITCH_FAILED") };
  }
}

export async function listPluginsAction(data: z.infer<typeof PluginListSchema>) {
  const parsed = PluginListSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await listPluginsForSchool({ ...parsed.data, actorId });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_LIST_FAILED") };
  }
}

export async function getPluginAction(data: z.infer<typeof PluginBySchoolSchema>) {
  const parsed = PluginBySchoolSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await getPluginForSchool({ ...parsed.data, actorId });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_GET_FAILED") };
  }
}

export async function deletePluginAction(data: z.infer<typeof PluginBySchoolSchema>) {
  const parsed = PluginBySchoolSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await dispatchPluginGovernanceCommand({
      type: "plugin.uninstall",
      actor: { actorId, actorScope: "teacher" },
      scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
      payload: {
        schoolId: parsed.data.schoolId,
        pluginId: parsed.data.pluginId,
        retentionMode: "cleanup",
      },
      source: "server-action",
      correlation: { producer: "plugin-actions.uninstall" },
    });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    updateInferredTags(result.invalidationTags.filter((tag) => tag !== cacheTags.pluginRegistry && tag !== cacheTags.plugin(parsed.data.pluginId)));
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_DELETE_FAILED") };
  }
}

export async function preflightUninstallPluginAction(data: z.infer<typeof PluginBySchoolSchema>) {
  const parsed = PluginBySchoolSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await dispatchPluginGovernanceCommand({
      type: "plugin.uninstall.preflight",
      actor: { actorId, actorScope: "teacher" },
      scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
      payload: parsed.data,
      source: "server-action",
      correlation: { producer: "plugin-actions.uninstall-preflight" },
    });
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_UNINSTALL_PREFLIGHT_FAILED") };
  }
}

export async function uninstallPluginAction(data: z.infer<typeof PluginBySchoolSchema>) {
  return deletePluginAction(data);
}

export async function runPluginHookAction(data: z.infer<typeof RunHookSchema>) {
  const parsed = RunHookSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await runPluginHook({ ...parsed.data, actorId });
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_HOOK_FAILED") };
  }
}
