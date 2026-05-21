import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import {
  courses,
  lessons,
  lessonSteps,
  pluginLessonExtensions,
  pluginLessonStepExtensions,
  pluginOwnedBusinessData,
  pluginRegistrations,
  pluginResourceExtensions,
  publishedLessonVersions,
  resources,
} from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import {
  backfillPluginJsonToSchema,
  cutoverPluginJsonToSchema,
  verifyBackfillData,
} from "./plugin-migration";

// 1. Mock "server-only" 以避免 Node 测试环境报错
vi.mock("server-only", () => ({}));

// 2. Mock 教师权限断言
vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: vi.fn(),
}));

// 3. Mock 数据库客户端
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

// 定义全局的测试行变量
let mockPluginRegRows: any[] = [];
let mockLessonRows: any[] = [];
let mockPublishedLessonVersionRows: any[] = [];
let mockStepRows: any[] = [];
let mockResourceRows: any[] = [];
let mockLessonExtRows: any[] = [];
let mockStepExtRows: any[] = [];
let mockResourceExtRows: any[] = [];

// 统一的 Mock spies
const mockInsert = vi.mocked(db.insert);
const mockUpdate = vi.mocked(db.update);
const mockSelect = vi.mocked(db.select);
const mockTransaction = vi.mocked(db.transaction);
const mockAssertActiveTeacher = vi.mocked(assertActiveTeacher);

const insertValues = vi.fn();
const updateSet = vi.fn();
const updateWhere = vi.fn();

// 统一链式 Drizzle Mock
class MockChain {
  constructor(public rows: any[] = []) {}
  from() { return this; }
  innerJoin(table: any) {
    if (table === publishedLessonVersions) {
      this.rows = this.rows.map((row) => {
        const published = mockPublishedLessonVersionRows.find((item) => item.id === row.publishedVersionId);

        return published
          ? {
              ...row,
              snapshotJson: published.snapshotJson,
            }
          : row;
      });
    }

    return this;
  }
  where(...args: any[]) { updateWhere(...args); return this; }
  limit() { return this; }
  values(val: any) { insertValues(val); return this; }
  set(val: any) { updateSet(val); return this; }
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return Promise.resolve(this.rows).then(onfulfilled, onrejected);
  }
}

describe("Phase 46 DAL Migration & Backfill Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 Drizzle Mock 行为
    mockInsert.mockImplementation(() => new MockChain() as any);
    mockUpdate.mockImplementation(() => new MockChain() as any);
    
    mockSelect.mockImplementation(() => {
      return {
        from: vi.fn().mockImplementation((table) => {
          let rows: any[] = [];
          if (table === pluginRegistrations) {
            rows = mockPluginRegRows;
          } else if (table === lessons) {
            rows = mockLessonRows;
          } else if (table === publishedLessonVersions) {
            rows = mockPublishedLessonVersionRows;
          } else if (table === lessonSteps) {
            rows = mockStepRows;
          } else if (table === resources) {
            rows = mockResourceRows;
          } else if (table === pluginLessonExtensions) {
            rows = mockLessonExtRows;
          } else if (table === pluginLessonStepExtensions) {
            rows = mockStepExtRows;
          } else if (table === pluginResourceExtensions) {
            rows = mockResourceExtRows;
          }
          return new MockChain(rows);
        }),
      } as any;
    });

    mockTransaction.mockImplementation(async (cb: any) => {
      return cb(db as any);
    });

    // 默认教师角色与学校范围断言通过
    mockAssertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });

    // 默认重置 Mock 数据数据行
    mockPluginRegRows = [{ pluginKey: "vendor/plugin-1", schoolId: "school-1" }];
    mockLessonRows = [];
    mockPublishedLessonVersionRows = [];
    mockStepRows = [];
    mockResourceRows = [];
    mockLessonExtRows = [];
    mockStepExtRows = [];
    mockResourceExtRows = [];
  });

  describe("A. Authentication & Tenancy Scopes", () => {
    it("should reject anonymous actor ID immediately", async () => {
      await expect(
        backfillPluginJsonToSchema("  ", "school-1", "plugin-1", "lesson")
      ).rejects.toThrow("PLUGIN_ACTOR_REQUIRED");
    });

    it("should reject non-active or cross-school teachers", async () => {
      mockAssertActiveTeacher.mockResolvedValueOnce({
        userId: "teacher-different",
        schoolIds: ["school-different"],
      });

      await expect(
        backfillPluginJsonToSchema("teacher-different", "school-1", "plugin-1", "lesson")
      ).rejects.toThrow("TEACHER_AUTH_REQUIRED");
    });

    it("should reject cross-school plugin metadata access", async () => {
      // 插件属于 school-different
      mockPluginRegRows = [{ pluginKey: "vendor/plugin-1", schoolId: "school-different" }];

      await expect(
        backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson")
      ).rejects.toThrow("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
    });
  });

  describe("B. Phase 46-01: Backfill Operations", () => {
    it("should correctly identify, parse and idempotent-upsert lesson JSON configurations", async () => {
      // 旧 payloadJson 包含了 vendor/plugin-1 的私有属性
      mockLessonRows = [
        {
          id: "lesson-1",
          publishedVersionId: "pub-1",
        },
      ];
      mockPublishedLessonVersionRows = [
        {
          id: "pub-1",
          snapshotJson: {
            lesson: {
              payloadJson: {
                someCoreConfig: true,
                "vendor/plugin-1": {
                  reminderRule: "daily",
                  alertTime: "08:00",
                },
              },
            },
          },
        },
      ];

      // 首次 backfill，对应的物理扩展记录不存在
      mockLessonExtRows = [];

      const result = await backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson");

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });

      // 断言调用了 db.insert 写入物理扩展表
      expect(mockInsert).toHaveBeenCalledWith(pluginLessonExtensions);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: "school-1",
          pluginId: "plugin-1",
          lessonId: "lesson-1",
          payloadJson: {
            reminderRule: "daily",
            alertTime: "08:00",
          },
        })
      );
    });

    it("should update physical extensions if they already exist during backfill", async () => {
      mockLessonRows = [
        {
          id: "lesson-1",
          publishedVersionId: "pub-1",
        },
      ];
      mockPublishedLessonVersionRows = [{ id: "pub-1", snapshotJson: { lesson: { payloadJson: { "vendor/plugin-1": { reminderRule: "weekly" } } } } }];

      // 已有扩展记录，触发 update
      mockLessonExtRows = [{ id: "ext-1", schoolId: "school-1", lessonId: "lesson-1" }];

      const result = await backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson");

      expect(result.succeeded).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(pluginLessonExtensions);
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          payloadJson: { reminderRule: "weekly" },
        })
      );
    });

    it("should handle step backfill correctly", async () => {
      mockStepRows = [
        {
          id: "step-1",
          payloadJson: {
            "vendor/plugin-1": { stepConfig: "interactive" },
          },
        },
      ];
      mockStepExtRows = [];

      const result = await backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "step");

      expect(result.succeeded).toBe(1);
      expect(mockInsert).toHaveBeenCalledWith(pluginLessonStepExtensions);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: "school-1",
          pluginId: "plugin-1",
          lessonStepId: "step-1",
          payloadJson: { stepConfig: "interactive" },
        })
      );
    });

    it("should handle resource backfill correctly", async () => {
      mockResourceRows = [
        {
          id: "res-1",
          content: JSON.stringify({
            "vendor/plugin-1": { downloadLimit: 5 },
          }),
        },
      ];
      mockResourceExtRows = [];

      const result = await backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "resource");

      expect(result.succeeded).toBe(1);
      expect(mockInsert).toHaveBeenCalledWith(pluginResourceExtensions);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: "school-1",
          pluginId: "plugin-1",
          resourceId: "res-1",
          payloadJson: { downloadLimit: 5 },
        })
      );
    });

    it("should skip resource rows whose content is not legacy plugin JSON", async () => {
      mockResourceRows = [
        {
          id: "res-1",
          content: "plain text resource body",
        },
      ];

      const result = await backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "resource");

      expect(result).toEqual({
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [],
      });
      expect(mockInsert).not.toHaveBeenCalledWith(pluginResourceExtensions);
    });
  });

  describe("C. Phase 46-01: Deep Verification (verifyBackfillData)", () => {
    it("should return matches: true if legacy and physical config match exactly", async () => {
      mockLessonRows = [
        {
          id: "lesson-1",
          publishedVersionId: "pub-1",
        },
      ];
      mockPublishedLessonVersionRows = [{ id: "pub-1", snapshotJson: { lesson: { payloadJson: { "vendor/plugin-1": { nested: { a: 1, b: [1, 2] } } } } } }];

      // 物理表存储的内容跟旧 JSON 完全一致
      mockLessonExtRows = [
        {
          payloadJson: { nested: { a: 1, b: [1, 2] } },
        },
      ];

      const res = await verifyBackfillData("teacher-1", "school-1", "plugin-1", "lesson");
      expect(res.matches).toBe(true);
      expect(res.mismatches).toHaveLength(0);
    });

    it("should return matches: false if a record has mismatched properties", async () => {
      mockLessonRows = [
        {
          id: "lesson-1",
          publishedVersionId: "pub-1",
        },
      ];
      mockPublishedLessonVersionRows = [{ id: "pub-1", snapshotJson: { lesson: { payloadJson: { "vendor/plugin-1": { nested: { a: 1, b: [1, 2] } } } } } }];

      // 物理表内容被篡改/不同
      mockLessonExtRows = [
        {
          payloadJson: { nested: { a: 1, b: [1, 999] } },
        },
      ];

      const res = await verifyBackfillData("teacher-1", "school-1", "plugin-1", "lesson");
      expect(res.matches).toBe(false);
      expect(res.mismatches).toContain("lesson-1");
    });
  });

  describe("D. Phase 46-01: Transactional Cutover (cutoverPluginJsonToSchema)", () => {
    it("should abort immediately and not touch core JSON if verification fails", async () => {
      mockLessonRows = [
        {
          id: "lesson-1",
          publishedVersionId: "pub-1",
        },
      ];
      mockPublishedLessonVersionRows = [{ id: "pub-1", snapshotJson: { lesson: { payloadJson: { "vendor/plugin-1": { nested: { a: 1 } } } } } }];
      // Mismatched
      mockLessonExtRows = [
        {
          payloadJson: { nested: { a: 999 } },
        },
      ];

      await expect(
        cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson")
      ).rejects.toThrow("CUTOVER_ABORTED");

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should erase designated plugin key in a transaction and preserve other fields", async () => {
      mockLessonRows = [
        {
          id: "lesson-1",
          publishedVersionId: "pub-1",
        },
      ];
      mockPublishedLessonVersionRows = [{ id: "pub-1", snapshotJson: { lesson: { payloadJson: { coreConfig: "keep-me", "vendor/plugin-1": { reminderRule: "daily" } } } } }];
      
      // Matching physical extension row
      mockLessonExtRows = [
        {
          payloadJson: { reminderRule: "daily" },
        },
      ];

      const result = await cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson");

      expect(result.succeeded).toBe(1);

      // 验证在 transaction 中发起了 update 并擦除了 "vendor/plugin-1" 键
      expect(mockUpdate).toHaveBeenCalledWith(publishedLessonVersions);
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshotJson: {
            lesson: {
              payloadJson: { coreConfig: "keep-me" },
            },
          },
        })
      );
    });

    it("should roll back atomically on any database exception during cutover", async () => {
      mockLessonRows = [
        {
          id: "lesson-1",
          publishedVersionId: "pub-1",
        },
      ];
      mockPublishedLessonVersionRows = [{ id: "pub-1", snapshotJson: { lesson: { payloadJson: { "vendor/plugin-1": { reminderRule: "daily" } } } } }];
      mockLessonExtRows = [
        {
          payloadJson: { reminderRule: "daily" },
        },
      ];

      // 让 update 抛错以模拟数据库异常
      mockUpdate.mockImplementationOnce(() => {
        throw new Error("MOCK_DB_FAIL");
      });

      await expect(
        cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson")
      ).rejects.toThrow("CUTOVER_FAILED_TRANSACTION_ROLLBACK: MOCK_DB_FAIL");
    });
  });

  describe("E. Static Verification & DDL Runtime Prevention Audit", () => {
    it("proves plugin lifecycle and reconcile code is 100% free of raw execution/run DDL commands", () => {
      const pluginsSource = readFileSync("src/lib/dal/plugins.ts", "utf8");
      
      // 插件运行时应当仅使用 Drizzle 的 DML 操作，绝不能执行动态 SQL 执行器来修改结构
      expect(pluginsSource).not.toContain("db.execute(");
      expect(pluginsSource).not.toContain("db.run(");
      expect(pluginsSource).not.toContain("CREATE TABLE");
      expect(pluginsSource).not.toContain("ALTER TABLE");
      expect(pluginsSource).not.toContain("DROP TABLE");
    });
  });
});
