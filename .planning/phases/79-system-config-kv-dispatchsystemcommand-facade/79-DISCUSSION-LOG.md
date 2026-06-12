# Phase 79: system.config KV 配置 + dispatchSystemCommand facade - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 79-system.config KV 配置 + dispatchSystemCommand facade
**Areas discussed:** 治理门泛化, system.config.get 治理路径, Producer 设计, 职责切分, Audit 写入模式, 模块结构

---

## 治理门：assertActionExecutable 泛化 vs 新建独立门

| Option | Description | Selected |
|--------|-------------|----------|
| 泛化 assertActionExecutable | 将 verb 参数泛化为 string，一个函数服务两种 facade | ✓ |
| 新建独立 system command 门 | 在 system-commands/ 下新建 assertSystemCommandExecutable | |
| facade 直接调用底层逻辑 | 不经过 assertActionExecutable，内部调用 deriveActiveSchoolScope + projectPluginGovernance | |

**User's choice:** 泛化 assertActionExecutable
**Notes:** 改动面最小，生命周期/kill-switch/school scope 检查逻辑完全一致，只需放宽 verb 类型签名。dispatchPluginDataAccess 行为零变化。

---

## system.config.get 治理路径

| Option | Description | Selected |
|--------|-------------|----------|
| 不过治理门 | 纯读走 DAL，不经过 Command Bus，不写 audit | ✓ |
| 过治理门但不走 Command Bus | get 先过 governance gate，通过后走 DAL 直读，deny 时写 audit | |
| 经 dispatchSystemCommand facade 统一派发 | get 走 facade 三段式，增加读操作开销 | |

**User's choice:** 不过治理门
**Notes:** 与 REQUIREMENTS.md SYS-02「纯读走 DAL（不声明为 PlatformCommandType）」一致。读操作不改变状态，manifest allowedKeys 校验在 handler 层做。

---

## system.config.set Producer 设计

| Option | Description | Selected |
|--------|-------------|----------|
| 直接 dispatchPlatformCommand | handler.execute 中直接构造 envelope 调 dispatchPlatformCommand | ✓ |
| 新建 produceSystemConfigSet | 参照 producePluginDataUpsert 模式建独立 producer | |
| 复用 producePluginDataUpsert | 以 pluginOwnedBusinessData 为 table 调用现有 producer | |

**User's choice:** 直接 dispatchPlatformCommand
**Notes:** 与 Phase 78 system.http.request handler 模式一致。handler 自己处理 upsert 逻辑，不引入额外的 producer 抽象层。

---

## 职责切分：Facade vs Handler

| Option | Description | Selected |
|--------|-------------|----------|
| facade 只做治理门+审计，handler 做白名单 | facade: assertActionExecutable → audit; handler: manifest re-parse + authorize | ✓ |
| facade 统一 re-parse manifest | facade 做 re-parse + 路由，handler 只做业务逻辑 | |
| facade 做治理门+白名单，handler 只做 execute | authorize 全部上提 facade，handler 失去独立可测试性 | |

**User's choice:** facade 只做治理门+审计，handler 做白名单
**Notes:** 与 Phase 78 system.http.request handler 自治模式一致。handler 独立可测试，manifest re-parse 在 handler.authorize 中完成。

---

## Audit 写入模式

| Option | Description | Selected |
|--------|-------------|----------|
| 新建专用 audit helper | 在 system-commands/audit.ts 新建 writeSystemCommandAudit() | ✓ |
| 内联 audit 写入 | 直接 db.insert(governanceAudits) 在 facade 和 handler 中 | |
| 泛化现有 audit helper | 泛化 writePluginDataAccessAudit 同时服务两种场景 | |

**User's choice:** 新建专用 audit helper
**Notes:** Phase 78 audit.ts 已存在基础实现，Phase 79 在此基础上扩展 system.config 的 audit 写入。保持审计域的清晰边界。

---

## 模块结构：Facade 放置位置

| Option | Description | Selected |
|--------|-------------|----------|
| system-commands/ 内聚 | facade.ts 放 system-commands/，与 handler.ts 同目录 | ✓ |
| facade 放 platform-core/ | facade 放 platform-core/commands/ 与 bus.ts 同级 | |
| facade 放 DAL 层 | facade 放 src/lib/dal/ 作为 DAL 层入口 | |

**User's choice:** system-commands/ 内聚
**Notes:** 保持 feature 内聚原则。dispatchSystemCommand facade 与 system commands handler 在同一 feature 目录，便于维护和理解。

---

## Claude's Discretion

- `assertActionExecutable` 泛化的具体类型签名变更（保持最小 diff）
- `system.config.get` 的 DAL 查询函数命名和缓存策略
- handler 内 key 构造、value JSON 序列化/反序列化的具体实现
- audit helper 与 Phase 78 现有 audit.ts 的合并方式
- facade 错误处理的具体异常类型

## Deferred Ideas

None — 讨论保持在 phase scope 内。
