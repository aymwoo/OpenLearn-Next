# Phase 65: Eval, Guardrails & verify:phase Close Gate - Research

**Researched:** 2026-06-01
**Domain:** Deterministic AI-output eval + output guardrails + aggregate close-gate orchestration (all in-repo TypeScript; no external deps)
**Confidence:** HIGH (codebase grounded; locked decisions reduce open design space)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (research HOW to implement, do NOT re-litigate)

**EVAL-01 — repeatable eval form**
- **D-01:** Fixture-driven Vitest `*.eval.test.ts` (co-located OR centralized `src/server/ai/eval/`). Replay Phase 61 mock model (`src/server/ai/providers/__fixtures__/mock-model.ts`) over fixed intents → recorded outputs; assert `lessonStepPayloadSchema.safeParse` passes + teaching-structure invariants. Deterministic, runs under `npm test`, no network, no provider key. **NOT** a standalone tsx script, **NOT** LLM-as-judge.
- **D-02:** Teaching-structure invariant set (minimum): content step `title`+`body` non-empty; task step `prompt` non-empty + `submissionType` valid; quiz step `options.length >= 2` + `correctOptionIndex` (if present) within options index range; `type ∈ {content,task,quiz}`. Planner completes the full invariant list against current `lessonStepPayloadSchema`.
- **D-03:** Fixture corpus covers all three step types + at least one out-of-bounds counter-example. The corpus is the **single shared source** feeding both EVAL-01 (positive pass) and EVAL-02 (negative reject) — avoid two drifting fixture sets.

**EVAL-02 — guardrail interception point & recording**
- **D-04:** Guardrail layer lives inside `src/server/ai/tools/lesson-draft.ts` `execute` — after `aiGenerateObject` returns, before `return step`. Preserves "single authoritative generation channel." **NOT** at agent layer or Server Action / command handler layer.
- **D-05:** Guardrail stacks out-of-bounds checks ON TOP of `lessonStepPayloadSchema` (which already guarantees base validity): field length caps (body/prompt/question/option overlong), cross-field (`correctOptionIndex < options.length`), forbidden injected content (markers/script fragments), step-type whitelist re-confirmation.
- **D-06:** Interception = throw typed rejection, no persist, no return. Throw typed error (aligned with existing `throwDraftFailure` style); execute returns no step; chain aborts; draft never enters persist or UI.
- **D-07:** Recording = event bus summary-only. NEW `lesson.draft.rejected` event (past-tense, aligned with `produced`/`persisted`/`accepted`), payload only `{ lessonId, stepType, reason, teacherId }` — **NO** step snapshot / `*Json`. Reuse v3.0 event bus, **NO new SQLite table**.

**EVAL-03 — verify:phase close gate**
- **D-08:** New `scripts/verify-phase65-<slug>.ts` aligned with `verify-phaseN-*.ts` style (mirror `verify-phase54-ai-contracts.ts` `read`/`listFiles`/`StaticCheck` helpers). Orchestrates: (a) `npm run build`, (b) v3.2 targeted test subset (AI tool/agent/provider/draft/review), (c) EVAL-01 eval suite, (d) Phase 61–65 static contract checks. Any failure → `process.exit(1)`.
- **D-09:** Register `verify:phase65` (→ script) AND authoritative alias `verify:phase` (= current milestone close-gate single entry) in `package.json`. `verify:phase` is the SINGLE authoritative gate for milestone close; CI and human close both run it.
- **D-10:** Static contract checks assert v3.2 non-negotiable invariants: tool `inputSchema` excludes `teacherId` (closure injection); tool generates ONLY via `aiGenerateObject` (not direct `ai` `generateObject`/`generateText`); no `eval()` / DB client / provider-key import; guardrail layer present; `lesson.draft.rejected` event contract present.

### Claude's Discretion (research options, recommend)
- Eval suite location (co-located `lesson-draft.eval.test.ts` vs centralized `src/server/ai/eval/`).
- Guardrail form (standalone `guardLessonStepPayload()` pure function vs inline block) — CONTEXT leans pure function for direct unit testing.
- Specific field length-cap numeric values — centralize as constants.
- `lesson.draft.rejected` reason-code enum value set.
- `verify-phase65` slug naming.
- Close-gate "targeted test subset" precise vitest filter vs full `npm test`.
- Whether eval drives `LessonAgent` (multi-step chain) or only `draftLessonStepTool` (single step) — leans cover tool + agent entry each once.

### Deferred Ideas (OUT OF SCOPE)
- LLM-as-judge / subjective teaching-quality scoring.
- Guardrail persistent audit table (event-only this phase).
- Multi-Agent (Homework/Data/Tutor/Parent) eval/guardrail.
- RAG-augmented draft eval.
- Semantic prompt-injection deep detection (this phase: marker/structural interception only).
- Cross-milestone unified `verify:milestone`.
- Human-readable eval report / trend dashboard.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVAL-01 | Repeatable eval validates LessonAgent draft output on schema validity + basic teaching structure | `MockLanguageModelV3` from `ai/test` (already used in `__fixtures__/mock-model.ts`); `lessonStepPayloadSchema` discriminatedUnion; vitest `include` glob picks up `*.eval.test.ts` automatically (§Validation Architecture) |
| EVAL-02 | Guardrails block out-of-bounds Agent output (illegal step type, overlong, forbidden injected content), intercepted output is recorded | Guardrail pure function in tool layer + typed rejection + NEW `lesson.draft.rejected` domain event in `events/contracts.ts` discriminated union (§Architecture Patterns — the critical event-emission resolution) |
| EVAL-03 | `verify:phase` close gate does end-to-end regression of AI draft chain, single authoritative milestone-close gate | `verify-phase54-ai-contracts.ts` is the directly reusable template; `runVitest`/`run`/`StaticCheck`/`read`/`listFiles` helpers copy-adapt (§Code Examples) |
</phase_requirements>

## Summary

This is a **brownfield integration/quality phase** with no new external dependencies. Every tool needed already exists in the repo: Vitest 4.1.5, Zod 4, `ai@6.0.193` with `MockLanguageModelV3` (`ai/test`), the v3.0 Command Bus + event ledger, the `lessonStepPayloadSchema` discriminatedUnion, and a battle-tested `verify-phaseN` script template. The work is composing these, not introducing anything new.

The **single most important planning decision** is unresolved by the locked decisions and must be designed explicitly: **where and how `lesson.draft.rejected` gets emitted**. D-04 puts the guardrail inside `draftLessonStepTool.execute` and D-06 says it throws a typed rejection. But the only path from a thrown error in `execute` today is `executeLessonDraftRun`'s `catch` → `throwDraftFailure` → the bus emits **only** a generic `platform.command.failed` event, because Phase 53's D-53-08 invariant forbids domain events on the failure path (proven by `lesson-draft.events.test.ts:146` "生成失败时...不返回任何 domain 事件"). A typed guardrail rejection therefore **cannot** ride the existing failure path to produce a domain event. The handler must distinguish a `DraftGuardrailRejection` from a generic generation failure and route it as a **successful interception outcome** (return `successResult` with `emittedEvents: [lesson.draft.rejected]`, `step: null`), not as a command failure. This keeps D-53-08 intact AND satisfies D-06 (step never flows downstream because it is null) AND D-07 (domain event recorded). See §Architecture Patterns Pattern 2.

**Primary recommendation:** Implement guardrail as a standalone pure function `guardLessonStepPayload(step): LessonStepPayload` (throws typed `DraftGuardrailRejection` carrying `reason` + `stepType`); call it in `execute` after generation; have `executeLessonDraftRun` `instanceof`-detect the rejection and emit `lesson.draft.rejected` as a domain event via `successResult` (NOT via `throwDraftFailure`). Add the event to the `events/contracts.ts` discriminated union using the existing `summaryOnlyStrictPayload` guard. Share one fixture corpus across eval positive/negative. Clone `verify-phase54-ai-contracts.ts` as the close-gate skeleton.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Eval replay of model output | Test tier (`*.eval.test.ts`) | AI provider fixtures | Deterministic regression belongs in vitest, fed by `MockLanguageModelV3`; no runtime/UI involvement |
| Guardrail validation (over-bounds checks) | AI tool layer (`server/ai/tools/lesson-draft.ts`) | DTO schema (`lessonStepPayloadSchema`) | D-04: single authoritative generation channel — interception at the generation boundary, not downstream consumers |
| Typed rejection throw | AI tool layer | — | D-06: abort at generation edge before any persist/return |
| Rejection event emission | Command handler (`commands/handlers/lesson-draft.ts`) | Event ledger/bus | Only command handlers return `emittedEvents`; the tool layer has no bus access. Handler must catch typed rejection and emit domain event |
| Event contract definition | Platform-core events (`events/contracts.ts`) | — | All `lesson.draft.*` event schemas live in the central discriminated union |
| Close-gate orchestration | Build script (`scripts/verify-phase65-*.ts`) | npm scripts | D-08/09: aggregate orchestrator + `verify:phase` alias, CI-consumable non-zero exit |

## Standard Stack

### Core (all already installed — verify, do not add)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.1.5 | Eval + unit test runner | `[VERIFIED: package.json]` Project test runner; `*.eval.test.ts` auto-included by `vitest.config.mts` glob `src/**/*.{test,spec}.ts` |
| Zod | 4.4.3 | Schema validation (guardrail base + event payloads) | `[VERIFIED: package.json]` `lessonStepPayloadSchema` is Zod; guardrail layers on top; event payloads use `summaryOnlyStrictPayload` |
| `ai` (`ai/test`) | 6.0.193 | `MockLanguageModelV3` deterministic replay | `[VERIFIED: package.json + mock-model.ts]` Already the fixture source; eval reuses `makeOkObjectModel(obj)` to inject recorded outputs |
| tsx | (installed) | Run close-gate TS script | `[VERIFIED: package.json scripts]` All `verify:phaseN` scripts run via tsx |

### Supporting (existing infrastructure to reuse)
| Asset | Location | Purpose |
|-------|----------|---------|
| `makeOkObjectModel(obj)` | `src/server/ai/providers/__fixtures__/mock-model.ts` | Inject deterministic JSON step output into the model channel for eval |
| `verify-phase54-ai-contracts.ts` helpers | `scripts/` | `read`/`listFiles`/`run`/`runVitest`/`StaticCheck` — clone for phase65 close gate |
| `summaryOnlyStrictPayload(shape)` | `src/features/platform-core/events/contracts.ts:75` | Build `lesson.draft.rejected` payload schema with `*Json` rejection + strict unknown-key rejection |
| v3.0 Command Bus + event ledger | `src/features/platform-core/commands/`, `events/` | Emit `lesson.draft.rejected` via handler `emittedEvents` |
| `throwDraftFailure` pattern | `commands/handlers/lesson-draft.ts:84` | Style reference for typed throw (guardrail rejection follows similar shape but is NOT routed through it) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `*.eval.test.ts` under `npm test` | Standalone `tsx scripts/eval.ts` | REJECTED by D-01 — non-deterministic harness, not CI-native |
| Pure-function guardrail | Inline validation block in `execute` | CONTEXT leans pure function (D-disc) — enables direct unit test without driving the whole tool; recommended |
| New SQLite audit table | Event-only recording | REJECTED by D-07 — event bus reuse, no migration |

**Installation:** None. All dependencies present. `npm view` not applicable (no new packages). `[VERIFIED: package.json — ai ~6.0.193, zod ^4.4.3, vitest 4.1.5]`

## Architecture Patterns

### System Architecture Diagram

```
                        EVAL-01 (test tier, deterministic)
  fixture corpus ──► makeOkObjectModel(recordedStep) ──► aiGenerateObject
  (shared, D-03)                                              │
       │                                                      ▼
       │                                            draftLessonStepTool.execute
       │                                                      │
       │                                          ┌───────────┴───────────┐
       │                                          ▼ (positive fixtures)   ▼ (negative fixtures)
       │                              lessonStepPayloadSchema OK   guardLessonStepPayload()
       │                                          │                       │ throws
       │  assert safeParse OK +                   ▼                       ▼
       └─ teaching invariants            return step           DraftGuardrailRejection
          (D-02)                                                 {reason, stepType}
                                                                         │
                        EVAL-02 (runtime path)                          ▼
  draftLessonStep (agent) ─► dispatchPlatformCommand ─► executeLessonDraftRun
                                                                 │
                                              ┌──────────────────┴──────────────────┐
                                   step returned OK                  catch(DraftGuardrailRejection)
                                              │                                      │
                                   emittedEvents:[requested,           emittedEvents:[lesson.draft.rejected]
                                   tool.invoked, produced]             resultSummary:{rejected:true, step:null}
                                   resultSummary:{step}                (NOT throwDraftFailure → keeps D-53-08)
                                              │                                      │
                                              └──────────► event ledger ◄────────────┘

                        EVAL-03 (close gate)
  npm run verify:phase ─► verify-phase65-*.ts:
     [1] npm run build → [2] targeted vitest subset → [3] EVAL-01 eval suite →
     [4] static contract checks (61–65) → any FAIL → process.exit(1)
```

### Pattern 1: Deterministic eval via recorded model output (EVAL-01)
**What:** A `*.eval.test.ts` builds the tool/agent against `MockLanguageModelV3` that replays a recorded JSON step, then asserts schema + structure invariants. Mirror the existing `lesson-draft.test.ts` mocking style (`vi.mock("@/server/ai/providers", ...)`).
**When to use:** All EVAL-01 positive cases.
**Key:** The existing `lesson-draft.test.ts` already mocks `aiGenerateObject` directly (cleanest). For an end-to-end eval through the real facade, instead inject `makeOkObjectModel(recordedStep)` via the registry — heavier, only needed if eval must exercise `generateObject` parsing. Recommend mocking `aiGenerateObject` for tool-level eval (fast, deterministic) and use `draftLessonStep` with injected store for the agent-level eval (mirror `lesson-agent.test.ts`).
```typescript
// Source: existing pattern src/server/ai/tools/lesson-draft.test.ts:19-32
const { aiGenerateObjectMock } = vi.hoisted(() => ({ aiGenerateObjectMock: vi.fn() }));
vi.mock("@/server/ai/providers", () => ({ aiGenerateObject: aiGenerateObjectMock }));
// per fixture:
aiGenerateObjectMock.mockResolvedValue(recordedStep);
const out = await tool.execute!({ lessonId, stepType, intent }, {} as never);
expect(lessonStepPayloadSchema.safeParse(out).success).toBe(true);
// + D-02 invariants
```

### Pattern 2: Guardrail rejection as a SUCCESSFUL interception outcome (EVAL-02 — CRITICAL)
**What:** Guardrail throws a typed `DraftGuardrailRejection` in `execute`; the command handler catches THAT type specifically and emits `lesson.draft.rejected` as a **domain event on the success-shaped result**, NOT via `throwDraftFailure`.
**Why this is the crux:** `throwDraftFailure` → bus emits only `platform.command.failed` (generic), because D-53-08 forbids domain events on the failure path (`lesson-draft.events.test.ts:146`). To get a `lesson.draft.rejected` domain event recorded, the rejection must be modeled as an *outcome*, not a *failure*. The step is `null` in `resultSummary`, so D-06's "chain aborts, never reaches persist/UI" still holds (downstream reads `result.step` → null).
**When to use:** Guardrail interceptions only. Genuine provider/generation failures still go through `throwDraftFailure` unchanged.
```typescript
// guardrail pure fn (recommended location: src/server/ai/tools/guardrails.ts, server-only)
export class DraftGuardrailRejection extends Error {
  constructor(readonly reason: DraftRejectionReason, readonly stepType: LessonStepType) {
    super(`DRAFT_GUARDRAIL_REJECTED:${reason}`);
  }
}
export function guardLessonStepPayload(step: LessonStepPayload): LessonStepPayload { /* checks, throw on violation */ return step; }

// in tool execute (lesson-draft.ts), after aiGenerateObject, before return:
return guardLessonStepPayload(step);

// in executeLessonDraftRun (handlers/lesson-draft.ts) — distinguish rejection from failure:
let step: LessonStepPayload;
try {
  step = await draftTool.execute!(...);
} catch (cause) {
  if (cause instanceof DraftGuardrailRejection) {
    return successResult({
      resultSummary: { stepType: cause.stepType, rejected: true, succeeded: false }, // NO step
      invalidation: { tags: [] },
      emittedEvents: [withAudit({
        eventType: "lesson.draft.rejected",
        category: "domain", aggregateType: "lesson", aggregateId: lessonId,
        payload: { lessonId, stepType: cause.stepType, reason: cause.reason, teacherId },
      }, command.audit)],
    });
  }
  throwDraftFailure(command, cause); // genuine generation failure → unchanged
}
```
> **Planner must confirm** whether `teacherId` belongs in the event payload. CONTEXT D-07/specifics list `{ lessonId, stepType, reason, teacherId }`, but `teacherId` is PII-adjacent and elsewhere is deliberately kept out of LLM-visible payloads. It is acceptable in a server-side ledger summary, but verify against the summary-only guard (it is a plain string, not `*Json`, so it passes the guard). `[ASSUMED]` — see Assumptions Log A1.

### Pattern 3: New domain event registration (EVAL-02 recording)
**What:** Add `LessonDraftRejectedPayloadSchema` + `LessonDraftRejectedEventSchema` to `events/contracts.ts` and include in BOTH `PlatformEventSchema` (discriminatedUnion) and `PlatformDomainEventSchema` (union), plus export the inferred types. Use `summaryOnlyStrictPayload` for the payload (auto-rejects `*Json` + unknown keys).
```typescript
// Source: existing src/features/platform-core/events/contracts.ts:112-122 pattern
const LessonDraftRejectedPayloadSchema = summaryOnlyStrictPayload({
  lessonId: z.string().min(1),
  stepType: LessonStepTypeSchema,         // reuse existing :70
  reason: LessonDraftRejectionReasonSchema, // new z.enum of reason codes
  teacherId: z.string().min(1),
});
export const LessonDraftRejectedEventSchema = z.object({
  eventType: z.literal("lesson.draft.rejected"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftRejectedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({ delegatedActor: null, approval: null }),
}).strict();
```
**Reason-code enum (D-disc / specifics):** `invalid_step_type` / `field_too_long` / `quiz_correct_index_out_of_range` / `quiz_too_few_options` / `forbidden_content`. Place the enum where both `guardrails.ts` and `events/contracts.ts` can import it without a cycle — recommend a small shared module (e.g. `src/server/ai/tools/guardrail-contracts.ts` or co-locate in dto). Avoid importing `server-only` guardrail module into `events/contracts.ts`.

### Pattern 4: Close-gate orchestrator (EVAL-03)
**What:** Clone `verify-phase54-ai-contracts.ts`. Reuse `read`/`listFiles`/`run`/`runVitest`/`StaticCheck`. Sequence: build → targeted vitest → eval suite → static checks → exit non-zero on any failure.
**Script invocation form:** Because the tool/guardrail are `server-only`, use the SAME node invocation as phase54: `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase65-<slug>.ts` (NOT bare `tsx`). The static check that "package.json exposes exact verify:phaseN script" in phase54 (`verify-phase54-ai-contracts.ts:81-91`) must be adapted to assert the phase65 string.

### Anti-Patterns to Avoid
- **Routing guardrail rejection through `throwDraftFailure`:** Produces a generic `platform.command.failed`, NOT `lesson.draft.rejected` → EVAL-02 "recorded" criterion fails. (See Pattern 2.)
- **Emitting `lesson.draft.rejected` from the tool layer:** The tool returns a step, not events. Only handlers return `emittedEvents`. Emit in the handler.
- **Putting step content in the rejected event payload:** Violates summary-only + the `*Json` guard. Payload is `{ lessonId, stepType, reason, teacherId }` only.
- **Two separate fixture sets for eval pos/neg:** D-03 mandates one shared corpus — drift risk.
- **Adding a new SQLite table for rejections:** D-07 forbids; event-only.
- **Bare `tsx` for the close-gate script:** server-only imports need the shim (phase 44+ scripts all use `--require ./scripts/server-only-node-shim.cjs`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deterministic model output for eval | Custom fake model class | `makeOkObjectModel()` / mock `aiGenerateObject` | Already proven in `mock-model.ts` + `lesson-draft.test.ts` |
| Summary-only event payload guard | Hand-written `*Json` rejection | `summaryOnlyStrictPayload()` | Exists at `contracts.ts:75`; auto rejects snapshots + unknown keys |
| Close-gate file IO + vitest spawn | New script scaffolding | Clone `verify-phase54-ai-contracts.ts` helpers | `read`/`listFiles`/`runVitest`/`run` handle pnpm/node/bin fallbacks already |
| Step schema base validity | Re-validate step fields manually | `lessonStepPayloadSchema` | Guardrail only ADDS over-bounds checks (D-05) |
| Typed failure throw style | New error hierarchy | Extend `Error` like `DraftGuardrailRejection`, mirror `throwDraftFailure` shape | Consistent with handler conventions |

**Key insight:** This phase is ~90% composition of existing primitives. The only genuinely new artifacts are: the guardrail pure function, the reason-code enum, the `lesson.draft.rejected` event schema + handler branch, the eval fixture corpus + `*.eval.test.ts`, and the close-gate script + npm aliases.

## Common Pitfalls

### Pitfall 1: Guardrail rejection silently becomes a generic failure
**What goes wrong:** Guardrail throws; handler's existing blanket `catch` calls `throwDraftFailure`; bus records `platform.command.failed`; no `lesson.draft.rejected` event ever exists.
**Why it happens:** `executeLessonDraftRun:133-142` currently catches ALL errors uniformly.
**How to avoid:** `instanceof DraftGuardrailRejection` branch BEFORE `throwDraftFailure` (Pattern 2).
**Warning signs:** EVAL-02 "recorded" test passes only against `platform.command.failed`, not `lesson.draft.rejected`.

### Pitfall 2: Forgetting to add the event to BOTH unions
**What goes wrong:** Adding `LessonDraftRejectedEventSchema` only to `PlatformEventSchema` but not `PlatformDomainEventSchema` (or vice versa) → handler's `emittedEvents` (typed `PlatformSuccessOrDomainEvent[]`) won't accept it, or ledger validation drops it.
**Why it happens:** Three places reference the event union (`contracts.ts:307`, `:322`, `:335`).
**How to avoid:** Add to `PlatformEventSchema` discriminatedUnion (:307) AND `PlatformDomainEventSchema` union (:322) AND export the type (:347+). Grep existing `LessonDraftAppliedEventSchema` for the full insertion checklist (it appears in both).

### Pitfall 3: `correctOptionIndex` cross-field check is genuinely missing from schema
**What goes wrong:** Assuming the schema already bounds `correctOptionIndex`. It does NOT — `quizStepPayloadSchema:143` is `z.number().int().nonnegative().optional()` with no relation to `options.length` (CONTEXT line 77 explicitly flags this gap).
**How to avoid:** Guardrail MUST implement `correctOptionIndex < options.length` (D-05). This is a primary guardrail check, not redundant with the schema.
**Warning signs:** A quiz with `options.length === 3, correctOptionIndex === 7` passes `safeParse` but should be rejected.

### Pitfall 4: Eval file accidentally excluded or double-counted
**What goes wrong:** `*.eval.test.ts` ends in `.test.ts` so it IS matched by `vitest.config.mts` `include` → it runs in normal `npm test` AND in the close gate's eval step → double execution / confusion.
**Why it happens:** The glob `src/**/*.{test,spec}.ts` is inclusive.
**How to avoid:** This is acceptable (eval is part of the suite), but the close gate's "targeted subset" + "EVAL-01 eval suite" steps must not redundantly fail the build for the same reason. Decide whether the eval suite is a distinct `runVitest([evalPaths])` call or folded into the subset (D-disc: planner chooses filter strategy).

### Pitfall 5: Forbidden-content check scope creep into semantic injection detection
**What goes wrong:** Over-engineering prompt-injection detection.
**How to avoid:** Deferred explicitly (CONTEXT line 126). This phase does marker/structural interception only (e.g., presence of `<script`, known forbidden tokens). Keep it a simple denylist check.

### Pitfall 6: Static contract check false-positives on comments
**What goes wrong:** `verify-phase54` style checks use `.includes("generateObject(")` / regex on source. `lesson-draft.ts` mentions `generateObject`/`generateText` in a DOC COMMENT (lines 21-22: "不直连 ai 的 generateObject/generateText"). A naive `source.includes("generateObject(")` would false-positive.
**How to avoid:** Check for the FORBIDDEN form precisely — e.g. assert the file does NOT `import { generateObject }` and the only generation call is `aiGenerateObject(`. Match against import statements / call sites, not doc-comment prose. (Note phase54 checks use `.includes` on identifier strings that don't appear in comments — phase65 must be more careful given the doc comments.)

## Code Examples

### Eval: shared corpus driving positive + negative (EVAL-01 + EVAL-02, D-03)
```typescript
// Source: composed from lesson-draft.test.ts + lesson-authoring dto
type EvalFixture = { name: string; intent: string; stepType: LessonStepType; recorded: unknown; expect: "pass" | { reject: DraftRejectionReason } };

const CORPUS: EvalFixture[] = [
  { name: "content ok", stepType: "content", intent: "导入", recorded: { type: "content", title: "讲授", body: "正文", materialRefs: [] }, expect: "pass" },
  { name: "quiz ok", stepType: "quiz", intent: "测验", recorded: { type: "quiz", question: "Q?", options: ["A","B"], correctOptionIndex: 0, materialRefs: [] }, expect: "pass" },
  { name: "quiz index OOB", stepType: "quiz", intent: "测验", recorded: { type: "quiz", question: "Q?", options: ["A","B"], correctOptionIndex: 5, materialRefs: [] }, expect: { reject: "quiz_correct_index_out_of_range" } },
  // + field_too_long, forbidden_content, invalid_step_type cases
];

for (const f of CORPUS) {
  it(f.name, () => {
    if (f.expect === "pass") {
      expect(lessonStepPayloadSchema.safeParse(f.recorded).success).toBe(true);
      expect(() => guardLessonStepPayload(f.recorded as LessonStepPayload)).not.toThrow();
    } else {
      try { guardLessonStepPayload(f.recorded as LessonStepPayload); throw new Error("should reject"); }
      catch (e) { expect((e as DraftGuardrailRejection).reason).toBe(f.expect.reject); }
    }
  });
}
```

### Close gate static checks (EVAL-03, D-10)
```typescript
// Source: adapted from verify-phase54-ai-contracts.ts:123-170
const toolSrc = read("src/server/ai/tools/lesson-draft.ts");
const eventsSrc = read("src/features/platform-core/events/contracts.ts");
const checks: StaticCheck[] = [
  { label: "tool inputSchema excludes teacherId",
    passed: /draftStepInputSchema = z\.object\(\{[^}]*\}\)/s.test(toolSrc) && !/inputSchema[^;]*teacherId/s.test(toolSrc) },
  { label: "tool does not import ai generateObject/generateText directly",
    passed: !/import\s*\{[^}]*generate(Object|Text)[^}]*\}\s*from\s*["']ai["']/.test(toolSrc) },
  { label: "tool generates only via aiGenerateObject", passed: toolSrc.includes("aiGenerateObject(") },
  { label: "no eval / db client / provider key in tool", passed: !/\beval\(/.test(toolSrc) && !toolSrc.includes("@/db") && !toolSrc.includes("process.env") },
  { label: "guardrail invoked in tool execute", passed: toolSrc.includes("guardLessonStepPayload(") },
  { label: "lesson.draft.rejected event contract present", passed: eventsSrc.includes('z.literal("lesson.draft.rejected")') },
  { label: "package.json exposes verify:phase + verify:phase65", passed: /* parse pkg.scripts */ true },
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TESTING.md says "Vitest v1.x" | Actual `vitest@4.1.5` | (stale doc) | Eval uses Vitest 4 APIs; no v1 quirks. `[VERIFIED: package.json]` |
| — | `ai@6.0.193`, `MockLanguageModelV3` from `ai/test` | current | Eval mock uses structured `LanguageModelV3Usage` shape (see `mock-model.ts:19-26`); only relevant if eval drives the real facade rather than mocking `aiGenerateObject` |

**Deprecated/outdated:** None affecting this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `teacherId` is acceptable in the `lesson.draft.rejected` server-side ledger payload (passes summary-only guard as a plain string) | Pattern 2/3 | If project policy bars teacherId from event payloads, planner drops it → payload becomes `{ lessonId, stepType, reason }`. Low impact; confirm in discuss/plan-check |
| A2 | Guardrail rejection should be modeled as a command *outcome* (successResult + domain event), not a *failure* | Pattern 2 | If the team prefers it remain a failure, EVAL-02 "recorded" must instead read from `platform.command.failed` with a rejection reason code — a different design. This is the #1 thing to confirm before planning |
| A3 | The eval suite running inside `npm test` (via the include glob) is acceptable | Pitfall 4 | If eval must be excluded from default `npm test`, naming must change (e.g. a non-`.test.ts` suffix + explicit close-gate-only run) |

**If A2 changes, most of EVAL-02's task structure changes.** Recommend confirming in plan-check.

## Open Questions

1. **How is `lesson.draft.rejected` emitted given D-53-08 forbids domain events on the failure path?**
   - What we know: tool `execute` throws (D-04/D-06); only handlers emit events; failure path emits only generic `platform.command.failed`.
   - What's unclear: whether to model rejection as a success-shaped outcome (recommended, Pattern 2) or extend the bus.
   - Recommendation: handler `instanceof` branch → `successResult` with `emittedEvents:[lesson.draft.rejected]`, `step:null`. Keeps D-53-08 and D-06 simultaneously. Confirm in plan-check (Assumption A2).

2. **Does eval cover the agent entry (`draftLessonStep`) too, or only the tool?**
   - What we know: D-disc leans "tool + agent entry each once"; N=1 single chain.
   - Recommendation: one tool-level eval (mock `aiGenerateObject`, fast) + one agent-level eval (mirror `lesson-agent.test.ts` with injected store) asserting the rejected event is emitted end-to-end.

3. **Eval suite location: co-located vs `src/server/ai/eval/`?**
   - Recommendation: co-locate `lesson-draft.eval.test.ts` next to the tool + guardrail (matches TESTING.md co-location convention); guardrail unit tests co-located too. Centralized `eval/` only if multiple agents later (deferred).

## Environment Availability

SKIPPED (no external dependencies — all in-repo TypeScript; no tools/services/runtimes beyond the existing Node/vitest/tsx toolchain already verified in `package.json`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 `[VERIFIED: package.json]` |
| Config file | `vitest.config.mts` (include glob `src/**/*.{test,spec}.ts`, `scripts/**/*.test.ts`; testTimeout 30000) |
| Quick run command | `npx vitest run src/server/ai/tools/lesson-draft.eval.test.ts` |
| Full suite command | `npm test` (= `vitest`, watch) or `npx vitest run` (CI single run) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVAL-01 | Draft output schema-valid + teaching invariants | eval (unit) | `npx vitest run src/server/ai/tools/lesson-draft.eval.test.ts` | ❌ Wave 0 |
| EVAL-02 | Guardrail rejects out-of-bounds + emits `lesson.draft.rejected` | unit + handler integration | `npx vitest run src/server/ai/tools/guardrails.test.ts src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` | ⚠️ guardrails.test.ts ❌ Wave 0; events.test.ts ✅ extend |
| EVAL-02 | Event contract summary-only + in union | contract test | `npx vitest run src/features/platform-core/events/contracts.test.ts` | ✅ extend |
| EVAL-03 | Close gate aggregates build+tests+eval+static, non-zero exit | script (smoke) | `npm run verify:phase` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run <changed eval/guardrail/handler test>`
- **Per wave merge:** targeted AI subset `npx vitest run src/server/ai/ src/features/platform-core/commands/handlers/lesson-draft.events.test.ts src/features/platform-core/events/contracts.test.ts`
- **Phase gate:** `npm run verify:phase` green (build + subset + eval + static checks) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/server/ai/tools/lesson-draft.eval.test.ts` — covers EVAL-01 (+ shares corpus for EVAL-02 negatives, D-03)
- [ ] `src/server/ai/tools/guardrails.test.ts` — guardrail pure-function unit tests (each reason code)
- [ ] `src/server/ai/tools/guardrails.ts` (+ reason-code enum module) — implementation under test
- [ ] Extend `src/features/platform-core/commands/handlers/lesson-draft.events.test.ts` — assert `lesson.draft.rejected` emitted on guardrail rejection (NOT generic failure)
- [ ] Extend `src/features/platform-core/events/contracts.test.ts` — `LessonDraftRejectedEventSchema` summary-only + in discriminatedUnion
- [ ] `scripts/verify-phase65-<slug>.ts` + `package.json` `verify:phase65` + `verify:phase` alias
- Framework install: none (Vitest present)

## Security Domain

This phase IS a security/guardrail feature — the controls below are the deliverable, not incidental.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input/Output Validation | yes | `lessonStepPayloadSchema` (base) + `guardLessonStepPayload` (over-bounds): length caps, cross-field, type whitelist, forbidden-content denylist |
| V5 Output encoding / injection | yes (structural) | Forbidden-content marker check (e.g. `<script`, known tokens). Semantic prompt-injection DEFERRED (CONTEXT:126) |
| V7 Error/Logging | yes | Summary-only `lesson.draft.rejected` event = the audit log of interceptions; no PII snapshot, no `*Json` |
| V6 Cryptography | no | N/A |
| V2/V3/V4 Auth/Session/Access | indirect | teacherId remains closure-injected (D-04 / existing Phase 62 invariant); guardrail does not weaken it |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| LLM emits illegal step type | Tampering | Step-type whitelist re-confirm in guardrail (`invalid_step_type`) |
| LLM emits overlong field (DoS / storage abuse) | DoS | Length caps constant (`field_too_long`) |
| LLM emits quiz with answer index out of range | Tampering | Cross-field `correctOptionIndex < options.length` (`quiz_correct_index_out_of_range`) — schema does NOT cover this |
| LLM injects forbidden content/markup | Tampering / injection | Forbidden-content denylist (`forbidden_content`) |
| Rejection bypasses persist boundary | Elevation | D-06: throw before `return step`; step is `null` downstream → never persisted |
| Audit gap on interception | Repudiation | `lesson.draft.rejected` recorded on event ledger |
| Static invariant regression (someone wires direct `generateObject`, adds `eval`, leaks key) | Tampering | D-10 close-gate static checks fail the build |

## Project Constraints (from AGENTS.md)
- **No arbitrary code:** guardrail/eval must NOT use `eval()` or dynamic execution — and this is itself a D-10 static assertion. `[CITED: AGENTS.md §Constraints, §Safe Plugin]`
- **Provider-key-server-only:** eval uses mock model / mocked `aiGenerateObject`; never touches a real key. `[CITED: AGENTS.md]`
- **DAL-only:** recording goes through the event bus, not direct DB writes from eval/guardrail. `[CITED: AGENTS.md]`
- **SQLite-first / no new table:** D-07 — event-only, no migration. `[CITED: 65-CONTEXT.md D-07]`
- **server-only isolation:** guardrail module first line `import "server-only"`; eval mocks it as no-op (`vi.mock("server-only", () => ({}))`). `[VERIFIED: lesson-draft.test.ts:16]`
- **GitNexus impact analysis:** AGENTS.md mandates `gitnexus_impact` before editing `executeLessonDraftRun`, `draftLessonStepTool.execute`, and `events/contracts.ts` unions (HIGH-fan-in symbols). Planner should include this as a pre-edit step.

## Sources

### Primary (HIGH confidence)
- `src/server/ai/tools/lesson-draft.ts` — guardrail insertion point (execute, after `aiGenerateObject`, before `return`)
- `src/server/ai/tools/lesson-draft.test.ts` — eval/guardrail test mocking pattern (`vi.mock("@/server/ai/providers")`)
- `src/lib/dto/lesson-authoring.ts:114-160` — `contentStepPayloadSchema`/`taskStepPayloadSchema`/`quizStepPayloadSchema`/`lessonStepPayloadSchema`; confirms `correctOptionIndex` is unbounded vs `options.length`
- `src/features/platform-core/events/contracts.ts` — `summaryOnlyStrictPayload`, `LessonStepTypeSchema`, event union registration (3 sites), existing `lesson.draft.*` events
- `src/features/platform-core/commands/handlers/lesson-draft.ts` — `executeLessonDraftRun` catch path, `throwDraftFailure`, `successResult`, `withAudit`
- `src/features/platform-core/commands/handlers/lesson-draft.events.test.ts:146` — proves failure path emits NO domain events (D-53-08)
- `src/server/ai/agents/lesson-agent.ts` + `lesson-agent.test.ts` — agent-level eval pattern (injected store)
- `src/server/ai/providers/__fixtures__/mock-model.ts` — `makeOkObjectModel` deterministic replay
- `scripts/verify-phase54-ai-contracts.ts` — close-gate script template (`read`/`listFiles`/`run`/`runVitest`/`StaticCheck`, non-zero exit)
- `package.json` — verified versions (ai ~6.0.193, zod ^4.4.3, vitest 4.1.5), `verify:phaseN` script invocation pattern (server-only shim)
- `vitest.config.mts` — test include glob (eval auto-included)
- `.planning/REQUIREMENTS.md:38-40,82-84` — EVAL-01/02/03 text + coverage matrix
- `.planning/config.json` — `nyquist_validation: true` → Validation Architecture required
- `65-CONTEXT.md` — locked decisions D-01..D-10

### Secondary (MEDIUM confidence)
- `.planning/codebase/TESTING.md` — co-location + mocking conventions (note: stale "Vitest v1.x" — actual v4.1.5)

### Tertiary (LOW confidence)
- None — all claims grounded in repo files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps verified present in package.json; no new installs
- Architecture: HIGH for what exists; the event-emission resolution (Pattern 2) is a design recommendation flagged for plan-check confirmation (Assumption A2)
- Pitfalls: HIGH — derived directly from reading the handler catch path, event unions, and schema gaps

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable — internal codebase, no fast-moving external deps)
