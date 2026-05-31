import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { systemTransportSettings } from "@/db/schema";
import { classroomRedisFanoutManager } from "@/features/runtime-platform/seams/transport/redis-fanout-manager";
import { probeRedisFanoutHealth } from "@/features/runtime-platform/seams/transport/redis-fanout-connection";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import {
  SystemTransportSettingsDTOSchema,
  UpdateSystemTransportSettingsInputSchema,
  type ClassroomTransportMode,
  type SystemTransportDeployStatus,
  type SystemTransportSettingsDTO,
  type UpdateSystemTransportSettingsInput,
} from "@/lib/dto/system-transport-settings";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function getCurrentSystemTransportActor() {
  const user = await getCurrentUserDTO();
  if (!user?.id) {
    throw new Error("AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const activeRoles = memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.role);

  return {
    userId: user.id,
    canManage:
      activeRoles.includes("developer") || activeRoles.includes("super_admin"),
  };
}

async function getStoredSystemTransportSettings() {
  return db.query.systemTransportSettings.findFirst({
    where: eq(systemTransportSettings.id, "default"),
  });
}

function resolveDeployStatus(input: {
  deployAllowsRedis: boolean;
  classroomTransportMode: ClassroomTransportMode;
  redisReachable: boolean;
  degraded: boolean;
}): SystemTransportDeployStatus {
  if (!input.deployAllowsRedis) {
    return "deploy_disallowed";
  }

  if (input.classroomTransportMode === "local_only") {
    return "product_disabled";
  }

  if (!input.redisReachable || input.degraded) {
    return "redis_degraded";
  }

  return "redis_enabled";
}

export async function getSystemTransportSettings(): Promise<SystemTransportSettingsDTO> {
  const [actor, stored] = await Promise.all([
    getCurrentSystemTransportActor(),
    getStoredSystemTransportSettings(),
  ]);
  await probeRedisFanoutHealth();
  const fanoutHealth = classroomRedisFanoutManager.getSnapshot();

  const classroomTransportMode =
    stored?.classroomTransportMode ?? ("local_only" satisfies ClassroomTransportMode);
  const effectiveMode: ClassroomTransportMode =
    fanoutHealth.deployAllowsRedis &&
    fanoutHealth.redisReachable &&
    classroomTransportMode === "redis_fanout"
      ? "redis_fanout"
      : "local_only";

  return SystemTransportSettingsDTOSchema.parse({
    classroomTransportMode,
    effectiveMode,
    deployStatus: resolveDeployStatus({
      deployAllowsRedis: fanoutHealth.deployAllowsRedis,
      classroomTransportMode,
      redisReachable: fanoutHealth.redisReachable,
      degraded: fanoutHealth.degraded,
    }),
    canManage: actor.canManage,
    deployAllowsRedis: fanoutHealth.deployAllowsRedis,
    redisConfigured: fanoutHealth.redisConfigured,
    redisReachable: fanoutHealth.redisReachable,
    degraded: fanoutHealth.degraded,
    degradedReason: fanoutHealth.degradedReason,
    updatedById: stored?.updatedById ?? null,
    updatedAt: toIso(stored?.updatedAt),
    health: {
      deployAllowsRedis: fanoutHealth.deployAllowsRedis,
      redisConfigured: fanoutHealth.redisConfigured,
      redisReachable: fanoutHealth.redisReachable,
      connectionState: fanoutHealth.connectionState,
      desiredTopicCount: fanoutHealth.desiredTopicCount,
      subscribedTopicCount: fanoutHealth.subscribedTopicCount,
      lastError: fanoutHealth.lastError,
      lastHealthyAt: fanoutHealth.lastHealthyAt,
      instanceId: fanoutHealth.instanceId,
    },
  });
}

export async function resolveSystemTransportModeForNewSessions() {
  const settings = await getSystemTransportSettings();

  return {
    classroomTransportMode: settings.classroomTransportMode,
    effectiveMode: settings.effectiveMode,
    deployStatus: settings.deployStatus,
  };
}

export async function updateSystemTransportSettings(
  rawInput: UpdateSystemTransportSettingsInput,
) {
  const input = UpdateSystemTransportSettingsInputSchema.parse(rawInput);
  const actor = await getCurrentSystemTransportActor();

  if (!actor.canManage) {
    throw new Error("SYSTEM_TRANSPORT_SETTINGS_UNAUTHORIZED");
  }

  const existing = await getStoredSystemTransportSettings();

  if (existing) {
    await db
      .update(systemTransportSettings)
      .set({
        classroomTransportMode: input.classroomTransportMode,
        updatedById: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(systemTransportSettings.id, existing.id));
  } else {
    await db.insert(systemTransportSettings).values({
      id: "default",
      classroomTransportMode: input.classroomTransportMode,
      updatedById: actor.userId,
      updatedAt: new Date(),
    });
  }

  return getSystemTransportSettings();
}
