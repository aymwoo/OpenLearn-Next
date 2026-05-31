import { readFileSync } from "node:fs";

import { getTableName } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LessonStepPayload } from "@/lib/dto/lesson-authoring";

const selectWhere = vi.fn();
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const selectMock = vi.fn(() => ({ from: selectFrom }));

const insertReturning = vi.fn();
const insertValues = vi.fn((_values: unknown) => ({ returning: insertReturning }));
const insertMock = vi.fn((_table: unknown) => ({ values: insertValues }));

const updateMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

vi.mock("@/lib/dal/auth", () => ({ getCurrentUserDTO: vi.fn() }));
vi.mock("@/lib/dal/membership", () => ({ getUserMembershipsDTO: vi.fn() }));
vi.mock("@/lib/dal/plugin-data", () => ({
  listPluginStepExtensions: vi.fn(),
  upsertPluginStepExtensionWithTx: vi.fn(),
}));

const source = readFileSync("src/lib/dal/lesson-authoring.ts", "utf8");

function makeSteps(): LessonStepPayload[] {
  return [
    { type: "content", title: "导入", body: "观察现象", materialRefs: [] },
    { type: "task", title: "练习", prompt: "完成实验记录", materialRefs: [] },
  ] as unknown as LessonStepPayload[];
}

async function loadDal() {
  return import("./lesson-authoring");
}

describe("persistDraftLessonVersion", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("Test 1: 首次写入 → version=1, source='ai', sourceCommandId 落库, snapshotJson 含传入 steps", async () => {
    selectWhere.mockResolvedValue([{ value: 0 }]);
    insertReturning.mockResolvedValue([{ id: "draft-1" }]);
    const steps = makeSteps();

    const { persistDraftLessonVersion } = await loadDal();
    const result = await persistDraftLessonVersion({
      lessonId: "lesson-1",
      steps,
      sourceCommandId: "cmd-1",
      createdById: "teacher-1",
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(getTableName(insertMock.mock.calls[0]![0] as never)).toBe("draftLessonVersion");

    const written = insertValues.mock.calls[0]![0];
    expect(written).toMatchObject({
      lessonId: "lesson-1",
      version: 1,
      source: "ai",
      sourceCommandId: "cmd-1",
      createdById: "teacher-1",
      snapshotJson: { steps },
    });
    expect(result).toEqual({ draftVersionId: "draft-1", version: 1, stepCount: 2 });
  });

  it("Test 2: 同 lessonId 二次写入（不同 sourceCommandId）→ version=2（max+1）", async () => {
    selectWhere.mockResolvedValue([{ value: 1 }]);
    insertReturning.mockResolvedValue([{ id: "draft-2" }]);

    const { persistDraftLessonVersion } = await loadDal();
    const result = await persistDraftLessonVersion({
      lessonId: "lesson-1",
      steps: makeSteps(),
      sourceCommandId: "cmd-2",
      createdById: "teacher-1",
    });

    expect(insertValues.mock.calls[0]![0]).toMatchObject({ version: 2, sourceCommandId: "cmd-2" });
    expect(result.version).toBe(2);
  });

  it("Test 3: 返回值含 {draftVersionId, version, stepCount} 供 handler 构造事件 payload", async () => {
    selectWhere.mockResolvedValue([]); // 无既存行 → coalesce 兜底为 0 → version 从 1 起
    insertReturning.mockResolvedValue([{ id: "draft-3" }]);

    const { persistDraftLessonVersion } = await loadDal();
    const result = await persistDraftLessonVersion({
      lessonId: "lesson-9",
      steps: makeSteps(),
      sourceCommandId: "cmd-9",
      createdById: "teacher-9",
    });

    expect(result).toEqual({ draftVersionId: "draft-3", version: 1, stepCount: 2 });
    expect(Object.keys(result).sort()).toEqual(["draftVersionId", "stepCount", "version"]);
  });

  it("Test 4 / 隔离 A（写隔离）: 只 insert(draftLessonVersions)，绝不写 live lessons/lessonSteps", async () => {
    selectWhere.mockResolvedValue([{ value: 0 }]);
    insertReturning.mockResolvedValue([{ id: "draft-x" }]);

    const { persistDraftLessonVersion } = await loadDal();
    await persistDraftLessonVersion({
      lessonId: "lesson-iso",
      steps: makeSteps(),
      sourceCommandId: "cmd-iso",
      createdById: "teacher-iso",
    });

    // 运行时隔离：唯一一次 insert 落在 draftLessonVersions；live 表零 insert/update
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedTable = getTableName(insertMock.mock.calls[0]![0] as never);
    expect(insertedTable).toBe("draftLessonVersion");
    expect(insertedTable).not.toBe("lesson");
    expect(insertedTable).not.toBe("lessonStep");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("隔离 A（静态）: persistDraftLessonVersion 函数体不含 lessons/lessonSteps 写操作", () => {
    const start = source.indexOf("export async function persistDraftLessonVersion");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start);
    expect(body).toContain("insert(draftLessonVersions)");
    expect(body).not.toContain("insert(lessons)");
    expect(body).not.toContain("insert(lessonSteps)");
    expect(body).not.toContain("update(lessons)");
    expect(body).not.toContain("update(lessonSteps)");
  });

  it("隔离 B（读隔离，结构性）: 学生/classroom 读路径源码不引用 draftLessonVersions", () => {
    const studentReadSources = [
      "src/lib/dal/learning.ts",
      "src/lib/dal/classroom.ts",
    ];
    for (const file of studentReadSources) {
      expect(readFileSync(file, "utf8")).not.toContain("draftLessonVersions");
    }
  });
});
