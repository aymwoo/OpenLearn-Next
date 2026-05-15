# Project Research Summary

**Project:** OpenLearn Next  
**Domain:** AI-native teaching runtime platform  
**Milestone:** v2.0 Runtime Platform Foundations  
**Researched:** 2026-05-15  
**Confidence:** HIGH

## Recommended milestone posture

v2.0 应被定义为一次**单体内平台化升级**，不是一次“大爆炸重写”，也不是基础设施总迁移。核心目标不是把仓库拆得多漂亮，而是让现有 lesson → launch → classroom → evidence 主链路上，首次跑通一个真正受控的 runtime-hosted step、插件能力边界、事件日志和审计视图。

推荐姿态是：**保留当前 Next.js 16 + Auth.js v5 + Drizzle + SQLite + SSE + DAL/Server Actions 主干不动**，在此之上引入清晰 contract、runtime host、plugin lifecycle、event/outbox、transport abstraction。仓库可以开始补 `turbo.json`、抽纯协议包，但不应把 milestone 成败绑定到 `/apps/web`、PostgreSQL、Redis、WebSocket 的同步切换。

## What must ship in v2.0

1. **一个真实可运行的 runtime-hosted step**
   - 仅支持一种内置 runtime 类型即可
   - 优先目标：sandboxed courseware runtime（建议按 requirement 写成 “one built-in runtime type”，实现可在 HTML courseware 与 Reveal 之间择一）

2. **Runtime session model**
   - runtime instance 与 lesson step / classroom session / actor 建立显式关联

3. **Versioned TeachingBridge contract**
   - 至少覆盖 `ready`、`event`、`save`、`submit`
   - 统一 envelope：`protocolVersion / runtimeSessionId / messageId / type / timestamp / payload`

4. **Canonical event envelope + durable event log/outbox**
   - 关键行为至少覆盖：runtime ready、step opened、student interaction、submit、teacher control、plugin action allowed/denied
   - 事件先服务于 audit / replay foundation / notifications，不能先反客为主成为主写路径

5. **Plugin manifest v2 + lifecycle + capability enforcement**
   - 最小状态：installed / enabled / mounted / ready / suspended / disabled / failed
   - runtime/plugin 发起 action 前必须做 capability check

6. **Transport abstraction boundary**
   - 继续保留 SSE 作为默认课堂通道
   - 但产品语义从 transport 中解耦，为后续 WebSocket 留接口

7. **Runtime inspector / audit timeline**
   - 能看到 actor、event、allowed/denied、result、timestamp
   - 这是 milestone 必须有的“可运营证明”

## What must be deferred

- PostgreSQL 作为主库的正式切换
- Redis / BullMQ / distributed event bus 落地
- 全站 WebSocket 替换 SSE
- dedicated realtime app / AI gateway / runtime 微服务群
- 多 runtime 同时首发（HTML、Reveal、Blockly、WASM 全上）
- plugin marketplace / third-party open ecosystem
- arbitrary remote plugin code execution
- full AI agent runtime / autonomous classroom control
- CRDT 协作编辑、白板、媒体级 replay
- pgvector / MinIO / object storage 等与 foundation 无直接耦合的迁移

## Main migration guardrails

1. **Compatibility first**
   - 现有 teacher authoring、publish、launch、student player、classroom control 必须有 parity 回归保障

2. **Contracts before file moves**
   - 先抽 `runtime-bridge`、`runtime-events`、permissions/shared DTO，再考虑大规模包拆分

3. **Host inside current app first**
   - Runtime Host 先作为当前 `src/app` 内的受控执行容器，不先做独立服务

4. **Keep DAL as hard boundary**
   - iframe/runtime/plugin 永不直连 DB、cookie、核心 API；所有写入仍走 host-side action/route → DAL

5. **Outbox before bus**
   - 先做“事务写主状态 + append event/outbox + updateTag()”，不要先把 Event Bus 变成 primary write path

6. **Truth model must stay explicit**
   - DB = durable truth；SSE/WebSocket = delivery；Redis（未来）= ephemeral fanout only

7. **Sandbox must stay strict**
   - 默认不要 `allow-same-origin`
   - 必须做 origin/source/runtimeSessionId/schema/capability 校验

8. **One user-visible win is mandatory**
   - milestone 验收标准不是“架构边界更清晰”，而是“教师可在现有课堂里运行一个 sandboxed runtime step，学生可交互并被审计”

9. **Safety gate before expansion**
   - 若 AUTH、DATA、CLASS-05 的高风险缺口未至少收紧，就不应授权外部 runtime/plugin execution 扩大范围

## Suggested requirement categories

1. **Compatibility & regression harness**
   - 现有 lesson/classroom 主链路不回退

2. **Runtime contracts**
   - runtime descriptor、bridge messages、capability token、result envelope

3. **Runtime session & persistence**
   - runtime session、state patch、submission、event log/outbox

4. **Runtime host & sandbox execution**
   - iframe host、bootstrap、snapshot sync、高度同步、submit/save roundtrip

5. **Plugin platform safety**
   - manifest v2、lifecycle、allowlisted actions、denial audit

6. **Realtime transport boundary**
   - transport gateway、SSE adapter、future WebSocket seam

7. **Auditability & operator tooling**
   - inspector、timeline、health、allowed/denied traces

8. **Cache & invalidation discipline**
   - 写后 tag 更新矩阵、跨 route freshness、background mutation revalidation

9. **Repo boundary evolution**
   - feature public API、compatibility re-export、仅抽稳定纯 TS contracts package

## Suggested demo flow(s)

### Demo A — Runtime-hosted courseware proof
1. 教师在 lesson editor 中插入一个 runtime step
2. 绑定一个内置 runtime asset
3. 学生进入课堂，主应用通过 Runtime Host 加载 sandboxed iframe
4. runtime 发送 `runtime.ready`
5. 学生完成一次交互并触发 `event` / `save` / `submit`
6. 系统写入 durable event log 与结构化 submission
7. 教师/开发者在 inspector 中看到完整 timeline

**这是里程碑主 demo，必须能跑通。**

### Demo B — Capability-safe plugin proof
1. 管理员安装并启用一个 sample plugin
2. 插件状态流转：installed → enabled → mounted → ready
3. 插件消费一次 runtime event 并成功执行一个 allowlisted action
4. 插件再请求一个未授权 action，被 capability layer 拒绝
5. inspector 中同时看到 allowed / denied 记录与 reason

### Demo C — Transport evolution proof
1. 教师推进到 runtime step
2. classroom/runtime 事件统一经 transport gateway 发布
3. 学生端通过当前 SSE adapter 接收并更新
4. inspector 可显示 producer → transport → consumer 链路

## Roadmap-ready recommendation

建议把 milestone 规划成以下要求序列：

1. **Safety Gate / Compatibility Baseline** — 先冻结现有关键链路和回归面
2. **Contract Boundary Phase** — 定义 runtime bridge、event、capability、descriptor
3. **Persistence & Outbox Phase** — runtime session、event log、cache invalidation matrix
4. **Runtime Host Pilot Phase** — 一个内置 runtime type 跑通 teacher/student flow
5. **Plugin Capability Phase** — manifest v2、lifecycle、allowed/denied audit
6. **Transport & Inspector Phase** — transport abstraction、timeline、operator tooling

其中真正的 milestone 成功线只有一条：**在不破坏当前课堂主链路的前提下，交付一个可运行、可审计、可受控的 runtime step。**

## Sources

- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`

---
*Research completed: 2026-05-15*  
*Ready for milestone planning: yes*
