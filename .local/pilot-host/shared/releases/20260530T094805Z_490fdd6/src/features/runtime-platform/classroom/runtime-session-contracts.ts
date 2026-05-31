import { z } from "zod";

import { RuntimeDescriptorSchema } from "@/features/runtime-platform/contracts/descriptors";
import { RuntimeCapabilitySchema, RuntimeActorScopeSchema } from "@/features/runtime-platform/contracts/permissions";

export const RuntimeSessionIdentitySchema = z.object({
  classroomSessionId: z.string().min(1),
  publishedVersionId: z.string().min(1),
  lessonId: z.string().min(1),
  stepId: z.string().min(1),
  runtimeId: z.string().min(1),
  runtimeVersion: z.string().min(1),
  actorId: z.string().min(1),
  actorScope: RuntimeActorScopeSchema,
  schoolId: z.string().min(1),
});

export const RuntimeSessionSummarySchema = z.object({
  sessionId: z.string().min(1),
  runtimeId: z.string().min(1),
  runtimeVersion: z.string().min(1),
  isLatest: z.boolean(),
  createdAt: z.string().min(1),
});

export const RuntimeStateSummarySchema = z.object({
  stateVersion: z.number().int().positive(),
  kind: z.enum(["ready", "saved", "submitted", "reset"]),
  summary: z.record(z.string(), z.unknown()).default({}),
  updatedAt: z.string().min(1),
});

export const RuntimeSubmitProofSummarySchema = z.object({
  title: z.string().min(1),
  submittedStateLabel: z.string().min(1),
  bridgeTargets: z.array(z.string().min(1)).min(1),
  inspectorHref: z.string().min(1).optional(),
  summary: z.record(z.string(), z.unknown()).default({}),
});

export const RuntimeStepSummarySchema = z.object({
  stepId: z.string().min(1),
  stepType: z.enum(["content", "task", "quiz"]),
  stepTitle: z.string().min(1),
  runtime: RuntimeDescriptorSchema,
});

export const RuntimeLessonSummarySchema = z.object({
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1),
  publishedVersionId: z.string().min(1),
});

export const RuntimeClassroomSummarySchema = z.object({
  classroomSessionId: z.string().min(1),
  classId: z.string().min(1),
  className: z.string().min(1),
  teacherId: z.string().min(1),
  locked: z.boolean(),
  status: z.enum(["live", "ended"]),
});

export const RuntimeActorSummarySchema = z.object({
  actorId: z.string().min(1),
  actorScope: RuntimeActorScopeSchema,
  schoolId: z.string().min(1),
});

export const RuntimeCapabilityContextSummarySchema = z.object({
  grantedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  hostPermissions: z.array(z.string().min(1)).default([]),
  authorizationMode: z.literal("session-snapshot").default("session-snapshot"),
});

export const RuntimeBootstrapDTOSchema = z.object({
  sessionId: z.string().min(1),
  runtimeVersion: z.string().min(1),
  stepSummary: RuntimeStepSummarySchema,
  lessonSummary: RuntimeLessonSummarySchema,
  classroomSummary: RuntimeClassroomSummarySchema,
  actor: RuntimeActorSummarySchema,
  capabilityContext: RuntimeCapabilityContextSummarySchema,
  latestStateSummary: RuntimeStateSummarySchema.nullable(),
});

export const RuntimeSubmitProofResultSchema = z.object({
  runtimeSessionId: z.string().min(1),
  classroomSessionId: z.string().min(1),
  lessonId: z.string().min(1),
  actorId: z.string().min(1),
  submittedAt: z.string().min(1),
  proofSummary: RuntimeSubmitProofSummarySchema,
});

export const CreateOrResumeRuntimeSessionInputSchema = RuntimeSessionIdentitySchema.extend({
  resumeFromLatest: z.boolean().default(true),
});

export type RuntimeSessionIdentity = z.infer<typeof RuntimeSessionIdentitySchema>;
export type RuntimeSessionSummary = z.infer<typeof RuntimeSessionSummarySchema>;
export type RuntimeStateSummary = z.infer<typeof RuntimeStateSummarySchema>;
export type RuntimeStepSummary = z.infer<typeof RuntimeStepSummarySchema>;
export type RuntimeLessonSummary = z.infer<typeof RuntimeLessonSummarySchema>;
export type RuntimeClassroomSummary = z.infer<typeof RuntimeClassroomSummarySchema>;
export type RuntimeActorSummary = z.infer<typeof RuntimeActorSummarySchema>;
export type RuntimeCapabilityContextSummary = z.infer<typeof RuntimeCapabilityContextSummarySchema>;
export type RuntimeBootstrapDTO = z.infer<typeof RuntimeBootstrapDTOSchema>;
export type CreateOrResumeRuntimeSessionInput = z.infer<typeof CreateOrResumeRuntimeSessionInputSchema>;
export type RuntimeSubmitProofSummary = z.infer<typeof RuntimeSubmitProofSummarySchema>;
export type RuntimeSubmitProofResult = z.infer<typeof RuntimeSubmitProofResultSchema>;
