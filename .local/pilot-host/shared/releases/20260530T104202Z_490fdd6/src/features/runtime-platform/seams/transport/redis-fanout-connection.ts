import "server-only";

import Redis from "ioredis";

import type { SystemTransportConnectionState } from "@/lib/dto/system-transport-settings";

type RedisFanoutConnections = {
  publisher: Redis;
  subscriber: Redis;
};

type RedisFanoutConnectionHealthSnapshot = {
  deployAllowsRedis: boolean;
  redisConfigured: boolean;
  redisReachable: boolean;
  connectionState: SystemTransportConnectionState;
  lastError: string | null;
  lastHealthyAt: string | null;
  instanceId: string;
};

const redisConnectionHealth: RedisFanoutConnectionHealthSnapshot = {
  deployAllowsRedis: false,
  redisConfigured: false,
  redisReachable: false,
  connectionState: "disabled",
  lastError: null,
  lastHealthyAt: null,
  instanceId: getRedisFanoutInstanceId(),
};

let redisConnectionsPromise: Promise<RedisFanoutConnections> | null = null;

function setRedisConnectionState(input: Partial<RedisFanoutConnectionHealthSnapshot>) {
  Object.assign(redisConnectionHealth, input);
}

function attachRedisConnectionObservers(connection: Redis) {
  connection.on("connect", () => {
    setRedisConnectionState({ connectionState: "connecting" });
  });

  connection.on("ready", () => {
    setRedisConnectionState({
      redisReachable: true,
      connectionState: "ready",
      lastError: null,
      lastHealthyAt: new Date().toISOString(),
    });
  });

  connection.on("reconnecting", () => {
    setRedisConnectionState({
      redisReachable: false,
      connectionState: "connecting",
    });
  });

  connection.on("error", (error) => {
    setRedisConnectionState({
      redisReachable: false,
      connectionState: "degraded",
      lastError: error.message,
    });
  });

  connection.on("close", () => {
    setRedisConnectionState({
      redisReachable: false,
      connectionState: "degraded",
    });
  });

  connection.on("end", () => {
    setRedisConnectionState({
      redisReachable: false,
      connectionState: "degraded",
    });
  });
}

export function getRedisFanoutInstanceId() {
  const candidate =
    process.env.RUNTIME_INSTANCE_ID?.trim() ||
    process.env.INSTANCE_ID?.trim() ||
    process.env.HOSTNAME?.trim();

  return candidate && candidate.length > 0
    ? candidate
    : `instance-${process.pid}`;
}

export function getRedisFanoutEnvironmentCapability() {
  const redisUrl = process.env.REDIS_URL?.trim() || null;
  const deployAllowsRedis =
    process.env.REDIS_FANOUT_ENABLED === "true" && Boolean(redisUrl);

  return {
    deployAllowsRedis,
    redisConfigured: Boolean(redisUrl),
    redisUrl,
  };
}

async function createRedisFanoutConnections(): Promise<RedisFanoutConnections> {
  const capability = getRedisFanoutEnvironmentCapability();

  setRedisConnectionState({
    deployAllowsRedis: capability.deployAllowsRedis,
    redisConfigured: capability.redisConfigured,
    redisReachable: false,
    connectionState: capability.deployAllowsRedis ? "connecting" : "disabled",
  });

  if (!capability.deployAllowsRedis || !capability.redisUrl) {
    throw new Error("REDIS_FANOUT_DEPLOY_DISALLOWED");
  }

  const connectionOptions = {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    autoResubscribe: false,
  } as const;

  const publisher = new Redis(capability.redisUrl, connectionOptions);
  const subscriber = new Redis(capability.redisUrl, connectionOptions);

  attachRedisConnectionObservers(publisher);
  attachRedisConnectionObservers(subscriber);

  await Promise.all([publisher.connect(), subscriber.connect()]);

  setRedisConnectionState({
    deployAllowsRedis: true,
    redisConfigured: true,
    redisReachable: true,
    connectionState: "ready",
    lastError: null,
    lastHealthyAt: new Date().toISOString(),
  });

  return { publisher, subscriber };
}

export async function getRedisFanoutConnections() {
  const capability = getRedisFanoutEnvironmentCapability();

  if (!capability.deployAllowsRedis) {
    setRedisConnectionState({
      deployAllowsRedis: false,
      redisConfigured: capability.redisConfigured,
      redisReachable: false,
      connectionState: "disabled",
    });
    return null;
  }

  if (!redisConnectionsPromise) {
    redisConnectionsPromise = createRedisFanoutConnections().catch((error) => {
      setRedisConnectionState({
        deployAllowsRedis: capability.deployAllowsRedis,
        redisConfigured: capability.redisConfigured,
        redisReachable: false,
        connectionState: "degraded",
        lastError: error instanceof Error ? error.message : "REDIS_FANOUT_CONNECT_FAILED",
      });
      redisConnectionsPromise = null;
      throw error;
    });
  }

  return redisConnectionsPromise;
}

export async function probeRedisFanoutHealth() {
  const capability = getRedisFanoutEnvironmentCapability();

  setRedisConnectionState({
    deployAllowsRedis: capability.deployAllowsRedis,
    redisConfigured: capability.redisConfigured,
  });

  if (!capability.deployAllowsRedis) {
    return getRedisFanoutConnectionHealthSnapshot();
  }

  try {
    await getRedisFanoutConnections();
  } catch {
    // The health snapshot already captures the most recent connection error.
  }

  return getRedisFanoutConnectionHealthSnapshot();
}

export function getRedisFanoutConnectionHealthSnapshot() {
  return {
    ...redisConnectionHealth,
  } satisfies RedisFanoutConnectionHealthSnapshot;
}
