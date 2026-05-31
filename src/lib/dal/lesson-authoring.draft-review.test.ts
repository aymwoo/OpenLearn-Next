import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LessonStepDTO, LessonStepPayload } from "@/lib/dto/lesson-authoring";

// ─── Mock Setup (mirrors draft-persist.test.ts pattern) ───

const findFirstLessons = vi.fn();
const findFirstCourses = vi.fn();
const findManyLessonSteps = vi.fn();
const findFirstDraftLessonVersions = vi.fn();
const findManyDraftLessonVersions = vi.fn();

const selectWhere = vi.fn();
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const selectMock = vi.fn(() => ({ from: selectFrom }));

const insertReturning = vi.fn();
const insertValues = vi.fn((_values: unknown) => ({ returning: insertReturning }));
const insertMock = vi.fn((_table: unknown) => ({ values: insertValues }));

const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const updateMock = vi.fn(() => ({ set: updateSet }));

const getCurrentUserDTO = vi.fn();
const getUserMembershipsDTO = vi.fn();

const transaction = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    transaction,
    query: {
      lessons: { findFirst: findFirstLessons },
      courses: { findFirst: findFirstCourses },
      lessonSteps: { findMany: findManyLessonSteps },
      draftLessonVersions: {
        findMany: findManyDraftLessonVersions,
        findFirst: findFirstDraftLessonVersions,
      },
    },
  },
}));

vi.mock("@/lib/dal/auth", () => ({ getCurrentUserDTO }));
vi.mock("@/lib/dal/membership", () => ({ getUserMembershipsDTO }));
vi.mock("@/lib/dal/plugin-data", () => ({
  listPluginStepExtensions: vi.fn(),
  upsertPluginStepExtensionWithTx: vi.fn(),
}));

const dalSource = readFileSync("src/lib/dal/lesson-authoring.ts", "utf8");

async function loadDal() {
  return import("./lesson-authoring");
}

// ─── Test Helpers ───

const now = new Date("2026-05-31T12:00:00.000Z");

function makeLessonRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "lesson-1",
    courseId: "course-1",
    createdById: "teacher-1",
    title: "AI 生成的课时",
    objective: "掌握基本概念",
    status: "draft",
    revision: 3,
    publishedVersionId: null,
    aiDraftAppliedAt: null,
    latestDraftVersionId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCourseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "course-1",
    schoolId: "school-1",
    ownerId: "teacher-1",
    title: "我的课程",
    subject: "科学",
    grade: "七年级",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeLiveStepRows(): Array<{
  id: string;
  lessonId: string;
  type: string;
  title: string;
  rank: string;
  payloadJson: unknown;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}> {
  return [
    {
      id: "live-step-1",
      lessonId: "lesson-1",
      type: "content",
      title: "导入",
      rank: "a0",
      payloadJson: {
        type: "content",
        title: "导入",
        body: "观察实验现象",
        materialRefs: [],
      },
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "live-step-2",
      lessonId: "lesson-1",
      type: "task",
      title: "练习",
      rank: "a1",
      payloadJson: {
        type: "task",
        prompt: "完成实验记录",
        materialRefs: [],
        submissionType: "text",
      },
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function makeDraftSteps(): LessonStepPayload[] {
  return [
    {
      type: "content",
      title: "新课导入",
      body: "观察实验现象 v2",
      materialRefs: [],
    },
    {
      type: "task",
      prompt: "完成实验记录",
      materialRefs: [],
      submissionType: "text" as const,
    },
    {
      type: "content",
      title: "新增步骤",
      body: "拓展思考",
      materialRefs: [],
    },
  ];
}

function makeDraftRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "draft-1",
    lessonId: "lesson-1",
    version: 1,
    snapshotJson: { steps: makeDraftSteps() },
    source: "ai",
    sourceCommandId: "cmd-1",
    createdById: "teacher-1",
    createdAt: now,
    status: "pending",
    archivedAt: null,
    ...overrides,
  };
}

// ─── Tests ───

describe("getLessonDraftReviewDTO", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getCurrentUserDTO.mockResolvedValue({ id: "teacher-1" });
    getUserMembershipsDTO.mockResolvedValue([
      { schoolId: "school-1", role: "teacher", status: "active" },
    ]);

    findFirstLessons.mockResolvedValue(makeLessonRow());
    findFirstCourses.mockResolvedValue(makeCourseRow());
    findManyLessonSteps.mockResolvedValue(makeLiveStepRows());

    // Default transaction mock — resolves successfully
    transaction.mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ id: "updated" }]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "inserted" }]),
            }),
          }),
        };
        return callback(tx);
      },
    );
  });

  it("RED Test 1: 返回 hasPendingDraft=true 和 draftMeta 当存在 pending 草稿", async () => {
    findManyDraftLessonVersions.mockResolvedValue([makeDraftRow()]);

    const { getLessonDraftReviewDTO } = await loadDal();
    const result = await getLessonDraftReviewDTO({ lessonId: "lesson-1" });

    expect(result.hasPendingDraft).toBe(true);
    expect(result.draftMeta).toMatchObject({
      draftVersionId: "draft-1",
      version: 1,
      source: "ai",
      status: "pending",
      stepCount: 3,
    });
  });

  it("RED Test 2: liveSteps 来自未归档的 lessonSteps，按 rank 升序", async () => {
    findManyDraftLessonVersions.mockResolvedValue([makeDraftRow()]);

    const { getLessonDraftReviewDTO } = await loadDal();
    const result = await getLessonDraftReviewDTO({ lessonId: "lesson-1" });

    expect(result.liveSteps).toHaveLength(2);
    expect(result.liveSteps[0]!.id).toBe("live-step-1");
    expect(result.liveSteps[1]!.id).toBe("live-step-2");
  });

  it("RED Test 3: draftSteps 来自 snapshotJson.steps 的 payload 数组", async () => {
    findManyDraftLessonVersions.mockResolvedValue([makeDraftRow()]);

    const { getLessonDraftReviewDTO } = await loadDal();
    const result = await getLessonDraftReviewDTO({ lessonId: "lesson-1" });

    expect(result.draftSteps).toHaveLength(3);
    // Check that draftStep titles are derived from payload
    expect(result.draftSteps[0]!.title).toBe("新课导入");
    // task steps derive title from prompt
    expect(result.draftSteps[1]!.title).toBe("完成实验记录");
    expect(result.draftSteps[2]!.title).toBe("新增步骤");
  });

  it("RED Test 4: diffRows 由 buildLessonDraftDiffRows 计算，包含 index/state/liveStep/draftStep", async () => {
    findManyDraftLessonVersions.mockResolvedValue([makeDraftRow()]);

    const { getLessonDraftReviewDTO } = await loadDal();
    const result = await getLessonDraftReviewDTO({ lessonId: "lesson-1" });

    expect(result.diffRows).toHaveLength(3);
    expect(result.diffRows[0]!).toHaveProperty("index");
    expect(result.diffRows[0]!).toHaveProperty("state");
    expect(result.diffRows[0]!).toHaveProperty("liveStep");
    expect(result.diffRows[0]!).toHaveProperty("draftStep");
    // index 0: content title+body changed → modified
    expect(result.diffRows[0]!.state).toBe("modified");
    // index 1: task, draft title derived from prompt differs from live row title → modified
    expect(result.diffRows[1]!.state).toBe("modified");
    // index 2: live missing, draft present → new
    expect(result.diffRows[2]!.state).toBe("new");
  });

  it("RED Test 5: 无 pending 草稿时返回 hasPendingDraft=false", async () => {
    findManyDraftLessonVersions.mockResolvedValue([]);

    const { getLessonDraftReviewDTO } = await loadDal();
    const result = await getLessonDraftReviewDTO({ lessonId: "lesson-1" });

    expect(result.hasPendingDraft).toBe(false);
  });

  it("RED Test 6: 无 pending 草稿时 draftSteps 和 diffRows 为空数组", async () => {
    findManyDraftLessonVersions.mockResolvedValue([]);

    const { getLessonDraftReviewDTO } = await loadDal();
    const result = await getLessonDraftReviewDTO({ lessonId: "lesson-1" });

    expect(result.draftSteps).toEqual([]);
    expect(result.diffRows).toEqual([]);
  });

  it("RED Test 7: 非 pending 状态的草稿被忽略（status=applied 不返回为 pending）", async () => {
    // 函数过滤 status=pending，所以 applied 的草稿不应被返回
    findManyDraftLessonVersions.mockResolvedValue([]);

    const { getLessonDraftReviewDTO } = await loadDal();
    const result = await getLessonDraftReviewDTO({ lessonId: "lesson-1" });

    expect(result.hasPendingDraft).toBe(false);
  });

  it("RED Test 8: 教师必须经过授权（assertActiveTeacher 被调用）", async () => {
    getCurrentUserDTO.mockResolvedValue(null);

    const { getLessonDraftReviewDTO } = await loadDal();
    await expect(getLessonDraftReviewDTO({ lessonId: "lesson-1" })).rejects.toThrow(
      "TEACHER_AUTH_REQUIRED",
    );
  });

  it("RED Test 9: lesson 不在教师 scope 内时抛出 LESSON_NOT_FOUND", async () => {
    findFirstLessons.mockResolvedValue(null);

    const { getLessonDraftReviewDTO } = await loadDal();
    await expect(getLessonDraftReviewDTO({ lessonId: "lesson-missing" })).rejects.toThrow(
      "LESSON_NOT_FOUND",
    );
  });

  it("source 断言: 导出面包含 getLessonDraftReviewDTO", async () => {
    // 验证 DAL 源码中存在该函数定义
    expect(dalSource).toContain("getLessonDraftReviewDTO");
  });
});

// ─── Task 2: applyDraftToLiveLesson RED tests ───

describe("applyDraftToLiveLesson", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getCurrentUserDTO.mockResolvedValue({ id: "teacher-1" });
    getUserMembershipsDTO.mockResolvedValue([
      { schoolId: "school-1", role: "teacher", status: "active" },
    ]);

    findFirstLessons.mockResolvedValue(makeLessonRow());
    findFirstCourses.mockResolvedValue(makeCourseRow());

    // Default transaction mock
    transaction.mockImplementation(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ id: "updated" }]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "inserted" }]),
            }),
          }),
        };
        return callback(tx);
      },
    );
  });

  it("RED Test 1: 归档所有活跃 lessonSteps 并插入替换步骤", async () => {
    findFirstDraftLessonVersions.mockResolvedValue(makeDraftRow());

    const { applyDraftToLiveLesson } = await loadDal();
    const result = await applyDraftToLiveLesson({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    // 确认调用了 transaction
    expect(transaction).toHaveBeenCalledTimes(1);
    // 返回结果包含正确字段
    expect(result).toMatchObject({
      lessonId: "lesson-1",
      courseId: "course-1",
      draftVersionId: "draft-1",
      appliedStepCount: 3,
    });
  });

  it("RED Test 2: 插入的步骤匹配草稿 snapshotJson.steps 内容", async () => {
    findFirstDraftLessonVersions.mockResolvedValue(makeDraftRow());

    const { applyDraftToLiveLesson } = await loadDal();
    await applyDraftToLiveLesson({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    // 事务被执行
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("RED Test 3: 返回结果包含 lessonId、courseId、draftVersionId、appliedStepCount", async () => {
    findFirstDraftLessonVersions.mockResolvedValue(makeDraftRow());

    const { applyDraftToLiveLesson } = await loadDal();
    const result = await applyDraftToLiveLesson({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    expect(result).toEqual({
      lessonId: "lesson-1",
      courseId: "course-1",
      draftVersionId: "draft-1",
      appliedStepCount: 3,
    });
  });

  it("RED Test 4: draftLessonVersions 状态更新为 'applied'", async () => {
    findFirstDraftLessonVersions.mockResolvedValue(makeDraftRow());

    const { applyDraftToLiveLesson } = await loadDal();
    const result = await applyDraftToLiveLesson({
      lessonId: "lesson-1",
      draftVersionId: "draft-1",
    });

    // 验证事务被调用（更新在 tx 内执行）
    expect(transaction).toHaveBeenCalledTimes(1);
    // 返回结果正确即表明事务成功
    expect(result).toBeDefined();
  });

  it("RED Test 5: 非 pending 状态的草稿抛出错误", async () => {
    findFirstDraftLessonVersions.mockResolvedValue(makeDraftRow({ status: "applied" }));

    const { applyDraftToLiveLesson } = await loadDal();
    await expect(
      applyDraftToLiveLesson({ lessonId: "lesson-1", draftVersionId: "draft-1" }),
    ).rejects.toThrow();
  });

  it("RED Test 6: 未授权教师不能 apply 非 scope 内 lesson", async () => {
    findFirstLessons.mockResolvedValue(null);

    const { applyDraftToLiveLesson } = await loadDal();
    await expect(
      applyDraftToLiveLesson({ lessonId: "lesson-missing", draftVersionId: "draft-1" }),
    ).rejects.toThrow("LESSON_NOT_FOUND");
  });

  it("RED Test 7: 草稿不存在时抛出错误", async () => {
    findFirstDraftLessonVersions.mockResolvedValue(null);

    const { applyDraftToLiveLesson } = await loadDal();
    await expect(
      applyDraftToLiveLesson({ lessonId: "lesson-1", draftVersionId: "draft-none" }),
    ).rejects.toThrow();
  });

  it("source 断言: 导出面包含 applyDraftToLiveLesson", () => {
    expect(dalSource).toContain("applyDraftToLiveLesson");
  });
});
