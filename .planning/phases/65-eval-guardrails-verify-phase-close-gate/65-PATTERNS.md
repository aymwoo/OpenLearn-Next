# Phase 65: Eval, Guardrails & verify:phase Close Gate - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 10 (4 create, 6 modify)
**Analogs found:** 10 / 10 (all in-repo; this is a ~90% composition phase)

> **Scope correction (important for planner):** The pattern-mapping brief referenced
> `src/features/platform-core/commands/handlers/lesson-draft.events.ts` as a file to modify.
> **That file does not exist.** In this codebase:
> - Event *contracts* (schemas + 3-site union registration) live in
>   `src/features/platform-core/events/contracts.ts`.
> - Event *emission* (handler `emittedEvents`) lives in
>   `src/features/platform-core/commands/handlers/lesson-draft.ts` (`executeLessonDraftRun`).
> - The handler's behavioral test is `commands/handlers/lesson-draft.events.test.ts`.
> Plan against these three real files, not a non-existent `*.events.ts`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/server/ai/tools/guardrails.ts` (CREATE) | service / validator (pure fn + typed error) | transform (validate-or-throw) | `src/server/ai/tools/lesson-draft.ts` (server-only + zod + typed-throw) | role-match |
| reason-code enum module (CREATE — non-server-only, e.g. `src/server/ai/tools/guardrail-contracts.ts` OR co-locate in `lib/dto/lesson-authoring.ts`) | contract/enum | n/a | `LessonStepTypeSchema` in `events/contracts.ts:70` | exact |
| `src/server/ai/tools/lesson-draft.ts` (MODIFY) | AI tool | request-response | itself (insert at `execute` line 56–63) | exact |
| `src/server/ai/tools/guardrails.test.ts` (CREATE) | unit test | n/a | `src/server/ai/tools/lesson-draft.test.ts` | exact |
| `src/server/ai/tools/lesson-draft.eval.test.ts` (CREATE) | eval test | n/a | `lesson-draft.test.ts` (tool) + `lesson-agent.test.ts` (agent entry) | role-match |
| `src/features/platform-core/commands/handlers/lesson-draft.ts` (MODIFY) | command handler | event-driven | itself (`executeLessonDraftRun` catch path line 132–142) | exact |
| `src/features/platform-core/events/contracts.ts` (MODIFY — 3 sites) | event contract registry | n/a | `LessonDraftAppliedEventSchema` (full insertion exemplar) | exact |
| `commands/handlers/lesson-draft.events.test.ts` (MODIFY) | handler integration test | n/a | itself (D-53-08 failure test at line 146) | exact |
| `src/features/platform-core/events/contracts.test.ts` (MODIFY) | contract test | n/a | itself (lines 1–60) | exact |
| `scripts/verify-phase65-eval-close-gate.ts` (CREATE) | build orchestrator | batch / process-exit | `scripts/verify-phase54-ai-contracts.ts` | exact |
| `package.json` scripts (MODIFY) | config | n/a | existing `verify:phase54` entry | exact |

---

## Pattern Assignments

### `src/server/ai/tools/guardrails.ts` (CREATE — guardrail pure fn + typed rejection)

**Analog:** `src/server/ai/tools/lesson-draft.ts` (server-only + zod conventions) and `commands/handlers/lesson-draft.ts:84` (`throwDraftFailure` typed-throw style).

**Imports / server-only header** (mirror `lesson-draft.ts:1-8` — `import "server-only"` MUST be first line):
```typescript
import "server-only";

import {
  lessonStepPayloadSchema,
  type LessonStepPayload,
} from "@/lib/dto/lesson-authoring";
// reason-code enum imported from the NON-server-only contract module (see below)
import { type DraftRejectionReason } from "./guardrail-contracts";
```

**Typed-error pattern** — mirror the typed-throw intent of `throwDraftFailure` (handler line 84–113) but as an `Error` subclass carrying `reason` + `stepType` (per RESEARCH Pattern 2):
```typescript
export class DraftGuardrailRejection extends Error {
  constructor(
    readonly reason: DraftRejectionReason,
    readonly stepType: LessonStepPayload["type"],
  ) {
    super(`DRAFT_GUARDRAIL_REJECTED:${reason}`);
    this.name = "DraftGuardrailRejection";
  }
}
```

**Core pattern — validate-or-throw, returns the input on pass** (RESEARCH §Code Examples; `correctOptionIndex < options.length` is the genuinely-missing schema check per Pitfall 3 and `lesson-authoring.ts:143`):
```typescript
// Centralize length caps as constants at top of file (D-disc).
const FIELD_LENGTH_CAPS = { body: 4000, prompt: 2000, question: 1000, option: 500 } as const;

export function guardLessonStepPayload(step: LessonStepPayload): LessonStepPayload {
  // step-type whitelist re-confirm → invalid_step_type
  // length caps → field_too_long
  // quiz: options.length < 2 → quiz_too_few_options
  // quiz: correctOptionIndex >= options.length → quiz_correct_index_out_of_range  (schema does NOT cover this)
  // forbidden-content denylist (e.g. "<script") → forbidden_content  (marker/structural ONLY, no semantic detection — Pitfall 5)
  return step; // pass-through on success
}
```

**Constraints to honor:** No `eval()`, no `@/db` import, no `process.env` / provider key (these are also asserted by the close gate, D-10). Guardrail only ADDS over-bounds checks on top of `lessonStepPayloadSchema` (D-05) — do not re-validate base fields.

---

### reason-code enum module (CREATE — must be importable by `events/contracts.ts`)

**Analog:** `LessonStepTypeSchema` at `events/contracts.ts:70` (`z.enum([...])`).

**Critical constraint:** `events/contracts.ts` is **NOT** `server-only`, but `guardrails.ts` **IS**. The reason enum is imported by both → place it in a **non-server-only** module to avoid pulling `server-only` into the contracts file (RESEARCH Pattern 3). Recommend `src/server/ai/tools/guardrail-contracts.ts` (no `import "server-only"`) or co-locate in `lib/dto/lesson-authoring.ts`.

```typescript
import { z } from "zod";

export const LessonDraftRejectionReasonSchema = z.enum([
  "invalid_step_type",
  "field_too_long",
  "quiz_correct_index_out_of_range",
  "quiz_too_few_options",
  "forbidden_content",
]);
export type DraftRejectionReason = z.infer<typeof LessonDraftRejectionReasonSchema>;
```

---

### `src/server/ai/tools/lesson-draft.ts` (MODIFY — insert guardrail call)

**Analog:** itself. Insertion point is `execute`, after `aiGenerateObject` returns (line 56–60), before `return step` (line 63), per D-04.

**Current code** (`lesson-draft.ts:56-63`):
```typescript
      const step = await aiGenerateObject({
        teacherId,
        prompt: buildDraftStepPrompt({ stepType, intent, context }),
        schema: lessonStepPayloadSchema,
      });

      // ③ 纯内存返回，绝不写库（D-01 / AGENT-03）。
      return step;
```

**Target shape** (single new import + single call replacing the bare `return`):
```typescript
import { guardLessonStepPayload } from "./guardrails";
// ...
      // ③ guardrail：越界即抛 DraftGuardrailRejection（不落库、不返回 / D-04 D-06）。
      return guardLessonStepPayload(step);
```
> The existing doc-comment (lines 20–22) already states "不直连 `ai` 的 `generateObject`/`generateText`" — the close-gate static check must match import/call-sites, NOT this prose (Pitfall 6).

---

### `src/server/ai/tools/guardrails.test.ts` (CREATE — pure-fn unit tests per reason code)

**Analog:** `src/server/ai/tools/lesson-draft.test.ts` (co-located, `vi.mock("server-only")`, `beforeEach` + `vi.clearAllMocks()`).

**Mock header** (mirror `lesson-draft.test.ts:1,16`):
```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

// server-only 在测试环境是 no-op（lesson-draft.test.ts:16 / no-leak.test.ts:8 先例）。
vi.mock("server-only", () => ({}));

import { guardLessonStepPayload, DraftGuardrailRejection } from "./guardrails";
```

**Per-reason assertion shape** (one `it` per reason code; assert `.reason` on the typed error — RESEARCH §Code Examples lines 283–293):
```typescript
it("quiz correctOptionIndex 越界 → quiz_correct_index_out_of_range", () => {
  const bad = { type: "quiz", question: "Q?", options: ["A", "B"], correctOptionIndex: 5, materialRefs: [] };
  try { guardLessonStepPayload(bad as never); throw new Error("should reject"); }
  catch (e) { expect((e as DraftGuardrailRejection).reason).toBe("quiz_correct_index_out_of_range"); }
});
```

---

### `src/server/ai/tools/lesson-draft.eval.test.ts` (CREATE — fixture-driven eval)

**Analog:** `lesson-draft.test.ts` (tool-level, mock `aiGenerateObject`) for the tool entry; `lesson-agent.test.ts:1-55` (injected store, real bus) for the agent entry (D-disc: cover tool + agent each once).

**Tool-level eval — mock the facade directly** (mirror `lesson-draft.test.ts:18-24,80-89`):
```typescript
// server-only no-op + mock唯一生成通道 aiGenerateObject
vi.mock("server-only", () => ({}));
const { aiGenerateObjectMock } = vi.hoisted(() => ({ aiGenerateObjectMock: vi.fn() }));
vi.mock("@/server/ai/providers", () => ({ aiGenerateObject: aiGenerateObjectMock }));
vi.mock("@/lib/dal/lesson-authoring", () => ({ getTeacherLessonPreviewDTO: vi.fn() }));
```

**Shared corpus driving positive + negative (D-03 — single fixture set):** Use one `CORPUS` array with `expect: "pass" | { reject: DraftRejectionReason }`. Positives assert `lessonStepPayloadSchema.safeParse(out).success === true` + D-02 invariants; negatives assert `DraftGuardrailRejection.reason`. (RESEARCH §Code Examples lines 271–294.)

**Agent-level eval — injected store + real bus** (mirror `lesson-agent.test.ts:8-21,26-42`): `vi.mock("@/db", () => ({ db: {} }))`, mock `assertActiveTeacher` + `createDraftLessonStepTool`, stub plugin handlers via Proxy, drive `draftLessonStep`; assert the emitted event set (positive → `produced`; negative → `lesson.draft.rejected`).

> **Pitfall 4:** `*.eval.test.ts` ends in `.test.ts` so the `vitest.config.mts` glob `src/**/*.{test,spec}.ts` auto-includes it in `npm test` AND the close gate. Acceptable; planner decides whether the close gate runs it as a distinct `runVitest([evalPath])` call or folds it into the subset.

---

### `src/features/platform-core/commands/handlers/lesson-draft.ts` (MODIFY — catch rejection → success outcome)

**Analog:** itself. The crux is `executeLessonDraftRun`'s catch (line 132–142): today ALL errors route through `throwDraftFailure` → only `platform.command.failed` (D-53-08 forbids domain events on failure). Add an `instanceof` branch BEFORE `throwDraftFailure` (RESEARCH Pattern 2 / Pitfall 1).

**Current catch** (`lesson-draft.ts:132-142`):
```typescript
  let step: LessonStepPayload;
  try {
    const draftTool = createDraftLessonStepTool({ teacherId });
    step = (await draftTool.execute!(
      { lessonId, stepType, intent: command.payload.intent },
      {} as never,
    )) as LessonStepPayload;
  } catch (cause) {
    // 失败：抛错走 bus 唯一 generic 失败事件（不发任何 domain 事件 / D-53-08）。
    throwDraftFailure(command, cause);
  }
```

**Target — branch on `DraftGuardrailRejection`, emit via `successResult` with `step: null`** (reuse existing `withAudit` line 49 + `successResult` line 56; `teacherId` already in scope at line 130):
```typescript
  } catch (cause) {
    if (cause instanceof DraftGuardrailRejection) {
      // guardrail 拦截 = 成功的 rejected 业务结果（D-11）：emit lesson.draft.rejected，
      // resultSummary.step 省略 → 下游读 step 为空，绝不落库/返回 UI（D-06）。NOT throwDraftFailure → 保 D-53-08。
      return successResult({
        resultSummary: { stepType: cause.stepType, reason: cause.reason, rejected: true, succeeded: false },
        invalidation: { tags: [] },
        emittedEvents: [
          withAudit({
            eventType: "lesson.draft.rejected",
            category: "domain",
            aggregateType: "lesson",
            aggregateId: lessonId,
            payload: { lessonId, stepType: cause.stepType, reason: cause.reason, teacherId },
          }, command.audit),
        ],
      });
    }
    throwDraftFailure(command, cause); // 真实生成失败 → 不变
  }
```
> **Existing `withAudit`/`successResult` signatures** are at `lesson-draft.ts:49-68` — reuse verbatim, do not reinvent. Compare emit shape to the working `lesson.draft.produced` block (line 178–188).
> **A1 (confirm in plan-check):** whether `teacherId` belongs in the payload. It is a plain string (passes the summary-only guard, not `*Json`); acceptable in a server-side ledger summary. If project policy bars it, drop to `{ lessonId, stepType, reason }`.

---

### `src/features/platform-core/events/contracts.ts` (MODIFY — register `lesson.draft.rejected` at 3 sites)

**Analog:** `LessonDraftAppliedEventSchema` (line 287–305) — appears in payload schema + `PlatformEventSchema` (line 319) + `PlatformDomainEventSchema` (line 332) + exported type (line 363). Mirror exactly (Pitfall 2 — must be in BOTH unions).

**Payload schema — use `summaryOnlyStrictPayload` (line 75)** so `*Json` + unknown keys auto-reject (mirror `LessonDraftRequestedPayloadSchema` line 112–116):
```typescript
const LessonDraftRejectedPayloadSchema = summaryOnlyStrictPayload({
  lessonId: z.string().min(1),
  stepType: LessonStepTypeSchema,                 // reuse existing :70
  reason: LessonDraftRejectionReasonSchema,       // imported from non-server-only enum module
  teacherId: z.string().min(1),                   // A1
});
```

**Event schema** (mirror the `.strict()` + `PlatformAuditMetadataSchema.default(...)` block at line 201–211):
```typescript
export const LessonDraftRejectedEventSchema = z.object({
  eventType: z.literal("lesson.draft.rejected"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftRejectedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({ delegatedActor: null, approval: null }),
}).strict();
```

**3 registration sites (do not miss any):**
1. `PlatformEventSchema` discriminatedUnion — add to array at **line 307–320** (after `LessonDraftAppliedEventSchema`).
2. `PlatformDomainEventSchema` union — add at **line 322–333**.
3. Exported inferred type — add at **line 363+**: `export type LessonDraftRejectedEvent = z.infer<typeof LessonDraftRejectedEventSchema>;`

---

### `commands/handlers/lesson-draft.events.test.ts` (MODIFY — assert rejection path)

**Analog:** itself. Reuse `mockToolThrowing` (line 71–77) but throw a `DraftGuardrailRejection` instead of a plain `Error`, and assert the **success-shaped** result (NOT a thrown `PlatformCommandExecutionError`). Contrast with the existing D-53-08 failure test at line 146–168.

```typescript
it("guardrail 拦截时 emit lesson.draft.rejected 作为成功 domain 事件（NOT generic failure / D-11）", async () => {
  mocks.createDraftLessonStepTool.mockReturnValue({
    execute: vi.fn(async () => { throw new DraftGuardrailRejection("forbidden_content", "content"); }),
  });
  const result = await lessonDraftCommandHandlers["lesson.draft.run"].execute({
    command: createRunCommand() as never, attemptNumber: 1,
  });
  expect(result.failureEvent).toBeNull();                              // 非失败路径
  expect(result.emittedEvents.map((e) => e.eventType)).toEqual(["lesson.draft.rejected"]);
  expect(result.resultSummary).not.toHaveProperty("step");            // step 不下行（D-06）
});
```

---

### `src/features/platform-core/events/contracts.test.ts` (MODIFY — contract test)

**Analog:** itself (line 1–60). Add `LessonDraftRejectedEventSchema` to imports; assert (a) summary-only guard rejects a `*Json`/unknown-key payload, (b) it parses inside `PlatformEventSchema` / `PlatformDomainEventSchema`. Mirror the existing `LessonDraft*EventSchema.safeParse(...)` style used in `lesson-draft.events.test.ts:111-113`.

---

### `scripts/verify-phase65-eval-close-gate.ts` (CREATE — close gate orchestrator)

**Analog:** `scripts/verify-phase54-ai-contracts.ts` — clone wholesale; reuse `read` (line 10), `listFiles` (line 15), `run` (line 46), `runVitest` (line 63), `StaticCheck` type (line 5), `verifyPackageScript` (line 81), and `process.exit(1)` on failed checks (line 178).

**Invocation form** (D-08; server-only imports need the shim — same as phase 44+):
`node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase65-eval-close-gate.ts`

**`runVitest` helper — copy verbatim** (`verify-phase54:63-79`): tries `node_modules/vitest/vitest.mjs` → `.bin/vitest` → `pnpm exec vitest`, with `--run --testTimeout`.

**Sequence (D-08):** build → targeted AI vitest subset → EVAL-01 eval suite → 61–65 static checks → any FAIL `process.exit(1)`. Build step adds (not in phase54): `run("npm", ["run", "build"], "next build")` or invoke `next build --turbopack`.

**Static checks — adapt `staticChecks` array (line 123–170)** to D-10 invariants. **Pitfall 6: match import/call-sites, not doc-comment prose** (`lesson-draft.ts` mentions `generateObject`/`generateText` in comments lines 20–22):
```typescript
const toolSrc = read("src/server/ai/tools/lesson-draft.ts");
const eventsSrc = read("src/features/platform-core/events/contracts.ts");
const checks: StaticCheck[] = [
  { label: "package.json exposes verify:phase65 + verify:phase",
    passed: verifyPackageScript(packageSource) },
  { label: "tool inputSchema excludes teacherId",
    passed: !/inputSchema[^;]*teacherId/s.test(toolSrc) },
  { label: "tool does not import ai generateObject/generateText directly",
    passed: !/import\s*\{[^}]*generate(Object|Text)[^}]*\}\s*from\s*["']ai["']/.test(toolSrc) },
  { label: "tool generates only via aiGenerateObject", passed: toolSrc.includes("aiGenerateObject(") },
  { label: "no eval / db client / provider key in tool",
    passed: !/\beval\(/.test(toolSrc) && !toolSrc.includes("@/db") && !toolSrc.includes("process.env") },
  { label: "guardrail invoked in tool execute", passed: toolSrc.includes("guardLessonStepPayload(") },
  { label: "lesson.draft.rejected contract present", passed: eventsSrc.includes('z.literal("lesson.draft.rejected")') },
];
```
**`verifyPackageScript` (line 81–91)** must be adapted to assert the phase65 string AND the `verify:phase` alias.

---

### `package.json` scripts (MODIFY)

**Analog:** existing `verify:phase54` (line shown below). Add two entries — the server-only-shim form is mandatory because the close gate imports server-only code:
```jsonc
"verify:phase54": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase54-ai-contracts.ts",
// ADD:
"verify:phase65": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase65-eval-close-gate.ts",
"verify:phase": "npm run verify:phase65"
```
> `verify:phase` is the authoritative milestone-close alias (D-09). No prior aggregate `verify:phase` exists.

---

## Shared Patterns

### server-only isolation (ALL new runtime modules)
**Source:** `lesson-draft.ts:1`, `handlers/lesson-draft.ts:1`
**Apply to:** `guardrails.ts` (first line `import "server-only";`).
**Test counterpart:** every test mocks it as no-op — `vi.mock("server-only", () => ({}))` (`lesson-draft.test.ts:16`, `lesson-draft.events.test.ts:3`, `lesson-agent.test.ts:4`).
**Do NOT** add `server-only` to the reason-code enum module (it is imported by the non-server-only `events/contracts.ts`).

### summary-only event payload (the rejection event)
**Source:** `summaryOnlyStrictPayload` at `events/contracts.ts:75-110`
**Apply to:** `LessonDraftRejectedPayloadSchema` — auto-rejects `*Json` snapshots + unknown keys. Payload is `{ lessonId, stepType, reason, teacherId }` ONLY; never include step content (RESEARCH Anti-Patterns).

### typed-throw failure style
**Source:** `throwDraftFailure` at `handlers/lesson-draft.ts:84-114`
**Apply to:** `DraftGuardrailRejection` (extends `Error`, carries `reason`/`stepType`). NOTE: guardrail rejection is shaped *like* this style but is **routed as a success outcome**, not through `throwDraftFailure` (Pattern 2).

### test mocking convention
**Source:** `lesson-draft.test.ts:1,19-32,54-58`
**Apply to:** `guardrails.test.ts`, `lesson-draft.eval.test.ts`. `vi.hoisted` for mock fns, `vi.mock("@/server/ai/providers", ...)`, `beforeEach(() => { vi.clearAllMocks(); ... })`.

### verify-script helper set
**Source:** `verify-phase54-ai-contracts.ts:5-105`
**Apply to:** `verify-phase65-eval-close-gate.ts`. Clone `read`/`listFiles`/`run`/`runVitest`/`StaticCheck`/`verifyPackageScript`, `process.exit(1)` on any failed check.

---

## No Analog Found

None. Every artifact has a direct in-repo analog. The only genuinely new logic is the over-bounds guardrail body, the reason-code enum values, and the close-gate sequence wiring — all composing existing primitives.

---

## Metadata

**Analog search scope:** `src/server/ai/tools/`, `src/server/ai/agents/`, `src/features/platform-core/commands/handlers/`, `src/features/platform-core/events/`, `src/lib/dto/lesson-authoring.ts`, `scripts/`, `package.json`.
**Files scanned:** 11 read in full/targeted + directory listings.
**Pattern extraction date:** 2026-06-01
</content>
</invoke>
