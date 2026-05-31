# Phase 55: Pilot Scope & Acceptance Gate - Research

**Researched:** 2026-05-24  
**Domain:** single-school pilot framing, acceptance gate design, proof and recovery contracts  
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PILOT-01 | `v3.1` 必须正式固定为“单校试点生产可用（插件先行）”，并明确首个真实样板是课堂投票插件。 | 研究结论已反复确认 `v3.1` 的主矛盾是“真实样板链路 + 试点生产 readiness”，而不是平台抽象继续升级。[VERIFIED: .planning/research/SUMMARY.md][VERIFIED: .planning/research/FEATURES.md] |
| PILOT-02 | milestone 必须前置定义 success criteria、failure taxonomy、recovery matrix 与 proof artifacts，而不是在 close 时补写。 | 研究指出 v3.1 最主要风险之一是只做 happy path、proof 最后补、现场故障无 runbook；因此 acceptance gate 必须前置写死。[VERIFIED: .planning/research/SUMMARY.md][VERIFIED: .planning/research/PITFALLS.md] |
| PILOT-03 | 试点容量口径必须量化为单课堂 40 名学生、同时 5 个课堂，并进入 close gate。 | 研究已给出明确容量口径，并强调没有定量容量就无法建立 load/degrade rehearsal。[VERIFIED: .planning/research/SUMMARY.md][VERIFIED: .planning/research/FEATURES.md] |

</phase_requirements>

## Summary

Phase 55 最重要的现实判断是：`v3.1` 的风险不在于“技术栈不够新”，而在于如果不先冻结试点口径，后续每个 phase 都会把“生产可用”写成宽泛口号，最后不是 scope 漂移成 infra-first，就是 close 时才发现缺少 proof、runbook 和 recovery 语义。[VERIFIED: .planning/research/SUMMARY.md][VERIFIED: .planning/research/PITFALLS.md]

当前仓库已经具备够强的 baseline：lesson editor / publish / classroom runtime / student progress 主链路成立，WebSocket-first transport、optional Redis fanout、BullMQ worker、plugin governance、command/event baseline 都已交付。[VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/MILESTONES.md] 因此 Phase 55 不能再把这些 baseline 写回“需要先补基础设施”，而应把后续 phase 的火力集中到三件事上：

1. **冻结样板**：课堂投票插件是唯一真实样板，主链路固定为“教师设计 -> 发布 -> 开课 -> 学生课堂完成 -> 教师与 operator 验证”。
2. **冻结验收**：success criteria、failure taxonomy、recovery matrix、proof artifacts 必须先有正式 contract。
3. **冻结容量与诚实降级口径**：40/5 容量、Redis degraded、worker backlog、reconnect/retry、partial failure 都必须进入 close gate。

**Primary recommendation:** 把 Phase 55 拆成三份权威 artifact：
- `55-PILOT-CONTRACT.md`：冻结单校试点 scope、样板链路、角色、容量与 deferred wall。
- `55-PROOF-INVENTORY.md`：逐 phase 锁定必须留下的 proof artifacts 与 verifier/rehearsal evidence。
- `55-FAILURE-RECOVERY-MATRIX.md`：锁定 failure taxonomy、owner、operator action、fallback/rollback 条件。

## Recommended Approach

1. **先写 pilot contract。**
   - 明确 single-school、plugin-first、classroom voting sample、40/5 capacity。
   - 明确哪些 baseline 已有，哪些内容属于 deferred。

2. **再写 proof inventory。**
   - 按 Phase 56-60 列出必须交付的 proof artifact、自动化 gate、手工 rehearsal 证据。
   - 把“close 时再补文档”改成“phase kickoff 时就定义证据”。

3. **最后写 failure and recovery matrix。**
   - 覆盖 authoring、publish、launch、runtime transport、student submit、worker backlog、backup/restore、release/rollback。
   - 为每类 failure 指定 owner、operator action、evidence source、escalation 条件。

## Architecture Patterns

### Pattern 1: Baseline-first planning
- **What:** 把已存在的 transport/async/plugin baseline 视为前提，而不是待建设项。
- **Why:** 否则 roadmap 会再次滑向 infra-first，并重复讨论已完成能力。

### Pattern 2: Proof-first milestone gating
- **What:** 在 phase kickoff 时就锁定 proof artifacts 和 verifier，而不是在 milestone close 时追补。
- **Why:** v3.1 的核心是“敢上线、敢回滚、敢恢复”，没有前置 evidence contract 就无法做到。

### Pattern 3: Failure-to-action mapping
- **What:** 每类 failure 都必须映射到 owner、operator action、fallback/rollback posture。
- **Why:** 单校试点最怕的不是故障本身，而是现场没人知道下一步做什么。

## Anti-Patterns to Avoid

- **把 Phase 55 做成“再写一遍研究总结”**：本阶段应产出可执行 contract，不是重复背景说明。
- **把已存在 baseline 写成 phase 任务**：WebSocket-first、optional Redis fanout、BullMQ、SQLite + DAL truth 都已经成立。
- **只写 success path，不写 failure/recovery**：这会让 operator/school support 仍然依赖研发临场救火。
- **把容量写成模糊词**：没有 40/5 这类定量数字，Phase 60 无法形成 close gate。

## Suggested Plan Split

1. **55-01**: 冻结 pilot contract 与 deferred wall。
2. **55-02**: 冻结 phase-by-phase proof inventory 与 acceptance evidence。
3. **55-03**: 冻结 failure taxonomy、recovery matrix、rollout/rollback trigger。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None. 样板插件、主链路、容量口径都已由上游研究和用户决策固定。 | — | — |

## Sources

### Primary (HIGH confidence)
- `.planning/research/SUMMARY.md` — `v3.1` 的统一 framing、40/5 容量口径、phase sequencing。
- `.planning/research/FEATURES.md` — 样板链路、table stakes、requirement categories 与 defer 边界。
- `.planning/research/ARCHITECTURE.md` — authoritative write path、operator/readiness layer build order。
- `.planning/research/PITFALLS.md` — scope 漂移、happy-path-only、operator 不可执行等关键风险。
- `.planning/PROJECT.md` — 当前 milestone、baseline truth posture、out-of-scope。
- `.planning/ROADMAP.md` — Phase 55 正式 goal、requirements、success criteria。
- `.planning/REQUIREMENTS.md` — `PILOT-01..03` requirement truth。

### Secondary (MEDIUM confidence)
- `.planning/milestones/v3.0-ROADMAP.md` — 最近 milestone 的 roadmap/phase detail 写法参考。

---

*Phase: 55-Pilot Scope & Acceptance Gate*
*Research completed: 2026-05-24*
