# Phase 76: v4.2 Authoritative Close Gate — Discussion Log

**Gathered:** 2026-06-11
**Mode:** discuss (default interactive)
**Gray areas discussed:** 4

## Area 1: Gate 拓扑与 alias

### Question 1: Stage 拓扑设计
- **Options:** 6-stage 扩展 / 3-stage 压缩 / 4-stage 重组
- **Selected:** 6-stage 扩展（72→73→75→cross-plugin regression→formal verification→sign-off）
- **Rationale:** 对标 Phase 74 的 5-wave 结构，扩展至覆盖 Phase 75 homework 验证 + 跨插件回归

### Question 2: alias 设计
- **Options:** 逐阶段 alias / 单一聚合 alias / 增量 alias
- **Selected:** 逐阶段 alias（`pnpm verify:phase72 && pnpm verify:phase73-v41-close-gate && pnpm verify:phase75 && pnpm verify:v42-cross-plugin`）
- **Rationale:** 各阶段独立可跑，失败定位精确

## Area 2: 跨插件回归策略

### Question 3: 回归范围
- **Options:** 双插件全量 / Critical path 精选 / 分层顺序回归
- **Selected:** 双插件全量（quiz 全量 + homework 全量，独立跑、独立报告）
- **Rationale:** 任一失败即阻断，确保不破 quiz + homework 全链路 green

### Question 4: 回归组织
- **Options:** 独立回归脚本 / 内嵌各阶段 / 扩展既有文件
- **Selected:** 独立回归脚本（`pnpm verify:v42-cross-plugin`）
- **Rationale:** 作为 gate 独立 Stage 4，与其他 stage 解耦

## Area 3: Manual Surface Sign-Off Ledger

### Question 5: Sign-Off 行数
- **Options:** 8-row 扩展 / 6-row 精简 / 4-row 合并
- **Selected:** 8-row（quiz 4 row + homework 4 row）
- **Rationale:** quiz 和 homework 在 ledger 中地位对等，各自覆盖完整用户旅程

## Area 4: Closeout 产出与审计

### Question 6: VERIFICATION.md 结构
- **Options:** 对标 Phase 74 / 新建 v4.2 格式 / 增量独立产出
- **Selected:** 对标 Phase 74 结构（7-section），扩展至覆盖 v4.2
- **Rationale:** 保持一致性，下游 agent 无需学习新格式

### Question 7: 审计框架
- **Options:** 对标 v4.1 / 新建 v4.2 / 自动化审计
- **Selected:** 新建 v4.2 专属框架（新增跨插件验证 + 泛化修复验证维度）
- **Rationale:** v4.2 的增量（跨插件 + 泛化）需要专属审计维度，不应被 v4.1 框架限制

## Deferred Ideas

None — 讨论完全聚焦在 Phase 76 close gate 范围内。

---

*Discussion completed: 2026-06-11*
