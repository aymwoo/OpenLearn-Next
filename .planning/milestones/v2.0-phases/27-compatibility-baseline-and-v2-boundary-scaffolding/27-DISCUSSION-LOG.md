# Phase 27: Compatibility baseline and V2 boundary scaffolding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 27-Compatibility baseline and V2 boundary scaffolding
**Areas discussed:** 兼容基线, 边界切口, 合约颗粒度, 接缝显式度

---

## 兼容基线

### compatibility baseline 范围

| Option | Description | Selected |
|--------|-------------|----------|
| 主链+关键护栏 | 冻结 happy path，并把 editor 入口约束、launch published snapshot、classroom conflict refresh、player lock/unlock + resume 一并纳入 | ✓ |
| 只锁主 happy path | 只覆盖顺畅主路径 | |
| 只做路由级 smoke | 只确认页面能打开和跳转 | |

**User's choice:** 主链+关键护栏
**Notes:** Phase 27 的 baseline 必须是 fail-loud 的安全门，不只是页面还在。

### compatibility gate 主入口

| Option | Description | Selected |
|--------|-------------|----------|
| 单一 verify:phase27 | 提供统一 canonical compatibility gate | ✓ |
| 分散在各自 phase verifier | 继续只依赖旧 verifier | |
| 只靠测试文件集合 | 无明确 verifier 入口 | |

**User's choice:** 单一 verify:phase27
**Notes:** 需要一个仓库里清晰可见的 Phase 27 安全门。

### verify:phase27 与旧 verifier 的关系

| Option | Description | Selected |
|--------|-------------|----------|
| 组合旧 verifier + 少量新 guard | 复用成熟断言，再补 Phase 27 新边界检查 | ✓ |
| 重写成全新的兼容测试矩阵 | 重做所有断言 | |
| 只引用旧 verifier，不补新 guard | 不新增 Phase 27 专属检查 | |

**User's choice:** 组合旧 verifier + 少量新 guard
**Notes:** 避免重复和漂移，同时补齐 runtime-platform scaffolding 的新增风险面。

### 迁移期兼容姿态

| Option | Description | Selected |
|--------|-------------|----------|
| 旧入口继续可用 | 页面迁移进行中，旧入口仍需继续工作 | ✓ |
| 允许尽快切到新入口 | 尽快放弃旧入口 | |
| 只保证运行时兼容 | 不强制旧导入路径存在 | |

**User's choice:** 旧入口继续可用
**Notes:** 对齐“单体内平台化，不搞 big-bang rewrite”。

---

## 边界切口

### 第一刀切哪里

| Option | Description | Selected |
|--------|-------------|----------|
| 先切 runtime/platform 新域 | 先建立新 feature root，降低 blast radius | ✓ |
| 同时切主链页面域 | 一次性把多域都 feature 化 | |
| 先只建 contracts，不动 feature root | 边界更轻，但平台感更弱 | |

**User's choice:** 先切 runtime/platform 新域
**Notes:** 先让 V2 新域立住，再逐步吸纳现有主链消费者。

### 主链与新 boundary 的连接方式

| Option | Description | Selected |
|--------|-------------|----------|
| 旧主链先走 facade/compat re-export | 由旧入口先包新边界 | |
| 页面直接改依赖新 boundary | app pages 开始直接导入新 public API | ✓ |
| 双轨并存一段时间 | 新旧入口都直接被调用 | |

**User's choice:** 页面直接改依赖新 boundary
**Notes:** route consumers 可以尽早切到新边界，但不等于旧入口立刻消失。

### 旧 dal/actions/dto 的角色

| Option | Description | Selected |
|--------|-------------|----------|
| 保留为兼容 shim | 旧文件继续存在，但只做薄 re-export / facade | ✓ |
| 部分 shim，部分保留实现 | ownership 继续混合 | |
| 尽快废弃旧入口 | 页面切完就不再保留 | |

**User's choice:** 保留为兼容 shim
**Notes:** 这与“页面先切新 boundary”和“旧入口继续可用”同时成立。

### 主工程内的边界姿态

| Option | Description | Selected |
|--------|-------------|----------|
| 一个 runtime-platform 根 + 子域 | 先集中成一个平台根，再分 host/bridge/permissions 等 | ✓ |
| 多个平级 feature root | 一开始就平铺多个域 | |
| 先只做 shared/contracts 根 | Phase 27 的 feature boundary 太弱 | |

**User's choice:** 一个 runtime-platform 根 + 子域
**Notes:** 更适合本阶段收敛，也便于后续再拆。

### plugin 骨架做到哪一步

| Option | Description | Selected |
|--------|-------------|----------|
| 先立同域骨架，不做生命周期细节 | 在 runtime-platform 根下先占位 plugin/capability/lifecycle/manifest v2 ownership | ✓ |
| Phase 27 只管 runtime，不碰 plugin | plugin 完全留后面 | |
| 提前把 plugin lifecycle 细节也做进来 | 会挤占后续治理 phase | |

**User's choice:** 先立同域骨架，不做生命周期细节
**Notes:** 与 roadmap 对齐，避免 Phase 27 提前做深。

---

## 合约颗粒度

### shared contracts 第一版颗粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 一个 contracts 根，内部分域 | `bridge/events/permissions/descriptors` 统一在一个根下 | ✓ |
| 一开始就四个独立 contract 包 | 边界最清楚，但仓库改动更重 | |
| 先只做 types 文件集合 | 最轻，但 contract 边界太弱 | |

**User's choice:** 一个 contracts 根，内部分域
**Notes:** 当前仓库还没有 `packages/`，先统一再细分更稳。

### contracts 根的物理形态

| Option | Description | Selected |
|--------|-------------|----------|
| 先用主工程内等价边界 | 不急着为了形式切 monorepo packages | ✓ |
| 直接建 packages/contracts | 更像最终态 | |
| 两者都建 | 重复和漂移风险高 | |

**User's choice:** 先用主工程内等价边界
**Notes:** 符合“main project scaffolding，不做 multi-app rewrite”。

### contracts 默认服务对象

| Option | Description | Selected |
|--------|-------------|----------|
| 先服务 host-side 边界 | 先让 main project 内部 host/facade/route 使用 | ✓ |
| 同时服务 host 与 iframe runtime | 从第一版就双端直接消费 | |
| 主要服务未来外部包 | 对当前主工程价值较弱 | |

**User's choice:** 先服务 host-side 边界
**Notes:** 双端或外部包消费能力只按未来兼容姿态准备，不要求本阶段成熟。

### contracts 边界纯度

| Option | Description | Selected |
|--------|-------------|----------|
| 纯 contract，不放实现逻辑 | 只放 schema/types/public API/constants/versioning | ✓ |
| 允许少量 helper | 可能膨胀成 shared utils | |
| 按需放任何共用代码 | 最容易污染边界 | |

**User's choice:** 纯 contract，不放实现逻辑
**Notes:** 这是后续可安全拆包的前提。

---

## 接缝显式度

### future seam 的完成级别

| Option | Description | Selected |
|--------|-------------|----------|
| 接口+默认当前实现 | 每类 seam 都有 contract 和 current default implementation | ✓ |
| 接口+provider 注册 | 进一步做 provider/config 层 | |
| 只写占位接口 | scaffolding 感太弱 | |

**User's choice:** 接口+默认当前实现
**Notes:** 既不是空壳，也不提前把基础设施切换做深。

### seam 的运行姿态

| Option | Description | Selected |
|--------|-------------|----------|
| 结构上可替换，运行时不开放切换 | 代码可换，但本阶段不提供切换开关 | ✓ |
| 预留隐藏切换开关 | 存在误开风险 | |
| 公开可切换但默认关闭 | 超出本阶段稳态要求 | |

**User's choice:** 结构上可替换，运行时不开放切换
**Notes:** seam 存在，但 Phase 27 不允许真实 cutover。

### seam 的组织方式

| Option | Description | Selected |
|--------|-------------|----------|
| 集中在 runtime-platform/seams | 统一表达平台演进接缝 | ✓ |
| 各自贴近子域放置 | 第一版容易过散 | |
| 先只在文档里约定 | 缺少真正 scaffolding | |

**User's choice:** 集中在 runtime-platform/seams
**Notes:** 更适合本阶段表达清晰 ownership。

### event/transport seam 的真相源原则

| Option | Description | Selected |
|--------|-------------|----------|
| 现有持久写链仍是真相源 | event seam 只表达未来 delivery/fan-out 位置 | ✓ |
| 先引入双写准备 | 本阶段会引入歧义 | |
| 让 event seam 靠近 primary write | 与当前风险控制方向不一致 | |

**User's choice:** 现有持久写链仍是真相源
**Notes:** 对齐 milestone 的“先立 seam，不改 truth ownership”。

---

## the agent's Discretion

- 具体目录命名、public barrel 命名、adapter/interface 命名仍可由 planner 收敛。
- `verify:phase27` 的精确测试清单仍可由 planner 基于现有 verifier 细化。

## Deferred Ideas

- 正式 `packages/contracts` / monorepo packages 落地
- plugin lifecycle 细节与 allowed/denied audit semantics
- runtime session persistence 与 canonical event log/outbox 深化
- PostgreSQL / Redis / WebSocket 的真实切换与 provider config
- event bus / transport 变成 primary write truth path
