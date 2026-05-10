"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { cacheTags } from "@/lib/cache-policy";
import {
  approveScheduleAssistantProposal,
  createScheduleAssistantProposal,
  getScheduleAssistantCenterDTO,
  rejectScheduleAssistantProposal,
} from "@/lib/dal/schedule-assistant";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; issues?: unknown[] };

const ScheduleAssistantProposalInputSchema = z
  .object({
    schoolId: z.string().min(1),
    proposalType: z.enum(["import_mapping", "conflict_explanation", "override_suggestion"]),
    targetType: z.string().min(1),
    targetId: z.string().min(1),
    title: z.string().min(1),
    reason: z.string().min(1),
    impactScope: z.array(z.string()).default([]),
    fieldsRequiringConfirmation: z.array(z.string()).default([]),
    draftPayload: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return { ok: false as const, error: "VALIDATION_ERROR", message: "建议内容不完整，请先检查输入。" };
  }
  if (error instanceof Error && (error.message === "TEACHER_AUTH_REQUIRED" || error.message === "SCHEDULE_ASSISTANT_APPROVAL_BLOCKED")) {
    return {
      ok: false as const,
      error: "SCHEDULE_ASSISTANT_APPROVAL_BLOCKED",
      message: "当前建议缺少作用范围、目标或审批上下文，不能直接采纳。",
    };
  }

  return { ok: false as const, error: "ACTION_FAILED", message: "AI 日程建议暂时不可用，请稍后重试。" };
}

export async function createScheduleAssistantProposalAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const parsed = ScheduleAssistantProposalInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "建议内容不完整，请先检查输入。" };
  }

  try {
    const proposal = await createScheduleAssistantProposal(parsed.data);
    updateTag(cacheTags.scheduleAssistantProposal(proposal.id));
    updateTag(cacheTags.scheduleImportSchool(proposal.schoolId));
    return { ok: true, data: proposal };
  } catch (error) {
    return handleError(error);
  }
}

export async function approveScheduleAssistantProposalAction(input: { proposalId: string }): Promise<ActionResult<unknown>> {
  try {
    const proposal = await approveScheduleAssistantProposal(input);
    updateTag(cacheTags.scheduleAssistantProposal(proposal.id));
    return { ok: true, data: proposal };
  } catch (error) {
    return handleError(error);
  }
}

export async function rejectScheduleAssistantProposalAction(input: { proposalId: string }): Promise<ActionResult<unknown>> {
  try {
    const proposal = await rejectScheduleAssistantProposal(input);
    updateTag(cacheTags.scheduleAssistantProposal(proposal.id));
    return { ok: true, data: proposal };
  } catch (error) {
    return handleError(error);
  }
}

export async function refreshScheduleAssistantCenterAction(input?: { schoolId?: string }): Promise<ActionResult<unknown>> {
  try {
    const dto = await getScheduleAssistantCenterDTO(input);
    return { ok: true, data: dto };
  } catch (error) {
    return handleError(error);
  }
}
