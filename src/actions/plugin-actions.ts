"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  readBlockedActionDiagnostics,
  readExecutableActionCatalog,
  readPluginGovernanceLifecycle,
} from "@/features/platform-core/actions/registry";
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

const RetryPluginSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  commandId: z.string().min(1),
  reason: z.string().min(1),
});

const TransitionPluginLifecycleSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  targetState: z.enum(["enabled", "mounted", "ready", "suspended", "disabled"]),
  reason: z.string().min(1),
});

const ReconcilePluginSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  reason: z.string().min(1),
  targetState: z.enum(["enabled", "mounted", "ready"]).optional(),
});

const KillSwitchSchema = z.object({
  pluginId: z.string().min(1),
  killSwitchEnabled: z.boolean(),
});

const PluginBySchoolSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
});

const UninstallPluginSchema = PluginBySchoolSchema.extend({
  retentionMode: z.enum(["retain", "cleanup"]).default("retain"),
  confirmationToken: z.string().min(1).optional(),
});

const PluginListSchema = z.object({
  schoolId: z.string().min(1),
});

const PluginGovernanceReadSchema = z.object({
  schoolId: z.string().min(1),
  pluginId: z.string().min(1),
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
  const memberships = (await getUserMembershipsDTO(actorId)).filter(
    (membership) => membership.status === "active" && membership.role === "teacher",
  );

  for (const membership of memberships) {
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
        existingRegistrationId: undefined,
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
            payload: {
              schoolId: parsed.data.schoolId,
              pluginId: parsed.data.pluginId,
              reason: parsed.data.reason,
              targetState: parsed.data.targetState === "mounted" || parsed.data.targetState === "ready"
                ? parsed.data.targetState
                : "enabled",
            },
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

export async function reconcilePluginAction(data: z.infer<typeof ReconcilePluginSchema>) {
  const parsed = ReconcilePluginSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await dispatchPluginGovernanceCommand({
      type: "plugin.reconcile",
      actor: { actorId, actorScope: "teacher" },
      scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
      payload: {
        schoolId: parsed.data.schoolId,
        pluginId: parsed.data.pluginId,
        reason: parsed.data.reason,
        targetState: parsed.data.targetState,
      },
      source: "server-action",
      correlation: { producer: "plugin-actions.reconcile" },
    });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    updateInferredTags(result.invalidationTags.filter((tag) => tag !== cacheTags.pluginRegistry && tag !== cacheTags.plugin(parsed.data.pluginId)));
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_RECONCILE_FAILED") };
  }
}

export async function retryPluginAction(data: z.infer<typeof RetryPluginSchema>) {
  const parsed = RetryPluginSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await dispatchPluginGovernanceCommand({
      type: "plugin.retry",
      actor: { actorId, actorScope: "teacher" },
      scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.pluginId },
      payload: {
        schoolId: parsed.data.schoolId,
        pluginId: parsed.data.pluginId,
        commandId: parsed.data.commandId,
        reason: parsed.data.reason,
      },
      source: "server-action",
      correlation: { producer: "plugin-actions.retry" },
    });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    updateInferredTags(result.invalidationTags.filter((tag) => tag !== cacheTags.pluginRegistry && tag !== cacheTags.plugin(parsed.data.pluginId)));
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_RETRY_FAILED") };
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

export async function listExecutableActionCatalogAction(data: z.infer<typeof PluginListSchema>) {
  const parsed = PluginListSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await readExecutableActionCatalog({
      actorId,
      schoolId: parsed.data.schoolId,
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_ACTION_CATALOG_FAILED") };
  }
}

export async function listBlockedActionDiagnosticsAction(data: z.infer<typeof PluginListSchema>) {
  const parsed = PluginListSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await readBlockedActionDiagnostics({
      actorId,
      schoolId: parsed.data.schoolId,
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_ACTION_DIAGNOSTICS_FAILED") };
  }
}

export async function getPluginGovernanceReadAction(data: z.infer<typeof PluginGovernanceReadSchema>) {
  const parsed = PluginGovernanceReadSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await readPluginGovernanceLifecycle({
      actorId,
      schoolId: parsed.data.schoolId,
      pluginId: parsed.data.pluginId,
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_GOVERNANCE_READ_FAILED") };
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

export async function deletePluginAction(data: z.infer<typeof UninstallPluginSchema>) {
  const parsed = UninstallPluginSchema.safeParse(data);
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
          retentionMode: parsed.data.retentionMode,
          confirmationToken: parsed.data.confirmationToken,
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

export async function uninstallPluginAction(data: z.infer<typeof UninstallPluginSchema>) {
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
