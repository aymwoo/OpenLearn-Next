# Phase 62：LessonAgent typed tool layer —— 研究

**研究日期：** 2026-05-31
**领域：** AI SDK（`ai` v6）typed tool 层 + 平台事件账本（platform event ledger）+ 只读 lesson DAL
**总体置信度：** HIGH（核心签名均来自已安装的 `.d.ts` 与仓库源码实读，非训练记忆）

---

## 概览

本 phase 为 `LessonAgent` 搭建**第一条 typed tool 链路（N=1）**：教师触发 → Agent 调用一个 typed tool → tool 内只读取 lesson 上下文 → 纯生成一个**单步教学包 DTO（内存返回，不落库）** → 三个 typed 平台事件落账本。

研究确认了四条锁定决策（D-01~D-04）在当前代码基线下的真实可行性，并暴露了 **一个必须由 planner 解决的架构开放问题**：平台事件账本（`appendPlatformEvents`）在物理上**无法脱离父 command 行独立写入**，因此 D-03 的三节点事件必须经由 **Command Bus dispatch** 路径产生 `commandId`，而当前 command 类型体系只有 plugin 治理类，没有 AI/lesson 类。

### 锁定约束（来自 62-CONTEXT.md，不可推翻）

| 编号 | 决策 | 本研究结论 |
|------|------|-----------|
| D-01 | 纯生成、不落库；内存返回步骤包 DTO，复用 `lessonStepPayloadSchema` | ✅ 可行。复用 `lessonStepPayloadSchema`（lesson-authoring.ts:154），先例为 `BUILT_IN_TEACHING_STEP_DEFINITIONS` 的单步 `initialPayload`（resource-ai.ts:469） |
| D-02 | 用 AI SDK `tool({ inputSchema, execute })`；execute 内只准调 Phase 61 facade / 只读 DAL / Command Bus，禁 DB client / env key / eval | ✅ 字段名确认为 `inputSchema`（v5+ 重命名，非旧 `parameters`）。execute 签名见下 |
| D-03 | 三节点 typed events（`draft.requested` / `tool.invoked` / `draft.produced` + 失败）经 `appendPlatformEvents` 落账本，遵循 contracts.ts 的 strict / summary-only | ⚠️ 可行但有前置：事件必须挂在父 `commandId` 下，须走 Command Bus，并新增 AI 域事件契约（aggregateType 当前仅 `plugin`） |
| D-04 | 仅只读 DAL，不新增写 | ✅ 已满足。`getTeacherLessonPreviewDTO` / `getLessonEditorDTO` 均为只读且自带授权域校验 |

---

## 关键依赖与真实签名

### 1. AI SDK `tool()` —— D-02 核心

`tool` 由 `ai` 从 `@ai-sdk/provider-utils@4.0.27` re-export（`ai` v6.0.193 已安装）。

```ts
// node_modules/.pnpm/@ai-sdk+provider-utils@4.0.27_.../dist/index.d.ts
declare function tool<INPUT, OUTPUT>(tool: Tool<INPUT, OUTPUT>): Tool<INPUT, OUTPUT>;   // :1198

type Tool<INPUT, OUTPUT> = {                                                            // :1055
  inputSchema: FlexibleSchema<INPUT>;                                                   // :1089  ← 注意：不是 parameters
  execute?: ToolExecuteFunction<INPUT, OUTPUT>;                                          // :1240
  // description?, onInputAvailable? 等
};

type ToolExecuteFunction<INPUT, OUTPUT> =                                               // :1033
  (input: INPUT, options: ToolExecutionOptions)
    => AsyncIterable<OUTPUT> | PromiseLike<OUTPUT> | OUTPUT;
```

要点：
- **字段名是 `inputSchema`**（AI SDK v5 起将 v4 的 `parameters` 重命名）。`FlexibleSchema` 接受 Zod schema（项目用 `zod@4.4.3`），故可直接传 Zod 对象。
- `execute(input, options)` 内即是 D-02 允许的逻辑落点：调 Phase 61 facade / 只读 DAL / Command Bus；返回值即 tool output。

### 2. `ai` v6 运行时导出（实测，非文档推断）

| 导出 | 运行时类型 | 说明 |
|------|-----------|------|
| `tool` | function | typed tool 工厂（见上） |
| `generateText` / `generateObject` | function | 单次生成；**Phase 61 facade 已封装，本 phase 不直接 import `ai`** |
| `Experimental_Agent` | function（= `ToolLoopAgent` 别名，index.d.ts:6443） | v6 的 Agent API 仍是 experimental |
| `Agent` | **type-only 导出**（运行时 `undefined`） | 不可当值用；planner 勿误用 |
| `ToolLoopAgent` | function | 工具循环 Agent 实现类 |
| `stepCountIs` / `hasToolCall` | function | `stopWhen` 停止条件构造器 |
| `InvalidToolInputError` / `NoSuchToolError` / `ToolCallRepairError` | class | tool 阶段错误判型 |

`generateText` 的工具相关入参（index.d.ts:1348+）：`tools?: TOOLS`（:1356）、`stopWhen?: StopCondition`（:1367）。无 `maxSteps`，改用 `stopWhen: stepCountIs(n)`。

> **N=1 设计含义：** 单链路最简实现可不引入 experimental 的 Agent 类，直接用 `generateText({ tools, stopWhen })` 跑一轮工具调用即可。是否引入 `Experimental_Agent` 留给 planner 按可测试性权衡（见风险）。

### 3. Phase 61 facade —— 唯一生成通道

```ts
// src/server/ai/providers/index.ts —— 只导出两类公共面
export { aiGenerateText, aiGenerateObject } from "./facade";          // :22
export type { GenerateTextArgs, GenerateObjectArgs } from "./facade"; // :23
export type { ProviderError } from "./errors";
export { ProviderParseError, ProviderRateLimitError,
         ProviderTimeoutError, ProviderUpstreamError } from "./errors";
```

- `GenerateObjectArgs<T>` = `{ teacherId: string; prompt: string; schema: z.ZodType<T>; modelId?: string }`；`GenerateTextArgs` 同去掉 `schema`。
- facade **刻意不导出** `config`（apiKey）、`registry`、`rate-limit` —— 与 D-02「禁 env key / 禁原始 provider 句柄」一致。
- facade.ts `import "server-only"`，内部封装 `generateObject`/`generateText` 与 `MAX_RETRIES`。
- **推荐：** tool 生成步骤包 DTO 用 `aiGenerateObject({ schema: <单步 schema> })`，让结构化输出直接被 Zod 校验，天然满足 D-01 的「复用 `lessonStepPayloadSchema`」。

### 4. 平台事件账本 —— D-03 关键约束 ⚠️

```ts
// src/features/platform-core/events/ledger.ts
export async function appendPlatformEvents(input: PersistPlatformEventsInput) { // :54
  // input 必填 commandId: string (:18)
  // 内部 UPDATE platformCommands WHERE id = input.commandId (:78)
  // 内部 UPDATE platformCommandAttempts WHERE commandId+attemptNumber (:80-84)
}
```

数据库层强约束：`platformEvents.commandId` 为 `notNull` + FK→`platformCommands.id`（cascade，schema.ts:445）。

**结论：`appendPlatformEvents` 不能独立调用** —— 它假定父 command 行与 attempt 行已存在并就地更新它们。现网唯一调用方是 Command Bus：

```ts
// src/features/platform-core/commands/bus.ts
const persistEvents = dependencies.persistPlatformEvents ?? appendPlatformEvents; // :281
export async function dispatchPlatformCommand(...)                                // :241
```

即 **command → attempt → events** 是不可分割的事务链。D-03 的三个事件必须作为某个 dispatched command 的产物落账。

### 5. 事件契约 —— 当前 plugin-centric，需扩展

```ts
// src/features/platform-core/events/contracts.ts
PlatformEventSchema = z.discriminatedUnion("eventType", [   // :130
  PlatformSuccessEventSchema, PlatformFailureEventSchema,
  PluginInstalledEventSchema, PluginLifecycleChangedEventSchema,
  PluginKillSwitchChangedEventSchema,
]);
```

- 现有领域事件全部 `aggregateType: z.literal("plugin")`（:73/85/97/109/121）、`category` 仅 `outcome`/`domain`、全部 `.strict()`。
- payload 经 `SummaryRecordSchema`（:5）守卫：**顶层及一层嵌套**的字段名禁以 `json` 结尾，违者报 `must not include object snapshots`（:10/:20）—— summary-only 语义。
- 新增 `draft.requested` / `tool.invoked` / `draft.produced`（+ 失败）需：(a) 新增对应 event schema 并并入 discriminated union；(b) 放宽或新增 `aggregateType`（如 `lesson` / `agent`）；(c) 步骤包 DTO **不可整体塞进事件 payload**（违反 summary-only），只能放摘要字段（如 stepType、title、是否成功、token 用量）。

### 6. 只读 DAL —— D-04 已满足

```ts
// src/lib/dal/lesson-authoring.ts  (import "server-only" :1)
export async function getTeacherLessonPreviewDTO(input: { lessonId: string }) // :871
export async function getLessonEditorDTO(...)                                  // (:928 起)
```

两者均先 `assertActiveTeacher()`（:241，auth + school scope）再 `getScopedLesson()`（:271，ownership），返回 course(subject/grade) + lesson(objective/status) + steps(+materials)。preview 更精简，**更适合作 tool 上下文输入**。无需新增写 DAL；如需更瘦投影可加只读 helper（非必须）。

### 7. 步骤包 schema —— D-01 复用目标

```ts
// src/lib/dto/lesson-authoring.ts
lessonStepPayloadSchema = z.discriminatedUnion("type", [ content, task, quiz ]); // :154
//   content(:115) / task(:127) / quiz(:140)
```

先例：`BUILT_IN_TEACHING_STEP_DEFINITIONS`（resource-ai.ts:469）的 `initialPayload` 是**单步对象**（如 `{ type:"content", title, body, teacherNotes, materialRefs }`），正是本 phase「生成单步包」的形状参照。

---

## 推荐实现路径

> 以下为研究结论，最终任务拆分由 planner 决定。

1. **定义 typed tool**（D-02）：用 `tool({ description, inputSchema: <Zod 输入>, execute })`。`inputSchema` 描述「要为哪节课/哪类步骤生成」；`execute` 内：
   - 调 `getTeacherLessonPreviewDTO({ lessonId })` 取只读上下文（D-04）；
   - 调 `aiGenerateObject({ teacherId, prompt, schema: <单步包 schema> })` 纯生成（D-01）；
   - 返回内存 DTO，**不写库**。

2. **驱动一轮工具调用**（N=1）：最简方案用 facade 之外不直连 `ai`；若需 Agent 工具循环，用 `generateText({ tools, stopWhen: stepCountIs(1) })` 或 `Experimental_Agent`。倾向最简：单工具单轮。

3. **事件落账（D-03）走 Command Bus**：新增一个轻量 AI/lesson command 类型与 handler，由 `dispatchPlatformCommand` 在 attempt 内发出三事件，借其 `commandId`/`attemptNumber` 经 `appendPlatformEvents` 落账。事件 payload 仅放 summary 字段（禁 `*json` 结尾、禁整包快照）。

4. **契约扩展**：在 contracts.ts 新增三个 `.strict()` event schema 并入 `PlatformEventSchema`；引入新 `aggregateType`（建议 `lesson` 或 `agent`），保持 `SummaryRecordSchema` 守卫。

---

## 边界与可测试性

- **server-only 边界**：facade.ts、DAL 均 `import "server-only"`；tool 与其 execute 必须停留在 server 侧，不可被 client/edge/plugin import（沿用 Phase 61 no-leak 断言风格）。
- **纯函数可测**：步骤包生成逻辑若把「DTO 组装」与「facade 调用」分离，可对组装函数做无网络单测；facade 可注入 mock。
- **事件可测**：Command Bus 已支持 `dependencies.persistPlatformEvents` 注入（bus.ts:281），可在测试中替换 `appendPlatformEvents`，断言三事件的 eventType/summary 形状，无需真实 DB。
- **授权可测**：`assertActiveTeacher` + `getScopedLesson` 已是既有受测路径，tool 复用即继承其 school-scope/ownership 保证。
- **D-01 不落库可测**：断言 execute 返回内存 DTO 且无任何写 DAL/DB 调用（可用 spy）。

---

## 风险与开放问题

1. **【架构 / HIGH】事件无法脱离 command 独立落账。** D-03 字面读作「经 `appendPlatformEvents` 落账」，但该函数要求父 `commandId` 并就地更新 `platformCommands`/`platformCommandAttempts`。
   - 需 planner 决定：(a) 新增 AI/lesson command 类型 + handler，走标准 `dispatchPlatformCommand`（推荐，事务/重试/去重一致）；还是 (b) 为 AI 域新增一条轻量 append 路径（偏离现有不变量，风险更高）。
   - 当前 command 类型仅 `PlatformPluginGovernanceCommandTypes`，无 AI/lesson command —— 需新增并注册 correlation（`{ correlationId, causationId, producer }`，commands/contracts.ts:38）。

2. **【契约 / MEDIUM】事件模型 plugin-centric。** `aggregateType` 硬编码 `plugin`、`category` 仅 `outcome`/`domain`。新增 AI 域事件需扩 discriminated union 并定义新 `aggregateType`，并确保步骤包 DTO 不违反 `SummaryRecordSchema`（`*json` 字段名禁用、禁整包快照）—— 步骤包只能以摘要进事件。

3. **【SDK / LOW】Agent API 仍 experimental。** v6 的 `Agent` 是 type-only（运行时 `undefined`），可用的是 `Experimental_Agent`/`ToolLoopAgent`。N=1 建议避开 Agent 类、用单工具单轮 `generateText`，降低对 experimental 面的耦合。`maxSteps` 不存在，用 `stopWhen: stepCountIs(n)`。

4. **【范围 / LOW】不在本 phase 引入 AI-SPEC / eval 体系**（归 Phase 65）。研究据此未设计评测，仅保证链路可测。

---

## 参考

### 代码（file:line —— 实读）
- `src/server/ai/providers/index.ts:22-29` —— facade 公共面（`aiGenerateText`/`aiGenerateObject` + `ProviderError` 4 类）
- `src/server/ai/providers/facade.ts` —— `import "server-only"`，内封 `generateObject/generateText`，`MAX_RETRIES`
- `node_modules/.pnpm/@ai-sdk+provider-utils@4.0.27_zod@4.4.3/.../dist/index.d.ts:1033,1055,1089,1198,1240` —— `tool()` / `Tool` / `inputSchema` / `ToolExecuteFunction`
- `node_modules/ai/dist/index.d.ts:1348-1367,6443` —— `generateText` tools/stopWhen；`Experimental_Agent`=`ToolLoopAgent` 别名
- `src/features/platform-core/events/ledger.ts:18,54,78,80-84` —— `appendPlatformEvents` 必填 `commandId` 并更新 command/attempt
- `src/features/platform-core/events/contracts.ts:5,40,73,130` —— `SummaryRecordSchema` summary-only 守卫；`aggregateType:"plugin"`；`PlatformEventSchema` discriminated union
- `src/features/platform-core/commands/bus.ts:241,281` —— `dispatchPlatformCommand`；`persistEvents = appendPlatformEvents`
- `src/features/platform-core/commands/contracts.ts:38` —— `PlatformCommandCorrelationSchema { correlationId, causationId, producer }`
- `src/db/schema.ts:445` —— `platformEvents.commandId` notNull + FK→`platformCommands.id`（cascade）
- `src/lib/dal/lesson-authoring.ts:1,241,271,871,928` —— server-only；`assertActiveTeacher`/`getScopedLesson`/`getTeacherLessonPreviewDTO`/`getLessonEditorDTO`
- `src/lib/dto/lesson-authoring.ts:115,127,140,154` —— `lessonStepPayloadSchema`（content/task/quiz union）
- `src/lib/dto/resource-ai.ts:446,469` —— `BuiltInTeachingStepTemplatePayloadSchema` / `BUILT_IN_TEACHING_STEP_DEFINITIONS` 单步 `initialPayload` 先例
- `src/server/ai/agents/registry.ts` —— `LessonAgent` seed（`featureFlag:"lesson_agent_enabled"`, `enabled:false`, `requiresTeacherApproval:true`）

### 包版本（实测，2026-05-31）
- `ai@6.0.193`、`@ai-sdk/provider-utils@4.0.27`、`zod@4.4.3`、`@ai-sdk/openai-compatible@~2.0.48`（无 `@ai-sdk/openai`）

### 文档
- AI SDK 工具/字段命名（`parameters`→`inputSchema`）以**已安装 `.d.ts` 为准**（高于在线文档，已版本对齐 v6.0.193）。如 planner 需补充 Agent/`stopWhen` 用法，Context7 `/vercel/ai` v6 文档可作二级参照。

---

## Validation Architecture

> `.planning/config.json` 的 `workflow.nyquist_validation = true`，故包含本节。

### Test Framework
| 属性 | 值 |
|------|----|
| Framework | Vitest（项目既有；STACK 指定 Vitest + Testing Library + Playwright） |
| Config file | 需 planner 在 Wave 0 确认（仓库已有 `*.test.ts`，如 facade.test.ts / no-leak.test.ts） |
| Quick run | `pnpm vitest run <file>`（按 planner 实际脚本核实） |
| Full suite | `pnpm test`（按 planner 实际脚本核实） |

### Phase 需求 → 测试映射
| 行为 | 测试类型 | 建议自动化 | 现有? |
|------|---------|-----------|-------|
| tool `execute` 只读取上下文、纯生成、不写库（D-01/D-04） | unit | spy 断言无写 DAL/DB；返回内存 DTO 符合单步 schema | ❌ Wave 0 |
| tool 定义用 `inputSchema`（D-02）、execute 不触 env key / DB client | unit + 静态 | 断言 tool 形状；沿用 no-leak 风格断言导出/边界 | ❌ Wave 0 |
| 三事件经 Command Bus 落账、summary-only 合规（D-03） | unit | 注入 `persistPlatformEvents` mock，断言 3 eventType + payload 通过 `SummaryRecordSchema` | ❌ Wave 0 |
| server-only 边界不泄漏到 client/edge/plugin | 静态 | 沿用 Phase 61 no-leak.test.ts A 组模式 | 部分既有 |

### Sampling Rate
- **每次 task commit：** 对应 quick run（单文件）。
- **每次 wave merge：** full suite 绿。
- **phase gate：** full suite 绿后再 `/gsd-verify-work`。

### Wave 0 Gaps
- [ ] tool 单测文件 —— 覆盖 D-01/D-02/D-04（纯生成、不落库、inputSchema 形状）
- [ ] 事件落账单测 —— 注入 mock persist，覆盖 D-03 三事件 + summary-only
- [ ] （若新增 AI command 类型）command handler 单测 —— 覆盖 dispatch→attempt→events 链
- [ ] 确认 Vitest 脚本与 config 路径（quick/full 命令）

---

## Metadata

**置信度分解：**
- `tool()` / `ai` 导出 / 包版本：HIGH —— 读已安装 `.d.ts` 与 node 实测。
- facade / DAL / DTO 签名：HIGH —— 仓库源码实读并附 file:line。
- 事件账本约束（D-03 必须挂 command）：HIGH —— ledger.ts + schema.ts + commands/bus.ts 三处交叉确认。
- 推荐实现路径：MEDIUM —— 基于事实推导，最终拆分留给 planner。

**研究日期：** 2026-05-31
**有效期：** ~14 天（`ai` v6 仍在快速演进，experimental Agent 面尤需复检）
