import { z } from "zod";

import { RuntimeCapabilitySchema, RuntimeActorScopeSchema } from "./permissions";
import { RuntimeContractVersionSchema } from "./version";

export const TeachingBridgeMessageKindSchema = z.enum([
  "runtime-ready",
  "runtime-event",
  "runtime-save",
  "runtime-submit",
  "host-action-request",
  "host-action-result",
]);

export const TeachingBridgeCapabilityContextSchema = z.object({
  actorId: z.string().min(1),
  actorScope: RuntimeActorScopeSchema,
  grantedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  sessionId: z.string().min(1).optional(),
  schoolId: z.string().min(1).optional(),
});

export const TeachingBridgeMessageEnvelopeSchema = z.object({
  version: RuntimeContractVersionSchema,
  messageId: z.string().min(1),
  runtimeInstanceId: z.string().min(1),
  kind: TeachingBridgeMessageKindSchema,
  sentAt: z.string().min(1),
  capabilityContext: TeachingBridgeCapabilityContextSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const TeachingBridgeRequestEnvelopeSchema = TeachingBridgeMessageEnvelopeSchema.extend({
  correlationId: z.string().min(1).optional(),
});

export const TeachingBridgeResultStatusSchema = z.enum(["ok", "error", "denied", "unsupported"]);

export const TeachingBridgeResultEnvelopeSchema = z.object({
  version: RuntimeContractVersionSchema,
  messageId: z.string().min(1),
  correlationId: z.string().min(1),
  runtimeInstanceId: z.string().min(1),
  status: TeachingBridgeResultStatusSchema,
  result: z.record(z.string(), z.unknown()).default({}),
  error: z
    .object({
      code: z.string().min(1),
      message: z.string().min(1),
    })
    .optional(),
});

export type TeachingBridgeMessageKind = z.infer<typeof TeachingBridgeMessageKindSchema>;
export type TeachingBridgeCapabilityContext = z.infer<typeof TeachingBridgeCapabilityContextSchema>;
export type TeachingBridgeMessageEnvelope = z.infer<typeof TeachingBridgeMessageEnvelopeSchema>;
export type TeachingBridgeRequestEnvelope = z.infer<typeof TeachingBridgeRequestEnvelopeSchema>;
export type TeachingBridgeResultStatus = z.infer<typeof TeachingBridgeResultStatusSchema>;
export type TeachingBridgeResultEnvelope = z.infer<typeof TeachingBridgeResultEnvelopeSchema>;
