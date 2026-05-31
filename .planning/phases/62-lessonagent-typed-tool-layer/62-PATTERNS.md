# Phase 62: LessonAgent Typed Tool Layer - Pattern Map

**Mapped:** 2026-05-31
**Files analyzed:** 12（新建/修改/复用）
**Analogs found:** 11 / 12（步骤包 DTO 为纯复用，无需 analog）

> 本文档把 62-CONTEXT.md（D-01~D-04）与 62-RESEARCH.md 的真实签名映射到代码基线里**最近的现有 analog**，供 planner 在每个 PLAN.md 的 action 中直接「照抄」。所有 analog 均为实读（file_path:line）。

---

## File Classification

| 新建/修改文件 | 角色 | 数据流向 | 最近 analog | 匹配质量 |
|---------------|------|----------|-------------|----------|
| `src/server/ai/tools/lesson-draft.ts`（新建） | tool / service | transform（只读上下文→生成→内存返回） | `src/server/ai/providers/facade.ts` | role+flow 近似 |
| `src/server/ai/tools/prompts.ts`（新建） | config / constant | 静态数据 | `src/lib/dto/resource-ai.ts:469` `BUILT_IN_TEACHING_STEP_DEFINITIONS` | role 匹配 |
| `src/server/ai/tools/index.ts`（新建 barrel） | config / barrel | re-export | `src/server/ai/providers/index.ts` | exact |
| `src/server/ai/agents/lesson-agent.ts`（新建，跑通 LessonAgent 链路） | service / orchestrator | request-response（单轮工具循环） | `src/server/ai/providers/facade.ts`（编排流水线）+ `agents/registry.ts`（seed） | role 匹配 |
| `src/features/platform-core/events/contracts.ts`（修改：并入 AI 域事件） | model / contract | event schema | 同文件既有 `Plugin*EventSchema`（:94-128） | exact |
| `src/features/platform-core/commands/contracts.ts`（修改：新增 AI/lesson command 类型） | model / contract | command schema | 同文件 `PlatformPluginGovernanceCommandTypes`（:13）+ envelope（:44） | exact |
| `src/features/platform-core/commands/handlers/lesson-draft.ts`（新建 handler） | service / handler | event-driven（execute→emittedEvents） | `src/features/platform-core/commands/handlers/plugins.ts:215-239` | role 匹配 |
| `src/features/platform-core/commands/registry.ts`（修改：注册新 command） | config / registry | 注册表 | 同文件既有 `createPlatformCommandDefinition`（:15） | exact |
| `src/features/platform-core/commands/producers/lesson-draft.ts`（可选，新建 producer） | service / producer | command envelope 构造 | `src/features/platform-core/commands/producers/plugin-governance.ts:19-39` | role 匹配 |
| `src/lib/dal/lesson-authoring.ts`（仅在投影不足时补只读 helper） | DAL / read | request-response（只读授权域） | 同文件 `getTeacherLessonPreviewDTO`（:871） | exact |
| `src/lib/dto/lesson-authoring.ts` `lessonStepPayloadSchema`（**纯复用，不改**） | model / DTO | — | — | 直接复用 |
| 测试文件（`lesson-draft.test.ts` / `no-leak` 扩展 / handler events 测试） | test | unit + 静态 | `providers/no-leak.test.ts` / `commands/handlers/plugins.events.test.ts` | role 匹配 |

---

## Pattern Assignments

### `src/server/ai/tools/lesson-draft.ts`（tool / service · transform）

**Analog:** `src/server/ai/providers/facade.ts`（server-only 边界 + 固定流水线 + 唯一生成通道）

**server-only 边界 + 唯一生成入口**（facade.ts:1-3 / D-02 禁直连 `ai`、禁 DB client、禁 env key）：
```typescript
import "server-only";
// 注意：tool 不直接 import "ai" 的 generateObject —— 只经 Phase 61 facade
import { aiGenerateObject } from "@/server/ai/providers";
import { getTeacherLessonPreviewDTO } from "@/lib/dal/lesson-authoring";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";
```

**tool() 形态**（RESEARCH.md:32-44，字段名是 `inputSchema` 不是 `parameters`；`ai@6.0.193` 从 `@ai-sdk/provider-utils@4.0.27` re-export）：
```typescript
import { tool } from "ai";
import { z } from "zod";

export const draftLessonStepTool = tool({
  description: "为目标课时生成一个符合 content/task/quiz 原子步骤 schema 的步骤包（纯生成，不落库）",
  inputSchema: z.object({          // ← AGENT-01 边界校验关口，非法 payload 在此被拒
    lessonId: z.string().min(1),
    stepType: z.enum(["content", "task", "quiz"]),
    intent: z.string().min(1),
  }),
  execute: async (input, _options) => {
    // 1) 只读上下文（D-04，DAL 自带 assertActiveTeacher + getScopedLesson 授权域）
    const context = await getTeacherLessonPreviewDTO({ lessonId: input.lessonId });
    // 2) 纯生成，结构化输出直接被 Zod 校验（D-01 复用 lessonStepPayloadSchema）
    const step = await aiGenerateObject({
      teacherId: /* 由 Server Action 传入 */ ,
      prompt: /* 见 prompts.ts */ ,
      schema: lessonStepPayloadSchema,   // 单步 discriminated union
    });
    // 3) 返回内存 DTO —— 本 phase 绝不写库（D-01）
    return step;
  },
});
```

**facade 调用的错误归一惯例**（facade.ts:67-73；调用方按 `ProviderError.kind` / `instanceof` 决策，永不裸抛 AI SDK 原生错误）：
```typescript
// execute 内若需细分错误，import 判型面（providers/index.ts:21-27）
import { ProviderParseError, ProviderRateLimitError } from "@/server/ai/providers";
```

**复用 vs 新建：** 新建文件，但生成机制、server-only 边界、错误判型**全部复用** Phase 61 facade；**不重复造结构化生成**（D-02）。`GenerateObjectArgs<T>` = `{ teacherId, prompt, schema, modelId? }`（facade.ts:44-50）。

---

### `src/server/ai/tools/prompts.ts`（config / constant · 静态数据）

**Analog:** `src/lib/dto/resource-ai.ts:469` `BUILT_IN_TEACHING_STEP_DEFINITIONS`

**单步 `initialPayload` 形状先例**（resource-ai.ts:478-484，是「生成单步包」的形状与默认值参照）：
```typescript
initialPayload: {
  type: "content",
  title: "教师讲授",
  body: "围绕本节重点展开讲授，结合板书、示范或例题帮助学生建立知识框架。",
  teacherNotes: "先明确本环节目标，再补充示范或关键提示。",
  materialRefs: [],
},
```

**复用 vs 新建：** 新建（prompt/系统前置/安全约束在本层定义，D-02、D-11@Phase61 下放）。few-shot 与默认值对齐上述 `initialPayload` 形状，**避免造第二套步骤模型**（specifics:100）。

---

### `src/server/ai/tools/index.ts`（config / barrel · re-export）

**Analog:** `src/server/ai/providers/index.ts`（收窄公共面，刻意不导出内部模块）

**barrel 收口风格**（providers/index.ts:18-27）：
```typescript
// 只 re-export tool 公共面；不导出 prompt 细节/内部 helper
export { draftLessonStepTool } from "./lesson-draft";
```

**复用 vs 新建：** 新建，照搬 providers barrel 的「窄公共面」纪律。

---

### `src/server/ai/agents/lesson-agent.ts`（service / orchestrator · request-response）

**Analog:** `facade.ts`（固定流水线编排）+ `agents/registry.ts:5-14`（LessonAgent seed，当前 `enabled:false`）

**N=1 最简编排**（RESEARCH.md:63-65,152；无 `maxSteps`，用 `stopWhen: stepCountIs(n)`；倾向单工具单轮，避开 experimental `Agent`）：
```typescript
import "server-only";
import { generateText, stepCountIs } from "ai";
import { draftLessonStepTool } from "@/server/ai/tools";

// 单轮工具调用即可跑通 LessonAgent N=1 链路
await generateText({
  model: /* 经 facade 内部装配，不在此读 key */,
  tools: { draftLessonStep: draftLessonStepTool },
  stopWhen: stepCountIs(1),
  // ...
});
```

**LessonAgent seed 现状**（agents/registry.ts:5-14）：`agentKey:"LessonAgent"`、`featureFlag:"lesson_agent_enabled"`、`enabled:false`、`requiresTeacherApproval:true` —— 本 phase 让此链路实际可跑。

**复用 vs 新建：** 新建。是否引入 `Experimental_Agent`/`ToolLoopAgent` 由 planner 按可测试性权衡（RESEARCH 风险 3，建议避开 experimental 面）。

---

### `src/features/platform-core/events/contracts.ts`（model / contract · 修改）

**Analog:** 同文件既有 `Plugin*EventSchema`（:94-128）+ `SummaryRecordSchema`（:5）守卫

**summary-only 守卫（必须遵守，D-03）**（contracts.ts:5-27）：payload 顶层及一层嵌套字段名**禁以 `json` 结尾**，违者报 `must not include object snapshots` —— **步骤包 DTO 不可整体塞进事件 payload**，只能放摘要（stepType、title、是否成功、token 用量）。

**新增 AI 域 event schema 照抄此结构**（contracts.ts:94-104，`.strict()` + 固定字段集）：
```typescript
export const LessonDraftRequestedEventSchema = z.object({
  eventType: z.literal("lesson.draft.requested"),   // + tool.invoked / draft.produced (+失败)
  category: z.literal("domain"),                      // 沿用 outcome/domain
  aggregateType: z.literal("lesson"),                 // ⚠️ 当前仅 "plugin"，须放宽/新增（建议 lesson 或 agent）
  aggregateId: z.string().min(1),
  payload: LessonDraftRequestedPayloadSchema,          // 经 SummaryRecordSchema 风格，.strict()，仅摘要字段
  audit: PlatformAuditMetadataSchema.default({ delegatedActor: null, approval: null }),
}).strict();
```

**并入 discriminated union**（contracts.ts:130-136）：新增三/四个成员追加到 `PlatformEventSchema = z.discriminatedUnion("eventType", [...])`。

**复用 vs 新建：** 修改既有文件。新增 event schema + 放宽 `aggregateType` 字面量（RESEARCH 风险 2）。

---

### `src/features/platform-core/commands/contracts.ts`（model / contract · 修改）

**Analog:** 同文件 `PlatformPluginGovernanceCommandTypes`（:13-24）+ `PlatformCommandEnvelopeSchema`（:44-54）+ discriminated union（:140）

**关键架构约束（RESEARCH 风险 1，HIGH）：** 事件**无法脱离父 command 独立落账**（`appendPlatformEvents` 必填 `commandId` 并就地 UPDATE `platformCommands`/`platformCommandAttempts`，ledger.ts:18/78/80-84；schema.ts:445 FK notNull cascade）。故 D-03 三事件必须经 `dispatchPlatformCommand` 产生 `commandId`。当前 command 类型仅 plugin 治理类，**须新增 AI/lesson command 类型 + handler**。

**command type 枚举 + envelope 照抄**（contracts.ts:13-26,44-54）：
```typescript
export const LessonDraftCommandTypes = ["lesson.draft.run"] as const;  // N=1 单类型
// envelope 复用 PlatformCommandEnvelopeSchema 的 id/actor/correlation/audit/dedupeKey 结构
```

**correlation 串联（Success Criteria 4 可追溯）**（contracts.ts:38-42）：
```typescript
export const PlatformCommandCorrelationSchema = z.object({
  correlationId: z.string().min(1),
  causationId: z.string().min(1).nullable().default(null),
  producer: z.string().min(1),
});
```
→ 一次起草的三/四条事件用同一 `correlationId` 串联，`causationId` 链接因果。

**execute 结果契约（handler 通过它携带事件）**（contracts.ts:197-204）：`PlatformCommandExecutionResult.emittedEvents` 承载 handler 产出的 domain/success 事件；失败走单一 `failureEvent`。

**复用 vs 新建：** 修改既有文件。**注意 D-01 边界**：本 phase command 只用于「读侧/无持久副作用」路径触发事件落账，**不在本 phase 新增写 draft 的 command**（那是 Phase 63）。

---

### `src/features/platform-core/commands/handlers/lesson-draft.ts`（service / handler · event-driven）

**Analog:** `src/features/platform-core/commands/handlers/plugins.ts`（:1-46 imports/类型，:215-239 execute 返回 emittedEvents）

**handler execute 返回事件批**（plugins.ts:215-239）—— 三/四事件作为某次 dispatched command 的产物落账（D-03）：
```typescript
return successResult({
  resultSummary,
  invalidation,
  emittedEvents: [
    // draft.requested / tool.invoked / draft.produced，payload 仅摘要字段（禁 *json、禁整包快照）
    withAudit({
      eventType: "lesson.draft.produced",
      category: "domain",
      aggregateType: "lesson",
      aggregateId: lesson.id,
      payload: { stepType, title, succeeded: true, tokenUsage },  // summary-only
    }, command.audit),
  ],
});
```

**授权惯例**（plugins.ts:26,88；复用 `assertActiveTeacher` school-scope/ownership）：
```typescript
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
const scope = await assertActiveTeacher();
```

**复用 vs 新建：** 新建 handler 文件。execute→emittedEvents 模式、授权域、failure 抛 `PlatformCommandExecutionError`（contracts.ts:230）全部照抄 plugins handler。

---

### `src/features/platform-core/commands/registry.ts`（config / registry · 修改）

**Analog:** 同文件 `createPlatformCommandDefinition`（:8-12,15-21）

**注册新 command**（registry.ts:15-21）：
```typescript
"lesson.draft.run": createPlatformCommandDefinition({
  commandType: "lesson.draft.run",
  payloadSchema: LessonDraftPayloadSchema,
  dedupe: "optional",            // 或 required，由 planner 定
  authorize: lessonDraftCommandHandlers["lesson.draft.run"].authorize,
  execute: lessonDraftCommandHandlers["lesson.draft.run"].execute,
}),
```

**复用 vs 新建：** 修改 `satisfies Record<PlatformCommandType, PlatformCommandDefinition>` 注册表，追加一项。

---

### `src/features/platform-core/commands/producers/lesson-draft.ts`（service / producer · 可选新建）

**Analog:** `src/features/platform-core/commands/producers/plugin-governance.ts`（:1-39，server-only + envelope 构造 + `dispatchPlatformCommand`）

**producer 输入形状**（plugin-governance.ts:19-39）：`{ type, actor, scope, payload, correlation: { correlationId?, causationId?, producer }, source }` → 构造 envelope → `dispatchPlatformCommand`。

**复用 vs 新建：** 由 planner 决定是否需要独立 producer，还是 Server Action 直接调 `dispatchPlatformCommand`。N=1 倾向最简。

---

### `src/lib/dal/lesson-authoring.ts`（DAL / read · 仅必要时补 helper）

**Analog:** 同文件 `getTeacherLessonPreviewDTO`（:871-919）

**只读 + 授权域 + schema 校验**（lesson-authoring.ts:871-887）：
```typescript
export async function getTeacherLessonPreviewDTO(input: { lessonId: string }) {
  const scope = await assertActiveTeacher();                    // :872 auth + school scope
  const { lesson, course } = await getScopedLesson(input.lessonId, scope);  // :873 ownership
  // ... course(subject/grade) + lesson(objective/status) + steps（lessonStepPayloadSchema.safeParse）
}
```
preview 比 `getLessonEditorDTO` 更精简，**更适合作 tool 上下文输入**（RESEARCH.md:129）。

**复用 vs 新建：** **直接复用，不新增写 DAL**（D-04）。仅当现有只读投影不足时补**只读** helper。

---

### 测试文件（test · unit + 静态）

**Analog A — server-only 不泄漏边界（静态）:** `src/server/ai/providers/no-leak.test.ts:68-121`
扫描 `"use client"` / `runtime="edge"` / `plugins/` 文件断言**均不 import** tool 层；沿用 A 组三类目标集合模式（把 `server/ai/providers` 换成 `server/ai/tools`）。

**Analog B — 事件落账单测:** `src/features/platform-core/commands/handlers/plugins.events.test.ts:1-58`
`vi.mock("server-only")` + `vi.hoisted` mock DAL/db；注入 `dependencies.persistPlatformEvents`（bus.ts:281）断言三事件 `eventType` + payload 通过 `SummaryRecordSchema`（无需真实 DB）。

**Analog C — facade 行为单测:** `providers/no-leak.test.ts:124-208`（mock `ai` 的 `generateObject`/`generateText`，断言返回内存 DTO；spy 断言**无写 DAL/DB** → 证 D-01 不落库）。

**复用 vs 新建：** 新建测试文件，照搬上述三类断言骨架。

---

## Shared Patterns

### server-only 隔离
**Source:** `facade.ts:1`、`handlers/plugins.ts:1`、`dal/lesson-authoring.ts:1`、`producers/plugin-governance.ts:1`
**Apply to:** 所有新建 tool / agent / handler / producer 文件首行
```typescript
import "server-only";
```
配套 no-leak 静态断言（no-leak.test.ts A 组）：client/edge/plugin 不得 import 这些模块。

### Zod 边界校验
**Source:** tool `inputSchema`（RESEARCH.md:48）、command `payloadSchema`（contracts.ts:127-138）、event payload `.strict()`（contracts.ts:40）
**Apply to:** tool 输入、command payload、event payload —— 全部边界处 Zod 校验，非法在此被拒（AGENT-01）。

### summary-only 事件 payload
**Source:** `events/contracts.ts:5-27` `SummaryRecordSchema`
**Apply to:** 所有新增 AI 域事件 payload —— 字段名禁以 `json`/`Json` 结尾、禁内嵌对象快照、`.strict()`；步骤包只以摘要进事件。

### Command Bus 受控写（事件落账唯一合法路径）
**Source:** `commands/bus.ts:241,281-293`（`dispatchPlatformCommand` → `definition.execute` → `persistEvents = appendPlatformEvents`）
**Apply to:** D-03 三/四事件 —— 必须经 dispatched command 的 attempt 产生，借其 `commandId`/`attemptNumber` 落账；测试可注入 `dependencies.persistPlatformEvents` 替身。

---

## No Analog Found

| 文件/资产 | 角色 | 数据流 | 说明 |
|-----------|------|--------|------|
| `lessonStepPayloadSchema`（`dto/lesson-authoring.ts:154`） | DTO | — | **纯复用，不新建、不另造 schema**（D-01）。content(:114)/task(:126)/quiz(:139) discriminated union。 |

> 无「真正缺 analog」的文件 —— 所有新建文件均有同体系或上游 phase 的近似先例可照抄。唯一全新维度是 `aggregateType: "lesson"/"agent"`（当前仅 `"plugin"`），属对既有契约的**扩展**而非全新模式。

---

## Metadata

**Analog search scope:** `src/server/ai/{providers,agents,tools}`、`src/features/platform-core/{events,commands}`、`src/lib/{dal,dto}/lesson-authoring.ts`、`src/lib/dto/resource-ai.ts`
**Files scanned:** 14（实读，含 facade/index/contracts/registry/handlers/producers/DAL/DTO/测试）
**Pattern extraction date:** 2026-05-31
