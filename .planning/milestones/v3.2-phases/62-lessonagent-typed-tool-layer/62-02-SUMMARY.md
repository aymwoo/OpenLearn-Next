---
phase: 62-lessonagent-typed-tool-layer
plan: 02
subsystem: server/ai/tools
tags: [ai, tool-layer, security, server-only, tdd]
requires:
  - "@/server/ai/providers (aiGenerateObject) — Phase 61 facade"
  - "@/lib/dal/lesson-authoring (getTeacherLessonPreviewDTO) — 只读授权域 DAL"
  - "@/lib/dto/lesson-authoring (lessonStepPayloadSchema) — 复用步骤包 schema"
provides:
  - "createDraftLessonStepTool factory（闭包注入 teacherId 的 ai tool）"
  - "buildDraftStepPrompt（content/task/quiz 起草 prompt 编排）"
  - "server/ai/tools 窄公共 barrel"
affects:
  - "下游 LessonAgent 编排（Phase 62 后续 plan）可经 barrel 装配该 tool"
tech-stack:
  added: []
  patterns:
    - "factory 闭包注入受信任标识（teacherId），排除出 LLM 可控 inputSchema（缓解 Spoofing）"
    - "ai@6 tool({ inputSchema, execute }) —— 字段为 inputSchema 而非 parameters"
    - "no-leak 静态边界测试：client/edge/plugin 不得 import server-only 资产"
key-files:
  created:
    - src/server/ai/tools/lesson-draft.ts
    - src/server/ai/tools/prompts.ts
    - src/server/ai/tools/index.ts
    - src/server/ai/tools/lesson-draft.test.ts
    - src/server/ai/tools/no-leak.test.ts
  modified: []
decisions:
  - "tool 仅经 Phase 61 facade aiGenerateObject 生成，不直连 ai.generateObject（唯一生成通道）"
  - "产出纯内存返回不落库（D-01）——execute 不调用任何写 DAL"
  - "复用 lessonStepPayloadSchema，不另造步骤模型"
metrics:
  duration: ~25m
  completed: 2026-05-31
  tasks: 2
  files: 5
---

# Phase 62 Plan 02: LessonAgent Typed Tool Layer Summary

经 TDD 落地 server-only 的 `draftLessonStepTool` 工厂：边界 Zod 校验拒非法输入、teacherId 闭包注入消除 Spoofing 面、只经 Phase 61 facade + 只读 DAL 工作、产出经 `lessonStepPayloadSchema` 校验的 content/task/quiz 原子步骤包并纯内存返回不落库。

## What Was Built

- **`lesson-draft.ts`** — `createDraftLessonStepTool({ teacherId })` 工厂返回 `ai` 的 `tool({ inputSchema, execute })`。`inputSchema` 仅含 `lessonId`/`stepType`(枚举 content|task|quiz)/`intent`，**不含 teacherId**。execute：① 只读 `getTeacherLessonPreviewDTO` 取授权域上下文 → ② 经 `aiGenerateObject`（teacherId 来自闭包）按 `lessonStepPayloadSchema` 生成 → ③ 内存返回，无写库。
- **`prompts.ts`** — `buildDraftStepPrompt` 拼装 system 安全约束 + 课程上下文 + 已有步骤摘要 + 三类步骤 few-shot（形状对齐 resource-ai initialPayload），不含任何 provider key。
- **`index.ts`** — 窄 barrel，仅 re-export `createDraftLessonStepTool` 公共面。
- **`lesson-draft.test.ts`** — 行为单测：非法 payload 边界拒绝、合法生成经 schema 校验、teacherId 闭包注入(inputSchema 无 teacherId 键 + facade 收到闭包 teacherId)、只读 DAL 无写库。
- **`no-leak.test.ts`** — 照搬 providers A 组静态扫描，spec 改 `/server\/ai\/tools/`，断言 client/edge/plugin 三类文件均不 import tools 层。

## Verification

- `pnpm vitest run src/server/ai/tools/lesson-draft.test.ts src/server/ai/tools/no-leak.test.ts` → **8 passed**。
- `pnpm tsc --noEmit` → server/ai/tools 文件零类型错误。
- `pnpm eslint src/server/ai/tools/*.ts` → 干净。
- providers/no-leak.test.ts 无回归（5 passed）。
- 硬约束 grep：`generateObject/generateText` 仅出现在注释（实际 import 仅 `tool` from "ai"）；无 DB client / process.env / eval / drizzle 导入；首行 `import "server-only"`。

## Deviations from Plan

None — 计划照常执行。唯一附带调整：测试中将 `ai` 暴露为 `FlexibleSchema` 的 `tool.inputSchema` 经结构型 view 收窄回 `safeParse`/`shape`（运行期本就是传入的 ZodObject），属类型层适配，非行为偏离。

## Self-Check: PASSED

- 五文件均存在。
- 提交 `4da8692`(test RED) / `ff55bcf`(feat GREEN) 均在 git 历史。
