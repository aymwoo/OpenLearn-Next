---
phase: 79-system-config-kv-dispatchsystemcommand-facade
plan: 01
subsystem: platform
tags: [governance-gate, audit, facade, system-commands, dispatchSystemCommand]

# Dependency graph
requires:
  - phase: 68
    provides: dispatchPluginDataAccess facade + assertActionExecutable + writePluginDataAccessAudit
  - phase: 78
    provides: system.http.request handler + writeSystemCommandAudit
provides:
  - assertActionExecutable verb 泛化为 string（可同时服务 dispatchPluginDataAccess 和 dispatchSystemCommand）
  - writePluginDataAccessAudit verb 参数类型改为 string（向后兼容）
  - writeSystemCommandAudit commandType 参数化（action 字段不再硬编码）
  - dispatchSystemCommand facade 三元入口（治理门 + 判别派发 + 结果返回骨架）
affects: [79-02, system-config-handler]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "三段式 facade：治理门前置 → 判别派发 → 结果返回"
    - "correlationId 由 sha256(commandType+actorId+pluginKey) 稳定派生"
    - "schoolId 由 governance-gate 从认证 session 派生注入，facade 层绝不从 payload 读取"

key-files:
  created:
    - src/features/system-commands/facade.ts
    - src/features/system-commands/facade.test.ts
  modified:
    - src/features/platform-core/plugin-data-access/governance-gate.ts
    - src/features/platform-core/plugin-data-access/audit.ts
    - src/features/system-commands/audit.ts
    - src/features/system-commands/audit.test.ts
    - src/features/system-commands/handler.ts

key-decisions:
  - "verb 从 PluginDataAccessVerb 泛化为 string：PluginDataAccessVerb 是 string 的判别联合子类型，已有调用方自动兼容，零破坏"
  - "commandType 参数化：writeSystemCommandAudit 的 action 字段从硬编码改为 input.commandType，为 system.config.set/get 等后续命令类型预留"
  - "facade 未知 commandType 走审计 + Error 而非 PluginDataAccessError：system command 层有自己的拒因命名空间（config_key_denied），不与 data-access 拒因混用"

patterns-established:
  - "三段式 facade：治理门前置(assertActionExecutable) → 判别派发(switch/if) → 结果返回"
  - "correlationId 派生模式：sha256(commandType+actorId+pluginKey)，不含敏感 payload"
  - "audit before throw：所有拒绝点先写 audit 再抛错"

requirements-completed: [SYS-04]

# Metrics
duration: 9min
completed: 2026-06-12
---

# Phase 79 Plan 01: dispatchSystemCommand facade 入口 + 治理门泛化 + audit 参数化

**assertActionExecutable verb 泛化为 string + writeSystemCommandAudit action 参数化 + dispatchSystemCommand facade 三段式骨架到位**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-12T04:41:24Z
- **Completed:** 2026-06-12T04:50:46Z
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- assertActionExecutable 的 verb 参数从 PluginDataAccessVerb 泛化为 string，writePluginDataAccessAudit 同步泛化
- writeSystemCommandAudit 的 action 字段由硬编码改为参数化 commandType，handler.ts 全部 10 处调用更新
- dispatchSystemCommand facade 三段式结构到位：治理门 → 判别派发（system.config.set/get 待 79-02）→ 结果返回

## Task Commits

Each task was committed atomically:

1. **Task 1: 泛化 governance-gate.ts 的 verb 类型签名 + audit.ts 连带变更** - `c78e0c2` (feat)
2. **Task 2: 扩展 writeSystemCommandAudit 添加 commandType 参数 + 更新所有调用方** - `accfca0` (feat)
3. **Task 3: 创建 dispatchSystemCommand facade 入口** - `362bf87` (feat)

## Files Created/Modified
- `src/features/platform-core/plugin-data-access/governance-gate.ts` - verb 参数泛化为 string，移除 PluginDataAccessVerb 导入
- `src/features/platform-core/plugin-data-access/audit.ts` - verb 参数泛化为 string，移除 PluginDataAccessVerb 导入
- `src/features/system-commands/audit.ts` - 新增 commandType 字段，action 由 input.commandType 参数化
- `src/features/system-commands/audit.test.ts` - 3 个测试用例 input 均添加 commandType 字段
- `src/features/system-commands/handler.ts` - 全部 10 处 writeSystemCommandAudit 调用添加 commandType: "system.http.request"
- `src/features/system-commands/facade.ts` - 新建：dispatchSystemCommand 三段式统一入口
- `src/features/system-commands/facade.test.ts` - 新建：8 个集成测试覆盖正常/拒绝/correlationId/未实现/schoolId

## Decisions Made
- verb 从 PluginDataAccessVerb 泛化为 string：PluginDataAccessVerb("insert"|"upsert"|"getByIndex"|"count"|"aggregate") 是 string 的判别联合子类型，已有调用方自动兼容
- commandType 参数化使用字面联合类型 `"system.http.request" | "system.config.set" | "system.config.get"`：类型安全的扩展点，新增 system 命令类型时编译期捕获
- 未知 commandType 走 `Error`（非 `PluginDataAccessError`）抛错：system command 层有自己的拒因命名空间
- facade 中 schoolId 从治理门派生注入：符合 D-13/D-14/D-15 安全契约

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 更正 facade.ts 未知 commandType 的抛错类型**

- **Found during:** Task 3
- **Issue:** plan 中指定 throw `PluginDataAccessError("config_key_denied", ...)`，但 `"config_key_denied"` 不在 `PluginDataAccessReason` 联合类型（10 种 data-access 拒因）中，TypeScript 编译报错
- **Fix:** 改用 `throw new Error("Unsupported system command: ...")`——system command 层有自己的拒因命名空间，不应混用 data-access 拒因类型。audit 记录中仍使用 `reasonCode: "config_key_denied"`（字符串类型，审计表 persist）。
- **Files modified:** `src/features/system-commands/facade.ts` (移除 PluginDataAccessError 导入，改用 Error)
- **Verification:** `npx tsc --noEmit` facade 无类型错误，8 个测试全部通过
- **Committed in:** `362bf87` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 类型修正，行为语义保持不变（audit 仍写 config_key_denied，错误仍被抛出并被调用方 catch）

## Issues Encountered
- libsql 数据库连接错误在 read-verbs.test.ts 中为预先存在的问题（环境 `/tmp/opencode/` 目录），与本次改动无关
- vitest CLI 在 pnpm 工作区中需要特殊调用方式，通过 `node --import` 直接调用

## Next Phase Readiness
- governance-gate verb 泛化已完成，assertActionExecutable 可服务 system commands
- dispatchSystemCommand facade 三段式骨架已就位
- system.config.set / system.config.get 的实际 handler 实现需由 Phase 79 Plan 02 完成
- 79-02 需要在 facade.ts 的判别派发段中添加 `system.config.set` → Command Bus producer 路径和 `system.config.get` → 纯 DAL 读取路径

---
*Phase: 79-system-config-kv-dispatchsystemcommand-facade*
*Completed: 2026-06-12*
