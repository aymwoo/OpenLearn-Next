---
phase: 59
slug: deploy-release-recovery-baseline
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-26
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + repo-local phase verifiers |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm db:migrate && pnpm verify:phase57 && pnpm verify:phase58 && pnpm verify:phase59 && bash ops/deploy/verify-restore.sh` |
| **Estimated runtime** | ~300 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run`
- **After every plan wave:** Run `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm verify:phase59`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 59-01-01 | 01 | 1 | ENVR-01 | T-59-01 | env schema rejects missing/invalid required server env and keeps BullMQ blocking posture separate from optional fanout posture | unit/static | `pnpm test --run src/lib/ops/env.server.test.ts` | ❌ W0 | ⬜ pending |
| 59-01-02 | 01 | 1 | ENVR-01 | T-59-02 | `.env.example` stays aligned with the centralized env parser and phase verifier contract | unit/static | `pnpm test --run src/lib/ops/env.server.test.ts scripts/verify-phase59-deploy-release.test.ts` | ❌ W0 | ⬜ pending |
| 59-02-01 | 02 | 2 | OPS-01, ENVR-03 | T-59-03 | shared status helper reads only canonical `current.json` / `green.json` pointers and exposes operatorCorrelation across school/classroom/lesson version/plugin/action/command/task | unit | `pnpm test --run src/lib/ops/release-status.test.ts` | ❌ W0 | ⬜ pending |
| 59-02-02 | 02 | 2 | OPS-01 | T-59-03 | `/api/health`, `/api/ready`, and `/api/release` expose honest component posture, current/green release state, and no-store operator linkage without leaking secrets | integration | `pnpm test --run src/app/api/ops-routes.test.ts` | ❌ W0 | ⬜ pending |
| 59-02-03 | 02 | 2 | OPS-01, ENVR-03 | T-59-04 | route contracts prove `/api/release` does not scan manifests directory and always returns canonical pointer data | integration/static | `pnpm test --run src/lib/ops/release-status.test.ts src/app/api/ops-routes.test.ts` | ❌ W0 | ⬜ pending |
| 59-03-01 | 03 | 3 | ENVR-02 | T-59-05 | repo-local verifier locks artifact list, focused suites, and release pointer expectations | static | `pnpm test --run scripts/verify-phase59-deploy-release.test.ts` | ❌ W0 | ⬜ pending |
| 59-03-02 | 03 | 3 | ENVR-02 | T-59-06 | GitHub Actions hard gate fails on lint/typecheck/test/build/migrate/health/ready/release regressions before release completes | workflow/static | `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm db:migrate && pnpm verify:phase57 && pnpm verify:phase58 && pnpm verify:phase59` | ❌ W0 | ⬜ pending |
| 59-04-01 | 04 | 3 | ENVR-03, OPS-01 | T-59-07 | deploy/rollback scripts write immutable manifests plus canonical current/green pointers and attach operator correlation ids/hrefs | script/verifier | `bash ops/deploy/deploy.sh --dry-run --environment pilot-single-school --actor phase59-test --shared-root "/tmp/openlearn-phase59/shared" --current-root "/tmp/openlearn-phase59/current" --base-url "http://127.0.0.1:3300" --school-id school-1 --classroom-session-id session-1 --lesson-version-id lesson-v1 --plugin-id plugin-1 --action-key addStepSuggestion --command-id command-1 --task-id task-1` | ❌ W0 | ⬜ pending |
| 59-04-02 | 04 | 3 | ENVR-03, OPS-01 | T-59-08 | rollback and checklists rewind canonical pointers and preserve rollback/operator traceability | script/static | `bash ops/deploy/rollback.sh --dry-run --release-id previous-green --reason ready_failed --shared-root "/tmp/openlearn-phase59/shared" --current-root "/tmp/openlearn-phase59/current" --base-url "http://127.0.0.1:3300" && pnpm verify:phase59` | ❌ W0 | ⬜ pending |
| 59-05-01 | 05 | 4 | SAFE-03 | T-59-09 | backup/restore scripts use SQLite-consistent snapshots and manifest-driven truth-first restore | script/static | `bash -n ops/deploy/backup.sh && bash -n ops/deploy/restore.sh && grep -q 'VACUUM INTO' ops/deploy/backup.sh && grep -q 'backup-manifest.json' ops/deploy/restore.sh` | ❌ W0 | ⬜ pending |
| 59-05-02 | 05 | 4 | SAFE-03 | T-59-10 | post-restore verifier fails closed on integrity, ready, or sample smoke regressions and emits `RESTORE_BLOCKER` | script/static | `bash -n ops/deploy/verify-restore.sh && grep -q 'RESTORE_BLOCKER' ops/deploy/verify-restore.sh && grep -q 'Sample-chain smoke' .planning/phases/59-deploy-release-recovery-baseline/59-RESTORE-DRILL.md` | ❌ W0 | ⬜ pending |
| 59-05-03 | 05 | 4 | SAFE-03, ENVR-03 | T-59-10 | one real restore drill is executed end-to-end and its outcome is recorded as a release blocker decision artifact | script/integration | `DRILL_ROOT="$(mktemp -d)" && bash ops/deploy/backup.sh --backup-dir "$DRILL_ROOT/backup" --db-path "${DB_FILE_NAME:-file:local.db}" --runtime-assets-root "${OPENLEARN_RUNTIME_ASSETS_ROOT:-./runtime-assets}" && bash ops/deploy/restore.sh --backup-dir "$DRILL_ROOT/backup" --restore-root "$DRILL_ROOT/restore" --db-path "$DRILL_ROOT/restore/local.db" --runtime-assets-root "$DRILL_ROOT/restore/runtime-assets" && bash ops/deploy/verify-restore.sh --db-path "$DRILL_ROOT/restore/local.db" --base-url "${OPENLEARN_HEALTHCHECK_BASE_URL:-http://127.0.0.1:3000}" && pnpm verify:phase59` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-phase59-deploy-release.ts` — static/repo-local verifier for env, release pointer, health/ready, systemd, deploy/rollback, backup/restore artifacts
- [ ] `scripts/verify-phase59-deploy-release.test.ts` — locks manifest pointer, API probe payloads, shell/systemd artifact expectations
- [ ] `src/app/api/health/route.ts` plus tests — liveness surface
- [ ] `src/app/api/ready/route.ts` plus tests — readiness surface
- [ ] `src/app/api/release/route.ts` plus tests — canonical release pointer surface
- [ ] `ops/deploy/verify-restore.sh` — restore verification command for SAFE-03
- [ ] `.github/workflows/pilot-release.yml` — CI hard gate definition with `verify:phase59`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Single-node pilot deploy walkthrough | ENVR-02, ENVR-03, OPS-01 | systemd/service wiring and operator handoff need one real host rehearsal | Run the documented deploy script on a pilot-like host, restart `openlearn-web` and `openlearn-worker`, then capture immutable manifest, `current.json` / `green.json`, and the filled school/classroom/lesson version/plugin/action/command/task correlation fields |
| Restore drill operator notes | SAFE-03 | restore timing, operator notes, and asset recovery observations need rehearsal evidence beyond script exit codes | Execute `backup.sh` -> `restore.sh` -> `verify-restore.sh`, then overwrite `59-RESTORE-DRILL.md` with real timing, source snapshot, restored target, command output summary, and `Release blocker: yes|no` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 300s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
