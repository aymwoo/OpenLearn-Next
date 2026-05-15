import { z } from "zod";

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
] as const;

export const RuntimeActorScopeValues = ["host", "teacher", "student", "plugin", "system"] as const;

export const RuntimeCapabilitySchema = z.enum(RuntimeCapabilityValues);
export const HostActionPermissionSchema = z.enum(HostActionPermissionValues);
export const RuntimeActorScopeSchema = z.enum(RuntimeActorScopeValues);

export const SchoolScopedActorConstraintSchema = z.object({
  schoolId: z.string().min(1),
  actorId: z.string().min(1),
  actorScope: RuntimeActorScopeSchema,
  capabilities: z.array(RuntimeCapabilitySchema).default([]),
  hostPermissions: z.array(HostActionPermissionSchema).default([]),
});

export type RuntimeCapability = z.infer<typeof RuntimeCapabilitySchema>;
export type HostActionPermission = z.infer<typeof HostActionPermissionSchema>;
export type RuntimeActorScope = z.infer<typeof RuntimeActorScopeSchema>;
export type SchoolScopedActorConstraint = z.infer<typeof SchoolScopedActorConstraintSchema>;
