"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { registerPluginManifest, setPluginKillSwitch, runPluginHook } from "@/lib/dal/plugins";
import { PluginActionInputSchema } from "@/lib/dto/resource-ai";
import { cacheTags } from "@/lib/cache-policy";

// Basic schemas for server actions
const RegisterPluginSchema = z.object({
  schoolId: z.string(),
  name: z.string(),
  manifestJson: z.any(),
});

const KillSwitchSchema = z.object({
  pluginId: z.string(),
  killSwitchEnabled: z.boolean(),
});

const RunHookSchema = z.object({
  pluginId: z.string(),
  hookAnchor: z.string(),
  input: PluginActionInputSchema,
});

export async function registerPluginManifestAction(data: z.infer<typeof RegisterPluginSchema>) {
  const parsed = RegisterPluginSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const result = await registerPluginManifest(parsed.data.schoolId, parsed.data.name, parsed.data.manifestJson);
    updateTag(cacheTags.pluginRegistry);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setPluginKillSwitchAction(data: z.infer<typeof KillSwitchSchema>) {
  const parsed = KillSwitchSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const result = await setPluginKillSwitch(parsed.data.pluginId, parsed.data.killSwitchEnabled);
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runPluginHookAction(data: z.infer<typeof RunHookSchema>) {
  const parsed = RunHookSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const result = await runPluginHook(parsed.data.pluginId, parsed.data.hookAnchor, parsed.data.input);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
