"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { runCurrentVotingRecoveryAction } from "@/actions/classroom-actions";
import { cacheTags } from "@/lib/cache-policy";
import { getClassroomSnapshotDTO } from "@/lib/dal/classroom";

const OperatorClassroomRecoveryActionSchema = z.object({
  classroomSessionId: z.string().min(1),
  action: z.enum(["retry", "reconcile"]),
});

export async function runOperatorClassroomRecoveryAction(input: {
  classroomSessionId: string;
  action: "retry" | "reconcile" | "resume" | "suspend" | "fallback";
}): Promise<{ success: true; action: "retry" | "reconcile" } | { success: false; error: string }> {
  const parsed = OperatorClassroomRecoveryActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const snapshot = await getClassroomSnapshotDTO({
      sessionId: parsed.data.classroomSessionId,
    });

    const result = await runCurrentVotingRecoveryAction({
      sessionId: parsed.data.classroomSessionId,
      stepId: snapshot.activeStepId,
      recoveryAction: parsed.data.action,
    });

    if (!result.ok) {
      return { success: false, error: result.error };
    }

    updateTag(cacheTags.classroom(parsed.data.classroomSessionId));
    revalidatePath("/settings/labs/incidents");
    revalidatePath(`/settings/labs/incidents/${parsed.data.classroomSessionId}`);

    return { success: true, action: parsed.data.action };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "OPERATOR_CLASSROOM_RECOVERY_FAILED",
    };
  }
}
