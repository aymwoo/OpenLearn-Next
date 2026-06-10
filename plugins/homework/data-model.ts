/**
 * homework 声明式 dataModel（Phase 75, MKT-EXT-03）。
 *
 * 与 quiz sample 走完全相同的受治理路径：
 *   - 被 `src/lib/dto/plugin-data-model.ts` 的 PluginDataModelSchema 校验；
 *   - 被 `scripts/compile-plugin-data-model.ts` 编译器消费，固定输出受治理的物理表 + allowlist。
 *
 * 设计约束（与 quiz 对齐）：
 *   - 纯对象常量，绝无 DDL/SQL 字符串；
 *   - 每张表均以 `plugin_owned_` 前缀命名，并强制携带 schoolId scope 列；
 *   - 列类型仅取白名单标量 text/integer/boolean/timestamp/enum；
 *   - 声明面不表达 id/pluginId/attemptNo/isLatest/createdAt/updatedAt —— 编译器固定注入。
 *
 * 三表结构：
 *   - assignments：作业定义（标题、描述、附件、classroomSession）
 *   - submissions：学生提交（内容、附件、append-only/isLatest）
 *   - grades：教师批改（分数、评语、append-only/isLatest）
 */

export const homeworkDataModel = {
  pluginKey: "homework",
  tables: [
    {
      name: "plugin_owned_homework_assignments",
      columns: [
        { name: "schoolId", type: "text", notNull: true },
        { name: "classroomSession", type: "text", notNull: true },
        { name: "title", type: "text", notNull: true },
        { name: "description", type: "text", notNull: false },
        { name: "attachmentUrl", type: "text", notNull: false },
        { name: "dueDate", type: "text", notNull: false },
      ],
      indexes: [{ columns: ["schoolId", "classroomSession"] }],
    },
    {
      name: "plugin_owned_homework_submissions",
      columns: [
        { name: "schoolId", type: "text", notNull: true },
        { name: "classroomSession", type: "text", notNull: true },
        { name: "student", type: "text", notNull: true },
        { name: "assignment", type: "text", notNull: true },
        { name: "content", type: "text", notNull: true },
        { name: "attachmentUrl", type: "text", notNull: false },
      ],
      indexes: [{ columns: ["schoolId", "classroomSession", "assignment"] }],
      // append-only 去重键：同一学生对同一作业可多次提交，保留历史
      uniques: [{ columns: ["classroomSession", "student", "assignment"] }],
    },
    {
      name: "plugin_owned_homework_grades",
      columns: [
        { name: "schoolId", type: "text", notNull: true },
        { name: "classroomSession", type: "text", notNull: true },
        { name: "student", type: "text", notNull: true },
        { name: "submission", type: "text", notNull: true },
        { name: "score", type: "integer", notNull: false },
        { name: "comment", type: "text", notNull: false },
      ],
      indexes: [{ columns: ["schoolId", "classroomSession", "submission"] }],
      // append-only 去重键：教师可多次修改分数/评语，保留批改历史
      uniques: [{ columns: ["classroomSession", "student", "submission"] }],
    },
  ],
} as const;
