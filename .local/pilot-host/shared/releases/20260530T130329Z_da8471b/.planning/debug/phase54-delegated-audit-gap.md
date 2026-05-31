---
status: resolved
trigger: "Milestone v3.0 audit reports AINT-03 and AINT-04 unsatisfied because delegated/approval audit metadata is accepted by contracts but dropped before durable command/event truth and operator read models."
created: 2026-05-23T13:35:00Z
updated: 2026-05-23T22:25:00Z
---

## Current Focus

hypothesis: 已验证，根因是 durable truth 与 operator projection 链路未持久化/暴露 summary-only audit metadata。
test: `verify:phase54` focused verifier + plugin governance / event ledger / persisted bus / operator read-model 回归测试。
expecting: AINT-03 / AINT-04 从 gaps_found 收敛到可重验证通过。
next_action: rerun milestone audit after Phase 54 verification artifact is refreshed

## Symptoms

expected: delegated actor and approval metadata should survive into durable command/event truth and operator-facing surfaces.
actual: audit metadata is schema-only; milestone audit says it is dropped before persistence and read models.
errors: milestone audit `v3.0-MILESTONE-AUDIT.md` marks AINT-03 and AINT-04 unsatisfied; `54-VERIFICATION.md` reports gaps_found.
reproduction: inspect Phase 54 delegated metadata flow from producer ingress to command ledger, event ledger, and `/settings/labs` observability surfaces.
started: discovered during milestone close audit on 2026-05-23.

## Eliminated

## Evidence

- timestamp: 2026-05-23T22:05:00Z
  checked: src/features/platform-core/commands/producers/plugin-governance.ts + src/features/platform-core/events/ledger.ts + src/features/platform-core/events/bus.ts + src/features/platform-core/observability/dto.ts
  found: command producer、event ledger、persisted event replay、operator DTO 四层都未保存或暴露 `audit` summary。
  implication: AINT-03/AINT-04 失败不是 contract 设计错误，而是 runtime truth 丢失。

- timestamp: 2026-05-23T22:18:00Z
  checked: src/db/schema.ts + drizzle/0013_phase54_audit_summary_truth.sql
  found: 已为 `platformCommand` / `platformEvent` 新增 `auditSummaryJson` 持久化列，并补 migration。
  implication: delegated / approval metadata 已有 durable truth 容器。

- timestamp: 2026-05-23T22:20:00Z
  checked: src/features/platform-core/commands/producers/plugin-governance.ts + src/features/platform-core/events/ledger.ts + src/features/platform-core/events/bus.ts
  found: producer 会把 `command.audit` 写入 command row；event ledger 会写入 `event.audit`；persisted replay 会恢复 `audit` 给 subscriber。
  implication: runtime truth 与 replay 链路已闭合。

- timestamp: 2026-05-23T22:22:00Z
  checked: src/features/platform-core/observability/dto.ts + src/components/surfaces/settings-surface.tsx
  found: operator summary / timeline DTO 已新增 `auditSummaryLabel`，`/settings/labs` 能展示 delegation / approval posture。
  implication: operator-visible surface 不再丢失 delegated summary-only posture。

- timestamp: 2026-05-23T22:24:00Z
  checked: scripts/verify-phase54-ai-contracts.ts + focused tests
  found: `verify:phase54` 已扩展为检查 durable truth + operator exposure，并在提高 test timeout 后通过；新增 4 组链路测试也通过。
  implication: Phase 54 gap 已具备重验证条件。

## Resolution

root_cause:
Phase 54 已在 contract/schema 层接受 delegated/approval metadata，但 command producer、platform event ledger、persisted event replay、operator read-model 四层都没有保存或暴露 summary-only audit metadata，导致 AINT-03/AINT-04 只停留在内存对象里，无法形成 durable truth。
fix:
为 `platformCommand` / `platformEvent` 新增 `auditSummaryJson`，将 `command.audit` 与 `event.audit` 写入持久化记录；persisted event replay 恢复 `audit`；operator DTO 与 `/settings/labs` 显示 delegation / approval summary；`verify:phase54` 和相关回归测试同步扩展。
verification:
`node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase54-ai-contracts.ts` 通过；`node ./node_modules/vitest/vitest.mjs run src/features/platform-core/commands/producers/plugin-governance.test.ts src/features/platform-core/events/ledger.test.ts src/features/platform-core/events/bus.test.ts src/features/platform-core/observability/operator-read-model.test.ts` 通过。
files_changed:
  - src/db/schema.ts
  - drizzle/0013_phase54_audit_summary_truth.sql
  - src/features/platform-core/commands/producers/plugin-governance.ts
  - src/features/platform-core/events/ledger.ts
  - src/features/platform-core/events/bus.ts
  - src/features/platform-core/observability/dto.ts
  - src/components/surfaces/settings-surface.tsx
  - scripts/verify-phase54-ai-contracts.ts
