import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  createDraftLessonStepTool: vi.fn(),
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: mocks.assertActiveTeacher,
}));

vi.mock("@/server/ai/tools", () => ({
  createDraftLessonStepTool: mocks.createDraftLessonStepTool,
}));

import { PlatformCommandExecutionError } from "../contracts";
import {
  LessonDraftProducedEventSchema,
  LessonDraftRequestedEventSchema,
  LessonToolInvokedEventSchema,
} from "@/features/platform-core/events/contracts";
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
