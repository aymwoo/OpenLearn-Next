import { z } from "zod";

export const ClassroomTransportModeSchema = z.enum([
  "local_only",
  "redis_fanout",
]);

export const SystemTransportDeployStatusSchema = z.enum([
  "deploy_disallowed",
  "product_disabled",
  "redis_enabled",
  "redis_degraded",
]);

export const SystemTransportConnectionStateSchema = z.enum([
  "disabled",
  "idle",
  "connecting",
  "ready",
  "degraded",
]);

export const SystemTransportHealthDTOSchema = z.object({
  deployAllowsRedis: z.boolean(),
  redisConfigured: z.boolean(),
  redisReachable: z.boolean(),
  connectionState: SystemTransportConnectionStateSchema,
  desiredTopicCount: z.number().int().nonnegative(),
  subscribedTopicCount: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  lastHealthyAt: z.string().nullable(),
  instanceId: z.string().min(1),
});

export const SystemTransportSettingsDTOSchema = z.object({
  classroomTransportMode: ClassroomTransportModeSchema,
  effectiveMode: ClassroomTransportModeSchema,
  deployStatus: SystemTransportDeployStatusSchema,
  canManage: z.boolean(),
  deployAllowsRedis: z.boolean(),
  redisConfigured: z.boolean(),
  redisReachable: z.boolean(),
  degraded: z.boolean(),
  degradedReason: z.string().nullable(),
  updatedById: z.string().nullable(),
  updatedAt: z.string().nullable(),
  health: SystemTransportHealthDTOSchema,
});

export const UpdateSystemTransportSettingsInputSchema = z.object({
  classroomTransportMode: ClassroomTransportModeSchema,
});

export type ClassroomTransportMode = z.infer<typeof ClassroomTransportModeSchema>;
export type SystemTransportDeployStatus = z.infer<
  typeof SystemTransportDeployStatusSchema
>;
export type SystemTransportConnectionState = z.infer<
  typeof SystemTransportConnectionStateSchema
>;
export type SystemTransportHealthDTO = z.infer<
  typeof SystemTransportHealthDTOSchema
>;
export type SystemTransportSettingsDTO = z.infer<
  typeof SystemTransportSettingsDTOSchema
>;
export type UpdateSystemTransportSettingsInput = z.infer<
  typeof UpdateSystemTransportSettingsInputSchema
>;
