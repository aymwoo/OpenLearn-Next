import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ops/release-status", () => ({
  getHealthPayload: vi.fn(),
  getReadyPayload: vi.fn(),
  getReleasePayload: vi.fn(),
}));

describe("ops probe routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/health returns 200, kind health, and no-store headers", async () => {
    const releaseStatus = await import("@/lib/ops/release-status");
    vi.mocked(releaseStatus.getHealthPayload).mockResolvedValue({
      kind: "health",
      ok: true,
      process: "alive",
      checkedAt: "2026-05-26T09:00:00.000Z",
    });

    const { GET } = await import("./health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.kind).toBe("health");
  });

  it("GET /api/ready returns 503 when blocking posture fails but keeps fanout non-blocking", async () => {
    const releaseStatus = await import("@/lib/ops/release-status");
    vi.mocked(releaseStatus.getReadyPayload).mockResolvedValue({
      kind: "ready",
      ok: false,
      checkedAt: "2026-05-26T09:00:00.000Z",
      components: {
        db: { posture: "green", blocking: true, reason: "ok", nextStep: "ok" },
        web: { posture: "green", blocking: true, reason: "ok", nextStep: "ok" },
        worker: {
          posture: "degraded",
          blocking: true,
          reason: "worker unavailable",
          nextStep: "restart worker",
        },
        fanout: {
          posture: "degraded",
          blocking: false,
          reason: "fanout degraded",
          nextStep: "observe optional transport",
        },
      },
      blocking: ["worker"],
      reason: "worker blocking",
      nextStep: "restart worker",
    });

    const { GET } = await import("./ready/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.components.worker).toBeDefined();
    expect(body.components.fanout.blocking).toBe(false);
  });

  it("GET /api/release returns unavailable payload without scanning manifest directory", async () => {
    const releaseStatus = await import("@/lib/ops/release-status");
    vi.mocked(releaseStatus.getReleasePayload).mockResolvedValue({
      kind: "release",
      ok: false,
      available: false,
      checkedAt: "2026-05-26T09:00:00.000Z",
      releaseId: null,
      gitSha: null,
      environment: null,
      releasedAt: null,
      rollbackTarget: null,
      manifestPath: null,
      currentRelease: null,
      greenRelease: null,
      migration: null,
      restoreDrill: null,
      operatorCorrelation: {
        schoolId: { id: null, href: null, hrefTemplate: null },
        classroomSessionId: { id: null, href: null, hrefTemplate: "/settings/labs/incidents/[sessionId]" },
        lessonVersionId: { id: null, href: null, hrefTemplate: null },
        pluginId: { id: null, href: null, hrefTemplate: "/settings/labs/plugins/[pluginId]" },
        actionKey: { id: null, href: null, hrefTemplate: "/settings/labs/plugins/[pluginId]/actions/[actionKey]" },
        commandId: { id: null, href: null, hrefTemplate: "/settings/labs/commands/[commandId]" },
        taskId: { id: null, href: null, hrefTemplate: "/settings/labs/async-tasks/[taskId]" },
        runtimeInspector: { href: null, hrefTemplate: "/settings/labs/runtime-inspector?runtimeSessionId={classroomSessionId}" },
        pluginActionDetail: { href: null, hrefTemplate: "/settings/labs/plugins/[pluginId]/actions/[actionKey]" },
      },
      operatorCorrelationComplete: false,
      reason: "current.json missing",
      nextStep: "create pointer",
    });

    const { GET } = await import("./release/route");
    const response = await GET();
    const body = await response.json();
    const routeSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./release/route.ts", import.meta.url), "utf8"),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.available).toBe(false);
    expect(body.gitSha).toBeNull();
    expect(routeSource).not.toContain("readdir");
  });

  it("GET /api/release returns release identity, rollbackTarget, greenRelease and operatorCorrelation fields", async () => {
    const releaseStatus = await import("@/lib/ops/release-status");
    vi.mocked(releaseStatus.getReleasePayload).mockResolvedValue({
      kind: "release",
      ok: true,
      available: true,
      checkedAt: "2026-05-26T09:00:00.000Z",
      releaseId: "release-123",
      gitSha: "abc1234",
      environment: "pilot-single-school",
      releasedAt: "2026-05-26T09:10:00.000Z",
      rollbackTarget: "release-122",
      manifestPath: "/srv/openlearn/manifests/release-123.json",
      currentRelease: {
        releaseId: "release-123",
        gitSha: "abc1234",
        environment: "pilot-single-school",
        releasedAt: "2026-05-26T09:10:00.000Z",
        rollbackTarget: "release-122",
        manifestPath: "/srv/openlearn/manifests/release-123.json",
      },
      greenRelease: {
        releaseId: "release-122",
        gitSha: "def5678",
        environment: "pilot-single-school",
        releasedAt: "2026-05-26T08:00:00.000Z",
        rollbackTarget: null,
        manifestPath: "/srv/openlearn/manifests/release-122.json",
      },
      migration: { command: "pnpm db:migrate", status: "passed" },
      restoreDrill: { status: "passed" },
      operatorCorrelation: {
        schoolId: { id: "school-1", href: null, hrefTemplate: null },
        classroomSessionId: { id: "session-1", href: "/settings/labs/incidents/session-1", hrefTemplate: "/settings/labs/incidents/[sessionId]" },
        lessonVersionId: { id: "lesson-version-1", href: null, hrefTemplate: null },
        pluginId: { id: "plugin-1", href: "/settings/labs/plugins/plugin-1", hrefTemplate: "/settings/labs/plugins/[pluginId]" },
        actionKey: { id: "launchVote", href: null, hrefTemplate: "/settings/labs/plugins/[pluginId]/actions/[actionKey]" },
        commandId: { id: "command-1", href: "/settings/labs/commands/command-1", hrefTemplate: "/settings/labs/commands/[commandId]" },
        taskId: { id: "task-1", href: "/settings/labs/async-tasks/task-1", hrefTemplate: "/settings/labs/async-tasks/[taskId]" },
        runtimeInspector: { href: "/settings/labs/runtime-inspector?runtimeSessionId=session-1", hrefTemplate: "/settings/labs/runtime-inspector?runtimeSessionId={classroomSessionId}" },
        pluginActionDetail: { href: "/settings/labs/plugins/plugin-1/actions/launchVote", hrefTemplate: "/settings/labs/plugins/[pluginId]/actions/[actionKey]" },
      },
      operatorCorrelationComplete: true,
      reason: "loaded",
      nextStep: "continue",
    });

    const { GET } = await import("./release/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.gitSha).toBe("abc1234");
    expect(body.rollbackTarget).toBe("release-122");
    expect(body.greenRelease.releaseId).toBe("release-122");
    expect(body.operatorCorrelation.taskId.id).toBe("task-1");
  });
});
