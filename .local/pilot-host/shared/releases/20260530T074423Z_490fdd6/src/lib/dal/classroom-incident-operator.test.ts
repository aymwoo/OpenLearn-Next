import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserDTO = vi.fn();
const getUserMembershipsDTO = vi.fn();
const listOperatorVisibleAsyncTasks = vi.fn();
const listOperatorVisiblePlatformCommands = vi.fn();
const readPluginGovernanceLifecycle = vi.fn();
const runCurrentVotingRecoveryAction = vi.fn();

const findManyClassroomSessions = vi.fn();
const findFirstClassroomSessions = vi.fn();
const findFirstClasses = vi.fn();
const findFirstLessons = vi.fn();
const findFirstPublishedLessonVersions = vi.fn();
const findManyRuntimeStepSessions = vi.fn();
const findManyGovernanceAudits = vi.fn();
const findManyPluginActionAudits = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO,
}));

vi.mock("@/features/async-tasks/server/operator-read-model", () => ({
  listOperatorVisibleAsyncTasks,
}));

vi.mock("@/features/platform-core/observability/operator-read-model", () => ({
  listOperatorVisiblePlatformCommands,
}));

vi.mock("@/features/platform-core/actions/registry", () => ({
  readPluginGovernanceLifecycle,
}));

vi.mock("@/actions/classroom-actions", () => ({
  runCurrentVotingRecoveryAction,
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      classroomSessions: {
        findMany: findManyClassroomSessions,
        findFirst: findFirstClassroomSessions,
      },
      classes: {
        findFirst: findFirstClasses,
      },
      lessons: {
        findFirst: findFirstLessons,
      },
      publishedLessonVersions: {
        findFirst: findFirstPublishedLessonVersions,
      },
      runtimeStepSessions: {
        findMany: findManyRuntimeStepSessions,
      },
      governanceAudits: {
        findMany: findManyGovernanceAudits,
      },
      pluginActionAudits: {
        findMany: findManyPluginActionAudits,
      },
    },
  },
}));

const listSource = readFileSync("src/lib/dal/classroom-incident-list.ts", "utf8");
const detailSource = readFileSync("src/lib/dal/classroom-incident-operator.ts", "utf8");

function seedAuthorizedScope() {
  getCurrentUserDTO.mockResolvedValue({ id: "admin-1" });
  getUserMembershipsDTO.mockResolvedValue([
    { schoolId: "school-1", role: "admin", status: "active" },
  ]);
}

describe("classroom incident contracts and read model", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    seedAuthorizedScope();

    findManyClassroomSessions.mockResolvedValue([
      {
        id: "session-1",
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        classId: "class-1",
        teacherId: "teacher-1",
        activeStepId: "step-1",
        locked: false,
        status: "live",
        version: 7,
        updatedAt: new Date("2026-05-26T01:00:00Z"),
      },
    ]);
    findFirstClassroomSessions.mockResolvedValue({
      id: "session-1",
      lessonId: "lesson-1",
      publishedVersionId: "pub-1",
      classId: "class-1",
      teacherId: "teacher-1",
      activeStepId: "step-1",
      locked: false,
      status: "live",
      version: 7,
      updatedAt: new Date("2026-05-26T01:00:00Z"),
    });
    findFirstClasses.mockResolvedValue({
      id: "class-1",
      schoolId: "school-1",
      name: "高一一班",
    });
    findFirstLessons.mockResolvedValue({
      id: "lesson-1",
      title: "古诗导读",
    });
    findFirstPublishedLessonVersions.mockResolvedValue({
      id: "pub-1",
      version: 3,
    });
    findManyRuntimeStepSessions.mockResolvedValue([
      {
        id: "runtime-1",
        classroomSessionId: "session-1",
        schoolId: "school-1",
        createdAt: new Date("2026-05-26T00:55:00Z"),
      },
    ]);
    findManyGovernanceAudits.mockResolvedValue([
      {
        id: "gov-1",
        classroomSessionId: "session-1",
        runtimeSessionId: "runtime-1",
        pluginId: "plugin-1",
        commandId: "command-1",
        schoolId: "school-1",
        action: "plugin.resume",
        decision: "denied",
        reasonCode: "activation_failed",
        createdAt: new Date("2026-05-26T00:58:00Z"),
      },
    ]);
    findManyPluginActionAudits.mockResolvedValue([
      {
        id: "plugin-audit-1",
        pluginId: "plugin-1",
        commandId: "command-1",
        action: "addStepSuggestion",
        decision: "denied",
        reasonCode: "activation_failed",
        schoolId: "school-1",
        correlationId: "runtime-1",
        createdAt: new Date("2026-05-26T00:57:00Z"),
      },
    ]);
    listOperatorVisiblePlatformCommands.mockResolvedValue([
      {
        commandId: "command-1",
        schoolId: "school-1",
        commandType: "plugin.resume",
        status: "failed",
        statusLabel: "已失败",
        latestAttemptNumber: 1,
        pluginId: "plugin-1",
        actorId: "teacher-1",
        actorScope: "teacher",
        correlationId: "corr-1",
        causationId: null,
        producer: "plugin-actions",
        createdAt: "2026-05-26T00:57:00.000Z",
        updatedAt: "2026-05-26T00:58:00.000Z",
        completedAt: "2026-05-26T00:58:00.000Z",
        resultSummary: null,
        resultSummaryLabel: "无结果摘要",
        auditSummary: null,
        auditSummaryLabel: null,
        failureAttribution: {
          scope: "plugin",
          pluginId: "plugin-1",
          reasonCode: "activation_failed",
          recommendedRecoveryAction: "retry",
        },
        failureSummaryLabel: "plugin:activation_failed -> retry",
        invalidationIntent: {
          tags: [],
          label: "无 invalidation intent",
        },
      },
    ]);
    listOperatorVisibleAsyncTasks.mockResolvedValue([
      {
        id: "task-1",
        actorId: "teacher-1",
        schoolId: "school-1",
        taskType: "classroom.session_summary",
        status: "failed",
        enqueueIntentStatus: "dispatched",
        entityType: "classroom_session",
        entityId: "session-1",
        entityLabel: "课堂汇总",
        summaryKey: "task.summary",
        latestFailureReason: "worker backlog",
        updatedAt: new Date("2026-05-26T00:59:00Z"),
      },
    ]);
    readPluginGovernanceLifecycle.mockResolvedValue({
      id: "plugin-1",
      schoolId: "school-1",
      pluginKey: "voting-plugin",
      name: "课堂投票",
      lifecycleState: "failed",
      blocked: true,
      killSwitchEnabled: false,
      reasonCode: "activation_failed",
      recommendedRecoveryAction: "retry",
      executableActionCatalog: [],
      blockedActionDiagnostics: [
        {
          actionKey: "addStepSuggestion",
          reasonCode: "activation_failed",
          recommendedRecoveryAction: "retry",
        },
      ],
      uninstall: {
        posture: "retain",
        cleanupRequested: false,
        blocked: false,
        reasonCode: null,
        recommendedRecoveryAction: null,
        cleanupConfirmationToken: "token",
        preflightSummary: {
          lessonExtCount: 0,
          stepExtCount: 0,
          resourceExtCount: 0,
          ownedBusinessCount: 0,
          totalCount: 0,
        },
      },
    });
  });

  it("limits list DTO to classroom-first summary fields and at most two relation chips", async () => {
    const { ClassroomIncidentListDTOSchema } = await import(
      "@/lib/dto/classroom-incident-list"
    );

    expect(() =>
      ClassroomIncidentListDTOSchema.parse({
        scopeRole: "admin",
        rows: [
          {
            classroomSessionId: "session-1",
            classId: "class-1",
            className: "高一一班",
            lessonId: "lesson-1",
            lessonTitle: "古诗导读",
            lessonVersionLabel: "v3",
            posture: "degraded",
            summary: "投票插件当前恢复失败。",
            impactScope: "current_classroom",
            updatedAt: "2026-05-26T01:00:00.000Z",
            detailHref: "/settings/labs/incidents/session-1",
            relationChips: [
              { kind: "plugin", label: "课堂投票", href: "/settings/labs/plugins/plugin-1" },
              { kind: "command", label: "plugin.resume", href: "/settings/labs/commands/command-1" },
              { kind: "task", label: "任务", href: "/settings/labs/async-tasks/task-1" },
            ],
          },
        ],
        emptyState: null,
      }),
    ).toThrow();
  });

  it("locks detail DTO to summary-first sections and forbids raw timeline diagnostics", async () => {
    const { ClassroomIncidentOperatorDTOSchema } = await import(
      "@/lib/dto/classroom-incident-operator"
    );

    expect(() =>
      ClassroomIncidentOperatorDTOSchema.parse({
        scopeRole: "admin",
        hero: {
          classroomSessionId: "session-1",
          classId: "class-1",
          className: "高一一班",
          lessonId: "lesson-1",
          lessonTitle: "古诗导读",
          lessonVersionId: "pub-1",
          lessonVersionLabel: "v3",
          runtimeSessionId: "runtime-1",
          sessionStatus: "live",
          updatedAt: "2026-05-26T01:00:00.000Z",
          detailHref: "/settings/labs/incidents/session-1",
        },
        metrics: [
          { key: "session", label: "课堂状态", value: "进行中", tone: "degraded" },
          { key: "plugin", label: "插件姿态", value: "失败", tone: "failed" },
          { key: "command", label: "最新命令", value: "plugin.resume", tone: "failed" },
        ],
        honesty: {
          trustedFacts: "SQLite truth 仍可信。",
          untrustedFacts: "插件恢复结果当前不可视为已健康。",
          impactScope: "current_classroom",
          recommendedNextStep: "查看 runtime inspector。",
          nextStepHref: "/settings/labs/runtime-inspector?runtimeSessionId=runtime-1",
        },
        problemCards: [],
        relatedCards: [
          { kind: "plugin", id: "plugin-1", label: "课堂投票", summary: "插件失败", href: "/settings/labs/plugins/plugin-1", nextStepHref: "/settings/labs/plugins/plugin-1" },
          { kind: "action", id: "action:addStepSuggestion", label: "addStepSuggestion", summary: "动作被阻断", href: "/settings/labs/plugins/plugin-1/actions/addStepSuggestion", nextStepHref: "/settings/labs/plugins/plugin-1/actions/addStepSuggestion" },
          { kind: "command", id: "command-1", label: "plugin.resume", summary: "最新命令失败", href: "/settings/labs/commands/command-1", nextStepHref: "/settings/labs/commands/command-1" },
          { kind: "task", id: "task-1", label: "课堂汇总", summary: "任务失败", href: "/settings/labs/async-tasks/task-1", nextStepHref: "/settings/labs/async-tasks/task-1" },
        ],
        lightActions: [],
        guardedActions: [],
        rawTimeline: [],
      }),
    ).toThrow();
  });

  it("requires explicit plugin action command and task relation cards with stable hrefs", async () => {
    const { ClassroomIncidentRelatedCardKindSchema } = await import(
      "@/lib/dto/classroom-incident-operator"
    );

    expect(ClassroomIncidentRelatedCardKindSchema.options).toEqual([
      "runtime",
      "plugin",
      "action",
      "command",
      "task",
    ]);
  });

  it("rejects foreign-school classroom sessions from the operator scope", async () => {
    findFirstClasses.mockResolvedValueOnce({
      id: "class-2",
      schoolId: "school-foreign",
      name: "外校班级",
    });
    findFirstClassroomSessions.mockResolvedValueOnce({
      id: "session-2",
      lessonId: "lesson-1",
      publishedVersionId: "pub-1",
      classId: "class-2",
      teacherId: "teacher-1",
      activeStepId: "step-1",
      locked: false,
      status: "live",
      version: 1,
      updatedAt: new Date("2026-05-26T01:00:00Z"),
    });

    const { getClassroomIncidentOperatorDTO } = await import(
      "./classroom-incident-operator"
    );

    await expect(
      getClassroomIncidentOperatorDTO({ classroomSessionId: "session-2" }),
    ).rejects.toThrow("CLASSROOM_INCIDENT_NOT_FOUND");
  });

  it("keeps operator scope on admin developer only and never introduces support membership", async () => {
    expect(listSource).toContain('import "server-only"');
    expect(detailSource).toContain('import "server-only"');
    expect(listSource).not.toContain('"support"');
    expect(detailSource).not.toContain('"support"');
    expect(listSource).toContain("getUserMembershipsDTO");
    expect(detailSource).toContain("getUserMembershipsDTO");
    expect(listSource).toContain('scopeRole: "developer"');
    expect(detailSource).toContain('scopeRole: "developer"');
    expect(listSource).toContain('scopeRole: "admin"');
    expect(detailSource).toContain('scopeRole: "admin"');
  });

  it("builds incident-first list and detail DTOs plus a light recovery seam from one truth source", async () => {
    const { getClassroomIncidentListDTO } = await import("./classroom-incident-list");
    const { getClassroomIncidentOperatorDTO } = await import(
      "./classroom-incident-operator"
    );
    const { runClassroomIncidentLightRecovery } = await import(
      "./classroom-incident-operator-actions"
    );

    const list = await getClassroomIncidentListDTO();
    const detail = await getClassroomIncidentOperatorDTO({
      classroomSessionId: "session-1",
    });

    expect(list.scopeRole).toBe("admin");
    expect(list.rows).toHaveLength(1);
    expect(list.rows[0]).toMatchObject({
      classroomSessionId: "session-1",
      lessonVersionLabel: "v3",
      detailHref: "/settings/labs/incidents/session-1",
      relationChips: [
        expect.objectContaining({ kind: "plugin" }),
        expect.objectContaining({ kind: "command" }),
      ],
    });

    expect(detail.hero).toMatchObject({
      classroomSessionId: "session-1",
      lessonVersionLabel: "v3",
      runtimeSessionId: "runtime-1",
    });
    expect(detail.metrics).toHaveLength(4);
    expect(detail.relatedCards.map((card) => card.kind)).toEqual([
      "runtime",
      "plugin",
      "action",
      "command",
      "task",
    ]);
    expect(detail.relatedCards.find((card) => card.kind === "plugin")?.href).toBe(
      "/settings/labs/plugins/plugin-1",
    );
    expect(detail.relatedCards.find((card) => card.kind === "action")?.href).toBe(
      "/settings/labs/plugins/plugin-1/actions/addStepSuggestion",
    );
    expect(detail.lightActions.map((action) => action.action)).toEqual([
      "retry",
      "reconcile",
    ]);
    expect(detail.guardedActions.every((action) => action.enabled === false)).toBe(true);

    runCurrentVotingRecoveryAction.mockResolvedValueOnce({
      ok: true,
      data: { sessionId: "session-1", applied: true },
    });

    await expect(
      runClassroomIncidentLightRecovery({
        classroomSessionId: "session-1",
        stepId: "step-1",
        action: "retry",
      }),
    ).resolves.toEqual({
      ok: true,
      data: { sessionId: "session-1", applied: true },
    });
    expect(runCurrentVotingRecoveryAction).toHaveBeenCalledWith({
      sessionId: "session-1",
      stepId: "step-1",
      recoveryAction: "retry",
    });
  });
});
