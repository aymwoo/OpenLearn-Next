---
phase: 65-eval-guardrails-verify-phase-close-gate
plan: 05
subsystem: testing/ci-gate
tags: [verify, close-gate, vitest, regression, guardrails, eval, d-10]
requires:
  - phase: 65-01
    provides: "draft-guardrails dto (DraftGuardrailRejection, reason-code enum)"
  - phase: 65-02
    provides: "server-only guardrails.ts + lesson-draft tool guardrail call"
  - phase: 65-04
    provides: "lesson.draft.rejected contract + handler instanceof branch"
provides:
  - "verify:phase65 close-gate: npm run build + Phase 61–65 vitest regression subset (18 files) + 14 static boundary checks, process.exit(1) on any failure"
  - "authoritative verify:phase alias resolving to the Phase 65 close gate"
affects:
  - scripts/verify-phase65-eval-guardrails.ts
  - package.json
tech-stack:
  added: []
  patterns:
    - "Close-gate = static D-10 boundary layer THEN build THEN end-to-end vitest regression (fail-loud process.exit(1))"
    - "Layer-scoped bans (DB-client + direct ai generateObject are tool-only) prevent false-RED on legitimate agent/facade usage"
    - "Directive-regex (import \"server-only\") over substring to avoid matching prose comments"
key-files:
  created:
    - scripts/verify-phase65-eval-guardrails.ts
  modified:
    - package.json
decisions:
  - "Check #7 (DTO must be non-server-only) uses /import [\"']server-only[\"']/ directive regex instead of the plan's literal !includes(\"server-only\") — the DTO documents '非 server-only' in prose, which would false-RED correct code"
  - "DB-client ban is tool-layer-scoped; agent layer (legit @/db dispatch) checked only for no-eval + no-provider-key — matches D-10 generation-boundary intent"
patterns-established:
  - "Milestone close gate: build precedes vitest; static checks precede both; any failure is non-zero exit"
requirements-completed: [EVAL-03]
duration: 22m
completed: 2026-06-01
---

# Phase 65 Plan 05: Eval + Guardrail Close-Gate Summary

**`verify:phase65` is a single repeatable close gate that runs `npm run build`, a Phase 61–65 end-to-end Vitest regression (18 files / 145 tests), and 14 static D-10 boundary assertions — exiting non-zero on any regression — exposed via an authoritative `verify:phase` alias.**

## Performance

- **Duration:** ~22 min (includes a full `npm run build` gate run)
- **Completed:** 2026-06-01
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Authored the Phase 65 close-gate verifier modeled on `scripts/verify-phase54-ai-contracts.ts` (same `read`/`listFiles`/`run`/`runVitest` helpers, verbatim runVitest resolution order).
- Static layer asserts **all five D-10 boundaries** (teacherId-excluded inputSchema, sole `aiGenerateObject` channel, no eval/DB-client/provider-key in the tool layer + no eval/provider-key in the agent layer, guardrail layer present, `lesson.draft.rejected` contract present) **plus Phase 61/63/64 contract-existence** and the canonical `reasonCode` field grep — 14 checks total.
- Gate runs `npm run build` BEFORE the Phase 61–65 vitest subset; `process.exit(1)` on any static gap, build failure, or red test.
- Wired `verify:phase65` and the canonical `verify:phase` alias; ran the gate green end-to-end (build OK, 18/18 files, 145/145 tests, exit 0).

## Task Commits

1. **Task 65-05-01: Author verify-phase65 close-gate script** - `5ebe8c3` (feat)
2. **Task 65-05-02: Wire verify:phase65 + verify:phase alias** - `cf6ebe8` (chore)

## Files Created/Modified
- `scripts/verify-phase65-eval-guardrails.ts` - Close-gate verifier: 14 static boundary checks → `npm run build` → Phase 61–65 vitest regression subset, `process.exit(1)` on failure.
- `package.json` - Added `verify:phase65` (server-only shim + tsx) and `verify:phase` (→ `pnpm verify:phase65`).

## Decisions Made
- **Check #7 directive-regex (see Deviations):** assert absence of the real `import "server-only"` directive, not a bare substring.
- **Tool-vs-agent layer scoping:** the no-DB-client and no-direct-`generateObject` bans are tool-layer-only by design — the agent layer legitimately imports `@/db` to dispatch persisted commands and the Phase 61 facade is the sanctioned `ai` importer. Banning these globally would false-RED correct code (the T-65-GATE inverse risk).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Check #7 uses an import-directive regex instead of a bare substring**
- **Found during:** Task 65-05-01 (authoring the static checks)
- **Issue:** Plan task step 7 specified `!guardrailsDtoSource.includes("server-only")`. The DTO `src/lib/dto/draft-guardrails.ts` documents its non-server-only placement in prose (line 4 `**非 server-only**`, lines 8–9), so a bare-substring negation evaluates to `false` and would fail the gate on **correct** code (a false-RED — the exact T-65-GATE inverse the plan warns against).
- **Fix:** Assert the absence of the actual module directive: `!/import\s+["']server-only["']/.test(guardrailsDtoSource)`. The DTO's line 1 is `import { z } from "zod"` with no server-only directive, so the check passes for correct code and would still trip if someone added `import "server-only"`.
- **Files modified:** scripts/verify-phase65-eval-guardrails.ts
- **Verification:** Gate static layer passes (reaches `npm run build`); guardrails.ts (which DOES have the directive) and facade.ts still satisfy their server-only checks.
- **Committed in:** `5ebe8c3` (Task 65-05-01 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — false-RED prevention)
**Impact on plan:** Preserves the plan's intent (DTO must not be a server-only module) with a precise predicate. No scope creep; all other 13 checks implemented exactly as specified.

## Issues Encountered
- The `pilot-host:*` scripts and `ops/deploy/*.sh` files were pre-existing uncommitted working-tree changes (out of scope). Staged only my `package.json` hunk via `git add -p` split so those changes remain untouched in the working tree.

## Verification
- `pnpm verify:phase65` → exit 0: 14 static checks pass, `npm run build` green, Phase 61–65 subset **18 files / 145 tests passed**.
- `node -e "const s=require('./package.json').scripts; ... verify:phase65 && verify:phase==='pnpm verify:phase65' && build"` → exit 0.
- All Task 65-05-01 acceptance greps pass: `process.exit(1)` present; build call (line 242) precedes the `runVitest` invocation; D-10 labels = 6; `draftStepInputSchema`/`aiGenerateObject(`/`reasonCode` present; Phase 61/63/64 contract greps ≥ 5; guardrail trio = 5; eval suite included; Phase 61 regression files = 4.
- `verify:phase` alias is a literal passthrough to `verify:phase65` (proven green); not re-run separately to avoid a second slow build.

## Threat Flags
None — the verifier is local-only (read + build + vitest subset), no network/provider/key. Scope-guard check #14 enforces that no guardrail persistence table is introduced (T-65-GATE-SCOPE).

## Self-Check: PASSED
- FOUND: scripts/verify-phase65-eval-guardrails.ts
- FOUND: package.json (verify:phase65 + verify:phase)
- FOUND commit 5ebe8c3
- FOUND commit cf6ebe8

## Next Phase Readiness
- Phase 65 has one canonical close-gate command (`verify:phase` / `verify:phase65`); the milestone is gate-ready for an EVAL-03 close-out audit.

---
*Phase: 65-eval-guardrails-verify-phase-close-gate*
*Completed: 2026-06-01*
