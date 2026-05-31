---
phase: 44-plugin-identity-and-namespace-contract
plan: 02
subsystem: plugin-dal-action
tags: [plugin, dal, server-actions, namespace, gitnexus]
requires:
  - phase: 44-plugin-identity-and-namespace-contract
    provides: Phase 44 SQL identity and namespace truth
provides:
  - install/reconcile single truth seam for plugin identity and namespace
  - explicit school-scoped conflict and namespace freeze tokens
  - action-layer passthrough of canonical identity fields
affects: [plugin-registry, plugin-actions, default-plugin-bootstrap, phase-44-03]
tech-stack:
  added: []
  patterns: [DAL-owned truth seam, thin server actions, explicit conflict tokens]
key-files:
  created:
    - .planning/phases/44-plugin-identity-and-namespace-contract/44-02-SUMMARY.md
  modified:
    - src/lib/dal/plugins.ts
    - src/lib/dal/plugins.test.ts
    - src/actions/plugin-actions.test.ts
key-decisions:
  - "install/reconcile 真相入口统一为 installOrReconcilePlugin()，registerPluginManifest() 只保留 teacher-scoped 包装。"
  - "manual 安装遇到同校 pluginKey / dbNamespace 冲突时直接失败；bootstrap/repair/seed 则按同 key 进入 reconcile。"
  - "reconcile 保留 operator 当前的 enabled / killSwitchEnabled / lifecycleState，不因 defaultEnabled 快照偷偷改写学校姿态。"
patterns-established:
  - "Plugin install seam: manifest.id -> pluginKey -> deriveDbNamespace -> SQL truth"
  - "Action boundary: safeParse -> requireCurrentActorId -> DAL -> updateTag"
requirements-completed: [PLUG-01, PLUG-02, PLUG-03, PLUG-04]
completed: 2026-05-20
---

# Phase 44 Plan 02: install/reconcile seam summary

**把插件正式身份与 namespace 写入收口到单一 DAL seam，并保持
Server Action 继续只负责认证、校验和 cache invalidation。**

## Accomplishments

- 在 `src/lib/dal/plugins.ts` 新增 `installOrReconcilePlugin()`，统一承接
  install/reconcile 身份写入。
- 导出并锁定 `deriveDbNamespace()` 与三类明确错误 token：
  `PLUGIN_KEY_CONFLICT`、`PLUGIN_DB_NAMESPACE_CONFLICT`、
  `PLUGIN_DB_NAMESPACE_FROZEN`。
- 让 `registerPluginManifest()` 退化为 teacher-scoped wrapper，避免继续
  维护第二套直接 insert 逻辑。
- 扩展 `src/lib/dal/plugins.test.ts`，补齐 namespace parity corpus、首次
  安装、同校冲突、namespace freeze、reconcile 保姿态等运行时覆盖。
- 扩展 `src/actions/plugin-actions.test.ts`，确保 action 继续透传
  `pluginKey`、`dbNamespace`、`sourceType`、`installSource`，并把冲突
  token 原样返回。

## GitNexus impact preflight

| Target | Risk | Direct callers | Processes | Notes |
|------|------|------:|------:|------|
| `registerPluginManifest` | LOW | 1 | 0 | 仅被 `registerPluginManifestAction` 直接调用 |
| `registerPluginManifestAction` | LOW | 0 | 0 | action 边界改动集中在插件注册路径 |
| `installOrReconcilePlugin` | UNKNOWN | 0 | 0 | 新增符号，索引尚未覆盖 |

**Decision:** 没有 `HIGH` / `CRITICAL` 风险，按计划继续执行。

## Acceptance criteria verification

- **PASS** `src/lib/dal/plugins.ts` 已导出
  `installOrReconcilePlugin()`。
- **PASS** `src/lib/dal/plugins.ts` 已导出
  `deriveDbNamespace()` 与三个明确冲突 token。
- **PASS** `registerPluginManifest()` 已改为委托统一 seam。
- **PASS** `src/actions/plugin-actions.ts` 未直接导入 `db`，也未在 action
  内生成 `dbNamespace`。
- **PASS** `src/actions/plugin-actions.test.ts` mock DTO 已包含
  `pluginKey`、`dbNamespace`、`sourceType`、`installSource`。
- **PASS** 44-02 已用运行时测试直接验证 namespace corpus parity、install
  / conflict / reconcile 行为，而不是只做静态字符串检查。

## Verification

- `./node_modules/.bin/vitest --run src/lib/dal/plugins.test.ts`
- `./node_modules/.bin/vitest --run src/lib/dal/plugins.test.ts src/actions/plugin-actions.test.ts src/lib/dal/plugins.builtins.test.ts`
- `npm run build`
- `npm test`
- `node --input-type=module --import tsx -e "import { readFileSync } from 'node:fs'; const sql = readFileSync('drizzle/0011_phase44_plugin_identity_namespace.sql', 'utf8'); const requiredTokens = ['pluginKey', 'dbNamespace']; const hasSqlContract = requiredTokens.every((token) => sql.includes(token)); if (!hasSqlContract) process.exit(1); process.exit(0);"`

## GitNexus detect_changes

`gitnexus_detect_changes(scope="all")` 返回：

- `risk_level: high`
- `changed_files: 10`
- `affected_processes: 8`

其中高风险主要来自当前工作树同时包含前面为 Wave 1 test gate 修复过的多组
测试文件，GitNexus 把这些一起计入了本次改动面。就 44-02 本身来看，直接影响
仍集中在 `plugins.ts` / `plugin-actions` 的注册边界，没有出现新的高风险运行时
依赖链。

## Notes

- `installOrReconcilePlugin` 当前策略是：`manual` 继续拒绝重复安装，
  `bootstrap` / `repair` / `seed` 可按同 `pluginKey` 自动进入 reconcile，
  为 44-03 默认插件 seed/reconcile 收口准备好统一 seam。
- reconcile 会保留已存在记录的 `installSource`、`enabled`、
  `killSwitchEnabled`、`lifecycleState`，避免默认插件在 repair/seed 流程里把
  operator 的当前姿态偷偷改回默认值。

## Next phase readiness

- 44-03 现在可以直接复用 `installOrReconcilePlugin()` 收口 bootstrap 与
  built-in default plugin seed，不需要再发明第二套 upsert identity 规则。
