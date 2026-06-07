/**
 * 合法 quiz 声明式 dataModel 样板（Phase 67, DATA-01）。
 *
 * 这是「compile, don't execute」流水线的**单一真相源**：
 *   - 被 `src/lib/dto/plugin-data-model.test.ts` 的 happy-path 断言消费；
 *   - 将被 Phase 2（67-02）的编译器读取，固定输出受治理的物理表 + 迁移。
 *
 * 设计约束（与 CONTEXT D-01..D-12 对齐）：
 *   - 纯对象常量，**绝无** DDL/SQL 字符串、`eval`、动态执行；
 *   - 每张表均以 `plugin_owned_` 前缀命名（D-10），并强制携带 `schoolId` scope 列（D-11）；
 *   - 列类型仅取白名单标量 text/integer/boolean/timestamp/enum（D-01），enum 携带命名 values 数组（D-03）；
 *   - 声明面**不**表达 `id`/`pluginId`/`isLatest`/`createdAt`/`updatedAt` 与任何 FK —— 这些由编译器固定注入（D-11）。
 */

export const quizDataModel = {
  pluginKey: "quiz",
  tables: [
    {
      name: "plugin_owned_quiz_questions",
      columns: [
        { name: "schoolId", type: "text", notNull: true },
        { name: "classroomSession", type: "text", notNull: true },
        { name: "question", type: "text", notNull: true },
        { name: "prompt", type: "text", notNull: true },
        { name: "optionAText", type: "text", notNull: true },
        { name: "optionBText", type: "text", notNull: true },
        { name: "optionCText", type: "text", notNull: false },
        { name: "optionDText", type: "text", notNull: false },
             {
          name: "questionType",
          type: "enum",
          notNull: true,
          default: "single_choice",
          enumValues: ["single_choice", "multi_choice", "true_false", "fill_blank", "ordering"],
        },
        {
          name: "correctOption",
          type: "enum",
          notNull: true,
          enumValues: ["A", "B", "C", "D"],
        },
      ],
      indexes: [{ columns: ["schoolId", "classroomSession", "question"] }],
    },
    {
      name: "plugin_owned_quiz_responses",
      columns: [
        { name: "schoolId", type: "text", notNull: true },
        { name: "classroomSession", type: "text", notNull: true },
        { name: "student", type: "text", notNull: true },
        { name: "question", type: "text", notNull: true },
        {
          name: "selectedOption",
          // Phase 73: changed from enum to text to support:
          // - single_choice: "A"/"B"/"C"/"D"
          // - multi_choice: "A,B" or "A,C,D" etc. (JSON string)
          // - true_false: "A" (True) / "B" (False)
          // - fill_blank: text answer
          // - ordering: rank string e.g. "A,B,C"
          type: "text",
          notNull: true,
        },
      ],
      // D-12 复合索引列序
      indexes: [{ columns: ["schoolId", "classroomSession", "student", "question"] }],
      // D-12 去重唯一约束
      uniques: [{ columns: ["classroomSession", "student", "question"] }],
    },
  ],
} as const;
