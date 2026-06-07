# Phase 73: Multi-Type Quiz Schema, Live WS Event & Teacher Live Dashboard — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-07
**Phase:** 73-multi-type-quiz-schema-live-ws-event-teacher-live-dashboard
**Areas discussed:** Schema 迁移方式, WS 事件触发时机, 实时仪表盘客户端架构, Dashboard UI 布局

---

## Schema 迁移方式

| Option | Description | Selected |
|--------|-------------|----------|
| 改源 + 重编译 + migration | 修改 `plugins/quiz-sample/data-model.ts` 加 `questionType` 字段，重跑 `compile-plugin-data-model` 生成新 `quiz.ts` schema，手写 Drizzle migration，旧行默认 `single_choice` | ✓ |
| 仅手写 migration | 不改 `data-model.ts`，直接手写 ALTER TABLE ADD COLUMN migration，生成文件手动补字段 | |

**User's choice:** 改源 + 重编译 + migration
**Notes:** 单一真相源（data-model.ts 是 schema 权威定义），不绕过编译生成链路。

---

## WS 事件触发时机

| Option | Description | Selected |
|--------|-------------|----------|
| Server Action 直推 | `submitQuizSampleAnswerAction` 写入后直接调用 ws-server broadcast | |
| 通过 Command Bus 解耦 | `dispatchPlatformCommand(quiz.answer.received)` → ws-server 订阅 → 广播 | ✓ |
| Event Bus（已有） | 复用 v3.0 Platform Event Bus 监听 | |

**User's choice:** 通过 Command Bus 解耦
**Notes:** 语义上是"作答已写入的事实通知"，走 Command Bus 保持 transport 层不侵入 Server Action。

---

## 实时仪表盘客户端架构

| Option | Description | Selected |
|--------|-------------|----------|
| Zustand store | 管理 WS 事件池 + 聚合缓存，跨组件共享，已在 stack 中 | ✓ |
| React Context + useReducer | 纯 React 方案，Context 包裹 dashboard tab | |
| Window 级 event buffer | 全局 Map/Array 存储原始事件 | |

**User's choice:** Zustand store
**Notes:** 刷新丢失可接受（课后自动切 v4.0 recap stats）。轻量，不引入新依赖。

---

## Dashboard UI 布局

| Option | Description | Selected |
|--------|-------------|----------|
| 同层级 sibling tab（推荐） | 与 recap/control 并列作为第三个 tab，tab bar 水平排列，保持 DESIGN.md tonal surface 层级 | ✓ |
| 侧边面板 | 右侧可折叠面板，不占用主内容区 | |
| 独立 section 在 control tab 内 | control tab 下方加 collapsible section | |

**User's choice:** 同层级 sibling tab（推荐）
**Notes:** 与现有 tab 导航模式一致，DESIGN.md tonal surface 层级不变。

---

## the agent's Discretion

无用户委托给 agent 的决策（所有 4 个方向均为用户直接选定）。

## Deferred Ideas

- `QUIZ-EXT-03` (post-class interactive review / AI 出题) — v4.2+
- `MKT-EXT-01/02/03` — v4.2+
- `STORE-01` — 暂缓
- 教师批改/评分/排名 — 明确排除
- 新 WS endpoint — 明确排除
