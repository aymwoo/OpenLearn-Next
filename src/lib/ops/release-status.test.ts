import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getBullmqConnectionHealthSnapshot: vi.fn(),
  listAsyncWorkerHeartbeats: vi.fn(),
  probeRedisFanoutHealth: vi.fn(),
  getRedisFanoutConnectionHealthSnapshot: vi.fn(),
  getServerEnv: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/features/async-tasks/infra/connection", () => ({
  getBullmqConnectionHealthSnapshot: mocks.getBullmqConnectionHealthSnapshot,
}));

vi.mock("@/features/async-tasks/infra/heartbeat", () => ({
  listAsyncWorkerHeartbeats: mocks.listAsyncWorkerHeartbeats,
}));

vi.mock("@/features/runtime-platform/seams/transport/redis-fanout-connection", () => ({
  probeRedisFanoutHealth: mocks.probeRedisFanoutHealth,
  getRedisFanoutConnectionHealthSnapshot: mocks.getRedisFanoutConnectionHealthSnapshot,
}));

vi.mock("@/lib/ops/env.server", () => ({
  getServerEnv: mocks.getServerEnv,
}));

vi.mock("node:fs/promises", () => ({
  readFile: mocks.readFile,
}));

describe("release status helper", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T09:00:20.000Z"));

    mocks.getBullmqConnectionHealthSnapshot.mockReturnValue({
      asyncTasksEnabled: true,
      redisConfigured: true,
      redisReachable: true,
      prefix: "openlearn:async-tasks",
      instanceId: "worker-1",
      connectionStates: {
        producer: "ready",
        worker: "ready",
        queue_events: "ready",
      },
      lastError: null,
      lastHealthyAt: "2026-05-26T09:00:00.000Z",
    });

    mocks.listAsyncWorkerHeartbeats.mockResolvedValue([
      {
        instanceId: "worker-1",
        status: "ready",
        queueNamesJson: ["async-tasks"],
        lastSeenAt: new Date("2026-05-26T09:00:00.000Z"),
        startedAt: new Date("2026-05-26T08:50:00.000Z"),
        stoppedAt: null,
        lastSignal: null,
      },
    ]);

    mocks.probeRedisFanoutHealth.mockResolvedValue(undefined);
    mocks.getRedisFanoutConnectionHealthSnapshot.mockReturnValue({
      deployAllowsRedis: true,
      redisConfigured: true,
      redisReachable: true,
      connectionState: "ready",
      lastError: null,
      lastHealthyAt: "2026-05-26T09:00:00.000Z",
      instanceId: "runtime-1",
    });

    mocks.getServerEnv.mockReturnValue({
      NODE_ENV: "production",
      HOSTNAME: "0.0.0.0",
      PORT: 3000,
      DB_FILE_NAME: "file:local.db",
      AUTH_SECRET: "secret",
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: "server-action-key",
      ASYNC_TASKS_ENABLED: true,
      BULLMQ_REDIS_URL: "redis://127.0.0.1:6379",
      BULLMQ_PREFIX: "openlearn:async-tasks",
      REDIS_FANOUT_ENABLED: true,
      REDIS_URL: "redis://127.0.0.1:6379",
      RUNTIME_INSTANCE_ID: "runtime-1",
      WORKER_INSTANCE_ID: "worker-1",
      OPENLEARN_DEPLOY_ENV: "pilot-single-school",
      OPENLEARN_SHARED_ROOT: "/srv/openlearn/shared",
      OPENLEARN_CURRENT_ROOT: "/srv/openlearn/current",
      OPENLEARN_RUNTIME_ASSETS_ROOT: "/srv/openlearn/assets",
      OPENLEARN_RELEASE_MANIFESTS_DIR: "/srv/openlearn/manifests",
      OPENLEARN_HEALTHCHECK_BASE_URL: "http://127.0.0.1:3000",
      bullmq: {
        asyncTasksEnabled: true,
        redisConfigured: true,
        redisUrl: "redis://127.0.0.1:6379",
        prefix: "openlearn:async-tasks",
        workerReady: true,
        isBlocking: true,
        posture: "blocking-required",
      },
      fanout: {
        fanoutEnabled: true,
        redisConfigured: true,
        redisUrl: "redis://127.0.0.1:6379",
        deployAllowsRedis: true,
        isBlocking: false,
        posture: "optional-enabled",
      },
    });

    mocks.readFile.mockImplementation(async (filePath: string | URL) => {
      const path = String(filePath);
      if (path.endsWith("current.json")) {
        return JSON.stringify({
          releaseId: "release-123",
          gitSha: "abc1234",
          environment: "pilot-single-school",
          releasedAt: "2026-05-26T09:10:00.000Z",
          rollbackTarget: "release-122",
          manifestPath: "/srv/openlearn/manifests/release-123.json",
          migration: {
            command: "pnpm db:migrate",
            status: "passed",
          },
          restoreDrill: {
            status: "passed",
            verifiedAt: "2026-05-26T08:55:00.000Z",
          },
          operatorCorrelation: {
            schoolId: "school-1",
            classroomSessionId: "session-1",
            lessonVersionId: "lesson-version-1",
            pluginId: "plugin-1",
            actionKey: "launchVote",
            commandId: "command-1",
            taskId: "task-1",
          },
        });
      }

      if (path.endsWith("green.json")) {
        return JSON.stringify({
          releaseId: "release-122",
          gitSha: "def5678",
          environment: "pilot-single-school",
          releasedAt: "2026-05-26T08:00:00.000Z",
          rollbackTarget: null,
          manifestPath: "/srv/openlearn/manifests/release-122.json",
        });
      }

      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("getHealthPayload only reports process alive", async () => {
    const { getHealthPayload } = await import("./release-status");

    const payload = await getHealthPayload();

    expect(payload.kind).toBe("health");
    expect(payload.ok).toBe(true);
    expect(payload.process).toBe("alive");
    expect(payload.checkedAt).toEqual(expect.any(String));
    expect(payload).not.toHaveProperty("components");
    expect(mocks.getBullmqConnectionHealthSnapshot).not.toHaveBeenCalled();
    expect(mocks.getRedisFanoutConnectionHealthSnapshot).not.toHaveBeenCalled();
  });

  it("getReadyPayload reports green only when worker heartbeat and bullmq reachability are healthy", async () => {
    const { getReadyPayload } = await import("./release-status");

    const payload = await getReadyPayload();

    expect(payload.ok).toBe(true);
    expect(payload.kind).toBe("ready");
    expect(payload.components.worker.posture).toBe("green");
    expect(payload.components.fanout.blocking).toBe(false);
    expect(payload.evidence.workerLastHeartbeatAt).toBe("2026-05-26T09:00:00.000Z");
    expect(mocks.probeRedisFanoutHealth).toHaveBeenCalledTimes(1);
  });

  it("getReadyPayload blocks on worker degradation but keeps fanout non-blocking", async () => {
    mocks.getBullmqConnectionHealthSnapshot.mockReturnValueOnce({
      asyncTasksEnabled: true,
      redisConfigured: true,
      redisReachable: false,
      prefix: "openlearn:async-tasks",
      instanceId: "worker-1",
      connectionStates: {
        producer: "degraded",
        worker: "degraded",
        queue_events: "degraded",
      },
      lastError: "redis down",
      lastHealthyAt: null,
    });
    mocks.listAsyncWorkerHeartbeats.mockResolvedValueOnce([]);
    mocks.getRedisFanoutConnectionHealthSnapshot.mockReturnValueOnce({
      deployAllowsRedis: true,
      redisConfigured: true,
      redisReachable: false,
      connectionState: "degraded",
      lastError: "fanout redis unreachable",
      lastHealthyAt: null,
      instanceId: "runtime-1",
    });

    const { getReadyPayload } = await import("./release-status");

    const payload = await getReadyPayload();

    expect(payload.ok).toBe(false);
    expect(payload.kind).toBe("ready");
    expect(payload.components.worker.blocking).toBe(true);
    expect(payload.components.worker.posture).toBe("degraded");
    expect(payload.components.worker.reason).toContain("redis down");
    expect(payload.components.fanout.blocking).toBe(false);
    expect(payload.components.fanout.posture).toBe("degraded");
    expect(payload.components.fanout.reason).toContain("fanout");
    expect(payload.evidence.workerLastHeartbeatAt).toBeNull();
  });

  it("getReleasePayload returns empty state when canonical pointer is missing", async () => {
    mocks.readFile.mockImplementationOnce(async () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });

    const { getReleasePayload } = await import("./release-status");

    const payload = await getReleasePayload();

    expect(payload.available).toBe(false);
    expect(payload.ok).toBe(false);
    expect(payload.gitSha).toBeNull();
    expect(payload.currentRelease).toBeNull();
    expect(payload.greenRelease?.releaseId).toBe("release-122");
    expect(payload.reason).toContain("current.json");
  });

  it("getReleasePayload returns current and green pointers with operator correlation", async () => {
    const { getReleasePayload } = await import("./release-status");

    const payload = await getReleasePayload();

    expect(payload.available).toBe(true);
    expect(payload.releaseId).toBe("release-123");
    expect(payload.gitSha).toBe("abc1234");
    expect(payload.rollbackTarget).toBe("release-122");
    expect(payload.currentRelease?.releaseId).toBe("release-123");
    expect(payload.greenRelease?.releaseId).toBe("release-122");
    expect(payload.currentRelease?.gitSha).toBe("abc1234");
    expect(payload.currentRelease?.rollbackTarget).toBe("release-122");
    expect(payload.operatorCorrelation.schoolId.id).toBe("school-1");
    expect(payload.operatorCorrelation.classroomSessionId.id).toBe("session-1");
    expect(payload.operatorCorrelation.lessonVersionId.id).toBe("lesson-version-1");
    expect(payload.operatorCorrelation.pluginId.id).toBe("plugin-1");
    expect(payload.operatorCorrelation.actionKey.id).toBe("launchVote");
    expect(payload.operatorCorrelation.commandId.id).toBe("command-1");
    expect(payload.operatorCorrelation.taskId.id).toBe("task-1");
  });

  it("getReleasePayload marks incomplete operatorCorrelation without throwing", async () => {
    mocks.readFile.mockImplementationOnce(async () =>
      JSON.stringify({
        releaseId: "release-123",
        gitSha: "abc1234",
        environment: "pilot-single-school",
        releasedAt: "2026-05-26T09:10:00.000Z",
        rollbackTarget: "release-122",
        manifestPath: "/srv/openlearn/manifests/release-123.json",
        migration: { command: "pnpm db:migrate", status: "passed" },
        restoreDrill: { status: "passed", verifiedAt: "2026-05-26T08:55:00.000Z" },
        operatorCorrelation: {
          schoolId: "school-1",
          classroomSessionId: null,
          lessonVersionId: "lesson-version-1",
          pluginId: "plugin-1",
          actionKey: "launchVote",
          commandId: null,
          taskId: "task-1",
        },
      }),
    );

    const { getReleasePayload } = await import("./release-status");

    const payload = await getReleasePayload();

    expect(payload.available).toBe(true);
    expect(payload.operatorCorrelation.classroomSessionId.id).toBeNull();
    expect(payload.operatorCorrelation.commandId.id).toBeNull();
    expect(payload.operatorCorrelationComplete).toBe(false);
    expect(payload.reason).toContain("operatorCorrelation");
  });

  it("getReleasePayload accepts manifest operatorCorrelation objects with ids and href metadata", async () => {
    mocks.readFile.mockImplementationOnce(async () =>
      JSON.stringify({
        releaseId: "release-123",
        gitSha: "abc1234",
        environment: "pilot-single-school",
        releasedAt: "2026-05-26T09:10:00.000Z",
        rollbackTarget: "release-122",
        manifestPath: "/srv/openlearn/manifests/release-123.json",
        migration: { command: "pnpm db:migrate", status: "passed" },
        restoreDrill: { status: "not_run" },
        operatorCorrelation: {
          schoolId: { id: "school-1", href: null, hrefTemplate: null },
          classroomSessionId: {
            id: "session-1",
            href: "/settings/labs/incidents/session-1",
            hrefTemplate: "/settings/labs/incidents/[sessionId]",
          },
          lessonVersionId: { id: "lesson-version-1", href: null, hrefTemplate: null },
          pluginId: {
            id: "plugin-1",
            href: "/settings/labs/plugins/plugin-1",
            hrefTemplate: "/settings/labs/plugins/[pluginId]",
          },
          actionKey: {
            id: "launchVote",
            href: "/settings/labs/plugins/plugin-1/actions/launchVote",
            hrefTemplate: "/settings/labs/plugins/[pluginId]/actions/[actionKey]",
          },
          commandId: {
            id: "command-1",
            href: "/settings/labs/commands/command-1",
            hrefTemplate: "/settings/labs/commands/[commandId]",
          },
          taskId: {
            id: "task-1",
            href: "/settings/labs/async-tasks/task-1",
            hrefTemplate: "/settings/labs/async-tasks/[taskId]",
          },
        },
      }),
    );

    const { getReleasePayload } = await import("./release-status");

    const payload = await getReleasePayload();

    expect(payload.available).toBe(true);
    expect(payload.operatorCorrelation.classroomSessionId.href).toBe(
      "/settings/labs/incidents/session-1",
    );
    expect(payload.operatorCorrelation.pluginId.href).toBe(
      "/settings/labs/plugins/plugin-1",
    );
    expect(payload.operatorCorrelation.actionKey.href).toBe(
      "/settings/labs/plugins/plugin-1/actions/launchVote",
    );
    expect(payload.operatorCorrelationComplete).toBe(true);
  });
});
