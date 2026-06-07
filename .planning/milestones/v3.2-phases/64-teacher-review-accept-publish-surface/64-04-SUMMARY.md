---
phase: 64-teacher-review-accept-publish-surface
plan: "04"
subsystem: ui
tags: [review-surface, diff-list, mode-switch, glass-prompt, editor-integration, component-tests]

# Dependency graph
requires:
  - phase: 64-02
    provides: "getLessonDraftReviewDTO DAL, applyDraftToLiveLesson DAL, discardDraftLessonVersion DAL"
  - phase: 64-03
    provides: "applyDraftLessonVersionAction, discardDraftLessonVersionAction Server Actions"
provides:
  - "mode=review URL entry point in editor page with DAL-loaded review DTO"
  - "Glass discovery prompt when unreviewed AI draft exists in edit mode"
  - "Segmented 编辑/审校 mode switch with pending draft count badge"
  - "LessonDraftReviewWorkspace: single-column diff list with per-step state badges"
  - "Per-step accept/discard with local client state + right-side edit panel"
  - "Global action bar with confirmations for overwrite/discard/return-to-edit"
  - "9 component tests covering core review interactions"
affects: [64-05-eval-guardrails]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mode switch via next/link with URL query param (not React state) — preserves browser history"
    - "Client-only local review state (acceptedStepIndices, discardedStepIndices, localEdits) per D-12"
    - "Per-step accept/discard updates local sets only — server call only on global actions"
    - "ConfirmDialog reusable component for all modal confirmations"
    - "StepEditPanel enforces D-13: type field is read-only badge, only title/description/content editable"
    - "No 1px border dividers — tonal surfaces + spacing per DESIGN.md"
    - "Tests use vi.hoisted() mocks for Server Actions and next/navigation"

key-files:
  created:
    - src/components/authoring/lesson-draft-review-workspace.tsx
    - src/components/authoring/lesson-draft-review-workspace.test.tsx
  modified:
    - src/app/(teacher)/teacher/editor/page.tsx
    - src/components/surfaces/lesson-editor-surface.tsx
    - src/components/authoring/lesson-authoring-workspace.tsx
    - src/app/globals.css

key-decisions:
  - "Mode stored in URL query param (?mode=review) not React state — allows direct linking, browser back/forward, SSR hydration"
  - "Glass discovery prompt dismissible via client useState — re-appears on next page load while draft pending"
  - "StepEditPanel slide-in uses CSS keyframes (not framer-motion) — no new dependency, 0.25s ease-out"
  - "Empty draft state shown inline in lesson-authoring-workspace.tsx, review workspace shows its own empty state for hasPendingDraft=false"

patterns-established:
  - "Pattern 1: page.tsx (Server Component) imports DAL directly for review DTO loading — UI components use Server Actions only"
  - "Pattern 2: vi.hoisted() mocking pattern for Server Actions in component tests mirrors existing test conventions"
  - "Pattern 3: Mode switch uses Link with replace (not push) to avoid cluttering browser history"

requirements-completed: [REVIEW-01, REVIEW-02, REVIEW-03, REVIEW-04]

# Metrics
duration: 13min
completed: 2026-05-31
---

# Phase 64 Plan 04: Teacher Review Surface — Editor Integration 总结

**在编辑器内嵌入审校模式：?mode=review URL 入口、glass 发现提示、分段模式切换、单列 diff 列表含逐步接受/丢弃、右侧编辑面板、全局操作栏含确认对话框。**

## 性能

- **耗时:** 13 分钟
- **开始时间:** 2026-05-31T14:01:20Z
- **结束时间:** 2026-05-31T14:14:00Z
- **任务数:** 3
- **修改文件数:** 6

## 成果
- 编辑器页面支持 `?mode=review` URL 参数，在 Server Component 中通过 DAL 加载 `LessonDraftReviewDTO`
- Glass 发现提示：「AI 已生成草稿，点击审校 →」，编辑模式下有未审校 AI 草稿时显示，可关闭（刷新后重新出现）
- 分段模式切换：「编辑」/「审校」在编辑器头部，审校段有 pending 数量徽章
- `LessonDraftReviewWorkspace` 主审校组件：固定顶部操作栏 + 可滚动单列 diff 列表
- 每个 diff 行显示状态徽章（新增/修改/删除），逐项 `<code>接受此步</code>` / `<code>丢弃此步</code>` 按钮
- 右侧滑出编辑面板（`w-96`）：仅 title/description/content 可编辑，步骤类型只读（D-13）
- 全局操作：`接受全部草稿`（含覆盖确认 D-06）、`丢弃草稿`、`返回编辑`（含未保存编辑警告）
- 成功/错误 toast 反馈，带自动导航回编辑模式
- 9 个组件测试覆盖核心交互，typecheck 零错误

## 任务提交

每个任务已原子化提交：

1. **Task 1: mode=review 入口 + glass 提示 + 模式切换** — `edd6808`（feat：3 文件修改 + 1 新文件[stub]）
2. **Task 2: LessonDraftReviewWorkspace 完整实现** — `d0b625d`（feat：diff 列表 + 逐项操作 + 全局操作栏 + 确认对话框 + toast + slide 动画）
3. **Task 3: 右侧编辑面板 + 组件测试 + 视觉对齐验证** — `b8fa635`（test：9 个测试覆盖核心交互）

## 创建/修改的文件
- `src/app/(teacher)/teacher/editor/page.tsx` — 修改：新增 `mode` 搜索参数、条件加载 `getLessonDraftReviewDTO`、传递 mode/draftReview 给 surface
- `src/components/surfaces/lesson-editor-surface.tsx` — 修改：新增 `"use client"`、分段 编辑/审校 切换、glass 发现提示、传递 mode/draftReview 给 workspace
- `src/components/authoring/lesson-authoring-workspace.tsx` — 修改：新增 mode/draftReview props、审校模式条件渲染（真实 workspace vs 空状态）
- `src/components/authoring/lesson-draft-review-workspace.tsx` — 新建：800+ 行主审校组件，含 DiffStepCard、StepEditPanel、ConfirmDialog 子组件
- `src/components/authoring/lesson-draft-review-workspace.test.tsx` — 新建：256 行，9 个测试覆盖 badge 渲染、逐步操作、编辑面板、确认对话框、空状态
- `src/app/globals.css` — 修改：新增 `@keyframes slideInRight` 和 `.animate-slide-in-right` 类

## 决策记录
- 模式存储在 URL query param（`?mode=review`）而非 React state —— 支持直接链接、浏览器前进/后退、SSR 水合
- Glass 发现提示通过客户端 `useState` 可关闭 —— 刷新页面后重新出现（只要草稿仍为 pending）
- StepEditPanel 滑入使用 CSS `@keyframes`（而非 framer-motion）—— 无新依赖，0.25s ease-out
- 空草稿状态在 lesson-authoring-workspace.tsx 内联展示（简单文本），审校组件内部也有 `hasPendingDraft: false` 的空状态

## 与计划的偏差

### 自动修复的问题

**1. [Rule 3 - Blocking] @testing-library/jest-dom 未安装，`toBeInTheDocument` 不可用**
- **发现于:** 任务 3（组件测试）
- **问题:** 测试使用了 `toBeInTheDocument()`，但项目中未安装 `@testing-library/jest-dom` 且未配置 vitest setup 文件。现有测试均使用 `.toBeTruthy()` + `getByText` 模式。
- **修复:** 将所有 `.toBeInTheDocument()` 替换为 `.toBeTruthy()`，匹配项目现有测试约定
- **修改文件:** src/components/authoring/lesson-draft-review-workspace.test.tsx
- **验证:** 9 个测试全部通过
- **提交于:** `b8fa635`（任务 3 提交）

---

**总计偏差:** 1 个自动修复（Rule 3）
**影响评估:** 测试断言语法调整以匹配项目约定 —— 无功能变化，无范围蔓延。

## 已知问题

无阻塞问题。

## 已知存根

无 —— 所有三个组件（LessonDraftReviewWorkspace、StepEditPanel、ConfirmDialog）均已完整实现并通过测试。

## 威胁标志

无 —— 所有 STRIDE 缓解措施已实现：
- S64-01（Spoofing）：review DTO 由 DAL 加载，附带授权；客户端永不接收原始 snapshotJson
- S64-04（Tampering）：所有写操作通过 Server Actions（applyDraftLessonVersionAction / discardDraftLessonVersionAction），Actions 内部处理缓存失效
- S64-05（Information Disclosure）：编辑面板仅暴露 title/description/content（D-13），type/config 字段锁定
- S64-09（Elevation of Privilege）：本地 accept/discard 状态为客户端专用，永不过久化；实际提交操作重新验证授权

## 需要用户配合的部分

无 —— 本计划无需外部服务配置。

## 下一阶段准备状态
- 审校 UI 已完全集成到编辑器中（`/teacher/editor?mode=review`）
- 逐步和全局接受/丢弃控制已就绪，通过 Server Actions 连接 DAL
- 9 个组件测试覆盖核心交互
- TypeScript 类型检查零错误
- **等待 checkpoint:human-verify 审批** — 视觉对齐验证通过后即完成 Phase 64

---

*阶段: 64-teacher-review-accept-publish-surface*
*完成时间: 2026-05-31*

## Self-Check: PASSED

- ✅ `src/components/authoring/lesson-draft-review-workspace.tsx` 存在
- ✅ `src/components/authoring/lesson-draft-review-workspace.test.tsx` 存在，9 个测试通过
- ✅ `src/app/(teacher)/teacher/editor/page.tsx` 包含 `getLessonDraftReviewDTO` 调用
- ✅ `src/components/surfaces/lesson-editor-surface.tsx` 包含 审校/AI 已生成草稿
- ✅ 3 个提交在 git log 中（edd6808, d0b625d, b8fa635）
- ✅ pnpm typecheck 零错误
