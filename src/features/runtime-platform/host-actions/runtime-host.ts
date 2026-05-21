import { z } from "zod";

import {
  publishTransportEvent,
  sqliteRuntimeDatabaseAdapter,
  sseRuntimeTransportAdapter,
} from "../seams";
import { RUNTIME_CONTRACT_VERSION } from "../contracts/version";
import {
  RuntimeInteractionRequestSchema,
  RuntimeReadyRequestSchema,
  RuntimeTeacherControlRequestSchema,
} from "../contracts/bridge";
import {
  createRuntimeGovernanceAudit,
  appendRuntimeEvent,
  getRuntimeBootstrapDTO,
  recordTeacherControlEvent,
  saveRuntimeState,
  submitRuntimeState,
} from "../classroom/runtime-session";
import {
  createAllowedGovernanceDecision,
  createDeniedGovernanceDecision,
  createGuardedHostAction,
  hasRequiredCapability,
  isLifecycleBlocked,
  resolveRuntimeHostActor,
  resolveTeacherHostActor,
} from "./guards";
import type { HostActionPermission, RuntimeCapability } from "../contracts/permissions";

function mapRuntimeLifecycleState(kind: "ready" | "mounted") {
  return kind === "ready" ? "active" : "enabled" as const;
}

const RuntimeHostRequestSchema = z.object({
  messageId: z.string().min(1),
  correlationId: z.string().min(1).optional(),
  runtimeInstanceId: z.string().min(1),
  action: z.enum([
    "runtime-bootstrap",
    "runtime-ready",
    "runtime-interaction",
    "runtime-save",
    "runtime-submit",
    "runtime-teacher-control",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

const runtimeActionCapabilityMap: Record<z.infer<typeof RuntimeHostRequestSchema>["action"], RuntimeCapability> = {
  "runtime-bootstrap": "runtime:host-action:request",
  "runtime-ready": "runtime:ready",
  "runtime-interaction": "runtime:event:emit",
  "runtime-save": "runtime:state:save",
  "runtime-submit": "runtime:submission:create",
  "runtime-teacher-control": "runtime:host-action:request",
};

async function resolveRuntimeGovernance({
  actor,
  input,
  requiredPermission,
}: {
  actor: Awaited<ReturnType<typeof resolveRuntimeHostActor>>;
  input: z.infer<typeof RuntimeHostRequestSchema>;
  requiredPermission?: HostActionPermission;
}) {
  const bootstrap = await getRuntimeBootstrapDTO({
    actor,
    payload: input.payload,
  });
  const requestedCapabilities = bootstrap.stepSummary.runtime.requestedCapabilities;
  const requiredCapability = runtimeActionCapabilityMap[input.action];
  const internalLifecycleState = bootstrap.latestStateSummary?.kind === "ready" ? "ready" : "mounted";
  const lifecycleState = mapRuntimeLifecycleState(internalLifecycleState);

  if (requiredCapability && !hasRequiredCapability(actor, requiredCapability)) {
    await createRuntimeGovernanceAudit({
      targetId: bootstrap.stepSummary.runtime.runtimeId,
      runtimeSessionId: bootstrap.sessionId,
      classroomSessionId: bootstrap.classroomSummary.classroomSessionId,
      schoolId: actor.schoolId,
      action: input.action,
      decision: "denied",
      reasonCode: "capability_missing",
      actorId: actor.actorId,
      actorScope: actor.actorScope,
      lifecycleState: internalLifecycleState,
      requestedCapabilities,
      grantedCapabilities: actor.capabilities,
      requiredPermission: requiredPermission ?? null,
      correlationId: input.correlationId ?? input.messageId,
      payloadJson: input.payload,
    });

    return createDeniedGovernanceDecision({
      action: input.action,
      actor,
      targetSchoolId: actor.schoolId,
      reason: "capability_missing",
      requestedCapabilities,
      grantedCapabilities: actor.capabilities,
      requiredPermission: requiredPermission ?? null,
      lifecycle: { state: lifecycleState, internalSubstate: internalLifecycleState },
    });
  }

  if (isLifecycleBlocked(internalLifecycleState)) {
    await createRuntimeGovernanceAudit({
      targetId: bootstrap.stepSummary.runtime.runtimeId,
      runtimeSessionId: bootstrap.sessionId,
      classroomSessionId: bootstrap.classroomSummary.classroomSessionId,
      schoolId: actor.schoolId,
      action: input.action,
      decision: "denied",
      reasonCode: "lifecycle_blocked",
      actorId: actor.actorId,
      actorScope: actor.actorScope,
      lifecycleState: internalLifecycleState,
      requestedCapabilities,
      grantedCapabilities: actor.capabilities,
      requiredPermission: requiredPermission ?? null,
      correlationId: input.correlationId ?? input.messageId,
      payloadJson: input.payload,
    });

    return createDeniedGovernanceDecision({
      action: input.action,
      actor,
      targetSchoolId: actor.schoolId,
      reason: "lifecycle_blocked",
      requestedCapabilities,
      grantedCapabilities: actor.capabilities,
      requiredPermission: requiredPermission ?? null,
      lifecycle: { state: lifecycleState, blocked: true, internalSubstate: internalLifecycleState },
    });
  }

  return createAllowedGovernanceDecision({
    action: input.action,
    actor,
    targetSchoolId: actor.schoolId,
    requestedCapabilities,
    grantedCapabilities: actor.capabilities,
    requiredPermission: requiredPermission ?? null,
    lifecycle: { state: lifecycleState, internalSubstate: internalLifecycleState },
  });
}

async function executeRuntimeHostAction({
  actor,
  input,
}: {
  actor: Awaited<ReturnType<typeof resolveRuntimeHostActor>>;
  input: z.infer<typeof RuntimeHostRequestSchema>;
}) {
  const ownership = sqliteRuntimeDatabaseAdapter.describeOwnership();
  const transport = sseRuntimeTransportAdapter.describeOwnership();
  const correlationId = input.correlationId ?? input.messageId;

  const buildResultEnvelope = async (requestKind: typeof input.action, result: Record<string, unknown>) => {
    const envelope = {
      version: RUNTIME_CONTRACT_VERSION,
      messageId: crypto.randomUUID(),
      correlationId,
      runtimeInstanceId: input.runtimeInstanceId,
      kind: "host-action-result" as const,
      requestKind,
      status: "ok" as const,
      result,
    };

    if ("sessionId" in result && typeof result.sessionId === "string") {
      await publishTransportEvent({
        sessionId: result.sessionId,
        channel: "classroom-runtime",
        kind: `runtime.host-result.${requestKind}`,
        correlationId,
        truthPersisted: true,
        truthRef: {
          type: "runtime-session",
          id: result.sessionId,
          runtimeSessionId: result.sessionId,
          classroomSessionId:
            "classroomSessionId" in result && typeof result.classroomSessionId === "string"
              ? result.classroomSessionId
              : undefined,
          schoolId: actor.schoolId,
        },
        payload: envelope,
      });
    }

    return envelope;
  };

  switch (input.action) {
    case "runtime-bootstrap": {
      const bootstrap = await getRuntimeBootstrapDTO({
        actor,
        payload: input.payload,
      });
      return {
        ok: true,
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        ownership,
        transport,
        envelope: await buildResultEnvelope("runtime-bootstrap", {
          requestKind: "runtime-bootstrap",
          sessionId: bootstrap.sessionId,
          classroomSessionId: bootstrap.classroomSummary.classroomSessionId,
          runtimeVersion: bootstrap.runtimeVersion,
          grantedCapabilities: bootstrap.capabilityContext.grantedCapabilities,
          latestStateSummary: bootstrap.latestStateSummary?.summary ?? {},
        }),
        bootstrap,
      } as const;
    }
    case "runtime-ready": {
      const payload = RuntimeReadyRequestSchema.parse(input.payload);
      const result = await appendRuntimeEvent({
        actor,
        requestKind: "runtime-ready",
        payload,
        messageId: input.messageId,
        correlationId,
        runtimeInstanceId: input.runtimeInstanceId,
      });
      return {
        ok: true,
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        ownership,
        transport,
        envelope: await buildResultEnvelope("runtime-ready", {
          requestKind: "runtime-ready",
          sessionId: result.sessionId,
          recordedEventId: result.recordedEventId,
        }),
      } as const;
    }
    case "runtime-interaction": {
      const payload = RuntimeInteractionRequestSchema.parse(input.payload);
      const result = await appendRuntimeEvent({
        actor,
        requestKind: "runtime-interaction",
        payload,
        messageId: input.messageId,
        correlationId,
        runtimeInstanceId: input.runtimeInstanceId,
      });
      return {
        ok: true,
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        ownership,
        transport,
        envelope: await buildResultEnvelope("runtime-interaction", {
          requestKind: "runtime-interaction",
          sessionId: result.sessionId,
          recordedEventId: result.recordedEventId,
        }),
      } as const;
    }
    case "runtime-save": {
      const result = await saveRuntimeState({
        actor,
        payload: input.payload as never,
        messageId: input.messageId,
        correlationId,
        runtimeInstanceId: input.runtimeInstanceId,
      });
      return {
        ok: true,
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        ownership,
        transport,
        envelope: await buildResultEnvelope("runtime-save", {
          requestKind: "runtime-save",
          ...result,
        }),
      } as const;
    }
    case "runtime-submit": {
      const result = await submitRuntimeState({
        actor,
        payload: input.payload as never,
        messageId: input.messageId,
        correlationId,
        runtimeInstanceId: input.runtimeInstanceId,
      });
      return {
        ok: true,
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        ownership,
        transport,
        envelope: await buildResultEnvelope("runtime-submit", {
          requestKind: "runtime-submit",
          ...result,
        }),
      } as const;
    }
    case "runtime-teacher-control": {
      const payload = RuntimeTeacherControlRequestSchema.parse(input.payload);
      const result = await recordTeacherControlEvent({
        actor,
        payload,
        messageId: input.messageId,
        correlationId,
        runtimeInstanceId: input.runtimeInstanceId,
      });
      return {
        ok: true,
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        ownership,
        transport,
        envelope: await buildResultEnvelope("runtime-teacher-control", {
          requestKind: "runtime-teacher-control",
          ...result,
        }),
      } as const;
    }
    default: {
      input.action satisfies never;
      throw new Error("HOST_ACTION_UNSUPPORTED");
    }
  }
}

const invokeRuntimeParticipantHostAction = createGuardedHostAction({
  inputSchema: RuntimeHostRequestSchema,
  actorScopes: ["host", "teacher", "system", "student"],
  resolveActor: () => resolveRuntimeHostActor(),
  resolveGovernance: resolveRuntimeGovernance,
  execute: executeRuntimeHostAction,
});

const invokeRuntimeTeacherHostAction = createGuardedHostAction({
  inputSchema: RuntimeHostRequestSchema,
  actorScopes: ["host", "teacher", "system"],
  requiredPermission: "host:classroom:control",
  resolveActor: () => resolveTeacherHostActor(["host:classroom:control"]),
  resolveGovernance: resolveRuntimeGovernance,
  execute: executeRuntimeHostAction,
});

export async function invokeRuntimeHostAction(input: z.input<typeof RuntimeHostRequestSchema>) {
  const parsed = RuntimeHostRequestSchema.parse(input);

  if (parsed.action === "runtime-teacher-control") {
    return invokeRuntimeTeacherHostAction(parsed);
  }

  return invokeRuntimeParticipantHostAction(parsed);
}

export type RuntimeHostRequest = z.infer<typeof RuntimeHostRequestSchema>;
