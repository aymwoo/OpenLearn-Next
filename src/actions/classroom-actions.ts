"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  bootstrapRuntimeSession,
  changeClassroomSlide,
  changeClassroomActiveStep,
  changeClassroomMode,
  endClassroomSession,
  launchClassroomSession,
  recordRuntimeReady,
  recordRuntimeInteraction,
  recordRuntimeTeacherControl,
  recordClassroomEvidence,
  recordClassroomIntervention,
  recordStudentFormativeEvaluation,
  recordStudentQuickResponse,
  refreshClassroomSnapshot,
  saveRuntimeSessionState,
  submitRuntimeSessionState,
  updateClassroomParticipantConnection,
} from "@/lib/dal/classroom";
import { cacheTags } from "@/lib/cache-policy";
import { RuntimeSubmitResultSchema } from "@/features/runtime-platform/contracts/bridge";
import {
  BootstrapRuntimeSessionInputSchema,
  ChangeClassroomModeInputSchema,
  ChangeClassroomSlideInputSchema,
  ChangeClassroomStepInputSchema,
  EndClassroomInputSchema,
  LaunchClassroomInputSchema,
  RecordRuntimeReadyInputSchema,
  RecordRuntimeInteractionInputSchema,
  RecordRuntimeTeacherControlInputSchema,
  RecordClassroomEvidenceInputSchema,
  RecordClassroomInterventionInputSchema,
  RecordStudentFormativeEvaluationInputSchema,
  RefreshClassroomSnapshotInputSchema,
  SaveRuntimeStateInputSchema,
  StudentQuickResponseInputSchema,
  SubmitRuntimeStateInputSchema,
  TouchClassroomPresenceInputSchema,
} from "@/lib/dto/classroom";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { createRuntimeBridgeMessageId } from "@/features/runtime-platform/host/runtime-host-bridge";
import { RUNTIME_CONTRACT_VERSION } from "@/features/runtime-platform/contracts/version";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; latest?: unknown; attemptedAction?: unknown };
type VotingRecoveryAction = "retry" | "reconcile" | "suspend" | "fallback";

const validationMessage = "输入内容不完整，请检查后重试。";
const launchMessage = "正在创建课堂，请稍候。";
const modeMessage = "正在更新课堂模式。";
const conflictMessage = "课堂状态已经被更新。请先恢复最新状态，再继续操作。";

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }
  return Object.fromEntries(input.entries());
}

function normalizeClassroomControlInput(input: FormData | Record<string, unknown>) {
  const normalized = normalizeInput(input);

  return {
    ...normalized,
    expectedVersion:
      typeof normalized.expectedVersion === "string"
        ? Number(normalized.expectedVersion)
        : normalized.expectedVersion,
    slideIndex:
      typeof normalized.slideIndex === "string"
        ? Number(normalized.slideIndex)
        : normalized.slideIndex,
    locked:
      normalized.locked === "true"
        ? true
        : normalized.locked === "false"
          ? false
          : normalized.locked,
  };
}

function validationError(message = validationMessage) {
  return { ok: false as const, error: "VALIDATION_ERROR", message };
}

function handleClassroomActionError(error: unknown, fallbackMessage = "操作失败，请重试。") {
  if (error instanceof z.ZodError) {
    return validationError();
  }

  if (
    error instanceof Error &&
    ["CLASSROOM_EVIDENCE_UNAUTHORIZED", "CLASSROOM_INTERVENTION_UNAUTHORIZED", "TEACHER_AUTH_REQUIRED"].includes(error.message)
  ) {
    return { ok: false as const, error: "UNAUTHORIZED", message: "您没有权限执行此操作。" };
  }

  if (error instanceof Error) {
    return { ok: false as const, error: error.message || "CLASSROOM_ACTION_FAILED", message: error.message || fallbackMessage };
  }

  return { ok: false as const, error: "CLASSROOM_ACTION_FAILED", message: fallbackMessage };
}

export async function launchClassroomSessionAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = LaunchClassroomInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await launchClassroomSession(parsed.data);
    if (result.sessionId) {
      updateTag(cacheTags.classroom(result.sessionId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error, launchMessage);
  }
}

export async function changeClassroomStepAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = ChangeClassroomStepInputSchema.safeParse(normalizeClassroomControlInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await changeClassroomActiveStep(parsed.data);
    if (!result.ok && result.error === "VERSION_CONFLICT") {
      return {
        ok: false,
        error: "VERSION_CONFLICT",
        message: conflictMessage,
        latest: result.snapshot,
        attemptedAction: { actionType: "change_step", targetStepId: parsed.data.targetStepId },
      };
    }
    
    if (result.sessionId) {
      updateTag(cacheTags.classroom(result.sessionId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function changeClassroomModeAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = ChangeClassroomModeInputSchema.safeParse(normalizeClassroomControlInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await changeClassroomMode(parsed.data);
    if (!result.ok && result.error === "VERSION_CONFLICT") {
      return {
        ok: false,
        error: "VERSION_CONFLICT",
        message: conflictMessage,
        latest: result.snapshot,
        attemptedAction: { actionType: "change_mode", targetLocked: parsed.data.locked },
      };
    }

    if (result.sessionId) {
      updateTag(cacheTags.classroom(result.sessionId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error, modeMessage);
  }
}

export async function changeClassroomSlideAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = ChangeClassroomSlideInputSchema.safeParse(normalizeClassroomControlInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await changeClassroomSlide(parsed.data);
    if (!result.ok && result.error === "VERSION_CONFLICT") {
      return {
        ok: false,
        error: "VERSION_CONFLICT",
        message: conflictMessage,
        latest: result.snapshot,
        attemptedAction: { actionType: "change_slide", targetStepId: parsed.data.stepId, slideIndex: parsed.data.slideIndex },
      };
    }

    if (result.sessionId) {
      updateTag(cacheTags.classroom(result.sessionId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function refreshClassroomSnapshotAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = RefreshClassroomSnapshotInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await refreshClassroomSnapshot(parsed.data);
    if (result.sessionId) {
      updateTag(cacheTags.classroom(result.sessionId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function endClassroomSessionAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = EndClassroomInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await endClassroomSession(parsed.data);
    if (result.sessionId) {
      updateTag(cacheTags.classroom(result.sessionId));
    }
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function touchClassroomPresenceAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = TouchClassroomPresenceInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const user = await getCurrentUserDTO();
    if (!user?.id) {
      return { ok: false, error: "CLASSROOM_PARTICIPANT_REQUIRED", message: "请先登录后再进入课堂。" };
    }

    await updateClassroomParticipantConnection({
      sessionId: parsed.data.sessionId,
      studentId: user.id,
      connectionState: parsed.data.connectionState,
      currentStepId: parsed.data.currentStepId ?? undefined,
    });

    updateTag(cacheTags.classroom(parsed.data.sessionId));
    return { ok: true, data: { sessionId: parsed.data.sessionId } };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function recordClassroomEvidenceAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = RecordClassroomEvidenceInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await recordClassroomEvidence(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.sessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function recordClassroomInterventionAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = RecordClassroomInterventionInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await recordClassroomIntervention(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.sessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function recordStudentFormativeEvaluationAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = RecordStudentFormativeEvaluationInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await recordStudentFormativeEvaluation(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.sessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error, "过程评价暂时没有保存成功，请稍后重试。");
  }
}

export async function submitStudentQuickResponseAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = StudentQuickResponseInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await recordStudentQuickResponse(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.sessionId));
    updateTag(cacheTags.progress(parsed.data.lessonId, result.studentId));
    updateTag(cacheTags.submission(parsed.data.lessonId, result.studentId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function bootstrapRuntimeSessionAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = BootstrapRuntimeSessionInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await bootstrapRuntimeSession(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function recordRuntimeReadyAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = RecordRuntimeReadyInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await recordRuntimeReady(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function recordRuntimeInteractionAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = RecordRuntimeInteractionInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await recordRuntimeInteraction(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function saveRuntimeStateAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = SaveRuntimeStateInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await saveRuntimeSessionState(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function submitRuntimeStateAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = SubmitRuntimeStateInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = RuntimeSubmitResultSchema.parse(await submitRuntimeSessionState(parsed.data));
    updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId));
    updateTag(cacheTags.progress(result.lessonId, result.actorId));
    updateTag(cacheTags.submission(result.lessonId, result.actorId));
    updateTag(cacheTags.teacherReview(result.lessonId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function recordRuntimeTeacherControlAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = RecordRuntimeTeacherControlInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await recordRuntimeTeacherControl(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}

export async function runCurrentVotingRecoveryAction(input: {
  sessionId: string;
  stepId: string;
  recoveryAction: VotingRecoveryAction;
}): Promise<ActionResult<unknown>> {
  if (!input.sessionId || !input.stepId || !input.recoveryAction) {
    return validationError();
  }

  const command = input.recoveryAction === "retry"
    ? "broadcast-preset"
    : input.recoveryAction === "reconcile"
      ? "reset-session"
      : "broadcast-preset";

  try {
    const result = await recordRuntimeTeacherControl({
      version: RUNTIME_CONTRACT_VERSION,
      messageId: createRuntimeBridgeMessageId(),
      correlationId: createRuntimeBridgeMessageId(),
      runtimeInstanceId: `teacher-runtime-${input.sessionId}-${input.stepId}`,
      sentAt: new Date().toISOString(),
      capabilityContext: {
        actorId: "teacher-recovery",
        actorScope: "teacher",
        grantedCapabilities: ["runtime:host-action:request"],
        sessionId: input.sessionId,
      },
      kind: "runtime-teacher-control",
      payload: {
        classroomSessionId: input.sessionId,
        lessonId: input.sessionId,
        publishedVersionId: input.sessionId,
        stepId: input.stepId,
        command,
        payload: {
          source: "classroom-voting-recovery",
          recoveryAction: input.recoveryAction,
        },
      },
    });

    updateTag(cacheTags.classroom(input.sessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}
