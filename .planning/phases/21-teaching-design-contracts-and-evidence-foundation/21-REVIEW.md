---
phase: 21-teaching-design-contracts-and-evidence-foundation
reviewed: 2026-05-12T16:10:00Z
depth: deep
files_reviewed: 16
files_reviewed_list:
  - src/lib/dto/lesson-authoring.ts
  - src/lib/dal/lesson-authoring.ts
  - src/lib/dal/lesson-authoring.test.ts
  - src/lib/dto/classroom.ts
  - src/lib/dal/classroom.ts
  - src/lib/dal/classroom.test.ts
  - src/db/schema.ts
  - src/actions/classroom-actions.ts
  - src/actions/classroom-actions.test.ts
  - src/components/authoring/lesson-authoring-workspace.tsx
  - src/components/authoring/lesson-authoring-workspace.test.tsx
  - src/components/surfaces/teacher-lesson-preview-surface.tsx
  - src/components/classroom/classroom-launch-preview.tsx
  - src/components/classroom/classroom-launch-panel.test.tsx
  - scripts/verify-phase21-contracts.ts
  - package.json
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 21: Code review report

**Reviewed:** 2026-05-12T16:10:00Z  
**Depth:** deep  
**Files Reviewed:** 16  
**Status:** issues_found

## Summary

本次 review 覆盖了 Phase 21 计划列出的全部源码文件。实现方向基本对齐，
但仍有 2 个必须先修复的 correctness/security 问题，以及 1 个会误导教师的
teacher-facing 合同偏差。

## Critical issues

### CR-01: classroom evidence 写入口允许未绑定 actor scope 的未授权写入

**Classification:** BLOCKER  
**File:** `src/lib/dto/classroom.ts:134-141`, `src/lib/dal/classroom.ts:417-433`  
**Issue:** `RecordClassroomEvidenceInputSchema` 把 `studentId` 设为 optional，
而 `recordClassroomEvidence()` 只有在 `payload.studentId` 存在时才校验
“当前登录学生只能为自己写入”。当调用方省略 `studentId` 时，代码只要求
“用户已登录 + session 存在”，不会校验该用户是否是本课堂 teacher，也不会
校验是否是该 session 的 participant。结果是任意已登录用户只要拿到
`sessionId`，就能向 `classroomEvidence` 和 `classroomTimeline` 写入伪造记录，
直接污染 Phase 21 刚建立的 durable evidence truth。

**Fix:** 按 `sourceType` 强制绑定 actor scope：

```ts
if (payload.sourceType.startsWith("student-")) {
  if (payload.studentId !== user.id) {
    throw new Error("CLASSROOM_EVIDENCE_UNAUTHORIZED");
  }
  await ensureSessionStudentParticipant(session.id, user.id);
} else if (session.teacherId !== user.id) {
  throw new Error("CLASSROOM_EVIDENCE_UNAUTHORIZED");
}
```

并且把 `studentId` 设为“学生来源必填，教师来源禁止冒充学生”的 schema 约束。

### CR-02: partial teaching-design 数据没有 fallback，而是会被直接判 invalid

**Classification:** BLOCKER  
**File:** `src/lib/dto/lesson-authoring.ts:84-89`, `src/lib/dal/lesson-authoring.ts:380-400`, `src/lib/dal/classroom.ts:198-215`  
**Issue:** `TeachingDesignSchema` 当前要求四个字段全部存在，DAL helper 也只处理
“完全缺失”与“完全显式”两种情况。这样一来，只要历史 step 或 published
snapshot 里出现了部分 `teachingDesign` 字段，`lessonStepPayloadSchema.parse()`
就会直接失败，根本不会落到 `partial-teaching-design` fallback。Phase 21 计划里
明确要求支持 partial fallback，但当前实现既没有 partial schema，也没有字段级
merge，导出的 `partial-teaching-design` enum 实际上是死分支。

**Fix:** 输入层接受 partial `teachingDesign`，再用共享 resolver 做字段级默认化，
并在任一字段由默认值补齐时返回 `partial-teaching-design`。

```ts
const TeachingDesignInputSchema = TeachingDesignSchema.partial().optional();

function mergeTeachingDesign(input: Partial<TeachingDesign> | undefined, fallback: TeachingDesign) {
  return {
    ...fallback,
    ...input,
    evidenceExpectation: {
      ...fallback.evidenceExpectation,
      ...input?.evidenceExpectation,
    },
  };
}
```

然后让 authoring 与 classroom launch 共用同一个 resolver。

## Warnings

### WR-01: editor 仍使用硬编码时长，和新的 teaching-design contract 不一致

**Classification:** WARNING  
**File:** `src/components/authoring/lesson-authoring-workspace.tsx:43-47`, `src/components/authoring/lesson-authoring-workspace.tsx:110`, `src/components/authoring/lesson-authoring-workspace.tsx:440`, `src/components/authoring/lesson-authoring-workspace.tsx:503-507`  
**Issue:** Phase 21 已把 `estimatedMinutes` 纳入 step 级 contract，但 editor 里的
总时长和步骤 badge 仍然使用 `content=12 / task=15 / quiz=8` 的硬编码默认值。
这会让教师在 editor 中看到的时长与 preview / launch preview 中的结构化时长不一致。
例如显式配置为 18 分钟的 task，在 editor 里仍显示 15 分钟。

**Fix:** 统一从 `step.payload.teachingDesign?.estimatedMinutes` 取值，缺失时才回落到
legacy default。

```ts
function getStepMinutes(step: LessonStepDTO) {
  return step.payload.teachingDesign?.estimatedMinutes
    ?? (step.type === "content" ? 12 : step.type === "task" ? 15 : 8);
}
```

并同时替换总时长聚合与每个步骤右侧时长 chip。

---

_Reviewed: 2026-05-12T16:10:00Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
