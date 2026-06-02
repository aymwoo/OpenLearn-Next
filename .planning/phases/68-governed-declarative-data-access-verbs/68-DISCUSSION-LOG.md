# Phase 68: Governed Declarative Data-Access Verbs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 68-governed-declarative-data-access-verbs
**Areas discussed:** 动词调用面形态, 读路径治理强度, aggregate 动词边界, 表/列/索引白名单来源, 拒绝契约/负样本集

---

## 动词调用面形态

| Option | Description | Selected |
|--------|-------------|----------|
| 单一 governed data-access 入口 + verb 判别字段 | 新增受治理 facade，payload 带 {verb, table}，五动词共享一套治理/审计 | ✓ |
| 每动词一个具名 action（复用 PLUGIN_ACTION_ALLOWLIST） | 登记为 static action catalog 独立 actionKey | |
| 你决定 | 交给 planner/researcher | |

**User's choice:** 单一 governed data-access 入口 + verb 判别字段

### 后续：Command Bus 命令类型粒度（写路径）

| Option | Description | Selected |
|--------|-------------|----------|
| 单一 plugin.data.write 命令类型 | insert/upsert 共用，payload 带 verb | |
| 每写动词一个 command 类型 | plugin.data.insert / plugin.data.upsert | ✓ |
| 你决定 | 按 contracts.ts 惯例 | |

**User's choice:** 每写动词一个 command 类型
**Notes:** facade 单一入口，但内部写路径按动词拆 command 类型，便于 replay 与审计区分。

---

## 读路径治理强度

| Option | Description | Selected |
|--------|-------------|----------|
| 读走 DAL + audit，不走 Command Bus | 读动词不落 platformCommands，经 registry 检查，拒绝时写 audit | ✓ |
| 读也落 Command Bus 持久化 | 审计最全但命令表高频只读膨胀 | |
| 读走 DAL，仅记拒绝 | 进一步减审计噪声 | |

**User's choice:** 读走 DAL + audit，不走 Command Bus

### 后续：governance audit 写入粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 写全记、读仅记拒绝 | 写成功+失败入 audit；读仅拒绝入 | ✓ |
| 读写全记 | 最高可审计但 audit 体量大 | |
| 仅拒绝写 audit | 成功路径静默 | |

**User's choice:** 写全记、读仅记拒绝

---

## aggregate 动词边界

| Option | Description | Selected |
|--------|-------------|----------|
| 受限具名聚合：count + groupBy 白名单列 | 返回 {key, count}，足够支撑 Phase 69 | ✓ |
| aggregate 仅留最小 scaffold，逻辑留 Phase 70 | | |
| 你决定 | 按 Phase 70 STATS 倒推 | |

**User's choice:** 受限具名聚合：count + groupBy 白名单列

---

## 表/列/索引白名单来源

| Option | Description | Selected |
|--------|-------------|----------|
| 从 Phase 67 声明/生成 schema 自动派生 | drizzle-zod 同源，单一真相源、零漂移 | ✓ |
| 手维护服务端 const map | 解耦但有漂移风险 | |
| 你决定 | 交给 researcher 核对 | |

**User's choice:** 从 Phase 67 声明/生成 schema 自动派生

### 后续：getByIndex / groupBy 可查询面

| Option | Description | Selected |
|--------|-------------|----------|
| 按逻辑 scope-key 名，只允许已建索引列 | byClassroomSessionStudentQuestion → 索引；未建索引列拒绝 | ✓ |
| dataModel 显式 opt-in flag 标注可查询/聚合列 | 更细粒但需扩展 Phase 67 meta-schema | |
| 你决定 | 按生成产物能抽出什么 | |

**User's choice:** 按逻辑 scope-key 名，只允许已建索引列

---

## 拒绝契约/负样本集

| Option | Description | Selected |
|--------|-------------|----------|
| 裸 SQL / 原始 SQL 传入 | raw_sql_rejected | ✓ |
| 自由 where / 任意过滤 | free_where_rejected | ✓ |
| 任意列名/表名 | unknown_column/table_rejected | ✓ |
| 跨校 schoolId / 前端传 schoolId | cross_school_rejected | ✓ |
| 非法 payload（Zod 越界） | invalid_payload_rejected | ✓ |
| 未建索引列查询/聚合 | unindexed_column_rejected | ✓ |
| 未安装/被阻插件调用 | 经 governed action registry 拒 | ✓ |

**User's choice:** 全部 7 类纳入负样本验收集（每个断言特定拒因 + 写 audit）

---

## Agent's Discretion

- facade 入口内部模块组织、command payload zod 形状、读 DAL 函数拆分粒度。
- 派生访问元数据的产物形态（编译期生成常量 vs 运行时反射生成 schema）。
- 写动词 dedupeKey / 幂等键取值（复用现有 Command Bus producer 惯例）。

## Deferred Ideas

- Phase 69：样板单选配置 + 学生作答经写动词 append-only/isLatest 落库。
- Phase 70：完整统计投影（正确率/选项分布/作答人数），在受限 aggregate 之上扩展。
- Phase 71：semver 升级 + retain/cleanup 卸载，消费 dataVersion 基线。
- Phase 72：端到端 verify:phase close gate。
- 幂等细节 / 错误回传形状 / 缓存 tag 失效策略 —— 留给 planner 按现有惯例拍。
