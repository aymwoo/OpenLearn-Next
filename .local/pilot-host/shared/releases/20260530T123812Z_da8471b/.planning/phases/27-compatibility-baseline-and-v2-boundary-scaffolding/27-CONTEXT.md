# Phase 27: Compatibility baseline and V2 boundary scaffolding - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定先做三层骨架，而不是提前交付第一个 runtime host 功能本身。

1. 把当前课堂主链 `teacher editor -> launch -> classroom -> student player`
   冻结成可执行的 compatibility baseline，并把关键 guardrail 一并纳入回归门。
2. 在主工程内立起第一版 `runtime-platform` feature boundary、public
   barrels 和 compatibility shims，让后续 V2 改造可以增量落地，而不是
   big-bang rewrite。
3. 建立第一版 shared contracts root 与 future infra seams，让后续
   runtime bridge、runtime events、permissions、descriptors、PostgreSQL、
   Redis/Event Bus、WebSocket 都有明确边界，但本阶段不做正式 cutover。

本阶段不交付 runtime session persistence、canonical event log/outbox、
iframe runtime host、plugin lifecycle 细节、allowed/denied audit 语义、
PostgreSQL/Redis/WebSocket 的真实切换能力，也不把仓库重组成正式 multi-app
或 monorepo 部署结构。

</domain>

<decisions>
## Implementation Decisions

### Compatibility baseline
- **D-01:** Phase 27 的 compatibility baseline 不是只锁 happy path；必须同时
  冻结主链和关键 guardrail，包括 editor 的 `courseId + lessonId` 入口约束、
  launch 只读 published snapshot、classroom conflict refresh、student player
  的 `locked/unlocked + resume` 语义。
- **D-02:** 本阶段要提供单一 `verify:phase27` 作为 canonical compatibility
  gate，而不是只分散依赖旧 phase verifier 或只靠零散测试文件。
- **D-03:** `verify:phase27` 采用“组合旧 verifier + 少量新 guard”的模式：
  优先复用既有 `verify:phase3/4/5` 与 orchestration/recap/trends 相关 verifier
  的成熟断言，再补 Phase 27 自己的 boundary、shim、contracts、seams 静态检查和
  focused tests；不要重写整套旧断言矩阵。
- **D-04:** 迁移期默认兼容姿态是“旧入口继续可用”：只要主链还未完全切到新边界，
  现有 `src/app` 路由行为与 legacy `src/lib/*`、`src/actions/*` 入口就必须继续工作，
  回归要 fail loudly。

### Boundary cut
- **D-05:** Phase 27 的第一刀先切新的 `runtime-platform` 域，不在本阶段同步把
  authoring、launch、player、classroom 全部重构成各自独立 feature roots。
- **D-06:** 现有主链页面在 Phase 27 就可以开始直接依赖新的 `runtime-platform`
  public API，而不是等所有旧 facade 完成后再迁移。
- **D-07:** 被迁移触及的 legacy `src/lib/dal/*`、`src/actions/*`、`src/lib/dto/*`
  文件继续保留，但角色收敛为 thin compatibility shims / re-exports，不再作为真实
  实现所有者。
- **D-08:** 主工程里的第一版 V2 feature boundary 采用“一个 `runtime-platform`
  根 + 子域”的姿态，而不是一开始就拆成多个平级 feature roots。
- **D-09:** plugin 相关边界要在同一个 `runtime-platform` 根下先立骨架，覆盖
  capability / lifecycle / manifest v2 的占位与 ownership；但 lifecycle 细节、
  allowed/denied audit 语义和完整治理流程留给后续 phase。

### Shared contracts boundary
- **D-10:** 第一版 shared contracts 采用“一个 contracts 根，内部分域”的颗粒度，
  在同一边界下收纳 `bridge / events / permissions / descriptors`。
- **D-11:** Phase 27 先在主工程内建立 `packages/contracts/*` 的等价边界，不为了
  目录形式提前切正式 monorepo `packages/contracts`。
- **D-12:** 这版 contracts root 首先服务 host-side 边界，也就是 main project
  内的 feature facade、route、server-side adapters；runtime iframe 或未来外部包的
  直接消费能力只按未来兼容方向设计，不要求本阶段落地。
- **D-13:** contracts root 保持纯 contract 边界，只放 schema、types、常量、版本化
  public API 与 contract-level exports；不放 DAL、Server Actions、side-effect
  helper、adapter implementation 或 shared utils。

### Future infra seams
- **D-14:** PostgreSQL、Redis/Event Bus、WebSocket 在 Phase 27 要做到“显式
  adapter contract + 当前默认实现”，而不是只写注释或占位接口。
- **D-15:** 这些 seams 在结构上必须可替换，但在 Phase 27 运行时不开放真实切换，
  不提供公开或隐藏的 cutover 开关。
- **D-16:** 三类 seams 统一集中在 `runtime-platform/seams` 或等价的集中子域下，
  明确它们是平台演进接缝，而不是各业务域各自私有的 one-off 抽象。
- **D-17:** 现有 SQLite 持久写链和当前 classroom/session truth 继续是唯一真相源；
  Event Bus seam 与 transport seam 只表达未来 fan-out / delivery adapter 的位置，
  不能在 Phase 27 改变 truth ownership。

### the agent's Discretion
- `runtime-platform` 根和 contracts root 的精确物理路径、命名与 public barrel
  组织形式，可由 planner 在“不切正式 monorepo packages、一个根带子域、contracts 保持纯边界”
  前提下收敛。
- `verify:phase27` 精确组合哪些旧 verifier、哪些 focused tests 需要新增，可由
  planner 细化，但必须覆盖 authoring、launch、classroom、student player 的兼容主链，
  以及 boundary/shim/contracts/seams 的新约束。
- 主链页面迁移到新 boundary 的具体顺序可由 planner 收敛，但应以
  `/teacher/editor`、`/teacher/launch`、`/classroom`、`/student/player` 作为首批锚点，
  并保持旧入口仍可工作。
- seam adapter、default implementation、contract submodule 的具体命名可由
  planner 选择，但必须保持 centralized seams、non-switchable runtime posture
  与 existing persistence truth ownership。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — 锁定 v2.0 的总体 posture：单体内平台化、`HTML courseware`
  pilot、seams only without cutover，以及 classroom-critical flow 必须继续可运行。
- `.planning/ROADMAP.md` — Phase 27 的正式 goal、success criteria 与 4 个计划槽位；
  明确本阶段同时承担 compatibility baseline、feature roots、shared contracts 与 seams。
- `.planning/REQUIREMENTS.md` — `SAFE-01`、`SAFE-02`、`ARCH-01`、`ARCH-02`、`ARCH-03`
  的 requirement truth，以及后续 `BRDG-*`、`RTSE-*`、`RHOST-*`、`GOVR-*` 的 phase boundary。
- `.planning/STATE.md` — 当前 milestone 状态与 carry-forward 决策；说明本轮从
  Phase 27 开始进入 runtime platform foundations。
- `OpenLearn-Next-V2-Architecture-Plan.md` — 长期目标蓝图；可作为方向参考，但本阶段
  只抽取 boundary / contracts / seams 思路，不照单执行 PostgreSQL、Redis、WebSocket、
  multi-app 切换。

### Existing classroom-critical compatibility contracts
- `src/app/(teacher)/teacher/editor/page.tsx` — 当前 editor 入口合同；明确要求
  `courseId + lessonId`，是 compatibility baseline 必须守住的 guardrail。
- `src/app/(teacher)/teacher/launch/page.tsx` — 当前 launch surface 的唯一准备入口；
  Phase 27 不能让 runtime-platform scaffolding 把它替换成新主路径。
- `src/app/(classroom)/classroom/page.tsx` — 当前 classroom route 如何在同一路径内装配
  live snapshot、ended recap 与 student detail，是兼容基线的核心宿主。
- `src/app/(student)/student/player/page.tsx` — 当前 student player 的 split shell +
  Suspense personal loader posture，是后续 boundary 迁移必须保留的播放入口语义。
- `.planning/phases/24-live-classroom-operations-and-formative-evaluation/24-CONTEXT.md` —
  `/classroom` 作为 live operation 主域与 same-route student detail workflow 的锁定边界。
- `.planning/phases/25-teaching-data-capture-and-session-analytics/25-CONTEXT.md` —
  ended recap 继续留在 `/classroom`、不创建第二真相源的约束。
- `.planning/phases/26-cross-session-trends-and-stitch-productization/26-CONTEXT.md` —
  `/teacher/trends` 已是既有主导航入口，且 recap 仍是 primary detail CTA，后续 V2 不能回退这条关系。

### Existing verification pattern
- `package.json` — 仓库当前 `verify:phaseN` 入口模式；Phase 27 应继续沿用同一脚本化安全门约定。
- `scripts/verify-phase3-authoring.ts` — authoring verifier 形态；展示如何把静态 guard 与已锁定
  editor 行为合同编码成 fail-loud checks。
- `scripts/verify-phase4-learning.ts` — learning/player verifier 形态；展示 shell/personal split、
  append-only 提交与 player behavior 的保护方式。
- `scripts/verify-phase5-classroom.ts` — classroom verifier 形态；展示 session/SSE/lock mode/conflict
  recovery 如何被编码为兼容门。
- `scripts/verify-phase18-schedule.ts` — feature migration + static guards + focused tests 的组合式
  verifier 模板，适合作为 Phase 27 组织 `verify:phase27` 的参考。
- `scripts/verify-phase26-trends-productization.ts` — 展示如何把 route metadata、nav wiring、surface
  posture 与 focused regression suite 绑定到同一个 phase gate 中。

### Feature boundary and compatibility-shim precedent
- `src/features/schedule/index.ts` — 现有 feature root public barrel 先例。
- `src/features/schedule/shared/boundary-map.ts` — 当前仓库里最直接的 feature migration
  规则文档：feature root 拥有真实实现，legacy top-level files 收敛为 compatibility re-exports。
- `src/lib/dto/schedule.ts` — DTO compatibility re-export 先例。
- `src/lib/dal/schedule-runtime.ts` — DAL compatibility re-export 先例。
- `src/actions/schedule-import-actions.ts` — Server Action compatibility re-export 先例。

### Shared route, cache, and DTO contracts
- `src/lib/theme-layout/route-surface-registry.ts` — teacher route metadata 的唯一真相源；任何新增
  runtime-platform surface 都必须继续走集中 route registry，而不是新建 route string branching。
- `src/lib/navigation.ts` — 教师主导航与现有 `/teacher`、`/teacher/trends`、`/classroom`、`/teacher/editor`
  链接关系，说明后续 V2 surface 不能擅自改写当前 teacher chain ownership。
- `src/lib/cache-policy.ts` — 当前 cache tags 与 route cache boundaries；runtime-platform scaffolding
  不能破坏现有 read-your-writes 与 classroom/player freshness posture。
- `src/lib/dto/classroom.ts` — 现有 classroom/session/recap/trends typed contract 集合；既是现有 truth
  model 的代表，也是 Phase 27 设计纯 contracts 边界时可直接参照的 schema style。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-phase3-authoring.ts`、`scripts/verify-phase4-learning.ts`、
  `scripts/verify-phase5-classroom.ts`、`scripts/verify-phase18-schedule.ts`、
  `scripts/verify-phase26-trends-productization.ts`：现成的 phase verifier 资产；
  Phase 27 更适合组合它们和补新 guard，而不是重写整套兼容矩阵。
- `src/features/schedule/index.ts` + `src/features/schedule/shared/boundary-map.ts`：
  当前仓库唯一成熟的 feature-root migration 先例，可直接复用到 `runtime-platform`。
- `src/lib/dto/schedule.ts`、`src/lib/dal/schedule-runtime.ts`、`src/actions/schedule-import-actions.ts`：
  已经验证过的 thin compatibility shim 例子，说明 legacy top-level 文件可以安全退化成 re-export。
- `src/lib/theme-layout/route-surface-registry.ts`：集中 route metadata 合同；后续新增任何
  runtime-platform teacher-facing surface 时，已有接入点明确。
- `src/lib/cache-policy.ts`：现有 cache tags 和 route boundary contract，可作为 runtime descriptors、
  bridge 写入、session durability 等后续 phase 的 freshness baseline。
- `src/lib/dto/classroom.ts`：现有 DTO 规模已经证明“纯 schema/type root”在本仓库可行，适合作为
  shared contracts root 的风格先例。

### Established Patterns
- 当前仓库的安全门模式不是“只加测试文件”，而是 `package.json` 中显式暴露 `verify:phaseN`，
  再用静态 guard + focused regression suite 共同守边界。
- 当前最成功的 feature 化迁移模式是“新 feature root 拥有真实实现，旧 `src/lib/*` / `src/actions/*`
  文件保留为 compatibility re-export”；Phase 27 应沿用这个节奏，而不是双轨长期并存。
- 现有 app routes 仍然是 server-first 直接装配 surface 的结构，说明 route-level consumer 完全可以
  在不改变 UI 姿态的前提下切向新的 runtime-platform public API。
- 当前 classroom/session 持久写链、cache tag、SSE 与 recap/trends 关系已经被多个 phase 锁定，
  所以 future event/transport seams 只能加 adapter boundary，不能在本阶段碰 truth ownership。
- teacher route metadata 与 navigation 已集中注册，说明 runtime-platform scaffolding 不能用新的一套
  ad hoc route ownership 方式绕开现有 shell contract。

### Integration Points
- `package.json` 需要新增 `verify:phase27`，并把它作为后续 V2 boundary 改造的第一道 compatibility gate。
- `/teacher/editor`、`/teacher/launch`、`/classroom`、`/student/player` 是首批应切向
  `runtime-platform` public API 的 route consumers。
- 被迁移触及的 legacy `src/lib/dal/*`、`src/actions/*`、`src/lib/dto/*` 需要转成 thin shims，
  保持旧入口仍可用。
- 主工程内需要新增统一 contracts root，以及 `runtime-platform/seams` 集中子域，分别承接纯 contract
  边界和 future infra adapters。
- 若后续 scaffolding 触及 teacher-facing 新 surface，必须继续通过 `src/lib/navigation.ts` 与
  `src/lib/theme-layout/route-surface-registry.ts` 接入，而不是单独起一套导航/壳层机制。

</code_context>

<specifics>
## Specific Ideas

- 直接把 Phase 18 的迁移模式当成 Phase 27 的操作模板：feature root 拥有真实实现，legacy top-level
  文件退成 one-line re-export / shim。
- `verify:phase27` 必须成为“兼容安全门”，而不是泛泛 smoke runner；它要显式守住 authoring、launch、
  classroom、student player 的主链和关键 guardrail，并额外守住新的 boundary/shim/seam 约束。
- 第一版 V2 边界先落成一个主工程内的 `runtime-platform` 根和一个主工程内等价的 contracts root，
  不为了追求最终目录形态提前切正式 `packages/contracts` 或 multi-app 结构。
- 主链页面可以优先切到新 boundary，但旧入口仍然保留为兼容 shim，这两件事要同时成立。
- Phase 27 的 future seams 只能表达“以后可切”，不能表达“现在就能切”；任何 provider toggle、
  hidden switch、双写真相源都不属于本阶段。

</specifics>

<deferred>
## Deferred Ideas

- 正式 `packages/contracts`、完整 monorepo packages 布局、multi-app deployment
  重组 — 延后到等价边界稳定后再做。
- plugin lifecycle 细节、allowed/denied audit semantics、完整 governance flow
  — 延后到 Phase 30。
- runtime session persistence、canonical event log/outbox、TeachingBridge 详细消息合同
  — 延后到 Phase 28。
- PostgreSQL、Redis/Event Bus、WebSocket 的真实 provider 切换、cutover 开关或主链启用
  — 延后到后续 milestone/phase。
- 把 event bus 或 transport seam 提升为 primary write truth path — 本阶段明确不做。

</deferred>

---

*Phase: 27-compatibility-baseline-and-v2-boundary-scaffolding*
*Context gathered: 2026-05-15*
