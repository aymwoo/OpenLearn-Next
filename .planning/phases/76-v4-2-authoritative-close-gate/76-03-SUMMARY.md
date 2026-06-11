---
phase: 76-v4-2-authoritative-close-gate
plan: 03
subsystem: testing
tags: [close-gate, verify, gate-script, homework, vitest, pnpm]

# Dependency graph
requires:
  - phase: 76-v4-2-authoritative-close-gate
    plan: 02
    provides: "Stage 1+2 verification wired (v4.0 regression + quiz multi-type) with execCommand pattern and D-06 blocking"
provides:
  - "Stage 3 wired: pnpm verify:phase75 executed in outer gate via execFileSync"
  - "D-06 blocking: Stage 3 failure blocks Stage 4-5 before execution"
affects: [04, 05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "execCommand() pattern (execFileSync via pnpm) reused for Stage 3 shell execution"
    - "D-06 sequential blocking: each stage failure pushes blocked statuses for all downstream stages"

key-files:
  modified:
    - scripts/verify-phase76-v42-close-gate.ts
  created: []

key-decisions:
  - "Stage 3 executes pnpm verify:phase75 as a single atomic shell call — no internal test-by-test orchestration in outer gate"
  - "Outer gate only consumes exit code + stdout/stderr from verify:phase75, never duplicates homework assertions"

patterns-established:
  - "runStageN() + verifyStageN() split for stage execution (smoke=static checks, full=shell execution)"

requirements-completed: []

duration: 5min
completed: 2026-06-11
---

# Phase 76 Plan 03: Stage 3 Homework 全链路验证接线 Summary

**在 outer gate 中将 Stage 3 从占位 skeleton 升级为真实 shell 执行——消费 pnpm verify:phase75 的 exit code 判定 homework 全链路通过/失败，并在失败时阻断后续所有 stage。**

## 性能

- **Duration:** 5min
- **Started:** 2026-06-11T05:45:00Z
- **Completed:** 2026-06-11T05:50:00Z
- **Tasks:** 1
- **Files modified:** 1

## 完成项
- Stage 3 从纯静态检查升级为真实 shell 执行，对标 Stage 1/2 的 execCommand() 模式
- 新增 `runStage3HomeworkFullChain()` 函数，执行 `pnpm verify:phase75`
- 在 main gate 函数中 Stage 3 段添加 D-06 阻断逻辑（失败 → Stage 4-5 blocked）
- Smoke 模式报告 Stage 3 为 "wired"（接线就绪但不执行），exit code 0
- 脚本源码不含 homework 内部结构断言（零 grep 命中 plugin_owned_homework_assignments 等表名）

## 任务提交

1. **Task 1: 接线 Stage 3 — homework 全链路验证 (pnpm verify:phase75)** - `6070d5b` (feat)

**Plan metadata:** 待生成（最终 commit）

## 文件修改
- `scripts/verify-phase76-v42-close-gate.ts` - Stage 3 升级：新增 `runStage3HomeworkFullChain()`；修改 main gate 段以区分 smoke/full 模式；添加 D-06 阻断逻辑

## 决策
- 完全复用 Stage 1/2 已有的 `run()` 函数（`execFileSync`）模式，参数 `pnpm verify:phase75`
- 不复制产品断言——outer gate 只消费 exit code，与 T-76-03-01 威胁缓解一致
- `verify:phase75` 引用与 package.json 中注册的 entry 保持一致

## 计划的偏差

无——计划完全按书面执行。

## 遇到的问题

无。

## 用户需要设置的内容

无——无需外部服务配置。

## 下一阶段就绪状态
- Stage 3 (homework 全链路验证) 已接线，现在 `pnpm verify:phase76` 在 full 模式下会真正执行 `pnpm verify:phase75`
- 下游 Plan 04 (Stage 4 跨插件回归) 与 Plan 05 (formal verification) 可继续
- D-06 阻断链完整：Stage 1→Stage 2→Stage 3，任一步失败即停止后续所有 stage

---
*Phase: 76-v4-2-authoritative-close-gate*
*Completed: 2026-06-11*
