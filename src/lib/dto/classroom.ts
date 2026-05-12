import { z } from "zod";

import {
  TeachingActivityIntentSchema,
  TeachingActivityModeSchema,
  TeachingDesignFallbackReasonSchema,
  TeachingDesignStatusSchema,
} from "@/lib/dto/lesson-authoring";

export const ClassroomModeSchema = z.enum(["locked", "unlocked"]);
export const ClassroomConnectionStateSchema = z.enum(["connected", "reconnecting", "offline"]);

export const ClassroomStepDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  rank: z.string(),
});

export const ClassroomLaunchPreviewStepDTOSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  title: z.string(),
  family: z.string(),
  summary: z.string(),
  activityIntent: TeachingActivityIntentSchema,
  activityMode: TeachingActivityModeSchema,
  estimatedMinutes: z.number().int().nonnegative(),
  evidenceSummary: z.string(),
  teachingDesignStatus: TeachingDesignStatusSchema,
  needsTeachingDesignRefinement: z.boolean(),
  teachingDesignFallbackReason: TeachingDesignFallbackReasonSchema.nullable(),
  materialCues: z.array(z.string()).default([]),
});

export const ClassroomLaunchPreviewDTOSchema = z.object({
  lessonId: z.string(),
  lessonTitle: z.string(),
  totalEstimatedMinutes: z.number().int().nonnegative(),
  stepCount: z.number().int().nonnegative(),
  steps: z.array(ClassroomLaunchPreviewStepDTOSchema),
});

export const ClassroomLaunchPreviewEmptyStateDTOSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const ClassroomLaunchLessonOptionDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  publishedVersionId: z.string(),
  courseId: z.string(),
  classes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  launchPreview: ClassroomLaunchPreviewDTOSchema,
});

export const ClassroomLiveSessionSummaryDTOSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  lessonTitle: z.string(),
  classId: z.string(),
  className: z.string(),
  updatedAt: z.string(),
  locked: z.boolean(),
  version: z.number().int(),
  status: z.literal("live"),
});

export const ClassroomConsoleDTOSchema = z.object({
  liveSessions: z.array(ClassroomLiveSessionSummaryDTOSchema),
  publishedLessons: z.array(ClassroomLaunchLessonOptionDTOSchema),
  emptyStateCopy: z.string(),
  launchPreviewEmptyState: ClassroomLaunchPreviewEmptyStateDTOSchema,
});

export const ClassroomParticipantDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  connectionState: ClassroomConnectionStateSchema,
  currentStepId: z.string(),
  lastSeenAt: z.string(),
});

export const ClassroomSnapshotDTOSchema = z.object({
  sessionId: z.string(),
  lessonId: z.string(),
  publishedVersionId: z.string(),
  classId: z.string(),
  className: z.string(),
  teacherId: z.string(),
  lessonTitle: z.string(),
  activeStepId: z.string(),
  locked: z.boolean(),
  status: z.enum(["live", "ended"]),
  version: z.number().int(),
  updatedAt: z.string(),
  participants: z.array(ClassroomParticipantDTOSchema),
  steps: z.array(ClassroomStepDTOSchema),
  copy: z.object({
    staleRefreshRequired: z.string().default("课堂状态已经被更新。请先恢复最新状态，再继续操作。"),
    pendingAction: z.string().default("当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。"),
    reconnecting: z.string().default("正在重新连接课堂，会先显示最近一次课堂状态。"),
    restored: z.string().default("已恢复课堂状态，你现在看到的是最新步骤。"),
  }),
});

export const ClassroomEventDTOSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  version: z.number().int(),
  type: z.enum(["launched", "active_step_changed", "lock_mode_changed", "snapshot_refreshed", "ended"]),
  actorId: z.string(),
  payload: z.unknown(),
  createdAt: z.string(),
});

export const LaunchClassroomInputSchema = z.object({
  lessonId: z.string(),
  publishedVersionId: z.string(),
  classId: z.string(),
});

export const ChangeClassroomStepInputSchema = z.object({
  sessionId: z.string(),
  targetStepId: z.string(),
  expectedVersion: z.number().int(),
});

export const ChangeClassroomModeInputSchema = z.object({
  sessionId: z.string(),
  locked: z.boolean(),
  expectedVersion: z.number().int(),
});

export const RefreshClassroomSnapshotInputSchema = z.object({
  sessionId: z.string(),
  expectedVersion: z.number().int().optional(),
});

export const TouchClassroomPresenceInputSchema = z.object({
  sessionId: z.string().min(1),
  connectionState: ClassroomConnectionStateSchema,
  currentStepId: z.string().nullable().optional(),
});

export const EndClassroomInputSchema = z.object({
  sessionId: z.string(),
});

export const PendingTeacherControlDTOSchema = z.object({
  actionType: z.enum(["change_step", "change_mode"]),
  targetStepId: z.string().optional(),
  targetLocked: z.boolean().optional(),
});

export const ClassroomActionResultDTOSchema = z.object({
  ok: z.boolean(),
  sessionId: z.string().optional(),
  snapshot: ClassroomSnapshotDTOSchema.optional(),
  error: z.string().optional(),
  code: z.enum(["conflict", "unauthorized", "not_found", "internal_error"]).optional(),
  expectedVersion: z.number().int().optional(),
  serverVersion: z.number().int().optional(),
});

export type ClassroomMode = z.infer<typeof ClassroomModeSchema>;
export type ClassroomConnectionState = z.infer<typeof ClassroomConnectionStateSchema>;
export type ClassroomStepDTO = z.infer<typeof ClassroomStepDTOSchema>;
export type ClassroomLaunchPreviewStepDTO = z.infer<typeof ClassroomLaunchPreviewStepDTOSchema>;
export type ClassroomLaunchPreviewDTO = z.infer<typeof ClassroomLaunchPreviewDTOSchema>;
export type ClassroomLaunchPreviewEmptyStateDTO = z.infer<typeof ClassroomLaunchPreviewEmptyStateDTOSchema>;
export type ClassroomLaunchLessonOptionDTO = z.infer<typeof ClassroomLaunchLessonOptionDTOSchema>;
export type ClassroomLiveSessionSummaryDTO = z.infer<typeof ClassroomLiveSessionSummaryDTOSchema>;
export type ClassroomConsoleDTO = z.infer<typeof ClassroomConsoleDTOSchema>;
export type ClassroomParticipantDTO = z.infer<typeof ClassroomParticipantDTOSchema>;
export type ClassroomSnapshotDTO = z.infer<typeof ClassroomSnapshotDTOSchema>;
export type ClassroomEventDTO = z.infer<typeof ClassroomEventDTOSchema>;
export type LaunchClassroomInput = z.infer<typeof LaunchClassroomInputSchema>;
export type ChangeClassroomStepInput = z.infer<typeof ChangeClassroomStepInputSchema>;
export type ChangeClassroomModeInput = z.infer<typeof ChangeClassroomModeInputSchema>;
export type RefreshClassroomSnapshotInput = z.infer<typeof RefreshClassroomSnapshotInputSchema>;
export type TouchClassroomPresenceInput = z.infer<typeof TouchClassroomPresenceInputSchema>;
export type EndClassroomInput = z.infer<typeof EndClassroomInputSchema>;
export type PendingTeacherControlDTO = z.infer<typeof PendingTeacherControlDTOSchema>;
export type ClassroomActionResultDTO = z.infer<typeof ClassroomActionResultDTOSchema>;
