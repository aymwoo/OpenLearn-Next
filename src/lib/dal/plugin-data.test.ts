import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateTag } from "next/cache";

import { db } from "@/db";
import {
  governanceAudits,
  pluginActionAudits,
  pluginLessonExtensions,
  pluginLessonStepExtensions,
  pluginOwnedBusinessData,
  pluginResourceExtensions,
} from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import {
  getPluginExtension,
  getPluginOwnedBusinessData,
  upsertPluginExtension,
  upsertPluginOwnedBusinessData,
} from "@/lib/dal/plugin-data";

// 1. Mock "server-only" 以避免 Node 测试环境报错
vi.mock("server-only", () => ({}));

// 2. Mock 数据库客户端并支持物理事务模拟
vi.mock("@/db", () => {
  const mockDb = {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
  };
  mockDb.transaction.mockImplementation((cb) => cb(mockDb));
  return { db: mockDb };
});

// Mock Next.js 16 缓存失效 API
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

// 3. Mock 教师权限断言
vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher: vi.fn(),
}));

// 读取 schema 源码进行物理结构静态校验
const schemaSource = readFileSync("src/db/schema.ts", "utf8");

describe("Phase 45 Drizzle Schema Physical Analysis (Static Verification)", () => {
  it("must define four designated tables with correct names and prefixes", () => {
    expect(schemaSource).toContain('export const pluginLessonExtensions = sqliteTable(\n  "plugin_ext_lesson"');
    expect(schemaSource).toContain('export const pluginLessonStepExtensions = sqliteTable(\n  "plugin_ext_lesson_step"');
    expect(schemaSource).toContain('export const pluginResourceExtensions = sqliteTable(\n  "plugin_ext_resource"');
    expect(schemaSource).toContain('export const pluginOwnedBusinessData = sqliteTable(\n  "plugin_owned_business_data"');
  });

  it("must enforce strictly cascading foreign keys on delete for all relational layers", () => {
    // 提取新增表相关的定义区
    const extensionSection = schemaSource.slice(schemaSource.indexOf("export const pluginLessonExtensions"));
    
    // 我们定义了 11 个 references（每个扩展表 3 个，自有表 2 个），全部必须显式绑定 onDelete: "cascade"
    const cascades = extensionSection.match(/onDelete:\s*"cascade"/g);
    expect(cascades).not.toBeNull();
    expect(cascades!.length).toBeGreaterThanOrEqual(11);
  });

  it("must declare necessary physical unique composite indexes for single instance conflict prevention", () => {
    // 扩展表三维唯一索引检查 (schoolId, pluginId, entityId)
    expect(schemaSource).toContain('uniqueIndex("plugin_ext_lesson_school_plugin_entity_unique").on(table.schoolId, table.pluginId, table.lessonId)');
    expect(schemaSource).toContain('uniqueIndex("plugin_ext_lesson_step_school_plugin_entity_unique").on(table.schoolId, table.pluginId, table.lessonStepId)');
    expect(schemaSource).toContain('uniqueIndex("plugin_ext_resource_school_plugin_entity_unique").on(table.schoolId, table.pluginId, table.resourceId)');
    
    // 自有业务表联合常规查询索引检查
    expect(schemaSource).toContain('index("plugin_owned_biz_school_plugin_key_idx").on(table.schoolId, table.pluginId, table.key)');
  });
});

describe("Phase 45-01 DAL Seam & Security Boundary", () => {
  const mockInsert = vi.mocked(db.insert);
  const mockUpdate = vi.mocked(db.update);
  const mockSelect = vi.mocked(db.select);
  const mockAssertActiveTeacher = vi.mocked(assertActiveTeacher);

  const insertValues = vi.fn();
  const updateSet = vi.fn();
  const updateWhere = vi.fn();

  // 辅助函数，构建 Drizzle 链式调用的 Select 模拟
  function setupDbSelectChain(rows: any[] = []) {
    const limitFn = vi.fn().mockResolvedValue(rows);
    const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const innerJoin2 = vi.fn().mockReturnValue({ where: whereFn });
    const innerJoin1 = vi.fn().mockReturnValue({ innerJoin: innerJoin2, where: whereFn });
    const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
    mockSelect.mockReturnValue({ from: fromFn } as any);
    return { limitFn, whereFn, fromFn };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 Drizzle Mock 行为
    mockInsert.mockReturnValue({ values: insertValues } as any);
    mockUpdate.mockReturnValue({ set: updateSet } as any);
    updateSet.mockReturnValue({ where: updateWhere } as any);

    // 默认教师角色与学校范围断言通过
    mockAssertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
  });

  describe("A. Auth & Actor Scope Enforcement", () => {
    it("should reject anonymous or blank actor ID immediately", async () => {
      await expect(
        upsertPluginExtension({
          actorId: "  ",
          schoolId: "school-1",
          pluginId: "plugin-1",
          entityType: "lesson",
          entityId: "lesson-1",
          payloadJson: { key: "val" },
        })
      ).rejects.toThrow("PLUGIN_ACTOR_REQUIRED");
    });

    it("should reject actor who is not an active teacher in the designated school", async () => {
      mockAssertActiveTeacher.mockResolvedValue({
        userId: "teacher-2",
        schoolIds: ["school-2"], // 不包含 school-1
      });

      await expect(
        getPluginExtension({
          actorId: "teacher-2",
          schoolId: "school-1",
          pluginId: "plugin-1",
          entityType: "lesson",
          entityId: "lesson-1",
        })
      ).rejects.toThrow("TEACHER_AUTH_REQUIRED");
    });
  });

  describe("B. Multi-Tenant Cross-Boundary Protection (School Isolation)", () => {
    it("should forbid execution if the plugin installation record belongs to a different school", async () => {
      // 模拟查询插件所属学校返回的是另一个学校
      setupDbSelectChain([{ schoolId: "school-different" }]);

      await expect(
        upsertPluginExtension({
          actorId: "teacher-1",
          schoolId: "school-1",
          pluginId: "plugin-1",
          entityType: "lesson",
          entityId: "lesson-1",
          payloadJson: { key: "val" },
        })
      ).rejects.toThrow("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
    });

    it("should forbid execution if the target core entity (Lesson) belongs to a different school", async () => {
      // 模拟第一步查询插件学校正确 (school-1)
      // 第二步查询课程学校返回的是另一个学校 (school-different)
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1" }]) // pluginRegistrations schoolId check
        .mockResolvedValueOnce([{ schoolId: "school-different" }]); // lessons schoolId check

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const innerJoin1 = vi.fn().mockReturnValue({ where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      await expect(
        upsertPluginExtension({
          actorId: "teacher-1",
          schoolId: "school-1",
          pluginId: "plugin-1",
          entityType: "lesson",
          entityId: "lesson-1",
          payloadJson: { key: "val" },
        })
      ).rejects.toThrow("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
    });

    it("should forbid execution if the target core entity (LessonStep) belongs to a different school", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1" }])
        .mockResolvedValueOnce([{ schoolId: "school-different" }]); // steps schoolId check

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const innerJoin2 = vi.fn().mockReturnValue({ where: whereFn });
      const innerJoin1 = vi.fn().mockReturnValue({ innerJoin: innerJoin2, where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      await expect(
        upsertPluginExtension({
          actorId: "teacher-1",
          schoolId: "school-1",
          pluginId: "plugin-1",
          entityType: "step",
          entityId: "step-1",
          payloadJson: { key: "val" },
        })
      ).rejects.toThrow("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
    });
  });

  describe("C. CRUD Operations & Idempotency", () => {
    it("should query core entity extension correctly if permission and tenant match", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1" }]) // pluginRegistrations schoolId check
        .mockResolvedValueOnce([{ schoolId: "school-1" }]) // lessons schoolId check
        .mockResolvedValueOnce([{ payloadJson: { test: "data" } }]); // target record select

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const innerJoin1 = vi.fn().mockReturnValue({ where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      const res = await getPluginExtension({
        actorId: "teacher-1",
        schoolId: "school-1",
        pluginId: "plugin-1",
        entityType: "lesson",
        entityId: "lesson-1",
      });

      expect(res).toEqual({ test: "data" });
    });

    it("should perform Drizzle insert if the extension record does not exist (idempotent upsert)", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1", manifestJson: { permissions: ["lesson:write"] } }]) // pluginRegistrations schoolId check
        .mockResolvedValueOnce([{ schoolId: "school-1" }]) // lessons schoolId check
        .mockResolvedValueOnce([]); // select target (empty = insert)

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const innerJoin1 = vi.fn().mockReturnValue({ where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      await upsertPluginExtension({
        actorId: "teacher-1",
        schoolId: "school-1",
        pluginId: "plugin-1",
        entityType: "lesson",
        entityId: "lesson-1",
        payloadJson: { foo: "bar" },
      });

      // 断言调用了 db.insert 且插入了对应数据
      expect(mockInsert).toHaveBeenCalledWith(pluginLessonExtensions);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: "school-1",
          pluginId: "plugin-1",
          lessonId: "lesson-1",
          payloadJson: { foo: "bar" },
        })
      );
    });

    it("should perform Drizzle update if the extension record already exists (idempotent upsert)", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1", manifestJson: { permissions: ["lesson:write"] } }]) // pluginRegistrations schoolId
        .mockResolvedValueOnce([{ schoolId: "school-1" }]) // lessons schoolId
        .mockResolvedValueOnce([{ id: "existing-uuid", schoolId: "school-1" }]); // select target

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const innerJoin1 = vi.fn().mockReturnValue({ where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      await upsertPluginExtension({
        actorId: "teacher-1",
        schoolId: "school-1",
        pluginId: "plugin-1",
        entityType: "lesson",
        entityId: "lesson-1",
        payloadJson: { foo: "new-bar" },
      });

      // 断言调用了 db.update 和 set / where
      expect(mockUpdate).toHaveBeenCalledWith(pluginLessonExtensions);
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          payloadJson: { foo: "new-bar" },
        })
      );
      expect(updateWhere).toHaveBeenCalled();
    });

    it("should upsert plugin owned business data correctly with exact key query", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1", manifestJson: { permissions: ["plugin:owned:write"] } }]) // pluginRegistrations schoolId check
        .mockResolvedValueOnce([]); // empty owned biz data (insert)

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      await upsertPluginOwnedBusinessData({
        actorId: "teacher-1",
        schoolId: "school-1",
        pluginId: "plugin-1",
        key: "reminders",
        payloadJson: { rule: "daily" },
      });

      expect(mockInsert).toHaveBeenCalledWith(pluginOwnedBusinessData);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: "school-1",
          pluginId: "plugin-1",
          key: "reminders",
          payloadJson: { rule: "daily" },
        })
      );
    });

    it("should read plugin owned business data correctly", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1" }]) // pluginRegistrations schoolId check
        .mockResolvedValueOnce([{ payloadJson: { rule: "weekly" } }]); // select target

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      const res = await getPluginOwnedBusinessData({
        actorId: "teacher-1",
        schoolId: "school-1",
        pluginId: "plugin-1",
        key: "reminders",
      });

      expect(res).toEqual({ rule: "weekly" });
    });
  });

  describe("Phase 47 DAL Integration & Security Boundary Controls", () => {
    const mockInsert = vi.mocked(db.insert);
    const mockSelect = vi.mocked(db.select);

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(revalidateTag).mockClear();
    });

    it("should reject upsertPluginExtension if manifest does not declare lesson:write or lesson:extension:write", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1", manifestJson: { permissions: ["some:other:permission"] } }]) // manifest
        .mockResolvedValueOnce([{ schoolId: "school-1" }]); // entity belongs to school

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const innerJoin1 = vi.fn().mockReturnValue({ where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      await expect(
        upsertPluginExtension({
          actorId: "teacher-1",
          schoolId: "school-1",
          pluginId: "plugin-1",
          entityType: "lesson",
          entityId: "lesson-1",
          payloadJson: { key: "val" },
        })
      ).rejects.toThrow("PLUGIN_MANIFEST_PERMISSION_DENIED");
    });

    it("should revalidate related tags including parent core entities on successful extension upsert", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1", manifestJson: { permissions: ["lesson:write"] } }]) // manifest
        .mockResolvedValueOnce([{ schoolId: "school-1" }]) // entity check
        .mockResolvedValueOnce([]) // existing check (empty = insert)
        .mockResolvedValueOnce([{ courseId: "course-123" }]); // lesson courseId retrieve in cache revalidation

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const innerJoin1 = vi.fn().mockReturnValue({ where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      await upsertPluginExtension({
        actorId: "teacher-1",
        schoolId: "school-1",
        pluginId: "plugin-1",
        entityType: "lesson",
        entityId: "lesson-1",
        payloadJson: { key: "val" },
      });

      // 验证缓存标签重置
      expect(revalidateTag).toHaveBeenCalledWith("plugin:ext:school-1:plugin-1:lesson-1");
      expect(revalidateTag).toHaveBeenCalledWith("lesson:lesson-1");
      expect(revalidateTag).toHaveBeenCalledWith("course:course-123");
    });

    it("should insert record into pluginActionAudits and governanceAudits in transaction on success", async () => {
      const limitFn = vi.fn();
      limitFn
        .mockResolvedValueOnce([{ schoolId: "school-1", manifestJson: { permissions: ["lesson:write"] } }]) // manifest
        .mockResolvedValueOnce([{ schoolId: "school-1" }]) // entity check
        .mockResolvedValueOnce([]) // existing check (empty = insert)
        .mockResolvedValueOnce([{ courseId: "course-123" }]); // cache retrieve

      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const innerJoin1 = vi.fn().mockReturnValue({ where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoin1, where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn } as any);

      await upsertPluginExtension({
        actorId: "teacher-1",
        schoolId: "school-1",
        pluginId: "plugin-1",
        entityType: "lesson",
        entityId: "lesson-1",
        payloadJson: { key: "val" },
      });

      // 验证事务是否被触发
      expect(db.transaction).toHaveBeenCalled();

      // 验证物理审计日志落盘
      expect(mockInsert).toHaveBeenCalledWith(pluginActionAudits);
      expect(mockInsert).toHaveBeenCalledWith(governanceAudits);
    });
  });
});
