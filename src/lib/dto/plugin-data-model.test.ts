import { describe, expect, it } from "vitest";

import {
  COLUMN_TYPES,
  OWNED_TABLE_PREFIX,
  PLUGIN_DATA_MODEL_REASONS,
  PluginDataModelSchema,
} from "@/lib/dto/plugin-data-model";

import { quizDataModel } from "../../../plugins/quiz-sample/data-model";

/**
 * 深拷贝合法样板后注入一处非法，保证每个负样本只触发其目标拒因，互不串扰。
 */
function mutate(fn: (model: any) => void): unknown {
  const clone = structuredClone(quizDataModel) as any;
  fn(clone);
  return clone;
}

describe("plugin-data-model meta-schema（DATA-01 边界契约）", () => {
  it("白名单常量恰为 5 个标量类型且顺序固定（json/blob 不在内）", () => {
    expect([...COLUMN_TYPES]).toEqual(["text", "integer", "boolean", "timestamp", "enum"]);
    expect(COLUMN_TYPES).not.toContain("json");
    expect(COLUMN_TYPES).not.toContain("blob");
  });

  it("OWNED_TABLE_PREFIX 为 plugin_owned_（D-10）", () => {
    expect(OWNED_TABLE_PREFIX).toBe("plugin_owned_");
  });

  it("拒因常量顺序固定（FK-to-core 刻意不入此数组，由 strict unrecognized_keys 把守）", () => {
    expect([...PLUGIN_DATA_MODEL_REASONS]).toEqual([
      "INVALID_COLUMN_TYPE",
      "MISSING_OWNED_PREFIX",
      "RAW_SQL_FORBIDDEN",
      "MISSING_SCHOOL_SCOPE",
      "ENUM_REQUIRES_VALUES",
    ]);
  });

  describe("happy-path：合法 quiz 样板", () => {
    it("PluginDataModelSchema.parse 成功（编译器输入真相源）", () => {
      expect(() => PluginDataModelSchema.parse(quizDataModel)).not.toThrow();
    });
  });

  describe("5 类非法声明各在边界被拒并断言特定拒因", () => {
    it("非法#1 夹带 raw SQL/DDL（列默认值含 DROP）→ RAW_SQL_FORBIDDEN", () => {
      const bad = mutate((m) => {
        m.tables[0].columns[1].default = "DROP TABLE users";
      });
      const result = PluginDataModelSchema.safeParse(bad);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues.some((i) => i.message === "RAW_SQL_FORBIDDEN")).toBe(true);
    });

    it("非法#2 表名缺 plugin_owned_ 前缀 → MISSING_OWNED_PREFIX", () => {
      const bad = mutate((m) => {
        m.tables[0].name = "quiz_questions";
      });
      const result = PluginDataModelSchema.safeParse(bad);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues.some((i) => i.message === "MISSING_OWNED_PREFIX")).toBe(true);
    });

    it("非法#3 声明对 core 表的 FK（foreignKeys 键）→ strict unrecognized_keys", () => {
      const bad = mutate((m) => {
        m.tables[0].foreignKeys = [{ column: "schoolId", references: "schools.id" }];
      });
      const result = PluginDataModelSchema.safeParse(bad);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues.some((i) => i.code === "unrecognized_keys")).toBe(true);
    });

    it("非法#4 缺 schoolId scope 列 → MISSING_SCHOOL_SCOPE", () => {
      const bad = mutate((m) => {
        m.tables[1].columns = m.tables[1].columns.filter((c: any) => c.name !== "schoolId");
        // 同步移除引用 schoolId 的索引/唯一约束，避免悬空列噪音掩盖目标拒因
        m.tables[1].indexes = [{ columns: ["classroomSession", "student", "question"] }];
      });
      const result = PluginDataModelSchema.safeParse(bad);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues.some((i) => i.message === "MISSING_SCHOOL_SCOPE")).toBe(true);
    });

    it("非法#5 出现 json 列类型 → INVALID_COLUMN_TYPE（path 指向 type）", () => {
      const bad = mutate((m) => {
        m.tables[0].columns[1].type = "json";
      });
      const result = PluginDataModelSchema.safeParse(bad);
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.message === "INVALID_COLUMN_TYPE");
      expect(issue).toBeDefined();
      expect(issue?.path.at(-1)).toBe("type");
    });
  });
});
