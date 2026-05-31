import "server-only";

import Redis from "ioredis";

type BullmqConnectionRole = "producer" | "worker" | "queue_events";
type BullmqConnectionState = "disabled" | "connecting" | "ready" | "degraded";

type BullmqEnvironmentCapability = {
  asyncTasksEnabled: boolean;
  redisConfigured: boolean;
  redisUrl: string | null;
  prefix: string;
};

type BullmqConnectionHealthSnapshot = {
  asyncTasksEnabled: boolean;
  redisConfigured: boolean;
  redisReachable: boolean;
  prefix: string;
  instanceId: string;
  connectionStates: Record<BullmqConnectionRole, BullmqConnectionState>;
  lastError: string | null;
  lastHealthyAt: string | null;
};

const DEFAULT_BULLMQ_PREFIX = "openlearn:async-tasks";

const bullmqConnectionHealth: BullmqConnectionHealthSnapshot = {
  asyncTasksEnabled: false,
  redisConfigured: false,
  redisReachable: false,
  prefix: DEFAULT_BULLMQ_PREFIX,
  instanceId: getBullmqInstanceId(),
  connectionStates: {
    producer: "disabled",
    worker: "disabled",
    queue_events: "disabled",
  },
  lastError: null,
  lastHealthyAt: null,
};

const connectionPromises: Partial<Record<BullmqConnectionRole, Promise<Redis>>> = {};

function setBullmqConnectionState(input: Partial<BullmqConnectionHealthSnapshot>) {
  Object.assign(bullmqConnectionHealth, input);
}

function setBullmqRoleState(role: BullmqConnectionRole, state: BullmqConnectionState) {
  bullmqConnectionHealth.connectionStates[role] = state;
}

function updateBullmqHealthFromCapability(capability: BullmqEnvironmentCapability) {
  setBullmqConnectionState({
    asyncTasksEnabled: capability.asyncTasksEnabled,
    redisConfigured: capability.redisConfigured,
    prefix: capability.prefix,
  });

  if (!capability.asyncTasksEnabled) {
    setBullmqRoleState("producer", "disabled");
    setBullmqRoleState("worker", "disabled");
    setBullmqRoleState("queue_events", "disabled");
  }
}

function attachBullmqConnectionObservers(role: BullmqConnectionRole, connection: Redis) {
  connection.on("connect", () => {
    setBullmqRoleState(role, "connecting");
  });

  connection.on("ready", () => {
    setBullmqConnectionState({
      redisReachable: true,
      lastError: null,
      lastHealthyAt: new Date().toISOString(),
    });
    setBullmqRoleState(role, "ready");
  });

  connection.on("reconnecting", () => {
    setBullmqConnectionState({
      redisReachable: false,
    });
    setBullmqRoleState(role, "connecting");
  });

  connection.on("error", (error) => {
    setBullmqConnectionState({
      redisReachable: false,
      lastError: error.message,
    });
    setBullmqRoleState(role, "degraded");
  });

  connection.on("close", () => {
    setBullmqConnectionState({
      redisReachable: false,
    });
    setBullmqRoleState(role, "degraded");
  });

  connection.on("end", () => {
    setBullmqConnectionState({
      redisReachable: false,
    });
    setBullmqRoleState(role, "degraded");
  });
}

function getBullmqConnectionOptions(role: BullmqConnectionRole) {
  return {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: role === "producer" ? 1 : null,
    connectionName: `openlearn-${role}-${getBullmqInstanceId()}`,
  } as const;
}

async function createBullmqConnection(role: BullmqConnectionRole): Promise<Redis> {
  const capability = getBullmqEnvironmentCapability();
  updateBullmqHealthFromCapability(capability);
  setBullmqRoleState(role, capability.asyncTasksEnabled ? "connecting" : "disabled");

  if (!capability.asyncTasksEnabled || !capability.redisUrl) {
    throw new Error("BULLMQ_ENV_NOT_READY");
  }

  const connection = new Redis(capability.redisUrl, getBullmqConnectionOptions(role));
  attachBullmqConnectionObservers(role, connection);
  await connection.connect();

  setBullmqConnectionState({
    asyncTasksEnabled: true,
    redisConfigured: true,
    redisReachable: true,
    prefix: capability.prefix,
    lastError: null,
    lastHealthyAt: new Date().toISOString(),
  });

  return connection;
}

async function getBullmqConnection(role: BullmqConnectionRole) {
  const capability = getBullmqEnvironmentCapability();
  updateBullmqHealthFromCapability(capability);

  if (!capability.asyncTasksEnabled) {
    throw new Error("BULLMQ_DISABLED");
  }

  if (!connectionPromises[role]) {
    connectionPromises[role] = createBullmqConnection(role).catch((error) => {
      setBullmqConnectionState({
        redisReachable: false,
        lastError: error instanceof Error ? error.message : "BULLMQ_CONNECT_FAILED",
      });
      setBullmqRoleState(role, "degraded");
      delete connectionPromises[role];
      throw error;
    });
  }

  return connectionPromises[role]!;
}

export function getBullmqInstanceId() {
  const candidate =
    process.env.WORKER_INSTANCE_ID?.trim() ||
    process.env.RUNTIME_INSTANCE_ID?.trim() ||
    process.env.INSTANCE_ID?.trim() ||
    process.env.HOSTNAME?.trim();

  return candidate && candidate.length > 0 ? candidate : `worker-${process.pid}`;
}

export function getBullmqEnvironmentCapability(): BullmqEnvironmentCapability {
  const redisUrl = process.env.BULLMQ_REDIS_URL?.trim() || null;
  const asyncTasksEnabled = process.env.ASYNC_TASKS_ENABLED === "true" && Boolean(redisUrl);
  const prefix = process.env.BULLMQ_PREFIX?.trim() || DEFAULT_BULLMQ_PREFIX;

  return {
    asyncTasksEnabled,
    redisConfigured: Boolean(redisUrl),
    redisUrl,
    prefix,
  };
}

export async function getBullmqProducerConnection() {
  return getBullmqConnection("producer");
}

export async function getBullmqWorkerConnection() {
  return getBullmqConnection("worker");
}

export async function getBullmqQueueEventsConnection() {
  return getBullmqConnection("queue_events");
}

export async function closeBullmqConnections() {
  const roles = Object.keys(connectionPromises) as BullmqConnectionRole[];

  await Promise.all(
    roles.map(async (role) => {
      const connection = await connectionPromises[role]!;
      await connection.quit();
      delete connectionPromises[role];
      setBullmqRoleState(role, "disabled");
    }),
  );

  setBullmqConnectionState({
    redisReachable: false,
  });
}

export function getBullmqConnectionHealthSnapshot() {
  return {
    ...bullmqConnectionHealth,
    connectionStates: { ...bullmqConnectionHealth.connectionStates },
  } satisfies BullmqConnectionHealthSnapshot;
}

export type { BullmqConnectionHealthSnapshot, BullmqConnectionRole, BullmqConnectionState };
