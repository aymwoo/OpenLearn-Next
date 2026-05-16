import { z } from "zod";

import { RuntimeCapabilitySchema, RuntimeActorScopeSchema } from "./permissions";
import { RuntimeContractVersionSchema } from "./version";

export const TeachingBridgeRequestKindSchema = z.enum([
  "runtime-bootstrap",
  "runtime-ready",
  "runtime-interaction",
  "runtime-save",
  "runtime-submit",
  "runtime-teacher-control",
]);

export const TeachingBridgeMessageKindSchema = z.enum([...TeachingBridgeRequestKindSchema.options, "host-action-result"]);

export const TeachingBridgeCapabilityContextSchema = z.object({
  actorId: z.string().min(1),
  actorScope: RuntimeActorScopeSchema,
  grantedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  sessionId: z.string().min(1).optional(),
  schoolId: z.string().min(1).optional(),
});

const TeachingBridgeEnvelopeBaseSchema = z.object({
  version: RuntimeContractVersionSchema,
  messageId: z.string().min(1),
  runtimeInstanceId: z.string().min(1),
  sentAt: z.string().min(1),
  capabilityContext: TeachingBridgeCapabilityContextSchema,
});

const TeachingBridgeStepReferenceSchema = z.object({
  classroomSessionId: z.string().min(1),
  stepId: z.string().min(1),
  lessonId: z.string().min(1).optional(),
  publishedVersionId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  runtimeVersion: z.string().min(1).optional(),
});

export const RuntimeBootstrapRequestSchema = TeachingBridgeStepReferenceSchema.extend({
  resumeFromLatest: z.boolean().default(true),
});

export const RuntimeReadyRequestSchema = TeachingBridgeStepReferenceSchema.extend({
  readyState: z.enum(["booting", "ready"]).default("ready"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const RuntimeInteractionRequestSchema = TeachingBridgeStepReferenceSchema.extend({
  interactionType: z.string().min(1),
  semanticEvent: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const RuntimeSaveRequestSchema = TeachingBridgeStepReferenceSchema.extend({
  stateSchemaVersion: z.string().min(1),
  stateVersion: z.number().int().positive().optional(),
  state: z.record(z.string(), z.unknown()),
  summary: z.record(z.string(), z.unknown()).default({}),
});

export const RuntimeSubmitRequestSchema = RuntimeSaveRequestSchema.extend({
  submittedAt: z.string().min(1).optional(),
});

export const RuntimeTeacherControlRequestSchema = TeachingBridgeStepReferenceSchema.extend({
  command: z.enum(["lock", "unlock", "focus-step", "broadcast-preset", "reset-session"]),
  targetActorId: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

const TeachingBridgeRequestEnvelopeBaseSchema = TeachingBridgeEnvelopeBaseSchema.extend({
  correlationId: z.string().min(1).optional(),
});

export const RuntimeBootstrapRequestEnvelopeSchema = TeachingBridgeRequestEnvelopeBaseSchema.extend({
  kind: z.literal("runtime-bootstrap"),
  payload: RuntimeBootstrapRequestSchema,
});

export const RuntimeReadyRequestEnvelopeSchema = TeachingBridgeRequestEnvelopeBaseSchema.extend({
  kind: z.literal("runtime-ready"),
  payload: RuntimeReadyRequestSchema,
});

export const RuntimeInteractionRequestEnvelopeSchema = TeachingBridgeRequestEnvelopeBaseSchema.extend({
  kind: z.literal("runtime-interaction"),
  payload: RuntimeInteractionRequestSchema,
});

export const RuntimeSaveRequestEnvelopeSchema = TeachingBridgeRequestEnvelopeBaseSchema.extend({
  kind: z.literal("runtime-save"),
  payload: RuntimeSaveRequestSchema,
});

export const RuntimeSubmitRequestEnvelopeSchema = TeachingBridgeRequestEnvelopeBaseSchema.extend({
  kind: z.literal("runtime-submit"),
  payload: RuntimeSubmitRequestSchema,
});

export const RuntimeTeacherControlRequestEnvelopeSchema = TeachingBridgeRequestEnvelopeBaseSchema.extend({
  kind: z.literal("runtime-teacher-control"),
  payload: RuntimeTeacherControlRequestSchema,
});

export const TeachingBridgeRequestEnvelopeSchema = z.discriminatedUnion("kind", [
  RuntimeBootstrapRequestEnvelopeSchema,
  RuntimeReadyRequestEnvelopeSchema,
  RuntimeInteractionRequestEnvelopeSchema,
  RuntimeSaveRequestEnvelopeSchema,
  RuntimeSubmitRequestEnvelopeSchema,
  RuntimeTeacherControlRequestEnvelopeSchema,
]);

export const TeachingBridgeMessageEnvelopeSchema = TeachingBridgeRequestEnvelopeSchema;

export const TeachingBridgeResultStatusSchema = z.enum(["ok", "error", "denied", "unsupported"]);

export const RuntimeBootstrapResultSchema = z.object({
  requestKind: z.literal("runtime-bootstrap"),
  sessionId: z.string().min(1),
  runtimeVersion: z.string().min(1),
  grantedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  latestStateSummary: z.record(z.string(), z.unknown()).default({}),
});

export const RuntimeReadyResultSchema = z.object({
  requestKind: z.literal("runtime-ready"),
  sessionId: z.string().min(1),
  recordedEventId: z.string().min(1),
});

export const RuntimeInteractionResultSchema = z.object({
  requestKind: z.literal("runtime-interaction"),
  sessionId: z.string().min(1),
  recordedEventId: z.string().min(1),
});

export const RuntimeSaveResultSchema = z.object({
  requestKind: z.literal("runtime-save"),
  sessionId: z.string().min(1),
  classroomSessionId: z.string().min(1),
  lessonId: z.string().min(1),
  actorId: z.string().min(1),
  stateVersion: z.number().int().positive(),
  persistedAt: z.string().min(1),
});

export const RuntimeSubmitResultSchema = z.object({
  requestKind: z.literal("runtime-submit"),
  sessionId: z.string().min(1),
  runtimeSessionId: z.string().min(1),
  classroomSessionId: z.string().min(1),
  lessonId: z.string().min(1),
  actorId: z.string().min(1),
  stateVersion: z.number().int().positive(),
  bridgeTargets: z.array(z.string().min(1)).min(1),
  submittedAt: z.string().min(1),
  proofSummary: z.object({
    title: z.string().min(1),
    submittedStateLabel: z.string().min(1),
    bridgeTargets: z.array(z.string().min(1)).min(1),
    inspectorHref: z.string().min(1).optional(),
    summary: z.record(z.string(), z.unknown()).default({}),
  }),
  persistedAt: z.string().min(1),
});

export const RuntimeTeacherControlResultSchema = z.object({
  requestKind: z.literal("runtime-teacher-control"),
  sessionId: z.string().min(1),
  applied: z.boolean(),
  recordedEventId: z.string().min(1),
});

export const TeachingBridgeResultPayloadSchema = z.discriminatedUnion("requestKind", [
  RuntimeBootstrapResultSchema,
  RuntimeReadyResultSchema,
  RuntimeInteractionResultSchema,
  RuntimeSaveResultSchema,
  RuntimeSubmitResultSchema,
  RuntimeTeacherControlResultSchema,
]);

export const TeachingBridgeResultEnvelopeSchema = z.object({
  version: RuntimeContractVersionSchema,
  messageId: z.string().min(1),
  correlationId: z.string().min(1),
  runtimeInstanceId: z.string().min(1),
  kind: z.literal("host-action-result").default("host-action-result"),
  requestKind: TeachingBridgeRequestKindSchema,
  status: TeachingBridgeResultStatusSchema,
  result: TeachingBridgeResultPayloadSchema.optional(),
  error: z
    .object({
      code: z.string().min(1),
      message: z.string().min(1),
    })
    .optional(),
}).superRefine((value, ctx) => {
  if (value.status === "ok") {
    if (!value.result) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ok result envelope requires typed result payload",
        path: ["result"],
      });
      return;
    }

    if (value.result.requestKind !== value.requestKind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "result payload requestKind must match envelope requestKind",
        path: ["result", "requestKind"],
      });
    }

    return;
  }

  if (!value.error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "non-ok result envelope requires error payload",
      path: ["error"],
    });
  }
});

export type TeachingBridgeMessageKind = z.infer<typeof TeachingBridgeMessageKindSchema>;
export type TeachingBridgeRequestKind = z.infer<typeof TeachingBridgeRequestKindSchema>;
export type TeachingBridgeCapabilityContext = z.infer<typeof TeachingBridgeCapabilityContextSchema>;
export type TeachingBridgeMessageEnvelope = z.infer<typeof TeachingBridgeMessageEnvelopeSchema>;
export type RuntimeBootstrapRequest = z.infer<typeof RuntimeBootstrapRequestSchema>;
export type RuntimeReadyRequest = z.infer<typeof RuntimeReadyRequestSchema>;
export type RuntimeInteractionRequest = z.infer<typeof RuntimeInteractionRequestSchema>;
export type RuntimeSaveRequest = z.infer<typeof RuntimeSaveRequestSchema>;
export type RuntimeSubmitRequest = z.infer<typeof RuntimeSubmitRequestSchema>;
export type RuntimeTeacherControlRequest = z.infer<typeof RuntimeTeacherControlRequestSchema>;
export type TeachingBridgeRequestEnvelope = z.infer<typeof TeachingBridgeRequestEnvelopeSchema>;
export type TeachingBridgeResultStatus = z.infer<typeof TeachingBridgeResultStatusSchema>;
export type TeachingBridgeResultPayload = z.infer<typeof TeachingBridgeResultPayloadSchema>;
export type TeachingBridgeResultEnvelope = z.infer<typeof TeachingBridgeResultEnvelopeSchema>;
