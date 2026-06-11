import { z } from "zod";

import {
  GovernanceLifecycleInternalSubstateSchema,
  GovernanceLifecycleStateSchema,
  GovernanceLifecycleStateValues,
  PluginGovernanceReasonCodeSchema,
  PluginGovernanceReasonCodeValues,
  PluginRecoveryActionSchema,
  PluginRecoveryActionValues,
} from "@/features/platform-core/plugins/lifecycle-contracts";

export const RuntimeCapabilityValues = [
  "runtime:ready",
  "runtime:event:emit",
  "runtime:state:save",
  "runtime:submission:create",
  "runtime:host-action:request",
] as const;

export const HostActionPermissionValues = [
  "host:classroom:read",
  "host:classroom:control",
  "host:lesson:read",
  "host:submission:write",
  "host:plugin:lifecycle:read",
  "host:plugin:lifecycle:write",
] as const;

export const RuntimeActorScopeValues = ["host", "teacher", "student", "plugin", "operator", "system"] as const;
export const GovernanceDecisionValues = ["allowed", "denied"] as const;
export const GovernanceDeniedReasonValues = [
  "not_allowlisted",
  "capability_missing",
  "permission_denied",
  "lifecycle_blocked",
  "school_mismatch",
  "kill_switch",
  "unsupported_action",
  "domain_not_allowed",
  "method_not_allowed",
  "private_ip_blocked",
  "config_key_denied",
] as const;
export const PluginPermissionValues = [
  "lesson:write:suggestion",
  "lesson:write:annotation",
  "notification:create:stub",
  "schedule:write:proposal",
] as const;
export const PluginLifecycleStateValues = [
  "installed",
  "enabled",
  "mounted",
  "ready",
  "suspended",
  "disabled",
  "failed",
] as const;

export const RuntimeCapabilitySchema = z.enum(RuntimeCapabilityValues);
export const HostActionPermissionSchema = z.enum(HostActionPermissionValues);
export const RuntimeActorScopeSchema = z.enum(RuntimeActorScopeValues);
export const GovernanceDecisionSchema = z.enum(GovernanceDecisionValues);
export const GovernanceDeniedReasonSchema = z.enum(GovernanceDeniedReasonValues);
export const PluginPermissionSchema = z.enum(PluginPermissionValues);
export const PluginLifecycleStateSchema = z.enum(PluginLifecycleStateValues);

export const SchoolScopedActorConstraintSchema = z.object({
  schoolId: z.string().min(1),
  actorId: z.string().min(1),
  actorScope: RuntimeActorScopeSchema,
  capabilities: z.array(RuntimeCapabilitySchema).default([]),
  hostPermissions: z.array(HostActionPermissionSchema).default([]),
});

export const GovernanceCapabilitySummarySchema = z.object({
  requestedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  grantedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
  requiredPermission: z.union([HostActionPermissionSchema, PluginPermissionSchema]).nullable().default(null),
});

export const GovernanceLifecycleSnapshotSchema = z.object({
  state: GovernanceLifecycleStateSchema,
  blocked: z.boolean().default(false),
  killSwitchEnabled: z.boolean().default(false),
  internalSubstate: GovernanceLifecycleInternalSubstateSchema.nullable().default(null),
  reasonCode: PluginGovernanceReasonCodeSchema.nullable().default(null),
  recommendedRecoveryAction: PluginRecoveryActionSchema.nullable().default(null),
});

export const GovernanceDecisionEnvelopeSchema = z.object({
  decision: GovernanceDecisionSchema,
  reason: GovernanceDeniedReasonSchema.nullable().default(null),
  action: z.string().min(1),
  actor: SchoolScopedActorConstraintSchema,
  capabilitySummary: GovernanceCapabilitySummarySchema,
  lifecycle: GovernanceLifecycleSnapshotSchema,
  targetSchoolId: z.string().min(1),
});

export type RuntimeCapability = z.infer<typeof RuntimeCapabilitySchema>;
export type HostActionPermission = z.infer<typeof HostActionPermissionSchema>;
export type RuntimeActorScope = z.infer<typeof RuntimeActorScopeSchema>;
export type SchoolScopedActorConstraint = z.infer<typeof SchoolScopedActorConstraintSchema>;
export type GovernanceDecision = z.infer<typeof GovernanceDecisionSchema>;
export type GovernanceDeniedReason = z.infer<typeof GovernanceDeniedReasonSchema>;
export type PluginPermission = z.infer<typeof PluginPermissionSchema>;
export type PluginLifecycleState = z.infer<typeof PluginLifecycleStateSchema>;
export type GovernanceLifecycleState = z.infer<typeof GovernanceLifecycleStateSchema>;
export type PluginGovernanceReasonCode = z.infer<typeof PluginGovernanceReasonCodeSchema>;
export type PluginRecoveryAction = z.infer<typeof PluginRecoveryActionSchema>;
export type GovernanceCapabilitySummary = z.infer<typeof GovernanceCapabilitySummarySchema>;
export type GovernanceLifecycleSnapshot = z.infer<typeof GovernanceLifecycleSnapshotSchema>;
export type GovernanceDecisionEnvelope = z.infer<typeof GovernanceDecisionEnvelopeSchema>;

export {
  GovernanceLifecycleStateSchema as GovernanceLifecycleStateSchema,
  GovernanceLifecycleStateValues as GovernanceLifecycleStateValues,
  PluginGovernanceReasonCodeSchema as PluginGovernanceReasonCodeSchema,
  PluginGovernanceReasonCodeValues as PluginGovernanceReasonCodeValues,
  PluginRecoveryActionSchema as PluginRecoveryActionSchema,
  PluginRecoveryActionValues as PluginRecoveryActionValues,
};
