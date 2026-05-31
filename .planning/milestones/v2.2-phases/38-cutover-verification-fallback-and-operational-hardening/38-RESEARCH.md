# Phase 38: Cutover verification, fallback, and operational hardening - Research

## Executive Summary

Phase 38 的真实工作重点不是继续实现 `ws + ioredis` transport 本体，而是把已经在
Phase 36 与 Phase 37 分别闭环的事实，收口成 **milestone-level 单一证明面**。当前
仓库已经具备两个强 verifier：

- `verify:phase36`：证明 `ws` handshake、canonical routing、WS-first consumer、
  SSE rollback surface。
- `verify:phase37`：证明 optional Redis fanout、deploy-authoritative setting、
  session snapshot、degraded operator visibility、recovery proof 与 honest local-only posture。

因此 Phase 38 最推荐的方向不是重写这两个 verifier，而是新增一个 **上层 close gate**
来编排和补齐它们之间尚未被单一命令覆盖的内容：route-by-route parity proof、
fallback/rollback matrix、repo-local demo/runbook、以及 milestone close artifact。

**Primary recommendation:**

1. 新增 `verify:phase38` 作为 milestone-level canonical gate。
2. `verify:phase38` 以组合现有 `verify:phase36` + `verify:phase37` 为主，补充少量
   closeout-specific static guards 或 focused proofs，而不是复制两边已有检查。
3. 单独新增一份 repo-local runbook / closeout doc，明确 Redis smoke 前提、双实例启动方式、
   fallback/rollback 预期、以及 operator 应该从哪里观察结果。
4. milestone close artifact 明确写死交付边界：只覆盖 `ws + ioredis` classroom transport，
   不包含 PostgreSQL、BullMQ、第二 runtime、第三方 runtime/package、AI runtime expansion。

## Current State Audit

### What is already proven by Phase 36

From `36-VERIFICATION.md` and `scripts/verify-phase36-websocket-cutover.ts`:

- WebSocket 已是真实的课堂双向 transport，不再只是 future seam。
- `server.ts -> ws-server.ts` 是 canonical upgrade host。
- `teacher.control`、`runtime.command`、`classroom.snapshot`、`runtime.event`、
  `transport.keepalive` 已通过统一 contract 流动。
- SSE rollback surface 被明确保留，并由 `verify:phase36` 输出诚实口径。
- `verify:phase36` 当前已经是高质量的 phase gate：
  - non-comment static guards
  - focused suites
  - `pnpm typecheck`
  - honest output

### What is already proven by Phase 37

From `37-VERIFICATION.md` and `scripts/verify-phase37-redis-fanout.ts`:

- Redis fanout 已被锁定为 optional capability，不是默认 transport baseline。
- global transport setting、deploy authority、effective mode 与 session snapshot
  都已经是 durable server truth。
- `publishTransportEvent()` 仍是唯一 canonical business publish entry。
- Redis degraded fallback 已有 honest attempt truth，不再伪装为 cross-instance delivered。
- `/settings`、runtime inspector、teacher `/classroom` 已经有 operator-visible degraded state。
- `verify:phase37` 当前也已经是高质量 phase gate：
  - non-comment static guards
  - 11 个 focused suites
  - `pnpm typecheck`
  - optional Redis smoke with honest skip output

### What is still missing at milestone level

虽然 Phase 36 和 Phase 37 各自已经闭环，但当前仍缺 4 个 milestone-level 交付面：

1. **Single close command**
   - 目前没有一个明确命令代表“v2.2 WebSocket Classroom Transport Cutover 已完成”。
   - 用户或 reviewer 需要自己理解什么时候跑 `verify:phase36`、什么时候跑 `verify:phase37`。

2. **Route-by-route parity proof as one story**
   - 现有 proofs 分散在两个 phase 中。
   - 缺一个统一结论来说明 classroom / player / runtime 这三条主链在 cutover 后如何共同成立。

3. **Human-readable fallback/demo path**
   - 代码和 verifier 已经很诚实，但 repo 内还缺少“如何手工验证”的完整 runbook。
   - 这会导致 close 仍然依赖作者记忆，而不是 repo-local artifact。

4. **Milestone close artifact**
   - 缺一份单独 close artifact，把 delivered scope、verification evidence、known exclusions
     和 deferred items 明确写死。

## Gap Analysis

### Gap 1: No milestone-level canonical gate

Current posture:

- `verify:phase36` proves WebSocket cutover correctness.
- `verify:phase37` proves Redis fanout optional capability and degraded honesty.

Problem:

- milestone-level close 还没有唯一命令。
- 这会让“到底要跑哪些命令才算 v2.2 close”留在口头知识里。

Recommended resolution:

- 新增 `verify:phase38`，让它成为 milestone close gate。
- 其职责不是重做 36/37，而是：
  - 运行 `verify:phase36`
  - 运行 `verify:phase37`
  - 再跑 Phase 38 特有的 closeout checks

### Gap 2: No unified route-by-route parity proof

Current posture:

- Phase 36 证明了 WebSocket route 和 consumers。
- Phase 37 证明了 Redis fanout、degraded behavior 和 operator surfaces。

Problem:

- 缺少一个“cutover 完整故事”：
  - teacher producer
  - classroom consumer
  - student player
  - runtime host
  - Redis optional fanout
  - SSE / snapshot rollback semantics

Recommended resolution:

- 在 Phase 38 verifier 或 verification report 中，把这些路径统一写成一套 parity matrix。
- 重点不是新增大量业务测试，而是把现有 focused suites 映射到更高层的路线证明。

### Gap 3: Fallback / rollback posture is distributed, not consolidated

Current posture:

- `verify:phase36` 输出 SSE rollback note。
- `verify:phase37` 输出 Redis smoke skip note 和 local-only note。
- 代码里 teacher/player/settings/inspector 各自持有部分 degraded semantics。

Problem:

- 对开发者或验收者来说，这些事实仍分散在多个脚本和多个页面里。

Recommended resolution:

- Phase 38 需要一份 **fallback matrix**，至少覆盖：
  - no Redis capability provided
  - Redis enabled and healthy
  - Redis degraded local-only
  - WebSocket unavailable but snapshot/SSE fallback still usable
  - operator surfaces vs student surfaces 的可见性差异

### Gap 4: Demo/bootstrap path is executable but not yet explainable enough

Current posture:

- `bootstrap-dev-db.ts` 已经把默认姿态固定为 `local_only`。
- `verify:phase37:redis` 已经存在。

Problem:

- 仍缺少 repo-local 手册，告诉人类如何：
  - 启 Redis
  - 启双实例
  - 连接两个 client
  - 看哪里能证明 cross-instance 或 degraded behavior

Recommended resolution:

- 在 Phase 38 中新增一份 closeout runbook 或 demo guide。
- 这份文档比继续堆脚本更有价值，因为当前“怎么证明”已经不只是机器问题。

## Options Considered

### Option A: Only keep `verify:phase36` + `verify:phase37`, no new verifier

Pros:

- 改动最少。
- 不会引入第三个 verifier 文件。

Cons:

- milestone 仍然没有单一 close command。
- 验收口径仍依赖人工解释。

Verdict:

- 不推荐。它适合内部开发，但不适合作为 milestone close posture。

### Option B: Extend `verify:phase37` into the milestone close gate

Pros:

- 可以少一个新文件。

Cons:

- 会让 `verify:phase37` 同时承担 “Phase 37 gate” 与 “milestone close gate” 两种角色。
- 容易让 Phase 37 的可选 Redis posture 与 Phase 38 的 overall close posture 混在一起。

Verdict:

- 不推荐。职责边界会变糊。

### Option C: Add a new `verify:phase38` that composes 36 + 37 + closeout checks

Pros:

- milestone 有单一 canonical gate。
- 不破坏 36/37 已稳定的 phase verifier。
- 结构最清晰：phase gate 继续服务 phase，自上而下的 close gate 服务 milestone。

Cons:

- 新增一个 verifier 文件和一个 package script。
- 需要注意避免重复跑过多 suites。

Verdict:

- **推荐方案。**

## Recommended Verifier Shape

### `verify:phase38` should likely do

1. Run `verify:phase36`
2. Run `verify:phase37`
3. Run a small set of Phase 38 static guards for closeout integrity
4. Print an honest milestone close posture summary

### Closeout-specific static guards worth adding

- milestone close docs exist
- fallback / rollback matrix doc exists
- local demo or bootstrap runbook exists
- no planning doc claims BullMQ / PostgreSQL / second runtime is part of this close
- optional Redis posture remains explicit, not rewritten as default baseline

### What `verify:phase38` should avoid

- Re-running every underlying focused suite again by hand if phase verifiers already do that
- Adding new business logic assertions that belong in 36/37 tests instead of closeout checks
- Mixing human guidance text with pass/fail logic so tightly that one blocks the other unnecessarily

## Recommended Artifact Split

### 38-01 — Canonical close gate + route-by-route parity proof

Recommended deliverables:

- `scripts/verify-phase38-cutover-closeout.ts`
- `package.json` script registration for `verify:phase38`
- `38-VERIFICATION.md`

Primary purpose:

- Publish the milestone-level executable gate.
- Prove classroom / player / runtime parity as one cutover story.

### 38-02 — Fallback matrix + local demo/bootstrap + milestone close artifact

Recommended deliverables:

- one repo-local runbook or closeout guide for demo/bootstrap/smoke
- one fallback/rollback matrix artifact
- milestone close report or audit doc

Primary purpose:

- Make the cutover explainable and reproducible for humans, not only for scripts.

## Candidate File Map

| File | Action | Why |
| --- | --- | --- |
| `scripts/verify-phase38-cutover-closeout.ts` | new | milestone-level canonical gate |
| `package.json` | modify | register `verify:phase38` |
| `.planning/phases/38-cutover-verification-fallback-and-operational-hardening/38-VERIFICATION.md` | new | milestone-level verification report |
| `docs/` or `.planning/phases/38-.../` closeout doc | new | local demo/bootstrap/runbook |
| `scripts/bootstrap-dev-db.ts` | maybe modify | only if research confirms the current dev output still misses needed cues |
| `scripts/verify-phase37-redis-fanout.ts` | maybe reference only | prefer composition over mutation unless a real gap is found |

## Risks & Tradeoffs

| Risk | Why it matters | Recommended stance |
| --- | --- | --- |
| verifier duplication | three verifiers can become noisy or redundant | Phase 38 verifier should compose 36/37, not clone them |
| over-claiming RTPX-02 | `RTPX-02` text mentions Redis or BullMQ-backed fanout and async workers | close only the Redis fanout classroom transport slice; keep BullMQ explicitly out of scope |
| doc-only close posture | docs can drift from executable truth | keep executable gate primary, docs secondary but explicit |
| human demo ambiguity | scripts may pass while reviewers still cannot reproduce proof | add a repo-local runbook with exact env and smoke steps |
| accidental scope creep | closeout work can tempt infra rewrites | treat implementation change as exception, not default |

## Assumptions Log

| # | Claim | Risk if wrong |
| --- | --- | --- |
| A1 | A dedicated `verify:phase38` is clearer than mutating `verify:phase37` into a milestone gate. | If the team prefers fewer scripts, plan 38-01 may need a different packaging approach. |
| A2 | A human-readable runbook is necessary even though `verify:phase37:redis` exists. | If reviewers only care about CI evidence, the runbook can be reduced in scope but should still exist. |
| A3 | Most Phase 38 work is documentation/proof consolidation, not runtime seam changes. | If a real gap appears during parity proof, the plan must allow a narrowly scoped code fix. |

## Resolved Research Decisions

1. **Milestone-level close should get its own gate.**
   - Recommended: add `verify:phase38` rather than overloading `verify:phase37`.

2. **Phase 38 should compose, not replace, prior proof.**
   - Recommended: reuse `verify:phase36` and `verify:phase37` as prerequisites.

3. **Human guidance is part of the closeout surface.**
   - Recommended: Phase 38 must ship at least one repo-local runbook or equivalent closeout guide.

## Conclusion

Phase 38 is a **proof-and-closeout phase**, not another transport-seam phase.
The highest-value path is:

1. publish `verify:phase38` as the milestone canonical gate,
2. unify classroom/player/runtime parity into one verification story,
3. add a repo-local fallback/demo/bootstrap runbook,
4. publish a milestone close artifact with explicit inclusions and exclusions.

Anything larger than that is probably scope creep unless a real parity gap is discovered during execution.

---

*Phase: 38-cutover-verification-fallback-and-operational-hardening*
*Research completed: 2026-05-18*
