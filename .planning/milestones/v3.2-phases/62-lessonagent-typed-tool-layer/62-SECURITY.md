---
phase: 62
slug: lessonagent-typed-tool-layer
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-31
---

# Phase 62 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Verifier stance: FORCE — every mitigation assumed absent until proven present in implemented code (file:line / passing test).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| LLM / caller → tool `inputSchema` | Untrusted intent + params cross into the tool layer | `{ lessonId, stepType, intent }` (no identity) |
| tool `execute` → Phase 61 facade | Generation request crosses into controlled AI channel | prompt + structured-output schema |
| caller → command payload | Untrusted draft params cross into the command track | `lesson.draft.run` payload (`.strict()`) |
| handler → event ledger | Handler-emitted event payloads cross into the persistent audit ledger | summary-only event payloads |
| lesson-agent → Command Bus | Sole dispatch path; events only via `dispatchPlatformCommand` → handler.emittedEvents | command envelope + resultSummary |
| server/ai/{tools,agents} → client / Edge / plugin | server-only assets must never be importable by low-trust runtimes | (none — boundary must hold) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation (verified evidence) | Status |
|-----------|----------|-----------|-------------|-------------------------------|--------|
| T-62-01 | Information Disclosure | AI 域事件 payload | mitigate | `events/contracts.ts:5-27` `SummaryRecordSchema` + `:80-128` `summaryOnlyStrictPayload` 守卫（字段名 `*Json` 被拒，"must not include object snapshots"）；三事件 `.strict()` `:191-225`。`lesson-draft.events.test.ts` summary-only 断言绿。 | closed |
| T-62-02 | Tampering | 事件 discriminated union | mitigate | `events/contracts.ts:227-245` 仅**追加**联合成员；plugin 字面量 `aggregateType: z.literal("plugin")` 未放宽；新事件 `.strict()` 拒多余字段。`bus.test.ts` 8/8 无回归。 | closed |
| T-62-03 | Spoofing | teacherId 限流/授权维度 | mitigate | `tools/lesson-draft.ts:29-33` `inputSchema` **不含** teacherId；`:46-57` teacherId 经 factory 闭包注入 execute。`lesson-draft.test.ts` Test 3 绿（inputSchema 无 teacherId 键）。 | closed |
| T-62-04 | Tampering / Elevation | tool 输入 payload | mitigate | `tools/lesson-draft.ts:29-33,50` `inputSchema` 边界 Zod 校验（lessonId.min(1)/stepType enum/intent.min(1)）。`lesson-draft.test.ts` Test 1 非法 payload 拒绝绿。 | closed |
| T-62-05 | Information Disclosure | provider apiKey / DB 句柄 | mitigate | `tools/lesson-draft.ts:6-8` 仅 import 只读 DAL + facade 窄 barrel（无 config/registry/key）；`tools/index.ts` 不导出内部 prompt helper。`no-leak.test.ts` 3 用例绿：client/edge/plugin 均不 import `server/ai/tools`（含防呆非空集合断言）。 | closed |
| T-62-06 | Elevation of Privilege | 任意代码执行 | mitigate | tools 层 grep（去注释）`@/db`/`drizzle`/`process.env`/`eval(`/raw `generateObject`·`generateText` == 0；唯一来自 `"ai"` 的 import 为 `tool`。生成只经 `aiGenerateObject`（`:8,56`）。 | closed |
| T-62-07 | Tampering | command payload | mitigate | `commands/contracts.ts:136-140` `LessonDraftRunPayloadSchema = z.object({...}).strict()`；`:153` payload 映射 + `:198-199` envelope 联合成员。dispatch 入口边界校验。 | closed |
| T-62-08 | Repudiation | 起草关键节点可追溯 | mitigate | `handlers/lesson-draft.ts:151-185` 三事件 `aggregateType:"lesson"`、`aggregateId=lessonId`、共享 `command.audit`；经同一 commandId 落账。`lesson-draft.events.test.ts:86-108` 三事件断言绿。 | closed |
| T-62-09 | Information Disclosure | 事件 payload | mitigate | `handlers/lesson-draft.ts:142-185` 整包 `step` **仅入 resultSummary**；三事件 payload 仅 `{stepType,title,succeeded}` 类摘要。`lesson-agent.test.ts` Test 3 端到端断言 events payload 不含 body/teacherNotes/materialRefs。 | closed |
| T-62-10 | Spoofing | sentinel pluginId / command.payload | mitigate + accept | **mitigate**：`lesson-agent.ts:189-195` payload 仅 `{lessonId,stepType,intent}`，teacherId 不可由调用方注入；`handlers/lesson-draft.ts:126` teacherId 取自 `assertActiveTeacher().userId`。`lesson-agent.test.ts` Test 4 断言 payload 无 teacherId + scope.pluginId=="core.lesson-agent"。 **accept**：sentinel `core.lesson-agent` 仅由 server-only 入口/handler 内部构造（`lesson-agent.ts:36`、`handlers:42`），本 phase 不开放外部以该 id dispatch（N=1 内部链路，低风险）。 | closed |
| T-62-11 | Elevation of Privilege / Tampering | 越权起草他校课时 / 事件落账路径 | mitigate | **越权**：`handlers/lesson-draft.ts:112-118` authorize 经 `assertActiveTeacher` 校验 `schoolId ∈ scope.schoolIds`，否则抛 `TEACHER_AUTH_REQUIRED`；tool 内 `getTeacherLessonPreviewDTO`（`tools/lesson-draft.ts:53`）二次授权域。 **落账**：`lesson-agent.ts:204` 只经 `dispatchPlatformCommand`，绝不直写 ledger（事件必带父 commandId FK notNull）；`lesson-agent.test.ts` 经注入 `persistPlatformEvents` 验证事件全部源自 bus→handler。 | closed |
| T-62-12 | Information Disclosure | server-only 边界 + 事件 payload | mitigate | `lesson-agent.ts:1` 首行 `import "server-only"`；去注释 grep `generateObject`/`eval(`/`process.env` == 0；`@/db` 仅用于装配 bus 所需的生产 `platformCommandStore`（D-01 允许的 command 记录）。整包 step 仅入 resultSummary（端到端 Test 3）。 | closed |
| T-62-13 | Repudiation | 起草轨迹 | mitigate | `lesson-agent.ts:182,196-200` 单一 `correlationId`（`crypto.randomUUID()`）贯穿 envelope；三事件共享 correlationId + 同一 commandId。`lesson-agent.test.ts` Test 1 端到端断言 correlation 串联。 | closed |
| T-62-14 | Denial of Service | LLM 工具调用 | accept | N=1 单链路、入口非公开触发（LessonAgent `enabled=false` / featureFlag `lesson_agent_enabled`）；速率/配额由 Phase 61 facade rate-limit 兜底。本 phase 不额外加固——记为已接受风险。 | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-62-01 | T-62-10 (sentinel) | 保留命名空间 `core.lesson-agent` 仅由 server-only 入口/handler 内部构造；本 phase 不开放外部以该 id dispatch。N=1 内部链路、低风险。外部 plugin 注册走独立校验路径。 | gsd-security-auditor | 2026-05-31 |
| AR-62-02 | T-62-14 (DoS) | LLM 工具调用为 N=1 单链路、入口非公开触发（featureFlag 默认关闭）；速率/配额由 Phase 61 facade rate-limit 兜底。本 phase 不额外加固。 | gsd-security-auditor | 2026-05-31 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-31 | 14 | 14 | 0 | gsd-security-auditor (FORCE stance) |

**Method:** 每条威胁按 disposition 验证——mitigate 威胁经源码 grep（file:line）+ 阶段测试确认守卫**实际执行**（非仅存在）；accept 威胁经本文件 Accepted Risks Log 记录。硬约束经 git diff 确认：`src/db/schema.ts` 与 `src/features/platform-core/commands/bus.ts` 在四个 phase-62 feat commit（38146a3 / ff55bcf / dfd392f / 0d8c3f8）中**零改**（`git diff --stat 6adabfc..HEAD` 对两文件均空）。

**Test evidence (read-only run):**
`pnpm vitest run no-leak.test.ts lesson-draft.events.test.ts lesson-agent.test.ts` → 3 files / 14 passed。

**Unregistered flags:** 无。SUMMARY 文件未声明 `## Threat Flags`；实现期未引入超出威胁登记册的新攻击面。

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter
- [x] `schema.ts` + `bus.ts` 失败路径经 git diff 确认零改

**Approval:** verified 2026-05-31 — verdict **PASS** (ASVS L1, block-on-high: 无 HIGH 级未缓解威胁)
