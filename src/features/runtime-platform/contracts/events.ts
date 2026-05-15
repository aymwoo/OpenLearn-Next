import { z } from "zod";

import { RuntimeActorScopeSchema } from "./permissions";
import { RuntimeContractVersionSchema } from "./version";

export const RuntimeEventTypeSchema = z.enum([
  "runtime.ready",
  "runtime.interaction",
  "runtime.state.saved",
  "runtime.submission.created",
  "runtime.host-action.requested",
  "runtime.host-action.completed",
]);

export const RuntimeEventActorSchema = z.object({
  actorId: z.string().min(1),
  actorScope: RuntimeActorScopeSchema,
});

export const RuntimeEventDeliveryMetadataSchema = z.object({
  channel: z.enum(["in-process", "sse", "event-bus", "websocket"]),
  deliveryKey: z.string().min(1),
  sequence: z.number().int().nonnegative().optional(),
  idempotencyKey: z.string().min(1).optional(),
});

export const RuntimeEventEnvelopeSchema = z.object({
  version: RuntimeContractVersionSchema,
  eventId: z.string().min(1),
  runtimeInstanceId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  type: RuntimeEventTypeSchema,
  actor: RuntimeEventActorSchema,
  occurredAt: z.string().min(1),
  delivery: RuntimeEventDeliveryMetadataSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type RuntimeEventType = z.infer<typeof RuntimeEventTypeSchema>;
export type RuntimeEventActor = z.infer<typeof RuntimeEventActorSchema>;
export type RuntimeEventDeliveryMetadata = z.infer<typeof RuntimeEventDeliveryMetadataSchema>;
export type RuntimeEventEnvelope = z.infer<typeof RuntimeEventEnvelopeSchema>;
