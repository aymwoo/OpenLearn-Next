# OpenLearn Next AI Native 插件平台升级方案（v3.x）

## 文档目标

本文档是在现有：

- OpenLearn Next 插件系统改进方案
- JupyterLab 插件架构分析
- AI Native Runtime 架构评估

基础之上形成的：

# 下一阶段平台级升级路线图

目标：

将 OpenLearn Next 从：

> “支持 AI 的在线学习平台”

升级为：

# “AI Native Educational Operating System（教育操作系统）”

---

# 一、系统升级核心目标

平台未来需要同时满足：

| 能力 | 目标 |
|---|---|
| 插件化 | 所有功能可扩展 |
| AI Native | Agent 可原生操作系统 |
| 可治理 | 全部行为可审计 |
| 可沙箱化 | 插件与 Agent 隔离 |
| 多租户 | 学校级隔离 |
| 工作流化 | 教学流程自动化 |
| 可观测 | 全链路 tracing |
| 安全 | Capability + Sandbox |
| 可演化 | 支持未来 Agent 生态 |

---

# 二、总体升级方向

升级后的整体架构：

```text
┌────────────────────────────────────┐
│          Web App Shell             │
│        (Next.js + React)           │
└────────────────┬───────────────────┘
                 │
         Command / Event Layer
                 │
┌────────────────▼───────────────────┐
│        Platform Core Runtime       │
│                                    │
│  - Plugin Registry                 │
│  - Command Bus                     │
│  - Event Bus                       │
│  - Capability Security             │
│  - Workflow Runtime                │
│  - Agent Runtime                   │
│  - Skill Runtime                   │
│  - Governance & Audit              │
│  - Observability                   │
└────────────────┬───────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
┌─────▼─────┐      ┌────────▼────────┐
│ Extensions│      │ AI Agents       │
└───────────┘      └─────────────────┘
```

---

# 三、系统升级优先级（重新排序）

## 原方案问题

原方案：

| Phase | 风险 |
|---|---|
| QuickJS 太早 | 工程复杂度极高 |
| Shadow DOM 过早 | UI 隔离收益有限 |
| 缺 Command Bus | Agent 难规划 |
| 缺 Lifecycle | 插件不可治理 |

---

## 新优先级

| Priority | 模块 | 原因 |
|---|---|---|
| P0 | Command Bus | AI Agent 核心 |
| P1 | Dynamic Action Registry | 插件扩展基础 |
| P2 | Plugin Lifecycle | 插件治理 |
| P3 | Event Bus | 插件通信 |
| P4 | DI Container | 服务发现 |
| P5 | Observability | 可运维 |
| P6 | Shadow DOM | UI 优化 |
| P7 | QuickJS Sandbox | 高级能力 |

---

# 四、核心升级：Command Bus 架构

## 为什么必须增加 Command Bus

当前系统：

```text
Plugin -> Action
```

未来必须：

```text
Plugin
   ↓
Command Bus
   ↓
Service Layer
```

原因：

- AI Agent 可规划
- 支持 Undo / Replay
- 支持 Workflow
- 支持审计
- 支持权限校验
- 支持事件派发

---

## Command 结构

```ts
type PlatformCommand = {
  id: string;
  type: string;
  actorId: string;
  payload: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
};
```

---

## Command 生命周期

```text
Command
  ↓
Validation
  ↓
Permission Check
  ↓
Execution
  ↓
Event Emit
  ↓
Audit Log
```

---

## Command 分类

### 教学类

```text
lesson.create
lesson.update
lesson.publish
```

### AI 类

```text
ai.quiz.generate
ai.lesson.optimize
ai.summary.generate
```

### Workflow 类

```text
workflow.run
workflow.pause
workflow.resume
```

### 插件类

```text
plugin.install
plugin.enable
plugin.disable
```

---

# 五、Plugin Lifecycle 系统

## 当前问题

当前插件：

- 没有 activate
- 没有 dispose
- 没有 dependency ordering
- 没有 hot reload

---

## 新生命周期

```text
register
  ↓
resolveDependencies
  ↓
activate
  ↓
running
  ↓
deactivate
  ↓
dispose
```

---

## 插件接口

```ts
interface OpenLearnPlugin {
  manifest: PluginManifest;

  activate(context: PluginContext): Promise<void>;

  deactivate?(): Promise<void>;

  dispose?(): Promise<void>;
}
```

---

# 六、Event Bus 升级

## Command 与 Event 分离

### Command

表示：

> “请求执行动作”

例如：

```text
lesson.create
```

---

### Event

表示：

> “已经发生的事实”

例如：

```text
lesson.created
```

---

## Event Bus 职责

- 插件通信
- Workflow 触发
- Agent 监听
- Analytics
- 实时协作

---

## Event 结构

```ts
type PlatformEvent = {
  id: string;
  type: string;
  source: string;
  payload: unknown;
  timestamp: number;
};
```

---

# 七、DI 容器升级

## 当前问题

现有 DI：

- 无生命周期
- 无作用域
- 无循环检测
- 无懒加载

---

## 新 DI 设计

### Scope 支持

```text
singleton
request
workspace
session
```

---

## 生命周期管理

```text
provide
resolve
dispose
```

---

## Token 示例

```ts
export const ILessonService =
  new PluginServiceToken<ILessonService>(
    "openlearn.lesson.service",
    "课程服务"
  );
```

---

# 八、Extension Host 架构（长期核心）

## 为什么必须引入

当前：

```text
React App
 ↕
Plugin
```

问题：

- 插件可阻塞 UI
- 状态泄漏
- 崩溃影响全局

---

## 新架构

```text
App Shell
   ↓ RPC
Extension Host
   ↓
Plugin Runtime
```

---

## Extension Host 职责

- 插件生命周期
- IPC 通信
- Sandbox 管理
- 权限治理
- 性能监控

---

# 九、AI Agent Runtime 升级

## 当前问题

目前：

```text
Chat + Tool Calling
```

太弱。

---

## 新架构

```text
Agent
 ├── Planner
 ├── Memory
 ├── Tool Router
 ├── Workflow Engine
 ├── Context Manager
 ├── Permission Guard
 └── Skill Runtime
```

---

## Agent 类型

### Lesson Planner Agent

负责：

- 生成教案
- 调整课程节奏
- 推荐教学活动

---

### Quiz Generator Agent

负责：

- 生成题目
- 自动分层
- 错题分析

---

### OCR Agent

负责：

- PDF OCR
- 图片识别
- 内容结构化

---

### Analytics Agent

负责：

- 学情分析
- 风险预警
- 个性化推荐

---

# 十、Skill Runtime 升级

## Skill Manifest

```yaml
name:
version:
permissions:
inputs:
outputs:
runtime:
tools:
```

---

## Skill 生命周期

```text
load
  ↓
validate
  ↓
execute
  ↓
dispose
```

---

## Skill Runtime 类型

| 类型 | 场景 |
|---|---|
| declarative | 简单工作流 |
| sandbox-js | 安全 JS |
| docker | 高隔离 |
| remote-mcp | 外部 Agent |

---

# 十一、Capability Security 升级

## 当前方向正确

继续坚持：

# Capability-based Security

不要退回 RBAC。

---

## 权限结构

```text
resource:action:scope
```

例如：

```text
lesson:write:school
submission:read:classroom
ai:invoke:quiz
```

---

## 新增能力

### 临时权限

```text
time-limited capability
```

---

### Agent Delegation

```text
teacher
  ↓ delegate
agent
```

---

### Approval Workflow

高风险操作：

```text
agent proposes
teacher approves
system executes
```

---

# 十二、Observability（必须新增）

## 当前缺失

目前：

- 缺 metrics
- 缺 tracing
- 缺 profiling

---

## 推荐新增

### Metrics

```text
plugin execution time
agent token usage
workflow duration
sandbox memory
```

---

### Tracing

```text
Agent
  ↓
Command
  ↓
Plugin
  ↓
Service
```

---

### Audit

必须保留：

```text
governanceAudits
pluginActionAudits
```

---

# 十三、QuickJS Sandbox 延后策略

## 当前建议

不要立刻开放：

```text
用户任意 JS
```

---

## 分阶段

### 阶段 1

仅：

```yaml
workflow:
```

声明式逻辑。

---

### 阶段 2

开放：

```ts
run(ctx)
```

---

### 阶段 3

开放完整 Runtime。

---

# 十四、Shadow DOM 调整建议

## 当前方向正确

但要注意：

# Shadow DOM 不是安全机制

只是：

- CSS 隔离
- DOM 隔离

不是：

- JS 隔离

---

## 建议

| 类型 | 挂载方式 |
|---|---|
| 内置插件 | shadow-dom |
| trusted 插件 | shadow-dom |
| 第三方插件 | iframe |

---

# 十五、推荐最终技术栈

| 模块 | 技术 |
|---|---|
| Web Framework | Next.js |
| UI | React |
| Layout | Lumino |
| State | Zustand |
| Editor | Monaco |
| Realtime | Yjs |
| Workflow | Temporal |
| Event Bus | Redis Streams |
| Queue | BullMQ |
| Sandbox | QuickJS |
| Observability | OpenTelemetry |
| DB | PostgreSQL |
| Vector DB | pgvector |

---

# 十六、推荐数据库升级

## 当前问题

SQLite-first 很适合早期。

但未来：

- Workflow
- Event sourcing
- Agent memory
- Analytics

会快速增长。

---

## 推荐路线

### 当前

```text
SQLite
```

### 中期

```text
PostgreSQL
```

### AI 阶段

```text
PostgreSQL + pgvector
```

---

# 十七、推荐目录结构

```text
apps/
  web/

packages/
  core/
  command-bus/
  event-bus/
  plugin-runtime/
  agent-runtime/
  skill-runtime/
  capability-system/
  observability/

plugins/
  markdown/
  ai-chat/
  reveal/
  whiteboard/

agents/
  lesson-planner/
  analytics-agent/
  ocr-agent/

skills/
  pdf-ocr/
  ppt-generator/
```

---

# 十八、实施路线图

## 第一阶段（最重要）

### 平台核心

- Command Bus
- Action Registry
- Plugin Lifecycle
- Event Bus

### AI

- Agent Runtime
- Tool Calling

---

## 第二阶段

### 平台能力

- DI Container
- Observability
- Workflow Engine

### AI

- Memory
- Planning
- Multi-step execution

---

## 第三阶段

### 高级能力

- Extension Host
- QuickJS
- Sandboxed Skills

---

# 十九、AI Agent Friendly 设计原则

## 所有能力都必须：

### 可发现

```text
listCommands()
listCapabilities()
```

---

### 可规划

```text
command metadata
```

---

### 可审计

```text
audit trail
```

---

### 可撤销

```text
undo / replay
```

---

### 可组合

```text
workflow + commands
```

---

# 二十、最终目标

OpenLearn Next 不应该只是：

> “带 AI 的 LMS”

而应该成为：

# AI Native Educational Operating System

核心原则：

```text
Everything is Plugin
Everything is Command
Everything is Event
Everything is Capability
Everything is Observable
Everything is Agent-callable
```

