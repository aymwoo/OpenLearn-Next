"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { runCurrentVotingRecoveryAction } from "@/actions/classroom-actions";
import {
  setPluginKillSwitchForOperatorAction,
  transitionPluginLifecycleForOperatorAction,
} from "@/actions/plugin-actions";
import { cacheTags } from "@/lib/cache-policy";

const RecoveryActionSchema = z.enum(["resume", "suspend", "fallback"]);
const ClassroomRecoveryActionSchema = z.enum(["suspend", "fallback"]);

const PluginRecoveryInputSchema = z.object({
  scope: z.literal("plugin"),
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  recoveryAction: RecoveryActionSchema,
  reason: z.string().min(1),
  revalidatePaths: z.array(z.string().min(1)).optional(),
});

const ClassroomRecoveryInputSchema = z.object({
  scope: z.literal("classroom"),
  sessionId: z.string().min(1),
  stepId: z.string().min(1),
  recoveryAction: ClassroomRecoveryActionSchema,
  reason: z.string().min(1),
  revalidatePaths: z.array(z.string().min(1)).optional(),
});

const OperatorPostureRecoveryInputSchema = z.discriminatedUnion("scope", [
  PluginRecoveryInputSchema,
  ClassroomRecoveryInputSchema,
]);

type OperatorPostureRecoveryInput = z.infer<typeof OperatorPostureRecoveryInputSchema>;

function revalidateAll(paths: string[] | undefined) {
  for (const path of paths ?? []) {
    revalidatePath(path);
  }
}

export async function runOperatorPostureRecoveryAction(
  input: OperatorPostureRecoveryInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = OperatorPostureRecoveryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  if (parsed.data.scope === "plugin") {
    const result = parsed.data.recoveryAction === "fallback"
      ? await setPluginKillSwitchForOperatorAction({
          pluginId: parsed.data.pluginId,
          schoolId: parsed.data.schoolId,
          killSwitchEnabled: true,
        })
      : await transitionPluginLifecycleForOperatorAction({
          pluginId: parsed.data.pluginId,
          schoolId: parsed.data.schoolId,
          targetState: parsed.data.recoveryAction === "resume" ? "enabled" : "suspended",
          reason: parsed.data.reason,
        });

    if (!result.success) {
      return { success: false, error: result.error ?? "OPERATOR_POSTURE_RECOVERY_FAILED" };
    }

    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    revalidatePath("/settings/labs");
    revalidatePath(`/settings/labs/plugins/${parsed.data.pluginId}`);
    revalidatePath(`/settings/labs/plugins/${parsed.data.pluginId}/actions/${parsed.data.recoveryAction}`);
    revalidateAll(parsed.data.revalidatePaths);
    return { success: true };
  }

  const result = await runCurrentVotingRecoveryAction({
    sessionId: parsed.data.sessionId,
    stepId: parsed.data.stepId,
    recoveryAction: parsed.data.recoveryAction,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  updateTag(cacheTags.classroom(parsed.data.sessionId));
  revalidateAll(parsed.data.revalidatePaths);
  return { success: true };
}
