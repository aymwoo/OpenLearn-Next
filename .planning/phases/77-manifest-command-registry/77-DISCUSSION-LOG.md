# Phase 77: Manifest 声明 + Command Registry 注册 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 77-manifest-command-registry
**Areas discussed:** systemCommands schema 结构, Install preflight 校验深度, 已有 manifest 兼容性保障, Governance reasonCode 归属

---

## systemCommands Schema 结构

| Option | Description | Selected |
|--------|-------------|----------|
| 统一 discriminated union | 顶层数组，`command` 字段判别类型，Zod discriminatedUnion 校验 | ✓ |
| 各自独立 optional 字段 | 扁平对象 `{ httpRequest?: ..., config?: ... }` | |
| V2 governance 内嵌 | 放在 governance 对象内 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 先定义完整 shape | Phase 77 定义完整的 allowedDomains/allowedMethods/allowedKeys Zod 校验 | ✓ |
| Phase 77 只定义最小骨架 | 仅 kind 字段，Phase 78/79 各自补充 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 放在 resource-ai.ts | 与 PluginManifestSchema 同文件 | ✓ |
| 放在 contracts/ 目录 | 与 PluginManifestGovernanceV2 并列 | |
| 新建独立 dto 文件 | src/lib/dto/system-commands.ts | |

| Option | Description | Selected |
|--------|-------------|----------|
| command | 与 Command Bus 术语一致 | ✓ |
| kind | 通用判别字段名 | |
| type | 最短 | |

---

## Install Preflight 校验深度

| Option | Description | Selected |
|--------|-------------|----------|
| Zod 全量校验 | regex + refine + superRefine，内嵌 schema 中 | ✓ |
| Zod 结构 + 独立 validate | 基本形状 Zod，语义校验独立函数 | |
| Zod 结构 + 静默通过 | install 通过，运行时发现 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 具名拒因码 | UPPER_SNAKE 如 SYSTEM_COMMAND_DOMAIN_INVALID | ✓ |
| 中文错误描述 | Zod issue 直接写中文 | |
| 仅抛通用错误 | 保持 PLUGIN_MANIFEST_INVALID | |

| Option | Description | Selected |
|--------|-------------|----------|
| install + upgrade 都跑 | parseManifestOrThrow 自然覆盖 | ✓ |
| 仅 install 时校验 | upgrade 不重校验 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 仅校验字段格式 | discriminatedUnion literal 自然约束命令名 | ✓ |
| 校验格式 + 查 registry | 额外检查 handler 存在性 | |

---

## 已有 Manifest 兼容性保障

| Option | Description | Selected |
|--------|-------------|----------|
| 自动化扫描 + vitest | 导入现有 manifest 构建函数，逐份 parse 断言 | ✓ |
| 仅手动确认 | pnpm typecheck + pnpm test | |
| Snapshot 测试 | toMatchSnapshot | |

| Option | Description | Selected |
|--------|-------------|----------|
| 全量 parse + 新 manifest 构造 | A) 现有 manifest 通过 B) 新 manifest parse 正确 | ✓ |
| 仅向后兼容 | 只测不抛错 | |
| 全量 + snapshot + typecheck | 最全面 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 需要——正反两面都要测 | 合法声明通过 + 非法声明抛预期拒因码 | ✓ |
| 不需要 | Phase 78/79 再测 | |

---

## Governance ReasonCode 归属

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展现有 GovernanceDeniedReason | 追加到 permissions.ts 现有数组中 | ✓ |
| 新建独立集合 | SystemCommandDeniedReason | |
| 复用 + 新增混合 | 部分归入已有，部分新建 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 至少 1 条（deny+allow 都记） | deny 记 denied+reasonCode，allow 记 allowed | ✓ |
| 仅 deny 时记录 | 成功不记 | |
| deny 记 + allow 选择性记 | deny 全量，allow 仅 http.request | |

| Option | Description | Selected |
|--------|-------------|----------|
| 直接使用 commandType | action = system.http.request 等 | ✓ |
| 统一前缀 + 细分后缀 | action = system_command:http_request | |
| 固定值 + reasonCode 区分 | action = system.command | |

| Option | Description | Selected |
|--------|-------------|----------|
| 无需 schema 变更 | reasonCode 是 text 无 enum 约束 | ✓ |
| 加 enum 约束 | SQLite enum 约束（需 migration） | |

---

## the Agent's Discretion

无——所有决策均由用户明确选择。

## Deferred Ideas

无——讨论保持在 phase scope 内。
