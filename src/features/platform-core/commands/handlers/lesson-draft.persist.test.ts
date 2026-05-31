import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  persistDraftLessonVersion: vi.fn(),
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: mocks.assertActiveTeacher,
  persistDraftLessonVersion: mocks.persistDraftLessonVersion,
}));

// cache-policy 为 ESM 纯函数，无需 mock。
import { lessonDraftCommandHandlers } from "./lesson-draft";

type PersistCommand = {
  id: string;
  type: "lesson.draft.persist";
  actor: { actorId: string; actorScope: "teacher" };
  scope: { schoolId: string; pluginId: string };
  payload: { lessonId: string; steps: Array<{ type: "content"; title: string; body: string; teacherNotes: string; materialRefs: unknown[] }> };
  correlation: { correlationId: string; causationId: string | null; producer: string };
  audit: { delegatedActor: null; approval: null };
};

function createPersistCommand(overrides?: Partial<PersistCommand["payload"]>): PersistCommand {
  return {
    id: "command-lesson.draft.persist",
    type: "lesson.draft.persist",
    actor: { actorId: "t1", actorScope: "teacher" },
    scope: { schoolId: "s1", pluginId: "core.lesson-agent" },
    payload: {
      lessonId: "lesson-1",
      steps: [
        { type: "content", title: "导入", body: "正文内容", teacherNotes: "教师备注", materialRefs: [] },
      ],
      ...overrides,
    },
    correlation: {
      correlationId: "corr-lesson-draft-persist",
      causationId: null,
      producer: "test-suite",
    },
    audit: { delegatedActor: null, approval: null },
  };
}

const mockDraftVersion = {
  draftVersionId: "draft-v1",
  version: 1,
  stepCount: 1,
};

describe("executeLessonDraftPersist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s1"] });
    mocks.persistDraftLessonVersion.mockResolvedValue(mockDraftVersion);
  });

  // Test 1: 合法 teacher（schoolId 命中 scope）→ authorizeLessonDraftCommand 通过 → 调 DAL
  it("合法 teacher 经授权后调 DAL 并返回 resultSummary 含 draftVersionId/version/stepCount", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });

    expect(mocks.persistDraftLessonVersion).toHaveBeenCalledTimes(1);
    expect(result.resultSummary).toMatchObject({
      draftVersionId: "draft-v1",
      version: 1,
      stepCount: 1,
    });
    expect(result.failureEvent).toBeNull();
  });

  // Test 2: command.scope.schoolId ∉ teacher scope → authorizeLessonDraftCommand 抛 TEACHER_AUTH_REQUIRED
  it("command.scope.schoolId 不在教师 scope 时抛 TEACHER_AUTH_REQUIRED 且 DAL 未被调用 (T-63-01)", async () => {
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s2"] });

    await expect(
      lessonDraftCommandHandlers["lesson.draft.persist"].execute({
        command: createPersistCommand() as never,
        attemptNumber: 1,
      }),
    ).rejects.toThrow("TEACHER_AUTH_REQUIRED");

    expect(mocks.persistDraftLessonVersion).not.toHaveBeenCalled();
  });

  // Test 3: 返回 invalidation.tags 含 draft:${lessonId} 与 lesson:${lessonId}
  it("返回 invalidation.tags 含 draft:${lessonId} 与 lesson:${lessonId}", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });

    expect(result.invalidation.tags).toEqual(expect.arrayContaining(["draft:lesson-1", "lesson:lesson-1"]));
  });

  // Test 4: emittedEvents 含一条 withAudit 包裹的 lesson.draft.persisted，summary-only（无 *Json 键）
  it("emittedEvents 含 withAudit 包裹的 lesson.draft.persisted，payload summary-only 无 *Json 键", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });

    expect(result.emittedEvents).toHaveLength(1);
    const event = result.emittedEvents[0];
    expect(event.eventType).toBe("lesson.draft.persisted");
    expect(event.audit).toBeDefined();

    // summary-only：payload 无 *Json 键
    const payload = event.payload as Record<string, unknown>;
    expect(Object.keys(payload).some((k) => k.endsWith("Json"))).toBe(false);
    expect(Object.keys(payload).some((k) => k.endsWith("json"))).toBe(false);
  });

  // Test 5: 传入 command.id 作 sourceCommandId、assertActiveTeacher().userId 作 createdById 流入 DAL
  it("sourceCommandId=command.id 且 createdById=userId 流入 DAL（均不来自 payload）", async () => {
    await lessonDraftCommandHandlers["lesson.draft.persist"].execute({
      command: createPersistCommand() as never,
      attemptNumber: 1,
    });

    expect(mocks.persistDraftLessonVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: "lesson-1",
        sourceCommandId: "command-lesson.draft.persist",
        createdById: "t1",
      }),
    );
  });
});
