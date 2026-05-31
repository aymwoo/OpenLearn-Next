# Phase 27 Research

**Date:** 2026-05-15
**Phase:** 27 - Compatibility baseline and V2 boundary scaffolding
**Status:** Complete

## Research question

如何在不破坏现有 `teacher editor -> launch -> classroom -> student player`
主链的前提下，为 v2.0 先立起 `runtime-platform` 边界、shared contracts
root 与 future infra seams，并提供单一 compatibility gate？

## Recommended implementation posture

### 1. 先建 boundary，再迁 consumer

- 复用 Phase 18 的 feature migration 模式：真实所有权逐步收敛到
  `src/features/runtime-platform/*`，现有 `src/app` route 先改为消费新的 public
  barrels。
- 本阶段不要求一次性把 `src/lib/dal/lesson-authoring.ts`、
  `src/lib/dal/classroom.ts`、`src/lib/dal/learning.ts` 整体迁空；首刀只要求 route
  consumers 改为走新边界，legacy 入口继续可用并被 verifier 守住。

### 2. contracts root 保持纯边界

- 合同根建议放在 `src/features/runtime-platform/contracts/*`，作为
  `packages/contracts/*` 的等价边界。
- 仅放 Zod schema、types、常量、版本号与 contract-level exports。
- 不在 contracts root 内放 DAL、Server Actions、helper、adapter 实现。

### 3. seams 必须是“可替换 contract + 当前默认实现”

- PostgreSQL seam：只声明 database adapter contract，并提供 SQLite/default
  adapter。
- Redis/Event Bus seam：只声明 canonical event publish/subscribe contract，并提供
  current in-process / no-op default adapter。
- WebSocket seam：只声明 transport adapter contract，并提供当前 SSE-compatible
  default transport。
- 本阶段禁止 provider toggle、hidden switch、双写真相源。

### 4. `verify:phase27` 采用组合式 verifier

- 保持当前仓库模式：`scripts/verify-phaseN*.ts` + `package.json` script。
- Phase 27 不重写旧断言矩阵；直接组合：
  - `verify:phase3` authoring
  - `verify:phase4` learning/player
  - `verify:phase5` classroom
  - `verify:phase18` feature-boundary/static-guard style
  - `verify:phase26` route metadata / shared skeleton drift style
- 新增 focused tests + static guards，专门覆盖：
  - route consumers 改走 `@/features/runtime-platform/*`
  - contracts root 纯边界
  - seams centralized + default-only posture
  - runtime/plugin host action guards 继续执行 authz、school scope、DTO shaping

## Codebase patterns to reuse

### Feature boundary precedent

- `src/features/schedule/index.ts`：feature root public barrel
- `src/features/schedule/shared/boundary-map.ts`：明确 public entrypoints、real
  implementation owners、compatibility re-export rules
- `src/lib/dto/schedule.ts` / `src/lib/dal/schedule-runtime.ts` /
  `src/actions/schedule-import-actions.ts`：legacy top-level compatibility re-export

### Compatibility-critical route consumers

- `/teacher/editor` 继续强制 `courseId + lessonId`
- `/teacher/launch` 继续只读 `getClassroomConsoleDTO()` / published snapshot 路径
- `/classroom` 继续以 `sessionId` 在同一路径上承接 live + ended recap
- `/student/player` 继续采用 shell/personal split + Suspense personal loader

### Verification precedent

- `scripts/verify-phase3-authoring.ts`：静态 guard + auth / editor contract
- `scripts/verify-phase4-learning.ts`：player shell/personal split 与 focused checks
- `scripts/verify-phase5-classroom.ts`：SSE / locked-unlocked / conflict refresh
- `scripts/verify-phase18-schedule.ts`：feature migration + static guards + focused tests
- `scripts/verify-phase26-trends-productization.ts`：route metadata + navigation drift

## Do not hand-roll

- 不新建第二套路由注册或 shell resolver；继续走
  `src/lib/theme-layout/route-surface-registry.ts`
- 不新建第二套 navigation contract；继续走 `src/lib/navigation.ts`
- 不新建新的 cache policy source；继续走 `src/lib/cache-policy.ts`
- 不把 runtime/session truth ownership 从现有 SQLite + classroom/session writes
  挪到 Event Bus / transport seam

## Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| 只建目录不迁 consumer | 新边界成为死骨架 | 首批 route pages 必须直接改用 `@/features/runtime-platform/*` |
| contracts root 混入实现 | 后续 bridge/runtime 无法安全复用 | verifier 静态禁止 contracts root 引入 DAL/actions/seam impl |
| seam 变成隐藏 cutover | 现网行为漂移且难排查 | 只允许 default adapter，无 config switch |
| 新 host actions 绕过 teacher scope | SAFE-02 失效 | 统一 guard wrapper：authz + school scope + DTO parse |
| compatibility gate 继续分散 | Phase 27 无单一安全门 | `verify:phase27` 作为 canonical entrypoint |

## Recommended file families

- `src/features/runtime-platform/{authoring,launch,classroom,player,plugins}/index.ts`
- `src/features/runtime-platform/shared/boundary-map.ts`
- `src/features/runtime-platform/contracts/{bridge,events,permissions,descriptors,index}.ts`
- `src/features/runtime-platform/seams/{database,event-bus,transport}/*.ts`
- `src/features/runtime-platform/host-actions/{runtime-host,plugin-host,guards}.ts`
- `scripts/verify-phase27-runtime-platform.ts`

## Source coverage notes

- CONTEXT D-01 ~ D-04 → Phase verifier + compatibility regressions
- CONTEXT D-05 ~ D-09 → runtime-platform root/subdomains/public API skeleton
- CONTEXT D-10 ~ D-13 → pure contracts root
- CONTEXT D-14 ~ D-17 → explicit seams + default adapters + no cutover
- REQUIREMENTS `SAFE-01`, `SAFE-02`, `ARCH-01`, `ARCH-02`, `ARCH-03` all map cleanly
  to the four roadmap plan slots; no phase split needed.
