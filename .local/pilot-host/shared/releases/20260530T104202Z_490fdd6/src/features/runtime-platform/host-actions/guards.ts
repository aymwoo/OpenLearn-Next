import "server-only";

import { z } from "zod";

import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

import {
  GovernanceDecisionEnvelopeSchema,
  type GovernanceDecisionEnvelope,
  type GovernanceDeniedReason,
  type GovernanceLifecycleSnapshot,
  type PluginLifecycleState,
  type RuntimeCapability,
  RuntimeCapabilityValues,
  SchoolScopedActorConstraintSchema,
  type HostActionPermission,
  type RuntimeActorScope,
  type SchoolScopedActorConstraint,
} from "../contracts/permissions";

export const GuardedHostActionContextSchema = z.object({
  actor: SchoolScopedActorConstraintSchema,
});

export const GuardedHostActionEnvelopeSchema = <TInput extends z.ZodTypeAny>(inputSchema: TInput) =>
  z.object({
    input: inputSchema,
  });

type GuardWrapperOptions<TInput extends z.ZodTypeAny, TOutput> = {
  inputSchema: TInput;
  actorScopes: readonly RuntimeActorScope[];
  requiredPermission?: HostActionPermission;
  resolveActor: () => Promise<SchoolScopedActorConstraint>;
  resolveGovernance?: (context: {
    actor: SchoolScopedActorConstraint;
    input: z.infer<TInput>;
    requiredPermission?: HostActionPermission;
  }) => Promise<GovernanceDecisionEnvelope>;
  execute: (context: { actor: SchoolScopedActorConstraint; input: z.infer<TInput> }) => Promise<TOutput>;
};

export function createAllowedGovernanceDecision(input: {
  action: string;
  actor: SchoolScopedActorConstraint;
  targetSchoolId: string;
  requestedCapabilities?: readonly RuntimeCapability[];
  grantedCapabilities?: readonly RuntimeCapability[];
  requiredPermission?: string | null;
  lifecycle?: Partial<GovernanceLifecycleSnapshot>;
}) {
  return GovernanceDecisionEnvelopeSchema.parse({
    decision: "allowed",
    reason: null,
    action: input.action,
    actor: input.actor,
    capabilitySummary: {
      requestedCapabilities: [...(input.requestedCapabilities ?? [])],
      grantedCapabilities: [...(input.grantedCapabilities ?? input.actor.capabilities)],
      requiredPermission: input.requiredPermission ?? null,
    },
    lifecycle: {
      state: (input.lifecycle?.state ?? "enabled") as PluginLifecycleState,
      blocked: input.lifecycle?.blocked ?? false,
      killSwitchEnabled: input.lifecycle?.killSwitchEnabled ?? false,
    },
    targetSchoolId: input.targetSchoolId,
  });
}

export function createDeniedGovernanceDecision(input: {
  action: string;
  actor: SchoolScopedActorConstraint;
  targetSchoolId: string;
  reason: GovernanceDeniedReason;
  requestedCapabilities?: readonly RuntimeCapability[];
  grantedCapabilities?: readonly RuntimeCapability[];
  requiredPermission?: string | null;
  lifecycle?: Partial<GovernanceLifecycleSnapshot>;
}) {
  return GovernanceDecisionEnvelopeSchema.parse({
    decision: "denied",
    reason: input.reason,
    action: input.action,
    actor: input.actor,
    capabilitySummary: {
      requestedCapabilities: [...(input.requestedCapabilities ?? [])],
      grantedCapabilities: [...(input.grantedCapabilities ?? input.actor.capabilities)],
      requiredPermission: input.requiredPermission ?? null,
    },
    lifecycle: {
      state: (input.lifecycle?.state ?? "enabled") as PluginLifecycleState,
      blocked: input.lifecycle?.blocked ?? true,
      killSwitchEnabled: input.lifecycle?.killSwitchEnabled ?? false,
    },
    targetSchoolId: input.targetSchoolId,
  });
}

export function hasRequiredCapability(actor: SchoolScopedActorConstraint, capability: RuntimeCapability) {
  return actor.capabilities.includes(capability);
}

export function isLifecycleBlocked(state: PluginLifecycleState) {
  return state === "suspended" || state === "disabled" || state === "failed";
}

function assertGovernanceAllowed(decision: GovernanceDecisionEnvelope) {
  if (decision.decision === "denied") {
    throw new Error(`HOST_ACTION_DENIED:${decision.reason}`);
  }
}

export async function resolveTeacherHostActor(
  grantedPermissions: readonly HostActionPermission[],
): Promise<SchoolScopedActorConstraint> {
  const user = await getCurrentUserDTO();

  if (!user) {
    throw new Error("HOST_ACTION_AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const teacherMembership = memberships.find((membership) => membership.role === "teacher" && membership.status === "active");

  if (!teacherMembership) {
    throw new Error("HOST_ACTION_AUTH_REQUIRED");
  }

  return SchoolScopedActorConstraintSchema.parse({
    actorId: user.id,
    schoolId: teacherMembership.schoolId,
    actorScope: "teacher",
    capabilities: [RuntimeCapabilityValues[0], RuntimeCapabilityValues[4]],
    hostPermissions: [...new Set(grantedPermissions)],
  });
}

export async function resolveStudentHostActor(
  grantedPermissions: readonly HostActionPermission[] = [],
): Promise<SchoolScopedActorConstraint> {
  const user = await getCurrentUserDTO();

  if (!user) {
    throw new Error("HOST_ACTION_AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const studentMembership = memberships.find((membership) => membership.role === "student" && membership.status === "active");

  if (!studentMembership) {
    throw new Error("HOST_ACTION_AUTH_REQUIRED");
  }

  return SchoolScopedActorConstraintSchema.parse({
    actorId: user.id,
    schoolId: studentMembership.schoolId,
    actorScope: "student",
    capabilities: [
      RuntimeCapabilityValues[0],
      RuntimeCapabilityValues[1],
      RuntimeCapabilityValues[2],
      RuntimeCapabilityValues[3],
      RuntimeCapabilityValues[4],
    ],
    hostPermissions: [...new Set(grantedPermissions)],
  });
}

export async function resolveRuntimeHostActor(
  grantedPermissions: readonly HostActionPermission[] = [],
): Promise<SchoolScopedActorConstraint> {
  try {
    return await resolveTeacherHostActor(grantedPermissions);
  } catch {
    return resolveStudentHostActor(grantedPermissions);
  }
}

function assertActorScope(actor: SchoolScopedActorConstraint, allowedScopes: readonly RuntimeActorScope[]) {
  if (!allowedScopes.includes(actor.actorScope)) {
    throw new Error("HOST_ACTION_UNAUTHORIZED_ACTOR_SCOPE");
  }
}

function assertSchoolScope(actor: SchoolScopedActorConstraint) {
  if (!actor.schoolId.trim()) {
    throw new Error("HOST_ACTION_SCHOOL_SCOPE_REQUIRED");
  }
}

function assertPermission(actor: SchoolScopedActorConstraint, requiredPermission?: HostActionPermission) {
  if (!requiredPermission) {
    return;
  }

  if (!actor.hostPermissions.includes(requiredPermission)) {
    throw new Error("HOST_ACTION_PERMISSION_REQUIRED");
  }
}

export function createGuardedHostAction<TInput extends z.ZodTypeAny, TOutput>({
  inputSchema,
  actorScopes,
  requiredPermission,
  resolveActor,
  resolveGovernance,
  execute,
}: GuardWrapperOptions<TInput, TOutput>) {
  return async (input: z.input<TInput>) => {
    const parsedTrustedContext = GuardedHostActionContextSchema.parse({ actor: await resolveActor() });
    const parsedInput = inputSchema.parse(input);
    const parsedActor = parsedTrustedContext.actor;

    assertActorScope(parsedActor, actorScopes);
    assertSchoolScope(parsedActor);
    assertPermission(parsedActor, requiredPermission);

    if (resolveGovernance) {
      const decision = await resolveGovernance({
        actor: parsedActor,
        input: parsedInput,
        requiredPermission,
      });
      assertGovernanceAllowed(decision);
    }

    return execute({
      actor: parsedActor,
      input: parsedInput,
    });
  };
}

export const hostActionGuardUtils = {
  assertActorScope,
  assertSchoolScope,
  createAllowedGovernanceDecision,
  createDeniedGovernanceDecision,
  hasRequiredCapability,
  isLifecycleBlocked,
};

export type GuardedHostActionContext = z.infer<typeof GuardedHostActionContextSchema>;
