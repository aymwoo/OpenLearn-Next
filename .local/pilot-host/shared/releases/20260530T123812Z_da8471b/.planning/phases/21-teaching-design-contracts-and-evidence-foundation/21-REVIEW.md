---
phase: 21-teaching-design-contracts-and-evidence-foundation
reviewed: 2026-05-13T01:30:00Z
depth: deep
files_reviewed: 20
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
  - src/components/classroom/classroom-timeline-panel.tsx
  - src/components/classroom/classroom-timeline-panel.test.tsx
  - src/components/classroom/classroom-control-panel.tsx
  - src/components/surfaces/classroom-console-surface.tsx
  - scripts/verify-phase21-contracts.ts
  - package.json
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 21: Code review report

**Reviewed:** 2026-05-13T01:30:00Z  
**Depth:** deep  
**Files Reviewed:** 20  
**Status:** issues_found

## Summary

本次复核覆盖了 Phase 21 当前落地的全部源码文件，并重新检查了上一轮
review 里的两个 blocker。`classroom evidence` 的 actor scope 绑定，以及
`partial teachingDesign` fallback 现在都已经修复；本轮剩余 2 个 warning，
主要集中在教师时间线的时间展示与 session 过滤健壮性。

## Warnings

### WR-01: 干预记录时间线把所有时间强制按 UTC 渲染，教师看到的记录时间会偏移

**Classification:** WARNING  
**File:** `src/components/classroom/classroom-timeline-panel.tsx:9-19`  
**Issue:** `formatTimelineTime()` 使用 `Intl.DateTimeFormat(..., { timeZone: "UTC" })`
把所有干预记录固定按 UTC 显示。后端存的是 UTC ISO 时间没问题，但前端展示时
应该按教师当前时区显示，否则中国教师会看到比真实记录时间早 8 小时，其他时区
同样会整体偏移。这会直接误导教师对干预发生时点的判断。

**Fix:** 去掉 `timeZone: "UTC"`，让浏览器按本地时区格式化；如果产品要求统一校时，
也应显式使用学校时区，而不是硬编码 UTC。

```ts
return new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(date);
```

### WR-02: teacher timeline 的 session 过滤依赖第一条记录，顺序一变就可能错筛

**Classification:** WARNING  
**File:** `src/lib/dal/classroom.ts:249-251`  
**Issue:** `buildTeacherTimeline()` 先做了一层过滤：

```ts
.filter((entry) => entry.sessionId === input.timelineRows[0]?.sessionId || input.timelineRows.length === 0)
```

这不是按“当前请求的 sessionId”过滤，而是按“第一条 timeline row 的 sessionId”过滤。
当前调用方恰好已经在查询层按 `session.id` 过滤，所以线上大多数时候不会暴露；但这让
helper 自身变成了顺序敏感逻辑，一旦未来调用方复用它并传入混合 session 数据，或查询
条件被放宽，当前课堂的干预记录可能被整批过滤掉，或者混入错误 session 的记录。

**Fix:** 给 `buildTeacherTimeline()` 显式传入目标 `sessionId` 并按它过滤，或者直接删掉
这层基于首条记录的过滤，完全依赖调用方的查询边界。

---

_Reviewed: 2026-05-13T01:30:00Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: deep_
