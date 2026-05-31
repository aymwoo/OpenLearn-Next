---
phase: 44-plugin-identity-and-namespace-contract
plan: 04
subsystem: operator-surface-and-verifier
tags: [plugin, settings, marketplace, verifier, gitnexus]
requires:
  - phase: 44-plugin-identity-and-namespace-contract
    provides: canonical plugin identity, namespace truth, bootstrap reconcile path, and built-in key lookup
provides:
  - operator-facing settings and marketplace surfaces render formal plugin identity metadata
  - phase 44 close gate covers schema, DAL, bootstrap, registry, operator UI, and lifecycle operator regression
  - phase 44 closeout no longer depends on manifestJson.id as the maintainer-facing identity badge
affects: [settings-labs, plugin-marketplace, plugin-lifecycle-operator, phase-44-close-gate]
tech-stack:
  added: []
  patterns: [tonal no-line metadata expansion, operator surface reuse, focused phase verifier]
key-files:
  created:
    - .planning/phases/44-plugin-identity-and-namespace-contract/44-04-SUMMARY.md
  modified:
    - src/features/platform-core/actions/registry.ts
    - src/components/surfaces/settings-surface.tsx
    - src/components/surfaces/settings-surface.test.tsx
    - src/components/surfaces/plugin-marketplace-surface.tsx
    - src/components/surfaces/plugin-marketplace-surface.test.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.tsx
    - src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx
    - scripts/verify-phase44-plugin-identity.ts
key-decisions:
  - "不为满足 verifier 裸入口去重构 HIGH-risk 的 deriveDbNamespace 主链；Phase 44 维持当前 server-only shim close gate。"
  - "settings/labs 通过现有 PluginLifecycleOperatorSurface 暴露正式 metadata，而不是再开一条新的插件读取面。"
  - "marketplace 继续保留 built-in product copy，只替换 secondary metadata 的 truth 来源。"
patterns-established:
  - "Operator-facing plugin identity: render pluginKey/dbNamespace/sourceType/installSource directly from DTO/read model"
  - "Phase close gate: one verifier script plus targeted UI regression suites, with explicit environment shim when server-only imports are involved"
requirements-completed: [PLUG-01, PLUG-02, PLUG-03, PLUG-04]
completed: 2026-05-24
---

# Phase 44 Plan 04: operator metadata and verifier closeout summary

**把正式 `pluginKey` / `dbNamespace` / provenance metadata 暴露到维护者 surface，
并把 Phase 44 close gate 收口到一个可重复执行的 verifier。**

## Accomplishments

- `settings/labs` 现已通过既有 `PluginLifecycleOperatorSurface` 直接展示正式
  `pluginKey`、`dbNamespace`、`sourceType`、`installSource`，不再把
  `manifestJson.id` 当作维护者视角下的身份 badge。
- built-in marketplace 现在继续保留“默认开启、可停用、不可删除”的产品语义，
  但 secondary metadata 已切到正式字段 `pluginKey`、`dbNamespace`、
  `sourceType`。
- `scripts/verify-phase44-plugin-identity.ts` 已成为当前仓库里的 canonical
  Phase 44 close gate：真实检查 SQLite schema/index、静态 contract token、
  namespace parity，以及 focused UI/DAL/bootstrap suites。
- 顺手补齐了 operator surface 的两个真实回归点：
  - uninstall cleanup confirmation dialog 改为消费最新 preflight token，避免旧 token
    残留。
  - 已处于 `enabled` 状态的诊断行现在展示“停用插件”，不再误导成“启用插件”。

## GitNexus impact preflight

| Target | Risk | Direct callers | Processes | Notes |
|------|------|------:|------:|------|
| `SettingsSurface` | LOW | 2 | 0 | 仅直接被 `SettingsPage` 和 `SettingsLabsPage` 消费 |
| `PluginMarketplaceSurface` | LOW | 1 | 0 | 仅直接被 `SettingsPluginsPage` 消费 |
| `runVerification` | LOW | 1 | 0 | 影响集中在 `scripts/verify-phase44-plugin-identity.ts` 文件入口 |

**Decision:** 计划要求的主符号 preflight 全部为 `LOW`，因此继续执行。

## Acceptance criteria verification

- **PASS** `settings-surface.tsx` 与 `plugin-marketplace-surface.tsx` 已停止把
  `manifestJson.id` 作为正式身份 badge。
- **PASS** `settings-surface.test.tsx` 现在锁定 `pluginKey`、`dbNamespace`、
  `sourceType`、`installSource` 四项正式字段可见。
- **PASS** `plugin-marketplace-surface.test.tsx` 锁定 built-in marketplace 卡片
  真实展示 `pluginKey`、`dbNamespace`、`sourceType`，同时保留默认插件产品文案。
- **PASS** `plugin-lifecycle-operator-surface.test.tsx` 新增覆盖已修正的 operator
  recovery / lifecycle action 文案行为。
- **PASS** `scripts/verify-phase44-plugin-identity.ts` 已覆盖 schema、DAL、
  bootstrap、registry、settings surface、marketplace surface 和 operator surface
  regression。
- **PASS** Phase 44 close gate 当前可稳定跑通，并输出完整 green 结果。

## Verification

- `node "node_modules/vitest/vitest.mjs" --run src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx src/components/surfaces/settings-surface.test.tsx src/components/surfaces/plugin-marketplace-surface.test.tsx`
- `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase44-plugin-identity.ts`

## GitNexus detect_changes

`gitnexus_detect_changes(scope="unstaged")` 返回：

- `risk_level: high`
- `changed_files: 11`
- `affected_processes: 11`

这次 high risk 不是因为本计划改坏了主链，而是因为当前工作树同时包含：

- 本计划真正触达的 `settings` / `marketplace` / `plugin-lifecycle-operator`
  surfaces 与 `verify-phase44`。
- 与本任务无关但同样脏着的 `AGENTS.md`、`CLAUDE.md`。

就本计划自身而言，preflight 目标仍保持 `LOW`，且没有再去触碰
`deriveDbNamespace()` 这类 GitNexus 已明确标为 `HIGH` blast radius 的主链符号。

## Deviations from plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] Worktree executor 无法在当前会话自恢复，改为顺序内联执行**
- **Found during:** execute-phase wave closeout
- **Issue:** worktree runner 落在 `main`，触发 `FATAL: worktree HEAD on 'main' (expected worktree-agent-*)`，无法继续标准 worktree 自恢复路径。
- **Fix:** 改为顺序内联执行、直接读取 plan/context/patterns 并完成实现与验证。
- **Files modified:** None
- **Verification:** 后续 targeted Vitest 与 Phase 44 verifier 均已通过。

**2. [Rule 3 - Blocking] Bare `node --import tsx` verifier 入口在当前仓库会被 `server-only` 拦截**
- **Found during:** verifier close gate validation
- **Issue:** `scripts/verify-phase44-plugin-identity.ts` 需要导入来自 `src/lib/dal/plugins.ts` 的 `deriveDbNamespace()`；该模块顶部带有 `server-only`，导致裸 `node --import tsx ...` 在当前环境直接失败。
- **Fix:** 保持现有 `verify:phase44` 走 `server-only-node-shim.cjs` 的正式入口，不为满足字面命令去重构 `deriveDbNamespace()` 这条 GitNexus `HIGH` 风险主链。
- **Files modified:** None
- **Verification:** `node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase44-plugin-identity.ts` 已完整通过。

**3. [Rule 3 - Blocking] `pnpm exec vitest` 在当前环境会被 install/build 问题打断**
- **Found during:** targeted UI regression runs
- **Issue:** 当前环境下 `pnpm exec vitest` 会落入依赖安装/构建问题，不适合作为本次 close gate 的最稳定入口。
- **Fix:** 直接调用本地 `node_modules/vitest/vitest.mjs` 运行 focused suites。
- **Files modified:** None
- **Verification:** 3 个 surface test files 共 17 个 tests 全绿。

---

**Total deviations:** 3 auto-fixed (3 blocking)

## Issues encountered

- `PluginLifecycleOperatorSurface` 在 closeout review 中暴露出两个真实问题：旧
  preflight token 残留，以及 enabled 行的 CTA 文案错误；均已补测试并修复。
- `gitnexus_detect_changes()` 继续把 unrelated dirty files 一起算进风险摘要，
  因此收尾时需要人为限定提交范围。

## Next phase readiness

- Phase 44 的四个 plans 现在已经全部补齐，后续历史 phase 若继续引用插件身份语义，
  可以直接依赖本阶段固定下来的 SQL truth、reconcile seam、built-in key lookup
  和 operator-facing metadata surface。
- 若未来要消除 verifier 对 `server-only` shim 的依赖，应以单独计划处理
  `deriveDbNamespace()` 抽取，而不是在历史 closeout 中顺手改写高风险 install
  / command handler 主链。

## Self-check: PASSED

- FOUND: `.planning/phases/44-plugin-identity-and-namespace-contract/44-04-SUMMARY.md`
- FOUND: `src/components/surfaces/settings-surface.tsx`
- FOUND: `src/components/surfaces/settings-surface.test.tsx`
- FOUND: `src/components/surfaces/plugin-marketplace-surface.tsx`
- FOUND: `src/components/surfaces/plugin-marketplace-surface.test.tsx`
- FOUND: `src/components/surfaces/plugin-lifecycle-operator-surface.tsx`
- FOUND: `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`
- FOUND: `scripts/verify-phase44-plugin-identity.ts`

---
*Phase: 44-plugin-identity-and-namespace-contract*
*Completed: 2026-05-24*
