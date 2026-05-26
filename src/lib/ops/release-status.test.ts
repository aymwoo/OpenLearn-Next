import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getAsyncTaskOperatorOverviewDTO: vi.fn(),
  getSystemTransportSettings: vi.fn(),
  getServerEnv: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/lib/dal/async-task-operator", () => ({
  getAsyncTaskOperatorOverviewDTO: mocks.getAsyncTaskOperatorOverviewDTO,
}));

vi.mock("@/lib/dal/system-transport-settings", () => ({
  getSystemTransportSettings: mocks.getSystemTransportSettings,
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

    mocks.getAsyncTaskOperatorOverviewDTO.mockResolvedValue({
      platformHealth: {
        asyncTasksEnabled: true,
        redisConfigured: true,
        redisReachable: true,
        prefix: "openlearn:async-tasks",
        instanceId: "worker-1",
        producerState: "ready",
        workerState: "ready",
        queueEventsState: "ready",
        lastError: null,
        lastHealthyAt: "2026-05-26T09:00:00.000Z",
        backlog: {
          level: "healthy",
          reason: "worker heartbeat 与队列积压都在可接受范围内。",
          queuedCount: 0,
          retryingCount: 0,
          runningCount: 1,
          oldestActiveAgeMinutes: 1,
          staleHeartbeat: false,
          trustedFacts: "worker heartbeat 与 task ledger 仍可信。",
          caution: "当前没有额外 caution。",
          nextStep: "继续观察。",
        },
        workerHeartbeats: [
          {
            instanceId: "worker-1",
            status: "ready",
            queueNames: ["async-tasks"],
            lastSeenAt: "2026-05-26T09:00:00.000Z",
            startedAt: "2026-05-26T08:50:00.000Z",
            stoppedAt: null,
            lastSignal: null,
          },
        ],
      },
      problemTasks: [],
      emptyState: null,
    });

    mocks.getSystemTransportSettings.mockResolvedValue({
      classroomTransportMode: "redis_fanout",
      effectiveMode: "redis_fanout",
      deployStatus: "redis_enabled",
      canManage: true,
      deployAllowsRedis: true,
      redisConfigured: true,
      redisReachable: true,
      degraded: false,
      degradedReason: null,
      updatedById: "user-1",
      updatedAt: "2026-05-26T09:00:00.000Z",
      health: {
        deployAllowsRedis: true,
        redisConfigured: true,
        redisReachable: true,
        connectionState: "ready",
        desiredTopicCount: 3,
        subscribedTopicCount: 3,
        lastError: null,
        lastHealthyAt: "2026-05-26T09:00:00.000Z",
        instanceId: "runtime-1",
      },
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
  });

  it("getHealthPayload only reports process alive", async () => {
    const { getHealthPayload } = await import("./release-status");

    const payload = await getHealthPayload();

    expect(payload.kind).toBe("health");
    expect(payload.ok).toBe(true);
    expect(payload.process).toBe("alive");
    expect(payload.checkedAt).toEqual(expect.any(String));
    expect(payload).not.toHaveProperty("components");
    expect(mocks.getAsyncTaskOperatorOverviewDTO).not.toHaveBeenCalled();
    expect(mocks.getSystemTransportSettings).not.toHaveBeenCalled();
  });

  it("getReadyPayload blocks on worker degradation but keeps fanout non-blocking", async () => {
    mocks.getAsyncTaskOperatorOverviewDTO.mockResolvedValueOnce({
      platformHealth: {
        asyncTasksEnabled: true,
        redisConfigured: true,
        redisReachable: false,
        prefix: "openlearn:async-tasks",
        instanceId: "worker-1",
        producerState: "degraded",
        workerState: "degraded",
        queueEventsState: "degraded",
        lastError: "redis down",
        lastHealthyAt: null,
        backlog: {
          level: "critical",
          reason: "worker heartbeat 已超过 45 秒未刷新。",
          queuedCount: 5,
          retryingCount: 2,
          runningCount: 0,
          oldestActiveAgeMinutes: 31,
          staleHeartbeat: true,
          trustedFacts: "SQLite task ledger 与最近一次 heartbeat 记录仍然可信。",
          caution: "当前不能把页面上的 worker 在线态当作实时健康结论。",
          nextStep: "先检查 worker 进程与 Redis 连接，再回到单任务详情确认是否需要 recovery。",
        },
        workerHeartbeats: [],
      },
      problemTasks: [],
      emptyState: null,
    });

    mocks.getSystemTransportSettings.mockResolvedValueOnce({
      classroomTransportMode: "redis_fanout",
      effectiveMode: "local_only",
      deployStatus: "redis_degraded",
      canManage: true,
      deployAllowsRedis: true,
      redisConfigured: true,
      redisReachable: false,
      degraded: true,
      degradedReason: "fanout redis unreachable",
      updatedById: "user-1",
      updatedAt: "2026-05-26T09:00:00.000Z",
      health: {
        deployAllowsRedis: true,
        redisConfigured: true,
        redisReachable: false,
        connectionState: "degraded",
        desiredTopicCount: 3,
        subscribedTopicCount: 0,
        lastError: "fanout redis unreachable",
        lastHealthyAt: null,
        instanceId: "runtime-1",
      },
    });

    const { getReadyPayload } = await import("./release-status");

    const payload = await getReadyPayload();

    expect(payload.ok).toBe(false);
    expect(payload.kind).toBe("ready");
    expect(payload.components.worker.blocking).toBe(true);
    expect(payload.components.worker.posture).toBe("degraded");
    expect(payload.components.fanout.blocking).toBe(false);
    expect(payload.components.fanout.posture).toBe("degraded");
    expect(payload.components.fanout.reason).toContain("fanout");
  });

  it("getReleasePayload returns empty state when canonical pointer is missing", async () => {
    mocks.readFile.mockImplementationOnce(async () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });

    const { getReleasePayload } = await import("./release-status");

    const payload = await getReleasePayload();

    expect(payload.available).toBe(false);
    expect(payload.ok).toBe(false);
    expect(payload.currentRelease).toBeNull();
    expect(payload.greenRelease?.releaseId).toBe("release-122");
    expect(payload.reason).toContain("current.json");
  });

  it("getReleasePayload returns current and green pointers with operator correlation", async () => {
    const { getReleasePayload } = await import("./release-status");

    const payload = await getReleasePayload();

    expect(payload.available).toBe(true);
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
});
