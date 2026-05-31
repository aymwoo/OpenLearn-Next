import { z } from "zod";

import {
  TeachingBridgeCapabilityContextSchema,
  TeachingBridgeRequestEnvelopeSchema,
  TeachingBridgeResultEnvelopeSchema,
  type TeachingBridgeCapabilityContext,
  type TeachingBridgeRequestEnvelope,
  type TeachingBridgeRequestKind,
} from "@/features/runtime-platform/contracts/bridge";
import { RuntimeBootstrapDTOSchema, type RuntimeBootstrapDTO } from "@/features/runtime-platform/classroom/runtime-session-contracts";
import { RUNTIME_CONTRACT_VERSION } from "@/features/runtime-platform/contracts/version";

export const RUNTIME_HOST_BRIDGE_CHANNEL = "openlearn-runtime-host-v1";

export const RuntimeHostSurfaceSchema = z.enum([
  "teacher-preview",
  "student-player",
  "classroom-stage",
]);

export const RuntimeHostFrameReadyMessageSchema = z.object({
  channel: z.literal(RUNTIME_HOST_BRIDGE_CHANNEL),
  kind: z.literal("runtime-frame-ready"),
  runtimeInstanceId: z.string().min(1),
  sentAt: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const RuntimeHostHeightChangeMessageSchema = z.object({
  channel: z.literal(RUNTIME_HOST_BRIDGE_CHANNEL),
  kind: z.literal("runtime-height-change"),
  runtimeInstanceId: z.string().min(1),
  sentAt: z.string().min(1),
  height: z.number().positive(),
});

export const RuntimeHostSnapshotUpdateMessageSchema = z.object({
  channel: z.literal(RUNTIME_HOST_BRIDGE_CHANNEL),
  kind: z.literal("runtime-snapshot-update"),
  runtimeInstanceId: z.string().min(1),
  sentAt: z.string().min(1),
  snapshot: z.record(z.string(), z.unknown()).default({}),
});

export const RuntimeHostBootstrapMessageSchema = z.object({
  channel: z.literal(RUNTIME_HOST_BRIDGE_CHANNEL),
  kind: z.literal("runtime-bootstrap"),
  runtimeInstanceId: z.string().min(1),
  sentAt: z.string().min(1),
  surface: RuntimeHostSurfaceSchema,
  bootstrap: RuntimeBootstrapDTOSchema.nullable(),
  preview: z
    .object({
      title: z.string().min(1),
      note: z.string().min(1).optional(),
    })
    .nullable()
    .default(null),
});

export const RuntimeHostInboundMessageSchema = z.union([
  RuntimeHostFrameReadyMessageSchema,
  RuntimeHostHeightChangeMessageSchema,
  z.object({
    channel: z.literal(RUNTIME_HOST_BRIDGE_CHANNEL),
  }).and(TeachingBridgeRequestEnvelopeSchema),
]);

export const RuntimeHostOutboundMessageSchema = z.union([
  RuntimeHostBootstrapMessageSchema,
  RuntimeHostSnapshotUpdateMessageSchema,
  z.object({
    channel: z.literal(RUNTIME_HOST_BRIDGE_CHANNEL),
  }).and(TeachingBridgeResultEnvelopeSchema),
]);

export type RuntimeHostSurface = z.infer<typeof RuntimeHostSurfaceSchema>;
export type RuntimeHostInboundMessage = z.infer<typeof RuntimeHostInboundMessageSchema>;
export type RuntimeHostOutboundMessage = z.infer<typeof RuntimeHostOutboundMessageSchema>;
export type RuntimeHostFrameReadyMessage = z.infer<typeof RuntimeHostFrameReadyMessageSchema>;
export type RuntimeHostHeightChangeMessage = z.infer<typeof RuntimeHostHeightChangeMessageSchema>;
export type RuntimeHostBootstrapMessage = z.infer<typeof RuntimeHostBootstrapMessageSchema>;
export type RuntimeHostSnapshotUpdateMessage = z.infer<typeof RuntimeHostSnapshotUpdateMessageSchema>;

export function createRuntimeBridgeMessageId() {
  return crypto.randomUUID();
}

export function createRuntimeCapabilityContext(input: {
  actorId: string;
  actorScope: TeachingBridgeCapabilityContext["actorScope"];
  grantedCapabilities?: TeachingBridgeCapabilityContext["grantedCapabilities"];
  schoolId?: string;
  sessionId?: string;
}) {
  return TeachingBridgeCapabilityContextSchema.parse({
    actorId: input.actorId,
    actorScope: input.actorScope,
    grantedCapabilities: input.grantedCapabilities ?? [],
    schoolId: input.schoolId,
    sessionId: input.sessionId,
  });
}

export function createRuntimeRequestEnvelope<K extends TeachingBridgeRequestKind>(input: {
  kind: K;
  runtimeInstanceId: string;
  capabilityContext: TeachingBridgeCapabilityContext;
  payload: Extract<TeachingBridgeRequestEnvelope, { kind: K }>["payload"];
  correlationId?: string;
}) {
  return TeachingBridgeRequestEnvelopeSchema.parse({
    channel: RUNTIME_HOST_BRIDGE_CHANNEL,
    version: RUNTIME_CONTRACT_VERSION,
    messageId: createRuntimeBridgeMessageId(),
    correlationId: input.correlationId,
    runtimeInstanceId: input.runtimeInstanceId,
    kind: input.kind,
    sentAt: new Date().toISOString(),
    capabilityContext: input.capabilityContext,
    payload: input.payload,
  });
}

export function postRuntimeBridgeMessage(
  target: Window,
  message: RuntimeHostInboundMessage | RuntimeHostOutboundMessage,
  targetOrigin = "*",
) {
  target.postMessage(message, targetOrigin);
}

export function parseRuntimeBridgeMessage(input: unknown) {
  const inbound = RuntimeHostInboundMessageSchema.safeParse(input);
  if (inbound.success) {
    return inbound.data;
  }

  const outbound = RuntimeHostOutboundMessageSchema.safeParse(input);
  if (outbound.success) {
    return outbound.data;
  }

  return null;
}

export function isRuntimeBridgeMessageForInstance(input: unknown, runtimeInstanceId: string) {
  const message = parseRuntimeBridgeMessage(input);
  return message?.runtimeInstanceId === runtimeInstanceId ? message : null;
}

export function createRuntimeBootstrapMessage(input: {
  runtimeInstanceId: string;
  surface: RuntimeHostSurface;
  bootstrap: RuntimeBootstrapDTO | null;
  preview?: { title: string; note?: string | undefined } | null;
}) {
  return RuntimeHostBootstrapMessageSchema.parse({
    channel: RUNTIME_HOST_BRIDGE_CHANNEL,
    kind: "runtime-bootstrap",
    runtimeInstanceId: input.runtimeInstanceId,
    sentAt: new Date().toISOString(),
    surface: input.surface,
    bootstrap: input.bootstrap,
    preview: input.preview ?? null,
  });
}

export function createRuntimeSnapshotUpdateMessage(input: {
  runtimeInstanceId: string;
  snapshot: Record<string, unknown>;
}) {
  return RuntimeHostSnapshotUpdateMessageSchema.parse({
    channel: RUNTIME_HOST_BRIDGE_CHANNEL,
    kind: "runtime-snapshot-update",
    runtimeInstanceId: input.runtimeInstanceId,
    sentAt: new Date().toISOString(),
    snapshot: input.snapshot,
  });
}
