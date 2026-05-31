# Phase 50 Ownership Map

本文件冻结 `current anchor -> future authoritative owner` 的正式映射，阻止旧 seam 继续被误读为平台 authority。

## Future Authoritative Ownership

src/features/platform-core/commands -> authoritative command execution
src/features/platform-core/actions -> authoritative action registry metadata
src/features/platform-core/plugins -> authoritative lifecycle orchestration
src/features/platform-core/events -> authoritative platform event outbox

以上 future owner 是 `v3.0` 第一阶段平台内核的唯一 authoritative orchestration layer。后续 planner 与 executor 应把新的 command execution、action discoverability metadata、plugin lifecycle orchestration、platform event outbox truth 都收口到这些 owner，而不是继续回填到 ad-hoc seam。

## Current Anchor Reclassification

src/actions/plugin-actions.ts -> future PlatformCommand producer adapter
src/lib/dal/plugins.ts -> plugin domain DAL only
src/server/plugins/registry.ts -> static implementation catalog only
src/features/runtime-platform/seams/event-bus/* -> runtime-only transport seam
src/db/schema.ts -> runtimeEventOutbox = runtime-only durable anchor, not platform event truth

这些 current anchors 仍然是今天仓库里的事实落点，但从本 map 起不再被视为 authoritative owner。它们只能分别承担 producer adapter、DAL-only、catalog-only、runtime-only seam 与 durable anchor 的受限角色，后续 phase 只允许围绕迁移和兼容逐步收口，不能把它们继续扩张成第二套平台 authority。

## Non-Authoritative Legacy Seams

- `src/actions/plugin-actions.ts` 未来可以继续承载 Zod parse、actor resolution、cache invalidation 与 command forwarding，但不能长期保留为 platform mutation authority。
- `src/lib/dal/plugins.ts` 继续持有 SQLite transaction、DTO shaping、plugin domain persistence 与 lifecycle append-only write helper，但不再承担平台级 policy router 或 orchestration owner。
- `src/server/plugins/registry.ts` 继续提供主仓库受控实现目录与 allowlist/catalog 解析，但 dynamic discoverability、lifecycle gating、conflict authority 不归它 authoritative 持有。
- `src/features/runtime-platform/seams/event-bus/*` 与 `runtimeEventOutbox` 继续服务 classroom/runtime delivery；它们是 runtime delivery 账本锚点，不是 future platform event outbox truth，也不能被直接升格为 platform facts 总线。
