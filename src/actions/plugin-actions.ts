"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getCurrentUserDTO } from "@/lib/dal/auth";
import {
  deletePluginForSchool,
  getPluginForSchool,
  listPluginsForSchool,
  registerPluginManifest,
  runPluginHook,
  setPluginEnabled,
  setPluginKillSwitch,
} from "@/lib/dal/plugins";
import { cacheTags } from "@/lib/cache-policy";
import { PluginActionInputSchema, PluginManifestSchema } from "@/lib/dto/resource-ai";

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

export async function registerPluginManifestAction(data: z.infer<typeof RegisterPluginSchema>) {
  const parsed = RegisterPluginSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await registerPluginManifest({ ...parsed.data, actorId });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(result.id));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_REGISTER_FAILED") };
  }
}

export async function setPluginEnabledAction(data: z.infer<typeof SetEnabledSchema>) {
  const parsed = SetEnabledSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await setPluginEnabled({ ...parsed.data, actorId });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));

    if (result.registeredThemeId) {
      updateTag(cacheTags.themeRegistry);
      updateTag(cacheTags.theme(result.registeredThemeId));
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_SET_ENABLED_FAILED") };
  }
}

export async function setPluginKillSwitchAction(data: z.infer<typeof KillSwitchSchema>) {
  const parsed = KillSwitchSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await setPluginKillSwitch({ ...parsed.data, actorId });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    return { success: true, data: result };
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
    const result = await deletePluginForSchool({ ...parsed.data, actorId });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_DELETE_FAILED") };
  }
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
