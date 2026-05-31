# Phase 60.1: Close gap PILOT-03 / LOAD-01 / LOAD-02 - Context

**Gathered:** 2026-05-28
**Status:** Ready for execution, blocked on live target setup

<domain>
## Phase Boundary

本次 closure phase 只处理 milestone audit 中剩余的 Phase 60 close blocker：
- `PILOT-03`：40/5 容量 proof 不能再停留在 dry-run artifact；
- `LOAD-01`：`phase60-capacity.k6.js` 必须在真实可达服务上产出 live result；
- `LOAD-02`：degraded / worker backlog / reconnect / partial failure drills 必须有 live rehearsal evidence；
- rollout/rollback rehearsal 必须在真实 target 上留下可审计证据，而不是仅通过 dry-run verifier。

本阶段不重做 `phase60` 设计，不回滚 `60.2` 的 frozen contract 修复，不扩展 operator surface 新需求，也不把 manual transport fallback 伪装成自动化通过项。
</domain>

<decisions>
## Locked Decisions

- **D-60.1-01:** dry-run artifacts 只能作为 authoring/wiring proof，不能再被当成 milestone close evidence。
- **D-60.1-02:** live evidence 仍沿用 Phase 60 既有 machine-readable contract：`smoke-result.json`、`capacity-result.json`、`drill-results.json`、`rehearsal-summary.md`。
- **D-60.1-03:** rollout/rollback rehearsal 必须复用 `ops/deploy/deploy.sh` / `ops/deploy/rollback.sh` 的 canonical release path，不新增第二套 release 语义。
- **D-60.1-04:** `transport fallback` 继续保留 manual rehearsal lane；closeout 只能要求留证，不能伪造自动化通过。
- **D-60.1-05:** 如果没有真实 target 环境与可达服务，就只能补 planning 和 blocker 说明，不能把 phase 标记为完成。
</decisions>

<canonical_refs>
## Canonical References

- `.planning/v3.1-MILESTONE-AUDIT.md` — 当前 unsatisfied requirements 与 blocker 权威来源。
- `.planning/phases/60-load-degrade-pilot-rehearsal/60-02-SUMMARY.md` — 说明 smoke/capacity 仍是 dry-run。
- `.planning/phases/60-load-degrade-pilot-rehearsal/60-03-SUMMARY.md` — 说明 drills 仍是 dry-run。
- `.planning/phases/60-load-degrade-pilot-rehearsal/60-04-PLAN.md` — 明确 live rollout/rollback rehearsal 需要 `pilot-host` 与 systemd target。
- `scripts/verify-phase60-load-and-rehearsal.ts` — 当前 close gate orchestration。
- `scripts/proof-phase60-load-smoke.ts` — sample smoke proof runner。
- `scripts/load/phase60-capacity.k6.js` — 40/5 capacity gate。
- `scripts/load/phase60-drills.k6.js` — degraded/backlog/reconnect/partial-failure drills。
- `scripts/rehearse-phase60-rollout-rollback.ts` — rollout/rollback rehearsal runner。
- `ops/deploy/deploy.sh` / `ops/deploy/rollback.sh` — canonical release path。
</canonical_refs>

<code_context>
## Existing Code Insights

- `verify:phase60` 默认执行 real path，但只要显式设置 `PHASE60_REHEARSAL_MODE=dry-run` / `PHASE60_K6_MODE=dry-run`，仍然会产出可通过静态检查的 dry-run evidence 文件。
- `proof-phase60-load-smoke.ts` 在非 dry-run 时会先执行 `pnpm verify:phase56`，再复用 `runPhase57BrowserProof()` 生成 sample smoke 结果。
- `phase60-capacity.k6.js` 与 `phase60-drills.k6.js` 都依赖 `PHASE60_BASE_URL` 指向真实可达服务；当前本机有 `docker`，没有宿主 `k6`，所以 k6 只能走 docker fallback 或额外安装。
- `rehearse-phase60-rollout-rollback.ts` 在非 dry-run 时会直接 shell 到 `ops/deploy/deploy.sh` / `ops/deploy/rollback.sh`，而 `60-04-PLAN.md` 已明确要求 systemd-managed target 与 Phase 59 deploy artifacts。
- 仓库里存在 `.env.local` 和 `local.db`，说明 repo-local smoke 可能可起本地服务，但这不足以自动满足 `pilot-host` / systemd rollout rehearsal 的 close gate。
</code_context>

<blocking_reality>
## Blocking Reality

当前可以在仓库内继续推进的只有两类工作：
1. 收紧 verifier / evidence 语义，避免 dry-run 被误读成 closeout proof；
2. 在拿到真实 target 环境后执行 live smoke / capacity / drills / rollout-rollback rehearsal。

当前不能在仓库内单方面完成的工作：
- systemd-managed pilot target 上的真实 rollout/rollback rehearsal；
- 以真实 target base URL 和 release roots 为基础的 final evidence bundle；
- 由 live results 支撑的 milestone close。
</blocking_reality>
