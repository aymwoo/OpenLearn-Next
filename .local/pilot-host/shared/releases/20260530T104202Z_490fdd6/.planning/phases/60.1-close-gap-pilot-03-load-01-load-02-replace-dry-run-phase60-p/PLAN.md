---
phase: 60.1-close-gap-pilot-03-load-01-load-02-replace-dry-run-phase60-p
plan: "01"
type: execute
wave: 3
depends_on:
  - 60.1-02
  - 60.1-03
files_modified:
  - scripts/verify-phase60-load-and-rehearsal.ts
  - scripts/verify-phase60-load-and-rehearsal.test.ts
  - scripts/proof-phase60-load-smoke.ts
  - scripts/rehearse-phase60-rollout-rollback.ts
  - scripts/rehearse-phase60-rollout-rollback.test.ts
  - ops/releases/evidence/phase60/smoke-result.json
  - ops/releases/evidence/phase60/capacity-result.json
  - ops/releases/evidence/phase60/drill-results.json
  - ops/releases/evidence/phase60/rehearsal-summary.md
  - ops/releases/evidence/phase60/rollout-notes.md
  - ops/releases/evidence/phase60/rollback-notes.md
  - ops/releases/evidence/phase60/transport-fallback-notes.md
  - .planning/v3.1-MILESTONE-AUDIT.md
autonomous: false
requirements:
  - PILOT-03
  - LOAD-01
  - LOAD-02
user_setup:
  - service: pilot-host
    why: "D-60.1-05 requires a real reachable target and systemd-managed release roots before Phase 60 can be closed."
    env_vars:
      - name: OPENLEARN_SHARED_ROOT
        source: "Pilot host shared release root consumed by ops/deploy/deploy.sh and ops/deploy/rollback.sh"
      - name: OPENLEARN_CURRENT_ROOT
        source: "Pilot host canonical current root/symlink consumed by canonical release scripts"
      - name: OPENLEARN_HEALTHCHECK_BASE_URL
        source: "Pilot host base URL serving /api/health and /api/ready"
      - name: PHASE60_BASE_URL
        source: "Reachable live target for sample smoke plus k6 capacity/drill gates"
must_haves:
  truths:
    - "D-60.1-01: dry-run artifacts remain authoring-only and cannot close PILOT-03 / LOAD-01 / LOAD-02."
    - "D-60.1-02: live closeout still uses the existing machine-readable contract: smoke-result.json, capacity-result.json, drill-results.json, and rehearsal-summary.md."
    - "D-60.1-03: rollout and rollback evidence proves the canonical path stayed on ops/deploy/deploy.sh and ops/deploy/rollback.sh."
    - "D-60.1-04: transport fallback remains a manual rehearsal lane with recorded notes, not an automated pass artifact."
    - "D-60.1-05: if the live pilot target is missing, the phase stays blocked and only blocker notes may be updated."
  artifacts:
    - path: ops/releases/evidence/phase60/smoke-result.json
      provides: "live sample-smoke verdict"
    - path: ops/releases/evidence/phase60/capacity-result.json
      provides: "live 40x5 capacity verdict"
    - path: ops/releases/evidence/phase60/drill-results.json
      provides: "live degraded/backlog/reconnect/partial-failure verdicts"
    - path: ops/releases/evidence/phase60/rollout-notes.md
      provides: "canonical deploy evidence tied to ops/deploy/deploy.sh"
    - path: ops/releases/evidence/phase60/rollback-notes.md
      provides: "canonical rollback evidence tied to ops/deploy/rollback.sh"
    - path: ops/releases/evidence/phase60/transport-fallback-notes.md
      provides: "manual transport fallback evidence"
    - path: ops/releases/evidence/phase60/rehearsal-summary.md
      provides: "single closeout summary derived from live evidence"
    - path: .planning/v3.1-MILESTONE-AUDIT.md
      provides: "updated milestone status driven by the Phase 60 live evidence bundle"
  key_links:
    - from: scripts/verify-phase60-load-and-rehearsal.ts
      to: ops/releases/evidence/phase60/smoke-result.json
      via: assertPhase60LiveResult and stage orchestration
      pattern: assertPhase60LiveResult|runPhase60SmokeStage
    - from: scripts/verify-phase60-load-and-rehearsal.ts
      to: ops/releases/evidence/phase60/capacity-result.json
      via: runPhase60K6Stage capacity gate
      pattern: phase60-capacity.k6.js|assertPhase60LiveResult
    - from: scripts/verify-phase60-load-and-rehearsal.ts
      to: ops/releases/evidence/phase60/drill-results.json
      via: runPhase60K6Stage drills gate
      pattern: phase60-drills.k6.js|assertPhase60LiveResult
    - from: scripts/rehearse-phase60-rollout-rollback.ts
      to: ops/deploy/deploy.sh
      via: buildPhase60DeployCommand canonical rollout path
      pattern: ops/deploy/deploy.sh
    - from: scripts/rehearse-phase60-rollout-rollback.ts
      to: ops/deploy/rollback.sh
      via: rollback command builder canonical rollback path
      pattern: ops/deploy/rollback.sh
    - from: ops/releases/evidence/phase60/smoke-result.json
      to: ops/releases/evidence/phase60/rehearsal-summary.md
      via: machine-readable source list and summary rendering
      pattern: smoke-result.json
    - from: ops/releases/evidence/phase60/capacity-result.json
      to: ops/releases/evidence/phase60/rehearsal-summary.md
      via: capacity section and go/no-go verdict
      pattern: capacity-result.json
    - from: ops/releases/evidence/phase60/drill-results.json
      to: ops/releases/evidence/phase60/rehearsal-summary.md
      via: drills section and stop-rule verdict
      pattern: drill-results.json
    - from: ops/releases/evidence/phase60/rehearsal-summary.md
      to: .planning/v3.1-MILESTONE-AUDIT.md
      via: audit evidence text and requirement status rows
      pattern: PILOT-03|LOAD-01|LOAD-02
---

<objective>
把 Phase 60 的 closeout 主计划改写为可执行的 live-target closeout plan：先收紧 verifier/evidence 语义，再在真实 target 上产出 smoke/capacity/drill/rollout/rollback live evidence，最后用 summary 回写 milestone audit。

Purpose: 用真实证据替换 dry-run artifact，并保持 Phase 60 既有 contract、canonical deploy/rollback path、manual transport fallback lane 不变。
Output: 更新后的 Phase 60 verifier/rehearsal 脚本、live evidence bundle、以及由 summary 驱动的 milestone audit 状态。
</objective>

<execution_context>
@/home/wuxf/Develop/OpenLearn-Next/.opencode/get-shit-done/workflows/execute-plan.md
@/home/wuxf/Develop/OpenLearn-Next/.opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/v3.1-MILESTONE-AUDIT.md
@.planning/phases/60.1-close-gap-pilot-03-load-01-load-02-replace-dry-run-phase60-p/CONTEXT.md
@.planning/phases/60.1-close-gap-pilot-03-load-01-load-02-replace-dry-run-phase60-p/60.1-PATTERNS.md
@.planning/phases/60-load-degrade-pilot-rehearsal/60-02-SUMMARY.md
@.planning/phases/60-load-degrade-pilot-rehearsal/60-03-SUMMARY.md
@.planning/phases/60-load-degrade-pilot-rehearsal/60-04-PLAN.md
@scripts/verify-phase60-load-and-rehearsal.ts
@scripts/proof-phase60-load-smoke.ts
@scripts/rehearse-phase60-rollout-rollback.ts
@scripts/load/phase60-capacity.k6.js
@scripts/load/phase60-drills.k6.js

<interfaces>
From `scripts/verify-phase60-load-and-rehearsal.ts`:

```ts
export function getPhase60StageOrder()
export function assertPhase60LiveResult(label: string, result: Phase60StageResult | null)
```

From `scripts/rehearse-phase60-rollout-rollback.ts`:

```ts
export function buildPhase60DeployCommand(input: { ... }): RehearsalCommand
```

Pattern anchors to preserve from `60.1-PATTERNS.md`:
- `scripts/verify-phase59-deploy-release.ts` style helper-based runner / static gate layout
- `scripts/rehearse-phase60-rollout-rollback.ts` canonical deploy + rollback command builders
- `ops/releases/evidence/phase60/rehearsal-summary.md` source-list + closeout-note rendering pattern
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 收紧 Phase 60 verifier 与 rehearsal writer，锁住 live-only closeout 语义</name>
  <read_first>
    - .planning/phases/60.1-close-gap-pilot-03-load-01-load-02-replace-dry-run-phase60-p/CONTEXT.md
    - .planning/phases/60.1-close-gap-pilot-03-load-01-load-02-replace-dry-run-phase60-p/60.1-PATTERNS.md
    - scripts/verify-phase60-load-and-rehearsal.ts
    - scripts/proof-phase60-load-smoke.ts
    - scripts/rehearse-phase60-rollout-rollback.ts
  </read_first>
  <pre_edit_checks>
    - Run `gitnexus_impact({ target: "runPhase60Verification", direction: "upstream" })` and `gitnexus_context({ name: "runPhase60Verification" })` before editing `scripts/verify-phase60-load-and-rehearsal.ts`.
    - Run `gitnexus_impact({ target: "buildPhase60DeployCommand", direction: "upstream" })` and `gitnexus_context({ name: "buildPhase60DeployCommand" })` before editing `scripts/rehearse-phase60-rollout-rollback.ts`.
  </pre_edit_checks>
  <files>scripts/verify-phase60-load-and-rehearsal.ts, scripts/verify-phase60-load-and-rehearsal.test.ts, scripts/proof-phase60-load-smoke.ts, scripts/rehearse-phase60-rollout-rollback.ts, scripts/rehearse-phase60-rollout-rollback.test.ts</files>
  <behavior>
    - Test 1: verifier continues to enforce the exact Phase 60 stage order and rejects any `dry-run` stage result from closing the phase per D-60.1-01 and the `Evidence contract + dry-run rejection` analog in `60.1-PATTERNS.md`.
    - Test 2: rollout/rollback rehearsal still shells only to `ops/deploy/deploy.sh` and `ops/deploy/rollback.sh` per D-60.1-03 and the `Canonical deploy / rollback path reuse` analog.
    - Test 3: transport fallback remains a manual lane whose notes file is required evidence but never converted into an automated pass bit per D-60.1-04.
  </behavior>
  <acceptance_criteria>
    - `scripts/verify-phase60-load-and-rehearsal.ts` still uses the helper-runner shape from the `scripts/verify-phase59-deploy-release.ts` analog and rejects dry-run evidence for smoke, capacity, drills, and summary.
    - `scripts/rehearse-phase60-rollout-rollback.ts` keeps the canonical command builders and writes `rollout-notes.md`, `rollback-notes.md`, `transport-fallback-notes.md`, and `rehearsal-summary.md` in the exact evidence bundle paths.
    - `scripts/rehearse-phase60-rollout-rollback.test.ts` asserts the canonical script paths `ops/deploy/deploy.sh` and `ops/deploy/rollback.sh` exactly.
    - `scripts/verify-phase60-load-and-rehearsal.test.ts` locks the evidence contract plus the fact that transport fallback remains manual evidence only.
  </acceptance_criteria>
  <action>Before editing, run the GitNexus impact/context checks listed above and use the returned blast radius to keep this change inside the existing Phase 60 close-gate path. Update the Phase 60 close gate in place using the analogs in `60.1-PATTERNS.md`, not a new orchestration shape. In `scripts/verify-phase60-load-and-rehearsal.ts`, keep `getPhase60StageOrder()` and `assertPhase60LiveResult(...)`, but tighten any remaining paths where summary or stage consumers could still treat authoring-mode output as closeout proof per D-60.1-01. In `scripts/proof-phase60-load-smoke.ts`, preserve the existing machine-readable writer shape from the `proof-phase58` analog so smoke still lands in `ops/releases/evidence/phase60/smoke-result.json` per D-60.1-02. In `scripts/rehearse-phase60-rollout-rollback.ts`, explicitly preserve the command builders that shell only to `ops/deploy/deploy.sh` and `ops/deploy/rollback.sh` per D-60.1-03; do not introduce any alternate release wrapper. Keep `transport-fallback-notes.md` on the manual-lane wording from the exact analog and make the summary mention it as recorded manual evidence, not an automated pass, per D-60.1-04.</action>
  <verify>
    <automated>pnpm exec vitest --run scripts/verify-phase60-load-and-rehearsal.test.ts scripts/rehearse-phase60-rollout-rollback.test.ts</automated>
  </verify>
  <done>Phase 60 close scripts now fail closed on dry-run closeout, preserve the canonical deploy/rollback path, and keep transport fallback as a manual evidence lane.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: 在改写 live evidence 与 milestone audit 之前确认真实 pilot target 已就绪</name>
  <what-built>Task 1 已收紧 verifier / rehearsal writer 语义，但尚未运行 live rehearsal，也尚未覆盖 `ops/releases/evidence/phase60/*` 与 `.planning/v3.1-MILESTONE-AUDIT.md`。</what-built>
  <how-to-verify>
    1. 确认真实 pilot target 可达，而不是 repo-local substitute lane；需满足 D-60.1-05 与 `60-04-PLAN.md` 的 systemd-managed target 前提。
    2. 确认 `PHASE60_BASE_URL`、`OPENLEARN_HEALTHCHECK_BASE_URL`、`OPENLEARN_SHARED_ROOT`、`OPENLEARN_CURRENT_ROOT` 都已指向真实 target。
    3. 查看 Task 1 的测试输出，确认接下来允许 live rehearsal 覆盖 Phase 60 evidence bundle 与 milestone audit。
    4. 若 target 仍未就绪，直接回复 blocker 详情；不要继续执行 live-target step。
  </how-to-verify>
  <resume-signal>输入 "approved" 继续执行 live rehearsal + audit closeout，或直接描述 blocker。</resume-signal>
</task>

<task type="auto">
  <name>Task 3: 在真实 pilot target 上执行 live rehearsal，生成证据包并回写 milestone audit</name>
  <read_first>
    - .planning/phases/60.1-close-gap-pilot-03-load-01-load-02-replace-dry-run-phase60-p/CONTEXT.md
    - .planning/phases/60-load-degrade-pilot-rehearsal/60-04-PLAN.md
    - scripts/proof-phase60-load-smoke.ts
    - scripts/load/phase60-capacity.k6.js
    - scripts/load/phase60-drills.k6.js
    - scripts/rehearse-phase60-rollout-rollback.ts
    - ops/releases/evidence/phase60/rehearsal-summary.md
    - .planning/v3.1-MILESTONE-AUDIT.md
  </read_first>
  <files>ops/releases/evidence/phase60/smoke-result.json, ops/releases/evidence/phase60/capacity-result.json, ops/releases/evidence/phase60/drill-results.json, ops/releases/evidence/phase60/rollout-notes.md, ops/releases/evidence/phase60/rollback-notes.md, ops/releases/evidence/phase60/transport-fallback-notes.md, ops/releases/evidence/phase60/rehearsal-summary.md, .planning/v3.1-MILESTONE-AUDIT.md</files>
  <acceptance_criteria>
    - `pnpm verify:phase60` runs against a reachable non-dry-run `PHASE60_BASE_URL`; `smoke-result.json`, `capacity-result.json`, and `drill-results.json` all end with live statuses rather than `dry-run`.
    - `rollout-notes.md` and `rollback-notes.md` record the live rehearsal performed through `ops/deploy/deploy.sh` and `ops/deploy/rollback.sh` exactly per D-60.1-03.
    - `transport-fallback-notes.md` is updated during the live rehearsal and still states that transport fallback is a manual artifact required for closeout rather than an automated pass per D-60.1-04.
    - `rehearsal-summary.md` is regenerated from the live evidence files and includes the machine-readable sources list plus a live closeout note.
    - `.planning/v3.1-MILESTONE-AUDIT.md` updates `PILOT-03`, `LOAD-01`, and `LOAD-02` only from the regenerated live evidence bundle, or explicitly remains blocked when Task 2 did not approve execution per D-60.1-05.
    - If the pilot target or release roots are missing, stop here and leave the phase blocked with no satisfied-status claim per D-60.1-05.
  </acceptance_criteria>
  <action>Only after Task 2 receives an explicit approval, run the real Phase 60 close gate against the configured pilot target. Export `PHASE60_BASE_URL`, `OPENLEARN_HEALTHCHECK_BASE_URL`, `OPENLEARN_SHARED_ROOT`, and `OPENLEARN_CURRENT_ROOT` from the real systemd-managed environment required by `60-04-PLAN.md`; do not use authoring dry-run flags. Execute `pnpm verify:phase60` so the existing orchestration produces live `smoke-result.json`, `capacity-result.json`, and `drill-results.json` per D-60.1-02. During the same rehearsal, keep rollout and rollback on `ops/deploy/deploy.sh` and `ops/deploy/rollback.sh` only per D-60.1-03, and update `transport-fallback-notes.md` as manual rehearsal evidence per D-60.1-04. Then use the regenerated live outputs as the only source of truth for `rehearsal-summary.md` and `.planning/v3.1-MILESTONE-AUDIT.md`: either cite the concrete live evidence bundle for `PILOT-03`, `LOAD-01`, and `LOAD-02`, or leave those rows explicitly blocked because the target was unavailable per D-60.1-05. Do not let audit text imply that dry-run evidence closed anything.</action>
  <verify>
    <automated>PHASE60_BASE_URL="$PHASE60_BASE_URL" OPENLEARN_HEALTHCHECK_BASE_URL="$OPENLEARN_HEALTHCHECK_BASE_URL" OPENLEARN_SHARED_ROOT="$OPENLEARN_SHARED_ROOT" OPENLEARN_CURRENT_ROOT="$OPENLEARN_CURRENT_ROOT" pnpm verify:phase60</automated>
  </verify>
  <done>The Phase 60 evidence bundle and milestone audit now move together from the same live rehearsal truth, or they both remain honestly blocked.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| verifier scripts → live pilot target | CLI automation crosses from repo-local control into the real pilot deployment surface |
| rehearsal runner → canonical deploy scripts | rollout and rollback can alter production-adjacent release state if an alternate path slips in |
| evidence bundle → milestone audit | a stale or dry-run artifact could falsely change requirement status |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-60.1-01-01 | Tampering | `scripts/verify-phase60-load-and-rehearsal.ts` | mitigate | Keep `assertPhase60LiveResult(...)` hard-failing on dry-run or missing stage results before summary/audit updates. |
| T-60.1-01-02 | Elevation of Privilege | `scripts/rehearse-phase60-rollout-rollback.ts` | mitigate | Reuse only `ops/deploy/deploy.sh` and `ops/deploy/rollback.sh` so release authority stays on the canonical path per D-60.1-03. |
| T-60.1-01-03 | Repudiation | `ops/releases/evidence/phase60/transport-fallback-notes.md` | mitigate | Record transport fallback as manual evidence with timestamps/notes rather than silently converting it into an automated pass bit per D-60.1-04. |
| T-60.1-01-04 | Spoofing | `.planning/v3.1-MILESTONE-AUDIT.md` | mitigate | Update audit rows only from the regenerated live evidence bundle and leave blocker text intact when the live target is missing per D-60.1-05. |
</threat_model>

<verification>
- `pnpm exec vitest --run scripts/verify-phase60-load-and-rehearsal.test.ts scripts/rehearse-phase60-rollout-rollback.test.ts`
- `PHASE60_BASE_URL="$PHASE60_BASE_URL" OPENLEARN_HEALTHCHECK_BASE_URL="$OPENLEARN_HEALTHCHECK_BASE_URL" OPENLEARN_SHARED_ROOT="$OPENLEARN_SHARED_ROOT" OPENLEARN_CURRENT_ROOT="$OPENLEARN_CURRENT_ROOT" pnpm verify:phase60`
</verification>

<success_criteria>
- Phase 60 closeout no longer accepts dry-run artifacts as milestone evidence.
- Live smoke/capacity/drills evidence is regenerated on a reachable target using the existing machine-readable contract.
- Rollout and rollback evidence explicitly proves reuse of `ops/deploy/deploy.sh` and `ops/deploy/rollback.sh`.
- `transport-fallback-notes.md` exists as manual rehearsal evidence and is not represented as an automated pass.
- `.planning/v3.1-MILESTONE-AUDIT.md` now truthfully reflects either live closure or remaining live-target blockers for `PILOT-03`, `LOAD-01`, and `LOAD-02`.
</success_criteria>

<output>
After completion, create `.planning/phases/60.1-close-gap-pilot-03-load-01-load-02-replace-dry-run-phase60-p/60.1-01-SUMMARY.md`
</output>
