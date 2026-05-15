# Architecture Research: v2.0 Runtime Platform Foundations

**Project:** OpenLearn Next  
**Researched:** 2026-05-15  
**Confidence:** HIGH

## Current Shape

当前代码库本质上还是一个 **单体 Next.js App Router 应用**，但已经出现了两个很重要的“可迁移前例”：

1. **稳定的 Server 边界已经存在**  
   `src/app` 负责路由与页面组合；`src/actions/*` 负责 Server Actions；`src/lib/dal/*` 负责 DB + authz + DTO；显式缓存与 `updateTag()` 已经是既有约束。

2. **feature root 渐进迁移已经被验证过一次**  
   `src/features/schedule/*` 不是实验文件夹，而是真实实现根；旧 `src/actions/schedule-*.ts` 与 `src/lib/dal/schedule-*.ts` 退化为 compatibility re-export。这证明“先抽 feature root，再保留旧入口适配层”是当前仓库里最安全的重构模式。

3. **课堂 runtime 已有可复用骨架**  
   学生播放器已采用 `shell + personal` 分层、`Suspense` 流式 personal state、SSE 接收课堂状态、`/api/classroom/[sessionId]/snapshot` 读取 durable snapshot。这是未来 Runtime Host 的天然接入点。

4. **插件系统目前还是 server-side proposal system，不是真 runtime**  
   现有插件链路是 `manifest -> enabled plugins -> runPluginHook() -> allowlisted action result -> UI widget`。它安全，但还没有真正的独立执行环境、生命周期、bridge、sandbox。

5. **路由元数据与主题布局系统说明“壳层与实现”可以拆开**  
   `route-surface-registry` 已经证明：把 route shell contract 从 JSX 硬编码中抽出来是可行的。V2 runtime host 也应该走“声明式 contract + resolver + renderer”这条路，而不是在页面里直接塞 iframe 逻辑。

**结论：** 最安全的路径不是一次性把仓库改造成完整 monorepo，也不是在现有页面里临时塞一套 iframe 实验，而是 **沿用 schedule 的迁移方法，做一次“单体内平台化”重构**：先引入清晰边界、目录合同、compatibility barrel，再让 runtime host 逐步替换页面内的直接实现。

---

## Target Milestone Shape

### 推荐目标：Hybrid V2，而不是一步到位 full monorepo

本 milestone 应达到的目标形态是：

- **继续保持当前 Next.js 主应用可运行、可发布、可渐进迁移**
- **在仓库内引入 V2 所需的目标边界**：`features / runtimes / packages / plugins`
- **暂不在本 milestone 强制把现有应用整体搬到 `/apps/web`**

原因很直接：

- 当前 Next.js 16、App Router、缓存、Server Actions、Auth.js、SQLite 路径都已经在根应用里稳定工作
- 一次性迁到 `/apps/web` 会把“架构重组风险”和“runtime foundation 风险”叠加
- 用户要的是“直接重构主项目”，不是“旁边再做个实验工程”；因此应 **直接在主仓库引入新结构，但保持当前 app 仍是唯一生产入口**

### 推荐目录形态

```text
src/
  app/                        # 继续作为唯一 Next.js 路由入口
  features/
    courseware/
      authoring/
      runtime/
      shared/
      ui/
    classroom/
      runtime/
      events/
      shared/
    runtime-host/
      host/
      bridge/
      shared/
      ui/
    plugins/
      registry/
      host/
      shared/
  runtimes/
    courseware/
      host-page/
      bridge-client/
      manifests/
    plugin/
      host-page/
      bridge-client/
  components/
    ...                       # 旧共享 UI 继续存在，逐步收口到 feature/ui
  actions/
    ...                       # 旧入口保留，逐步 re-export 到 feature actions
  lib/
    dal/
    dto/
    ...                       # 旧入口保留，逐步 re-export 到 feature/shared

packages/
  contracts/
    runtime-bridge/
    runtime-events/
    courseware/
  runtime-bridge/
    host-sdk/
    iframe-sdk/

plugins/
  builtin-html-courseware/
  builtin-reveal-courseware/

runtimes/
  README.md                   # 先文档化；真正独立 app/runtime 之后再拆
```

### 这个 target 的关键点

- `src/app` **保留**：因为现有 Next.js 路由、PPR、SSE、Auth、DAL 已经绑定在这里
- `src/features/*` **成为业务与平台能力的主实现根**
- `packages/*` **只承载纯 TypeScript contract / SDK，不承载 DB、cookies、Next runtime 依赖**
- `plugins/*` **只承载受控 manifest 与静态资源/构件，不承载任意远程代码执行**
- `src/runtimes/*` **先作为 Next.js 内部 host 实现区**，未来再独立为 `/apps/runtime-host`

---

## New Boundaries

下面区分 **新增边界** 与 **修改现有边界**。

### 1. 新增：Feature Public API Boundary

**现在引入：** `src/features/<domain>/index.ts`

**规则：**

- app routes 只能依赖 feature public barrel
- feature 内部可再分 `actions / server / shared / ui`
- 旧 `src/actions/*`、`src/lib/dal/*` 先作为 compatibility adapter 存在

**建议目录合同：**

```text
src/features/runtime-host/
  index.ts
  actions.ts          # Server Actions public entry
  server.ts           # server-only orchestration / DAL composition
  shared/
    dto.ts
    events.ts
    permissions.ts
  ui/
    runtime-host-surface.tsx
    runtime-frame.tsx
```

**为什么现在就要做：** 这是后续把 runtime、plugin、courseware 从 route-first 代码里抽出来的前提。

---

### 2. 新增：Runtime Host Boundary

**新增边界，不要混进 classroom page 或 player page 里。**

**职责：**

- 接收 shell DTO / runtime session DTO
- 决定加载哪种 runtime（html / reveal / future plugin runtime）
- 创建 iframe sandbox
- 建立 host ↔ iframe bridge
- 把 iframe 发出的请求转成受控 host action
- 把 classroom snapshot / step context / capability context 推送给 iframe

**禁止职责：**

- 不直接访问数据库
- 不直接读 cookies/auth（这些由 host page / server loader 解决）
- 不允许 iframe 直接拿到内部 API 密钥、session cookie、DB 标识全集

**推荐实现位置：**

- `src/features/runtime-host/*`：host orchestration
- `src/runtimes/courseware/host-page/*`：iframe 中真正执行的受限页面

---

### 3. 新增：Bridge Contract Boundary

这是 v2.0 最应该先固化的 contract。先有 contract，再有 runtime。

**推荐放在：** `packages/contracts/runtime-bridge/*`

**必须先定义的消息类型：**

| Direction | Event | Purpose |
|---|---|---|
| iframe → host | `runtime.ready` | 子 runtime 完成加载并声明能力 |
| iframe → host | `runtime.height.changed` | 请求宿主调整 iframe 高度 |
| iframe → host | `runtime.event.emitted` | 上报课堂事件/互动事件 |
| iframe → host | `runtime.submit.requested` | 请求提交学习产物 |
| iframe → host | `runtime.state.patch` | 请求保存本地运行态（草稿/临时状态） |
| host → iframe | `host.bootstrap` | 初始上下文：lesson/step/runtime/session/capabilities |
| host → iframe | `host.classroom.snapshot` | 当前课堂状态、锁定状态、活动 step |
| host → iframe | `host.navigation.changed` | 当前步骤/幻灯片/播放位置变更 |
| host → iframe | `host.command` | 允许的控制命令，如 `goToSlide`、`pause` |
| host → iframe | `host.result` | 对 submit/save/request 的结果回执 |

**必须有的 envelope 字段：**

- `protocolVersion`
- `runtimeSessionId`
- `messageId`
- `type`
- `timestamp`
- `payload`

**必须有的 host 校验：**

- 校验 `event.origin`
- 校验 `event.source === iframe.contentWindow`
- 校验 `runtimeSessionId`
- Zod 校验 message schema
- capability 校验后才执行 action

---

### 4. 新增：Runtime Event Boundary

V2 计划里强调 Event Bus，但本 milestone **不要直接把所有写路径改成异步 consumer 驱动**。

最安全做法是先引入：

```text
Server Action
  -> feature server/orchestrator
  -> DAL transaction (state change)
  -> append domain event / outbox record
  -> updateTag()
  -> optional SSE fanout
```

也就是：

- **真相源仍是当前 DAL + SQLite 写入事务**
- **事件先作为 durable outbox / domain event log 存在**
- SSE、analytics、replay、plugin consumers 逐步消费这些事件

这比“Action -> Event Bus -> Consumer -> DB”安全得多，因为：

- 当前系统依赖 Server Action 写后立即 `updateTag()` 实现 read-your-writes
- Classroom / editor / player 都已经和同步写反馈耦合
- SQLite 首发不适合一上来就把核心教学写路径全面异步化

**推荐新增合同：**

- `packages/contracts/runtime-events`
- `src/features/classroom/events`
- `src/features/courseware/runtime/events`

---

### 5. 新增：Courseware Package Boundary

不要把未来课件简单视作一段 HTML 字符串。要有“包”的概念。

**建议合同：**

```ts
type CoursewareManifest = {
  id: string
  version: string
  runtime: 'html' | 'reveal'
  entry: string
  assets: string[]
  capabilities: Array<'submit' | 'save' | 'emit-event' | 'resize' | 'navigate'>
  contentSecurityPolicy?: string
}
```

**为什么：**

- 未来 html / reveal / blockly / wasm 才能统一挂到 Runtime Host
- 当前 SQLite / published lesson version 也更容易保存“runtime descriptor”，而不是保存散乱 blob

---

### 6. 新增：Plugin Runtime Boundary

现有插件系统保留，但语义要拆成两层：

1. **现有 server plugin layer**：manifest + allowlisted action + audit
2. **新增 runtime plugin layer**：受控 iframe runtime，由 Runtime Host 托管

**本 milestone 不建议让“所有插件”立即升级成 runtime plugin。**

先只支持：

- built-in html courseware
- built-in reveal courseware

后续再开放第三方 runtime plugin。

这是最重要的 scope control。

---

### 7. 修改：App Route Boundary

**当前：** 页面常直接 import `lib/dal/*`、`components/*`

**目标：**

- `src/app/**/page.tsx` 只做 route param 解析、Suspense 编排、feature surface 组合
- route 不直接理解 runtime bridge 协议
- route 不直接处理 iframe message

**推荐页面模式：**

```text
page.tsx
  -> feature server loader / DTO loader
  -> feature surface
  -> runtime host slot
```

---

### 8. 修改：DAL Boundary

DAL 仍是硬边界，不能被 runtime 化吞掉。

**未来也不变的规则：**

- iframe runtime 永不直连 DB
- runtime bridge 永不绕过 Server Actions / server route handlers
- courseware submission / save / emit-event 最终仍走 host-side action -> DAL

**改法：**

- 新 feature server 文件组合多个 DAL
- 旧 DAL 文件逐步退化为 feature server dependency 或 compatibility re-export

---

## Integration Strategy

## 1. 总体策略：Inside-out migration

**推荐路线：** 先改“边界与适配层”，再接 runtime host，最后再谈多 runtime 扩展。

不要这样做：

- 一步把项目整体迁到 `/apps/web`
- 一步引入 Redis/Kafka/BullMQ 并重写所有写链路
- 直接让 iframe 拿 cookie 调内部 API
- 把用户 HTML 直接 `srcDoc` 到主页面并赋予同源能力

要这样做：

1. 先抽出 `runtime-host` feature root
2. 先定义 typed bridge contract
3. 用 **Next 页面中的 sandboxed iframe host** 落地第一版
4. 先让 host 成为现有 player/classroom 的“子舞台”，而不是平行新系统

---

## 2. Runtime Host 如何接到现有 app

### 教师侧链路

```text
Teacher Editor / Launch
  -> 产出 published lesson snapshot 中的 runtime descriptor
  -> Teacher Preview / Classroom Launch 读取 descriptor
  -> RuntimeHostSurface 决定是否渲染 iframe runtime
```

### 学生侧链路

```text
Student Player Page
  -> getStudentPlayerShellDTO()
  -> getStudentPlayerPersonalDTO() under Suspense
  -> ClassroomRuntimeClient
  -> StepActivityShell / CurrentStepRenderer
  -> 当 step.type 或 step.payload.runtimeDescriptor 命中 runtime step 时
     渲染 RuntimeHostSurface
```

### 课堂侧链路

```text
Classroom Page
  -> getClassroomConsoleDTO() / getClassroomSnapshotDTO()
  -> ClassroomConsoleSurface
  -> preview/live panel 中嵌入 RuntimeHostSurface
  -> live snapshot 通过 host message 转发给 iframe
```

**关键判断：** Runtime Host 不是新顶级产品路由；它首先应是 **现有 student/classroom/preview surface 内部的受控执行容器**。

---

## 3. iframe + bridge 的安全集成方式

### 推荐 iframe 策略

使用：

```html
sandbox="allow-scripts"
```

可按需要谨慎追加：

- `allow-forms`（只有课件确实需要 form submit 行为时）
- `allow-downloads`（只有导出型课件需要时）

**不要在 milestone v2.0 默认加入：**

- `allow-same-origin`
- `allow-top-navigation`
- `allow-popups`

MDN 明确提醒：`allow-scripts + allow-same-origin` 会显著削弱 sandbox 意义；跨窗口通信应优先通过 `postMessage()`，且必须校验 `origin` 与 `source`。这与项目“插件禁止任意代码越权”的安全要求一致。  
Sources: MDN iframe docs (last modified 2026-04-24), MDN postMessage docs (last modified 2026-04-13).

### 推荐 bridge 行为

- iframe 只通过 `postMessage()` 请求宿主能力
- 宿主只暴露白名单 capability，不暴露通用 `eval`/`fetch-anything` 能力
- 消息协议放在 `packages/contracts/runtime-bridge`
- 宿主收到消息后：`schema parse -> source/origin check -> capability check -> server action/route -> result ack`

### 推荐 bootstrap 方式

不要把完整 lesson/session 数据塞进 URL query。  
要用：

- `runtimeSessionId`
- 短期 bootstrap token / signed descriptor id
- 由 host page 在服务端解包成最小上下文 DTO

这样 iframe 即使被复制 URL，也拿不到完整会话权限。

---

## 4. 与当前缓存/PPR 约束的整合

Next.js 16 当前约束不能破坏：

- 公开 lesson shell / 页面框架可以缓存
- 用户态 / classroom runtime state 必须在 Suspense 下流式读取
- 写入后必须 `updateTag()` / `revalidateTag()`

**因此 Runtime Host 应分两层：**

1. **Host Shell（可缓存或半缓存）**  
   只渲染 iframe 容器、样式、runtime manifest、静态 UI chrome

2. **Host Session Region（不可缓存，Suspense 包裹）**  
   提供当前 step、classroom snapshot、capabilities、personal progress

**不要** 把当前课堂 session、lock state、student progress 放进 `use cache` 组件里。

---

## 5. Event Bus 的 milestone 级落地方式

V2 文档中的 Event Bus 方向是对的，但 milestone v2.0 应先引入 **事件合同与 durable outbox**，而不是先引入分布式基础设施。

### 当前 milestone 推荐

- `runtime_event_log` / `domain_event_outbox` 表
- 统一事件 schema
- host / classroom / analytics 从该事件流读取
- SSE 广播仍保持现有 HTTP/SSE 模式

### 延后到后续 milestone

- Redis Streams
- BullMQ
- 跨进程 consumer
- AI runtime async orchestration

**原因：** 这能把“平台演进方向”与“当前产品稳定性”解耦。

---

## Suggested Build Order

### 1. 先做目录边界，不先做多应用拆分

**第一批必须引入：**

1. `src/features/runtime-host/*`
2. `src/features/courseware/*`
3. `packages/contracts/runtime-bridge/*`
4. `packages/contracts/runtime-events/*`
5. `plugins/builtin-html-courseware/*`
6. `plugins/builtin-reveal-courseware/*`

**同时保留兼容层：**

- `src/actions/*` re-export 新 feature actions
- `src/lib/dal/*` 继续作为 DB 真相源，但逐步被 feature server 包起来

---

### 2. 先定义 contract，再接 UI

顺序建议：

1. Runtime descriptor schema
2. Bridge message schema
3. Capability schema
4. Runtime event schema
5. Host-side adapter interface

**不要先做一个“能跑的 iframe demo”再补协议。** 那会导致后续全部返工。

---

### 3. 先做 Host Surface，再接一个最小 runtime

**第一版只支持一个最小内置 runtime：**

- HTML courseware runtime 或 Reveal runtime 二选一

推荐优先：**Reveal runtime**

因为仓库里已经有 `reveal.js` 依赖，且演示型课件比“任意 HTML”更容易施加能力边界。

第一版目标：

- iframe 正常加载
- `runtime.ready`
- `host.bootstrap`
- 高度同步
- 一个提交动作 `runtime.submit.requested`
- 一个课堂状态同步 `host.classroom.snapshot`

---

### 4. 再把现有 player/classroom 接到 host

建议接入顺序：

1. `/teacher/editor/preview` 预览态接入 Runtime Host
2. `/student/player` 接入 Runtime Host
3. `/classroom` live console 接入 Runtime Host

原因：

- preview 最容易控制风险
- player 已有 `shell + personal + SSE` 分层，最适合承接 host
- classroom console 最复杂，应该最后接

---

### 5. 再引入事件 outbox 与 replay/analytics consumer

这一步不是为了炫技，而是为了后续：

- 课堂回放
- runtime 行为分析
- 插件 side-effect 审计
- AI runtime 观察性

但它应建立在 host 已经稳定工作的前提上。

---

### 6. 最后才考虑 `/apps/web` / `/apps/runtime-host`

**本 milestone 结束时可以完成“边界准备”，不必完成“物理分仓”。**

当以下条件同时满足，再考虑抽成真正的 `/apps/web`：

- 至少两个 runtime 已稳定接入
- `packages/contracts/*` 已稳定
- `src/features/*` 已成为默认实现根
- 旧 `src/actions/*` / `src/lib/dal/*` 大部分只剩 compatibility barrel

---

## Compatibility Notes

### 1. 对当前 Next.js App Router 的兼容策略

- 保持 `src/app` 不动，作为唯一路由入口
- 使用 Next.js 推荐的 project organization：route groups、private folders、code outside app 都可共存；Next 官方明确支持按 feature/route 组织，而不要求单一结构  
  Source: Next.js project structure docs, version 16.2.6, last updated 2026-05-13.

**判断：** 当前项目最适合“`src/app` 保持稳定，`src/features` 扩张为实现根”。

---

### 2. 对当前 DAL + Server Actions 规则的兼容策略

- Runtime Host 不能绕开 Server Actions
- iframe 不能直接请求内部 DB/API
- 所有 submit/save/event write 最终仍回到 host-side server action / route handler
- DAL 继续做 authz、DTO 清洗、cache tag 管理

这不是过渡方案，而是未来也应该保持的硬边界。

---

### 3. 对当前显式缓存规则的兼容策略

- cached shell 继续存在
- runtime personal/session state 必须 Suspense-streamed
- host-side mutation 后继续 `updateTag()`
- SSE 仍是课堂广播主通道；runtime host 只是 SSE consumer，不是替代者

换言之：**Runtime Host 接入现有 classroom state machine，而不是重做一套 realtime 系统。**

---

### 4. 对当前插件系统的兼容策略

- 现有 server plugin registry、allowlist、audit 全部保留
- runtime plugin 不直接替代现有 widget/plugin hook
- 两者先并存：
  - `server plugins` = 提案、注释、建议、受控动作
  - `runtime plugins` = 受 sandbox 托管的交互执行单元

这样可以避免把当前安全模型一次性推翻。

---

### 5. 对未来 AI runtime 的兼容策略

AI runtime 本 milestone **只预留边界，不真正落地执行环境**。

现在就该引入的只有：

- `packages/contracts/runtime-events`
- `packages/contracts/capabilities`
- `src/features/runtime-host/shared/permissions.ts`

不要在 Runtime Foundations milestone 中同时启动：

- Agent sandbox
- tool marketplace
- autonomous classroom control

那会把 milestone 变成失控的“平台大爆炸”。

---

## Bottom-line Recommendation

**最安全的 milestone-level 架构路线是：**

> **先做“单体内平台化”，不要先做“物理多应用化”。**  
> 用 `src/features/* + packages/contracts/* + src/runtimes/* + compatibility re-export` 的方式，把当前 Next.js 主应用重构成 V2 边界清晰的 Runtime Platform 内核；然后把 Runtime Host 作为现有 `/teacher/editor/preview`、`/student/player`、`/classroom` 的受控执行容器接进去。

如果只能选一个核心原则，那就是：

> **Runtime 可以新，DAL 边界不能破；iframe 可以上，bridge contract 必须先行；目录可以重组，但当前可运行主链路不能断。**

## Sources

- `.planning/PROJECT.md` — 项目硬约束与技术路线。Confidence: HIGH.
- `.planning/REQUIREMENTS.md` — App Router、DAL、CLASS-05、Plugin 安全边界。Confidence: HIGH.
- `.planning/ROADMAP.md` — schedule feature 与 theme/shell 演进前例。Confidence: HIGH.
- `OpenLearn-Next-V2-Architecture-Plan.md` — V2 目标方向；其中 PostgreSQL / WebSocket / full apps split 不直接照搬到本 milestone。Confidence: MEDIUM.
- `src/features/schedule/shared/boundary-map.ts` — 已验证的 compatibility re-export 迁移模式。Confidence: HIGH.
- `src/components/plugins/plugin-renderer.tsx` + `src/lib/dal/plugins.ts` + `src/server/plugins/registry.ts` — 当前插件为 server proposal system，而非 runtime sandbox。Confidence: HIGH.
- `src/components/learning/classroom-runtime-client.tsx` + `src/app/(student)/student/player/page.tsx` + `src/app/(classroom)/classroom/page.tsx` — 当前 classroom/player 的 runtime integration seam。Confidence: HIGH.
- Next.js docs: project structure, caching, `use server` (v16.2.6, last updated 2026-05-13). Confidence: HIGH.
- MDN: `<iframe>` docs (last modified 2026-04-24) and `window.postMessage()` docs (last modified 2026-04-13). Confidence: HIGH.
