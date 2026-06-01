import { beforeEach, describe, expect, it, vi } from "vitest";

import { cacheTags } from "@/lib/cache-policy";

/**
 * 66-04 路由回归：accept / discard server action 必须经 v3.0 Command Bus 派发
 * （lesson.draft.accept / lesson.draft.discard），不得再直连 DAL（D-04）。
 *
 * 断言：
 * - applyDraftLessonVersionAction 派发 lesson.draft.accept（非 applyDraftToLiveLesson 直调）
 * - discardDraftLessonVersionAction 派发 lesson.draft.discard（非 discardDraftLessonVersion 直调）
 * - 两条命令携带非空 dedupeKey（replay-safe / dedupe:required）
 * - pending→non-pending 草稿经命令路径冒泡 DRAFT_NOT_PENDING 为已处理 ActionResult error
 * - accept 成功路径用命令结果摘要中的 courseId 失效 course 级缓存标签
 */

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

const mocks = vi.hoisted(() => ({
  dispatchPlatformCommand: vi.fn(),
}));

vi.mock("@/features/platform-core/commands/bus", () => ({
  dispatchPlatformCommand: mocks.dispatchPlatformCommand,
}));

// 隔离 producer 的重量级底层（store 落库 / 事件适配器），但保留真实 buildLessonDraftCommand
// 以便断言真实 envelope（type / dedupeKey）。
vi.mock("@/db", () => ({
  db: {
    query: {
      platformCommands: { findFirst: vi.fn() },
      platformCommandAttempts: { findMany: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/features/platform-core/events/adapters/in-process", () => ({
  defaultInProcessPlatformEventAdapter: {
    id: "in-process-default",
    publishPersisted: vi.fn(async () => undefined),
    subscribe: vi.fn(() => () => undefined),
  },
}));

// DAL 全量 stub：断言 accept/discard 不再直调 DAL，且避免加载真实 db/server-only。
vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: vi.fn(),
  applyDraftToLiveLesson: vi.fn(),
  discardDraftLessonVersion: vi.fn(),
  addLessonStep: vi.fn(),
  archiveLesson: vi.fn(),
  archiveLessonStep: vi.fn(),
  createLessonDraft: vi.fn(),
  duplicateLesson: vi.fn(),
  duplicateLessonStep: vi.fn(),
  getLessonPublishReadinessDTO: vi.fn(),
  publishLesson: vi.fn(),
  reorderLessonStep: vi.fn(),
  saveVotingLessonStepConfig: vi.fn(),
  updateLessonDraft: vi.fn(),
  updateLessonStep: vi.fn(),
}));

vi.mock("@/lib/dal/resources", () => ({ createTeacherResource: vi.fn() }));

import { updateTag } from "next/cache";
import {
  applyDraftLessonVersionAction,
  discardDraftLessonVersionAction,
} from "./lesson-authoring-actions";
import {
  assertActiveTeacher,
  applyDraftToLiveLesson,
  discardDraftLessonVersion,
} from "@/lib/dal/lesson-authoring";

const updateTagMock = vi.mocked(updateTag);
const assertActiveTeacherMock = vi.mocked(assertActiveTeacher);
const applyDraftDalMock = vi.mocked(applyDraftToLiveLesson);
const discardDraftDalMock = vi.mocked(discardDraftLessonVersion);

describe("draft accept/discard command routing (66-04 / D-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacherMock.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    } as never);
  });

  it("routes accept through the Command Bus with a non-empty dedupeKey (no direct DAL call)", async () => {
    mocks.dispatchPlatformCommand.mockResolvedValue({
      commandId: "lesson.draft.accept:corr-1",
      attemptNumber: 1,
      status: "succeeded",
      resultSummary: { courseId: "course-xyz", draftVersionId: "draft-1", appliedStepCount: 3, version: 2 },
      invalidation: { tags: [] },
    });

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result.ok).toBe(true);
    expect(applyDraftDalMock).not.toHaveBeenCalled();
    expect(mocks.dispatchPlatformCommand).toHaveBeenCalledTimes(1);

    const [command] = mocks.dispatchPlatformCommand.mock.calls[0];
    expect(command.type).toBe("lesson.draft.accept");
    expect(typeof command.dedupeKey).toBe("string");
    expect(command.dedupeKey.length).toBeGreaterThan(0);

    // courseId 来自命令结果摘要 → course 级缓存失效。
    expect(updateTagMock).toHaveBeenCalledWith(cacheTags.course("course-xyz"));
  });

  it("routes discard through the Command Bus with a non-empty dedupeKey (no direct DAL call)", async () => {
    mocks.dispatchPlatformCommand.mockResolvedValue({
      commandId: "lesson.draft.discard:corr-1",
      attemptNumber: 1,
      status: "succeeded",
      resultSummary: { draftVersionId: "draft-1", discardedAt: "2026-06-01T00:00:00.000Z" },
      invalidation: { tags: [] },
    });

    const result = await discardDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result.ok).toBe(true);
    expect(discardDraftDalMock).not.toHaveBeenCalled();
    expect(mocks.dispatchPlatformCommand).toHaveBeenCalledTimes(1);

    const [command] = mocks.dispatchPlatformCommand.mock.calls[0];
    expect(command.type).toBe("lesson.draft.discard");
    expect(typeof command.dedupeKey).toBe("string");
    expect(command.dedupeKey.length).toBeGreaterThan(0);

    expect(updateTagMock).toHaveBeenCalledWith(cacheTags.draftLesson("lesson-1"));
    expect(updateTagMock).toHaveBeenCalledWith(cacheTags.lesson("lesson-1"));
  });

  it("surfaces DRAFT_NOT_PENDING from the command path as a handled ActionResult error", async () => {
    mocks.dispatchPlatformCommand.mockRejectedValue(new Error("DRAFT_NOT_PENDING"));

    const result = await applyDraftLessonVersionAction({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false, error: "DRAFT_NOT_PENDING" });
    expect(applyDraftDalMock).not.toHaveBeenCalled();
  });
});
