import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  createDraftLessonStepTool: vi.fn(),
  applyDraftToLiveLesson: vi.fn(),
  discardDraftLessonVersion: vi.fn(),
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: mocks.assertActiveTeacher,
  applyDraftToLiveLesson: mocks.applyDraftToLiveLesson,
  discardDraftLessonVersion: mocks.discardDraftLessonVersion,
}));

vi.mock("@/server/ai/tools", () => ({
  createDraftLessonStepTool: mocks.createDraftLessonStepTool,
}));

import { PlatformCommandExecutionError } from "../contracts";
import {
  LessonDraftProducedEventSchema,
  LessonDraftRejectedEventSchema,
  LessonDraftRequestedEventSchema,
  LessonToolInvokedEventSchema,
} from "@/features/platform-core/events/contracts";
import { DraftGuardrailRejection } from "@/lib/dto/draft-guardrails";
import { lessonDraftCommandHandlers } from "./lesson-draft";

type RunCommand = {
  id: string;
  type: "lesson.draft.run";
  actor: { actorId: string; actorScope: "teacher" };
  scope: { schoolId: string; pluginId: string };
  payload: { lessonId: string; stepType: "content" | "task" | "quiz"; intent: string };
  correlation: { correlationId: string; causationId: string | null; producer: string };
  audit: { delegatedActor: null; approval: null };
};

function createRunCommand(overrides?: Partial<RunCommand["payload"]>): RunCommand {
  return {
    id: "command-lesson.draft.run",
    type: "lesson.draft.run",
    actor: { actorId: "t1", actorScope: "teacher" },
    scope: { schoolId: "s1", pluginId: "core.lesson-agent" },
    payload: {
      lessonId: "lesson-1",
      stepType: "content",
      intent: "起草一个导入步骤",
      ...overrides,
    },
    correlation: {
      correlationId: "corr-lesson-draft",
      causationId: null,
      producer: "test-suite",
    },
    audit: { delegatedActor: null, approval: null },
  };
}

const contentStep = {
  type: "content" as const,
  title: "导入",
  body: "正文内容",
  teacherNotes: "教师备注",
  materialRefs: [] as unknown[],
};

function mockToolReturning(step: unknown) {
  mocks.createDraftLessonStepTool.mockReturnValue({
    execute: vi.fn(async () => step),
  });
}

function mockToolThrowing(error: Error) {
  mocks.createDraftLessonStepTool.mockReturnValue({
    execute: vi.fn(async () => {
      throw error;
    }),
  });
}

function mockToolRejecting(
  reasonCode: "illegal_step_type" | "oversize_field" | "invalid_teaching_structure" | "quiz_correct_index_out_of_range" | "forbidden_content",
  stepType: "content" | "task" | "quiz",
) {
  mocks.createDraftLessonStepTool.mockReturnValue({
    execute: vi.fn(async () => {
      throw new DraftGuardrailRejection({ reasonCode, stepType });
    }),
  });
}

describe("lesson.draft.run command event emission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s1"] });
    mockToolReturning(contentStep);
  });

  it("成功时经 emittedEvents 落账三条 AI 域事件（AGENT-04）", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.run"].execute({
      command: createRunCommand() as never,
      attemptNumber: 1,
    });

    expect(result.failureEvent).toBeNull();
    expect(result.emittedEvents).toHaveLength(3);
    const eventTypes = new Set(result.emittedEvents.map((event) => event.eventType));
    expect(eventTypes).toEqual(
      new Set(["lesson.draft.requested", "lesson.tool.invoked", "lesson.draft.produced"]),
    );
  });

  it("三事件 payload 均 summary-only（无整包步骤快照 / D-53-09）", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.run"].execute({
      command: createRunCommand() as never,
      attemptNumber: 1,
    });

    const requested = result.emittedEvents.find((e) => e.eventType === "lesson.draft.requested");
    const invoked = result.emittedEvents.find((e) => e.eventType === "lesson.tool.invoked");
    const produced = result.emittedEvents.find((e) => e.eventType === "lesson.draft.produced");

    // 经各自 strict + summary-only 守卫 schema 校验通过 → 证明无 *Json 字段、无未声明键。
    expect(LessonDraftRequestedEventSchema.safeParse(requested).success).toBe(true);
    expect(LessonToolInvokedEventSchema.safeParse(invoked).success).toBe(true);
    expect(LessonDraftProducedEventSchema.safeParse(produced).success).toBe(true);

    // produced 仅携带 { stepType, title, succeeded } 类摘要，绝无整包步骤字段。
    expect(produced?.payload).not.toHaveProperty("body");
    expect(produced?.payload).not.toHaveProperty("materialRefs");
    expect(Object.keys(produced?.payload ?? {}).sort()).toEqual(["stepType", "succeeded", "title"]);
  });

  it("生成步骤包经 resultSummary 回传（SC3）", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.run"].execute({
      command: createRunCommand() as never,
      attemptNumber: 1,
    });

    expect(result.resultSummary).not.toBeNull();
    expect(result.resultSummary).toMatchObject({
      stepType: "content",
      title: "导入",
      succeeded: true,
    });
    // 调用方可经 resultSummary 拿到可还原的整包步骤。
    expect(result.resultSummary?.step).toMatchObject({ type: "content", body: "正文内容" });
  });

  it("teacherId 经授权 actor 闭包注入工具（非 LLM/payload 字段）", async () => {
    await lessonDraftCommandHandlers["lesson.draft.run"].execute({
      command: createRunCommand() as never,
      attemptNumber: 1,
    });

    expect(mocks.createDraftLessonStepTool).toHaveBeenCalledWith({ teacherId: "t1" });
  });

  it("生成失败时抛 PlatformCommandExecutionError，且不返回任何 domain 事件（D-53-08）", async () => {
    mockToolThrowing(new Error("GEN_FAIL"));

    await expect(
      lessonDraftCommandHandlers["lesson.draft.run"].execute({
        command: createRunCommand() as never,
        attemptNumber: 1,
      }),
    ).rejects.toBeInstanceOf(PlatformCommandExecutionError);

    try {
      await lessonDraftCommandHandlers["lesson.draft.run"].execute({
        command: createRunCommand() as never,
        attemptNumber: 1,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PlatformCommandExecutionError);
      const typed = error as PlatformCommandExecutionError;
      expect(typed.failureEvent).not.toBeNull();
      expect(typed.failureEvent.eventType).toBe("platform.command.failed");
      expect(typed.failureAttribution).not.toBeNull();
    }
  });

  it("守卫拦截时解析为已解决 outcome，发唯一 lesson.draft.rejected 域事件（EVAL-02/T-65-EVT）", async () => {
    mockToolRejecting("forbidden_content", "quiz");

    const result = await lessonDraftCommandHandlers["lesson.draft.run"].execute({
      command: createRunCommand({ stepType: "quiz" }) as never,
      attemptNumber: 1,
    });

    // 拒绝是已解决 outcome（不抛错），且非失败事件。
    expect(result.failureEvent).toBeNull();
    expect(result.failureAttribution).toBeNull();

    // 仅一条 rejected 事件，绝无 requested/tool.invoked/produced。
    expect(result.emittedEvents).toHaveLength(1);
    const event = result.emittedEvents[0];
    expect(event.eventType).toBe("lesson.draft.rejected");

    // payload summary-only：仅 lessonId/reasonCode/stepType/teacherId（无 step/body/*Json / T-65-PII）。
    expect(Object.keys(event.payload).sort()).toEqual([
      "lessonId",
      "reasonCode",
      "stepType",
      "teacherId",
    ]);
    expect(LessonDraftRejectedEventSchema.safeParse(event).success).toBe(true);
    expect(event.payload).toMatchObject({
      lessonId: "lesson-1",
      stepType: "quiz",
      reasonCode: "forbidden_content",
      teacherId: "t1",
    });
  });

  it("三事件 aggregate 同为 lessonId/lesson，可经同一 commandId 追溯（SC4）", async () => {
    const result = await lessonDraftCommandHandlers["lesson.draft.run"].execute({
      command: createRunCommand() as never,
      attemptNumber: 1,
    });

    for (const event of result.emittedEvents) {
      expect(event.aggregateType).toBe("lesson");
      expect(event.aggregateId).toBe("lesson-1");
    }
  });
});

type AcceptCommand = {
  id: string;
  type: "lesson.draft.accept";
  actor: { actorId: string; actorScope: "teacher" };
  scope: { schoolId: string; pluginId: string };
  payload: { lessonId: string; draftVersionId: string };
  correlation: { correlationId: string; causationId: string | null; producer: string };
  audit: { delegatedActor: null; approval: null };
};

function createAcceptCommand(): AcceptCommand {
  return {
    id: "command-lesson.draft.accept",
    type: "lesson.draft.accept",
    actor: { actorId: "t1", actorScope: "teacher" },
    scope: { schoolId: "s1", pluginId: "core.lesson-agent" },
    payload: { lessonId: "lesson-1", draftVersionId: "draft-1" },
    correlation: {
      correlationId: "corr-lesson-draft-accept",
      causationId: null,
      producer: "test-suite",
    },
    audit: { delegatedActor: null, approval: null },
  };
}

type DiscardCommand = {
  id: string;
  type: "lesson.draft.discard";
  actor: { actorId: string; actorScope: "teacher" };
  scope: { schoolId: string; pluginId: string };
  payload: { lessonId: string; draftVersionId: string };
  correlation: { correlationId: string; causationId: string | null; producer: string };
  audit: { delegatedActor: null; approval: null };
};

function createDiscardCommand(): DiscardCommand {
  return {
    id: "command-lesson.draft.discard",
    type: "lesson.draft.discard",
    actor: { actorId: "t1", actorScope: "teacher" },
    scope: { schoolId: "s1", pluginId: "core.lesson-agent" },
    payload: { lessonId: "lesson-1", draftVersionId: "draft-1" },
    correlation: {
      correlationId: "corr-lesson-draft-discard",
      causationId: null,
      producer: "test-suite",
    },
    audit: { delegatedActor: null, approval: null },
  };
}

describe("lesson.draft.accept / discard event version fidelity（REVIEW-03 / DRAFT-03）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertActiveTeacher.mockResolvedValue({ userId: "t1", schoolIds: ["s1"] });
  });

  it("accepted 事件携带持久化的真实 draft version（>= 1，绝非硬编码 0）", async () => {
    mocks.applyDraftToLiveLesson.mockResolvedValue({
      lessonId: "lesson-1",
      courseId: "course-1",
      draftVersionId: "draft-1",
      appliedStepCount: 4,
      version: 3,
    });

    const result = await lessonDraftCommandHandlers["lesson.draft.accept"].execute({
      command: createAcceptCommand() as never,
      attemptNumber: 1,
    });

    const accepted = result.emittedEvents.find((e) => e.eventType === "lesson.draft.accepted");
    expect(accepted).toBeDefined();
    const version = (accepted!.payload as { version: number }).version;
    expect(version).toBe(3);
    expect(version).toBeGreaterThanOrEqual(1);
    expect(version).not.toBe(0);
  });

  it("accept resultSummary 携带 courseId（供下游 course 范围缓存失效）", async () => {
    mocks.applyDraftToLiveLesson.mockResolvedValue({
      lessonId: "lesson-1",
      courseId: "course-1",
      draftVersionId: "draft-1",
      appliedStepCount: 4,
      version: 3,
    });

    const result = await lessonDraftCommandHandlers["lesson.draft.accept"].execute({
      command: createAcceptCommand() as never,
      attemptNumber: 1,
    });

    const courseId = (result.resultSummary as { courseId?: unknown } | null)?.courseId;
    expect(typeof courseId).toBe("string");
    expect(courseId).toBe("course-1");
    expect((courseId as string).length).toBeGreaterThan(0);
  });

  it("discarded 事件携带真实 draft version（>= 1，绝非硬编码 0）", async () => {
    mocks.discardDraftLessonVersion.mockResolvedValue({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
      discardedAt: "2026-06-01T00:00:00.000Z",
      version: 2,
    });

    const result = await lessonDraftCommandHandlers["lesson.draft.discard"].execute({
      command: createDiscardCommand() as never,
      attemptNumber: 1,
    });

    const discarded = result.emittedEvents.find((e) => e.eventType === "lesson.draft.discarded");
    expect(discarded).toBeDefined();
    const version = (discarded!.payload as { version: number }).version;
    expect(version).toBe(2);
    expect(version).toBeGreaterThanOrEqual(1);
    expect(version).not.toBe(0);
  });
});
