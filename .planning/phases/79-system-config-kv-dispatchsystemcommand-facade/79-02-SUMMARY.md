---
phase: 79-system-config-kv-dispatchsystemcommand-facade
plan: 02
type: execute
subsystem: platform
tags: [system.config, KV, handler, facade, registry, dispatchSystemCommand]

# Dependency graph
requires:
  - phase: 79
    plan: 01
    provides: dispatchSystemCommand facade 三段式骨架 + governance-gate verb 泛化 + audit commandType 参数化
provides:
  - system.config.set handler: authorize（manifest re-parse + allowedKeys 前缀通配）+ execute（pluginOwnedBusinessData 原子 upsert）
  - system.config.get handler: authorize（同上）+ execute（纯 DAL 读，不写 audit，不过 Command Bus）
  - dispatchSystemCommand facade: system.config.set → Command Bus / system.config.get → DAL 判别派发
  - registry.ts: system.config.set stub 替换为 systemConfigHandler 真实实现
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "handler authorize 签名：({ command: PlatformCommand }) => Promise<void>（system.config.set 返回 void 而非 MatchedEntry）"
    - "system.config.get 独立导出 authorize/execute 供 facade 直接调用（不过 Command Bus）"
    - "matchConfigKey：前缀通配 `prefix:*` 仅匹配 `prefix:oneLevel`，不匹配 `prefix:sub:key`"
    - "triple-prefix isolation：{schoolId}:{pluginId}:{configKey}"
    - "PlatformCommandStore 内联实现（镜像 plugin-data.ts producer 模式）"

key-files:
  created: []
  modified:
    - src/features/platform-core/commands/contracts.ts
    - src/features/system-commands/handler.ts
    - src/features/system-commands/facade.ts
    - src/features/platform-core/commands/registry.ts
    - src/features/system-commands/handler.test.ts
    - src/features/system-commands/facade.test.ts
    - src/features/platform-core/commands/system-commands.test.ts

key-decisions:
  - "Contract 层 Zod refine/superRefine：configKey 拒含 `:`（三重前缀隔离边界），configValue JSON 可序列化 + ≤64KB（DoS 防护）"
  - "handler authorize 先 audit 后 throw：所有 deny 路径先调 writeSystemCommandAudit({decision:'denied'}) 再抛 PlatformCommandExecutionError"
  - "system.config.get 不走 Command Bus：facade 直接导入 handler 的 authorize/execute 函数名导出，纯读不写 command record、不写 audit"
  - "facade PlatformCommandStore 内联：不想导出 plugin-data.ts 的内部 store，在 facade.ts 中镜像实现"
  - "registry stub 替换：authorize wrapper 镜像 system.http.request 模式 async (input) => { await handler.authorize(input); }"

patterns-established:
  - "system.config.set：facade 构造 PlatformCommand envelope → dispatchPlatformCommand → bus 管道 auto validate/authorize/execute"
  - "system.config.get：facade → handler.authorize（manifest re-parse）→ handler.execute（DAL 查询）→ 返回 payloadJson 或 null"
  - "denyAllConfig helper：DRY 化 system.config set/get 两组 authorize 的 3 类拒绝路径（not_allowlisted/config_key_denied）"
  - "systemConfigStore：Command Bus store 内联 facade，mirror plugin-data.ts producer"

requirements-completed: [SYS-02, SYS-04]

# Metrics
duration: 16min
completed: 2026-06-12
---

# Phase 79 Plan 02: system.config set/get handler + registry 替换 + facade 判别派发

**system.config.set/get 的 authorize + execute handler 实现，registry stub 替换为真实 handler，facade 判别派发补全**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-12T13:05:00Z
- **Completed:** 2026-06-12T13:19:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- contracts.ts SystemConfigSetPayloadSchema 增强：configKey 拒含 `:`（refine）、configValue JSON 可序列化 + ≤64KB（superRefine）
- handler.ts 新增 systemConfigSetAuthorize（manifest re-parse + allowedKeys 前缀通配匹配）
- handler.ts 新增 systemConfigSetExecute（pluginOwnedBusinessData ON CONFLICT DO UPDATE 原子 upsert，三重前缀隔离）
- handler.ts 新增 systemConfigGetAuthorize（与 set 相同 manifest re-parse 逻辑）
- handler.ts 新增 systemConfigGetExecute（纯 DAL 读，不存在返回 null，不写 audit）
- registry.ts 中 system.config.set 的 authorize/execute stub 替换为 systemConfigHandler 真实实现
- facade.ts 判别派发：system.config.set → Command Bus / system.config.get → DAL
- 84 个测试全部通过（26 handler + 10 facade + 48 system-commands）

## Task Commits

Each task was committed atomically:

1. **Task 1: 增强 SystemConfigSetPayloadSchema + 实现 system.config set/get handler** - `1caccd0` (feat)
2. **Task 2: 替换 registry stub + 补全 facade 判别派发** - `4e9bdf5` (feat)
3. **Task 3: handler + facade + registry 全覆盖测试 (TDD)** - `5d8f254` (test)

## Files Created/Modified

- `src/features/platform-core/commands/contracts.ts` - SystemConfigSetPayloadSchema 增强（refine + superRefine）
- `src/features/system-commands/handler.ts` - 新增 system.config.set/get 的 authorize/execute（~400 行增量）
- `src/features/system-commands/facade.ts` - 判别派发补全 + PlatformCommandStore 内联
- `src/features/platform-core/commands/registry.ts` - system.config.set stub 替换为 systemConfigHandler
- `src/features/system-commands/handler.test.ts` - 新增 14 个 system.config 测试（26 total）
- `src/features/system-commands/facade.test.ts` - 更新判别派发测试（10 个用例）
- `src/features/platform-core/commands/system-commands.test.ts` - 更新 registry stub 断言为 wired handler

## Decisions Made

- Contract 层 Zod refine/superRefine 作为 triple-prefix isolation 的第一道防线（configKey 拒含 `:`、configValue JSON 可序列化 + ≤64KB）
- handler authorize 先 audit 后 throw 模式保持不变（与 system.http.request 一致）
- system.config.get 不走 Command Bus，通过命名导出 `systemConfigGetAuthorize`/`systemConfigGetExecute` 供 facade 直接调用
- facade PlatformCommandStore 内联（不导出 plugin-data.ts store，保持模块隔离）
- registry stub 替换采用与 system.http.request 一致的 authorize wrapper 模式
- matchConfigKey 前缀通配 `prefix:*` 仅匹配 `prefix:oneLevel`，不跨层匹配 `prefix:sub:key`（D-11）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 添加命名导出供 facade 使用**
- **Found during:** Task 2
- **Issue:** facade.ts 需要 import `systemConfigGetAuthorize` 和 `systemConfigGetExecute`，但 handler.ts 仅通过 `systemConfigHandler` 对象导出
- **Fix:** 在 handler.ts 中添加 `export { systemConfigGetAuthorize, systemConfigGetExecute };` 命名导出
- **Files modified:** `src/features/system-commands/handler.ts`（3 行增量）
- **Committed in:** `4e9bdf5`（Task 2 commit）

**2. [Rule 1 - Bug] 测试中 configKey 含 `:` 导致 ConfigKeySchema 提前拒绝**
- **Found during:** Task 3
- **Issue:** systemConfigGetAuthorize 测试使用 `configKey: "homework:title"` 等含 `:` 的 key，ConfigKeySchema.parse 在 authorize 逻辑前就抛出 ZodError，导致 writeSystemCommandAudit mock 未被调用
- **Fix:** 将 get authorize 测试中的 configKey 改为无冒号形式（如 `homework_title`、`unknown_key`、`simplekey`），并新增单独测试验证冒号边界拒绝行为
- **Files modified:** `src/features/system-commands/handler.test.ts`
- **Committed in:** `5d8f254`（Task 3 commit）

**3. [Rule 1 - Bug] vitest.config.mts 被误删除**
- **Found during:** Task 3 cleanup
- **Issue:** 为从 worktree 运行 vitest 复制了 vitest.config.mts 到 worktree，清理临时文件时连同 git 跟踪的 vitest.config.mts 一起删除
- **Fix:** `git checkout HEAD -- vitest.config.mts` 恢复
- **Committed in:** Auto-recovered before commit

## Self-Check: PASSED

- [x] handler.ts 包含 systemConfigSetAuthorize/Execute + systemConfigGetAuthorize/Execute 四个函数
- [x] SystemConfigSetPayloadSchema 含 `:` 拒绝 + JSON 序列化 + 64KB 校验
- [x] registry.ts system.config.set stub 已替换
- [x] facade.ts 判别派发 system.config.set → Command Bus / system.config.get → DAL
- [x] npx tsc --noEmit 无新增错误
- [x] 84 个测试全部通过
- [x] 所有 commit 已记录
