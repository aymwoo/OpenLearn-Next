---
phase: quick
plan: 260512-wo6
status: complete
---

# Quick summary

已完成：修复 Phase 21 review 提出的三处阻断问题，并恢复 `verify:phase21` 为本地 focused 验证入口。

- 将 `teachingDesign` 输入 schema 放宽为 partial input，并新增 `src/lib/teaching-design.ts` 统一补齐默认值与 `partial-teaching-design` / `needs-refinement` 标记，供 authoring 和 classroom launch 共用。
- 收紧 `recordClassroomEvidence()` 的 actor scope：学生来源必须带本人 `studentId` 且必须已加入该课堂；非学生来源仅允许 session teacher 写入。
- 让 editor 流程卡片和总时长改为优先读取 `step.payload.teachingDesign.estimatedMinutes`，避免与 preview / launch preview 合同漂移。
- 扩展 focused tests，并把 `src/lib/dal/lesson-authoring.test.ts` 纳入 `verify:phase21`。

验证：

- `pnpm verify:phase21`
