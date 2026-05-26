import "server-only";

import { runCurrentVotingRecoveryAction } from "@/actions/classroom-actions";
import type { ClassroomIncidentActionDTO } from "@/lib/dto/classroom-incident-operator";

type RecoveryAvailabilityInput = {
  runtimeSessionId: string | null;
  commandId: string | null;
  pluginBlocked: boolean;
  taskId: string | null;
};

export function buildClassroomIncidentActionSets(
  input: RecoveryAvailabilityInput,
): {
  lightActions: ClassroomIncidentActionDTO[];
  guardedActions: ClassroomIncidentActionDTO[];
} {
  const detailHref = input.commandId
    ? `/settings/labs/commands/${input.commandId}`
    : input.runtimeSessionId
      ? `/settings/labs/runtime-inspector?runtimeSessionId=${encodeURIComponent(input.runtimeSessionId)}`
      : null;

  return {
    lightActions: [
      {
        action: "retry",
        label: "追加恢复尝试",
        enabled: true,
        reason: null,
        nextStepHref: detailHref,
      },
      {
        action: "reconcile",
        label: "重新对账 authoritative truth",
        enabled: true,
        reason: null,
        nextStepHref: input.taskId
          ? `/settings/labs/async-tasks/${input.taskId}`
          : detailHref,
      },
    ],
    guardedActions: [
      {
        action: "resume",
        label: "恢复运行姿态",
        enabled: false,
        reason: input.pluginBlocked
          ? "当前插件治理姿态仍未恢复，需先进入详情页确认影响范围。"
          : "该动作会改变运行姿态，必须在 detail view 中确认。",
        nextStepHref: detailHref,
      },
      {
        action: "suspend",
        label: "暂停当前姿态",
        enabled: false,
        reason: "该动作会改变运行姿态，必须在 detail view 中确认。",
        nextStepHref: detailHref,
      },
      {
        action: "fallback",
        label: "切换到降级姿态",
        enabled: false,
        reason: "该动作会改变运行姿态，必须在 detail view 中确认。",
        nextStepHref: detailHref,
      },
    ],
  };
}

export async function runClassroomIncidentLightRecovery(input: {
  classroomSessionId: string;
  stepId: string;
  action: "retry" | "reconcile";
}) {
  return runCurrentVotingRecoveryAction({
    sessionId: input.classroomSessionId,
    stepId: input.stepId,
    recoveryAction: input.action,
  });
}
