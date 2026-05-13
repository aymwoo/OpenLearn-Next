"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  changeClassroomSlide,
  changeClassroomActiveStep,
  changeClassroomMode,
  endClassroomSession,
  launchClassroomSession,
  recordClassroomEvidence,
  recordClassroomIntervention,
  recordStudentQuickResponse,
  refreshClassroomSnapshot,
  updateClassroomParticipantConnection,
} from "@/lib/dal/classroom";
import { cacheTags } from "@/lib/cache-policy";
import {
  ChangeClassroomModeInputSchema,
  ChangeClassroomSlideInputSchema,
  ChangeClassroomStepInputSchema,
  EndClassroomInputSchema,
  LaunchClassroomInputSchema,
  RecordClassroomEvidenceInputSchema,
  RecordClassroomInterventionInputSchema,
  RefreshClassroomSnapshotInputSchema,
  StudentQuickResponseInputSchema,
  TouchClassroomPresenceInputSchema,
} from "@/lib/dto/classroom";
import { getCurrentUserDTO } from "@/lib/dal/auth";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; latest?: unknown; attemptedAction?: unknown };

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
  const parsed = ChangeClassroomStepInputSchema.safeParse(normalizeInput(input));
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
  const parsed = ChangeClassroomModeInputSchema.safeParse(normalizeInput(input));
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
  const parsed = ChangeClassroomSlideInputSchema.safeParse(normalizeInput(input));
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
