# Domain Pitfalls — v2.4 Plugin Data Architecture & Default Plugins

**Domain:** Plugin-owned data inside the existing Next.js + Drizzle + SQLite monolith  
**Researched:** 2026-05-20  
**Confidence:** HIGH

| Pitfall | Why it matters here | Prevention | Suggested phase |
|---------|---------------------|------------|-----------------|
| Using plugin display name as stable identity | 当前 built-in 仍有 `pluginName` 耦合；一旦名称变化，表名、索引名、bootstrap、审计都可能漂移 | Add immutable `pluginKey` and `dbNamespace`; never derive DB object names from display name | Phase 44 |
| Prefix governance only for tables, not indexes/constraints | SQLite 全局名字空间会让 index/unique names 冲突；schema review 也会失去可读性 | Define full naming convention for tables, indexes, uniques, other DB objects | Phase 44 |
| Keeping key governance fields inside `manifestJson` | SQL 层无法直接约束/索引/审计插件身份与 namespace | Move critical fields to explicit columns on `pluginRegistration` | Phase 44 |
| Polluting core tables with plugin-specific nullable columns | 会把默认插件变成 core schema 特权通道，后续很难卸载和治理 | Use extension tables for plugin-owned structured core extensions | Phase 45 |
| Extension tables without strong uniqueness | 同一核心实体可能被同一插件重复写入多行脏数据 | Add clear uniqueness such as `(pluginRegistrationId, coreEntityId)` | Phase 45 |
| Underestimating SQLite migration limits | JSON -> structured table、重命名、约束调整在 SQLite 中都容易演变成重建表 | Prefer additive tables first; use safe migration templates with backfill/verify steps | Phase 46 |
| Allowing plugin-managed migrations or DDL | 与当前 security boundary 正面冲突，也会破坏 Drizzle migration truth | Keep all schema changes in repo-governed migrations only | Phase 46 |
| Migrating to new tables without JSON backfill/cutover plan | 会出现一半读 JSON、一半读新表，产品行为不一致 | Define backfill + dual-read window + cutover point for every migration | Phase 46 |
| Checking manifest permissions but not actor capability | 当前 plugin authz 已有这类风险；插件拥有真实数据后会升级成越权写问题 | Dual-validate plugin permission and actor capability in DAL/write paths | Phase 47 |
| Treating school membership as the whole authz model | 插件数据一旦缺少强制 `schoolId` scope，很容易跨校泄露 | Require `schoolId` on plugin tables and enforce it in DAL queries | Phase 47 |
| Letting plugin logic bypass DAL | 会把 authz/cache/audit 分散到 registry/action implementation 里 | Route all plugin data reads/writes through typed DAL modules | Phase 47 |
| Missing plugin-specific cache tags | Next.js 16 explicit caching 下，插件写入后 UI 很容易继续读旧值 | Define plugin/plugin-entity/core-entity invalidation matrix | Phase 47 |
| Invalidating only plugin registry tags, not impacted core entity tags | extension table 改完后 lesson/resource page 仍可能读旧 DTO | Invalidate both plugin tags and affected core entity tags | Phase 47 |
| Split-brain lifecycle side effects | 当前 plugin-theme lifecycle 就已有不对称问题；v2.4 再加 plugin data 会放大 | Model install/enable/disable/uninstall side effects explicitly and transactionally where possible | Phase 48 |
| Treating disable as uninstall | 学校临时停用插件时可能意外丢数据 | Disable stops execution only; uninstall has explicit cleanup/retention policy | Phase 48 |
| Wrong cascade direction on plugin-owned relations | 删除插件安装记录若误删 core truth，会造成严重数据事故 | Only plugin-owned rows should depend on core rows, not the reverse | Phase 48 |
| No registry of what data a plugin owns | 无法安全做 uninstall、审计和迁移归属分析 | Track plugin-owned tables, extension tables, seed artifacts, cleanup policy | Phase 48 |
| Default plugins staying on hard-coded special paths | 会形成“两套插件系统”：built-in 特权路径 + formal plugin path | Force default plugins through the same registration/bootstrap/data governance model | Phase 49 |
| `defaultEnabled` only flips state without bootstrap | 看起来 enabled，但 plugin-owned rows/seed data/theme data 没初始化 | Separate registration from idempotent install/bootstrap | Phase 49 |
| Continuing JSON-overuse for queryable data | milestone 的核心目标会落空，后续仍要回头补结构化 schema | Define a hard cut line: queryable, constrained, scoped fields must be columns, not blobs | Phase 45 |

## Sources

- `.planning/PROJECT.md` — milestone constraints and out-of-scope boundaries. Confidence: HIGH.
- `src/db/schema.ts` — current plugin/theme/core schema posture. Confidence: HIGH.
- `src/lib/dal/plugins.ts` — current plugin lifecycle and authz behavior. Confidence: HIGH.
- `.planning/reviews/theme-plugin-architecture-REVIEWS.md` — prior review findings on plugin authz and plugin-theme lifecycle consistency. Confidence: HIGH.
