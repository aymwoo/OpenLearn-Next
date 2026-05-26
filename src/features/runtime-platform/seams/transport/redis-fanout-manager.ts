import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  classroomSessions,
  transportConsumerTraces,
  transportDeliveryAttempts,
} from "@/db/schema";
import type { RuntimeTransportEnvelope } from "./contract";
import {
  getRedisFanoutConnectionHealthSnapshot,
  getRedisFanoutConnections,
  getRedisFanoutInstanceId,
} from "./redis-fanout-connection";
import {
  resolveRedisFanoutTopic,
  type RedisFanoutSubchannel,
} from "./redis-fanout-topics";
import { classroomWebSocketConnectionRegistry } from "./ws-connection-registry";
import type { ClassroomWebSocketServerEnvelope } from "./ws-envelope";

type DesiredTopic = {
  sessionId: string;
  subchannel: RedisFanoutSubchannel;
  refCount: number;
};

type RedisFanoutWireEnvelope = {
  sessionId: string;
  correlationId: string;
  fanoutMode: "local_only" | "redis_fanout";
  subchannel: RedisFanoutSubchannel;
  serverEnvelope: ClassroomWebSocketServerEnvelope;
};

type RedisFanoutManagerSnapshot = ReturnType<
  typeof classroomRedisFanoutManager.getSnapshot
>;

type RedisFanoutDeliveryInput = {
  envelope: RuntimeTransportEnvelope;
  serverEnvelope: ClassroomWebSocketServerEnvelope;
};

type RedisFanoutErrorDetail = {
  fanoutMode: "local_only" | "redis_fanout";
  redisTopic: string | null;
  subchannel: RedisFanoutSubchannel;
  degraded: boolean;
  degradedReason: string;
  instanceId: string;
};

function isTransportDetailRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class RedisFanoutDeliveryError extends Error {
  readonly transportDetail: RedisFanoutErrorDetail;

  constructor(message: string, transportDetail: RedisFanoutErrorDetail) {
    super(message);
    this.name = "RedisFanoutDeliveryError";
    this.transportDetail = transportDetail;
  }
}

async function getClassroomTransportModeSnapshot(sessionId: string) {
  const session = await db.query.classroomSessions.findFirst({
    where: eq(classroomSessions.id, sessionId),
  });

  return session?.transportModeSnapshot ?? "local_only";
}

async function recordFanoutConsumerTrace(input: {
  sessionId: string;
  correlationId: string;
  traceType: "snapshot" | "runtime_event";
  detail: Record<string, unknown>;
}) {
  const transportDeliveryAttemptsQuery = db.query.transportDeliveryAttempts;
  const attempt = transportDeliveryAttemptsQuery
    ? await transportDeliveryAttemptsQuery.findFirst({
      where: and(
        eq(transportDeliveryAttempts.classroomSessionId, input.sessionId),
        eq(transportDeliveryAttempts.correlationId, input.correlationId),
      ),
      orderBy: (attempt, { desc }) => [desc(attempt.createdAt)],
    })
    : null;

  await db.insert(transportConsumerTraces).values({
    attemptId: attempt?.id ?? null,
    classroomSessionId: input.sessionId,
    runtimeSessionId: attempt?.runtimeSessionId ?? null,
    correlationId: input.correlationId,
    adapterId: "transport-websocket-adapter",
    adapterMode: "websocket",
    traceType: input.traceType,
    status: "emitted",
    detailJson: input.detail,
    emittedAt: new Date(),
  });
}

class ClassroomRedisFanoutManager {
  private readonly desiredTopics = new Map<string, DesiredTopic>();
  private readonly subscribedTopics = new Set<string>();
  private subscriberReady = false;
  private listenersAttached = false;
  private degradedReason: string | null = null;
  private lastHealthyAt: string | null = null;

  private markHealthy() {
    this.degradedReason = null;
    this.lastHealthyAt = new Date().toISOString();
  }

  private markDegraded(reason: string) {
    this.degradedReason = reason;
  }

  private async ensureSubscriberListeners() {
    if (this.listenersAttached) {
      return;
    }

    const connections = await getRedisFanoutConnections();
    if (!connections) {
      return;
    }

    this.listenersAttached = true;

    connections.subscriber.on("ready", async () => {
      this.subscriberReady = true;
      this.subscribedTopics.clear();
      await this.restoreDesiredSubscriptions();
    });

    connections.subscriber.on("close", () => {
      this.subscriberReady = false;
      this.subscribedTopics.clear();
      this.markDegraded("REDIS_SUBSCRIBER_CLOSED");
    });

    connections.subscriber.on("error", (error) => {
      this.markDegraded(error.message || "REDIS_SUBSCRIBER_FAILED");
    });

    connections.subscriber.on("message", async (_topic, payload) => {
      let decoded: RedisFanoutWireEnvelope | null = null;

      try {
        decoded = JSON.parse(payload) as RedisFanoutWireEnvelope;
      } catch {
        return;
      }

      const delivery = classroomWebSocketConnectionRegistry.broadcast(
        decoded.sessionId,
        decoded.serverEnvelope,
      );

      await recordFanoutConsumerTrace({
        sessionId: decoded.sessionId,
        correlationId: decoded.correlationId,
        traceType:
          decoded.subchannel === "runtime" ? "runtime_event" : "snapshot",
        detail: {
          receivedVia: "redis_subscriber",
          fanoutMode: decoded.fanoutMode,
          subchannel: decoded.subchannel,
          instanceId: getRedisFanoutInstanceId(),
          deliveredCount: delivery.deliveredCount,
        },
      });

      this.markHealthy();
    });
  }

  private async restoreDesiredSubscriptions() {
    const connections = await getRedisFanoutConnections();
    if (!connections) {
      return;
    }

    for (const [topic] of this.desiredTopics) {
      if (this.subscribedTopics.has(topic)) {
        continue;
      }

      await connections.subscriber.subscribe(topic);
      this.subscribedTopics.add(topic);
    }

    this.markHealthy();
  }

  async ensureSubscribed(sessionId: string, subchannel: RedisFanoutSubchannel) {
    const fanoutMode = await getClassroomTransportModeSnapshot(sessionId);
    if (fanoutMode !== "redis_fanout") {
      return;
    }

    const { topic } = resolveRedisFanoutTopic({
      sessionId,
      channel: subchannel === "runtime" ? "classroom-runtime" : "classroom-events",
      kind: subchannel === "runtime" ? "runtime.subscription" : "snapshot.subscription",
      correlationId: `classroom:${sessionId}:${subchannel}:subscribe`,
      truthRef: {
        type: "classroom-session",
        id: sessionId,
        classroomSessionId: sessionId,
      },
      payload: {},
    });

    const existing = this.desiredTopics.get(topic);
    if (existing) {
      existing.refCount += 1;
      this.desiredTopics.set(topic, existing);
      return;
    }

    this.desiredTopics.set(topic, {
      sessionId,
      subchannel,
      refCount: 1,
    });

    try {
      await this.ensureSubscriberListeners();
      const connections = await getRedisFanoutConnections();
      if (!connections) {
        throw new Error("REDIS_FANOUT_DEPLOY_DISALLOWED");
      }

      await connections.subscriber.subscribe(topic);
      this.subscribedTopics.add(topic);
      this.subscriberReady = true;
      this.markHealthy();
    } catch (error) {
      this.markDegraded(
        error instanceof Error ? error.message : "REDIS_SUBSCRIBE_FAILED",
      );
    }
  }

  async releaseSubscription(sessionId: string, subchannel: RedisFanoutSubchannel) {
    const { topic } = resolveRedisFanoutTopic({
      sessionId,
      channel: subchannel === "runtime" ? "classroom-runtime" : "classroom-events",
      kind: subchannel === "runtime" ? "runtime.subscription" : "snapshot.subscription",
      correlationId: `classroom:${sessionId}:${subchannel}:unsubscribe`,
      truthRef: {
        type: "classroom-session",
        id: sessionId,
        classroomSessionId: sessionId,
      },
      payload: {},
    });

    const existing = this.desiredTopics.get(topic);
    if (!existing) {
      return;
    }

    if (existing.refCount > 1) {
      existing.refCount -= 1;
      this.desiredTopics.set(topic, existing);
      return;
    }

    this.desiredTopics.delete(topic);
    this.subscribedTopics.delete(topic);

    try {
      const connections = await getRedisFanoutConnections();
      await connections?.subscriber.unsubscribe(topic);
    } catch (error) {
      this.markDegraded(
        error instanceof Error ? error.message : "REDIS_UNSUBSCRIBE_FAILED",
      );
    }
  }

  async deliver(input: RedisFanoutDeliveryInput) {
    const { sessionId, subchannel, topic } = resolveRedisFanoutTopic(input.envelope);
    const fanoutMode = await getClassroomTransportModeSnapshot(sessionId);

    if (fanoutMode === "local_only") {
      const delivery = classroomWebSocketConnectionRegistry.broadcast(
        sessionId,
        input.serverEnvelope,
      );

      await recordFanoutConsumerTrace({
        sessionId,
        correlationId: input.envelope.correlationId,
        traceType: subchannel === "runtime" ? "runtime_event" : "snapshot",
        detail: {
          receivedVia: "local_registry",
          fanoutMode,
          subchannel,
          instanceId: getRedisFanoutInstanceId(),
          deliveredCount: delivery.deliveredCount,
        },
      });
      return;
    }

    try {
      await this.ensureSubscriberListeners();
      const connections = await getRedisFanoutConnections();

      if (!connections) {
        throw new Error("REDIS_FANOUT_DEPLOY_DISALLOWED");
      }

      const wireEnvelope: RedisFanoutWireEnvelope = {
        sessionId,
        correlationId: input.envelope.correlationId,
        fanoutMode,
        subchannel,
        serverEnvelope: input.serverEnvelope,
      };

      await connections.publisher.publish(topic, JSON.stringify(wireEnvelope));
      this.markHealthy();
      return;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "REDIS_FANOUT_DELIVERY_FAILED";
      this.markDegraded(reason);

      const delivery = classroomWebSocketConnectionRegistry.broadcast(
        sessionId,
        input.serverEnvelope,
      );

      await recordFanoutConsumerTrace({
        sessionId,
        correlationId: input.envelope.correlationId,
        traceType: subchannel === "runtime" ? "runtime_event" : "snapshot",
        detail: {
          receivedVia: "local_registry",
          fanoutMode,
          subchannel,
          degraded: true,
          degradedReason: reason,
          instanceId: getRedisFanoutInstanceId(),
          deliveredCount: delivery.deliveredCount,
        },
      });

      throw new RedisFanoutDeliveryError(reason, {
        fanoutMode,
        redisTopic: topic,
        subchannel,
        degraded: true,
        degradedReason: reason,
        instanceId: getRedisFanoutInstanceId(),
      });
    }
  }

  async getLatestDegradedReason(sessionId?: string | null) {
    const transportDeliveryAttemptsQuery = db.query.transportDeliveryAttempts;

    if (sessionId && transportDeliveryAttemptsQuery) {
      const latestAttempt = await transportDeliveryAttemptsQuery.findFirst({
        where: and(
          eq(transportDeliveryAttempts.classroomSessionId, sessionId),
          eq(transportDeliveryAttempts.adapterMode, "websocket"),
        ),
        orderBy: (attempt, { desc }) => [desc(attempt.createdAt)],
      });

      const detail = isTransportDetailRecord(latestAttempt?.payloadSummaryJson)
        ? latestAttempt?.payloadSummaryJson
        : null;
      const degradedReason =
        typeof detail?.degradedReason === "string"
          ? detail.degradedReason
          : latestAttempt?.failureReason ?? null;

      return degradedReason;
    }

    return this.degradedReason;
  }

  getSnapshot() {
    const connectionHealth = getRedisFanoutConnectionHealthSnapshot();

    return {
      ...connectionHealth,
      desiredTopicCount: this.desiredTopics.size,
      subscribedTopicCount: this.subscribedTopics.size,
      degraded: Boolean(this.degradedReason),
      degradedReason: this.degradedReason,
      lastHealthyAt: this.lastHealthyAt ?? connectionHealth.lastHealthyAt,
      desiredTopics: [...this.desiredTopics.entries()].map(([topic, detail]) => ({
        topic,
        sessionId: detail.sessionId,
        subchannel: detail.subchannel,
        refCount: detail.refCount,
      })),
      subscriberReady: this.subscriberReady,
    } satisfies {
      deployAllowsRedis: boolean;
      redisConfigured: boolean;
      redisReachable: boolean;
      connectionState: string;
      desiredTopicCount: number;
      subscribedTopicCount: number;
      lastError: string | null;
      lastHealthyAt: string | null;
      instanceId: string;
      degraded: boolean;
      degradedReason: string | null;
      desiredTopics: Array<{
        topic: string;
        sessionId: string;
        subchannel: RedisFanoutSubchannel;
        refCount: number;
      }>;
      subscriberReady: boolean;
    };
  }
}

export const classroomRedisFanoutManager =
  new ClassroomRedisFanoutManager();

export type { RedisFanoutManagerSnapshot };
