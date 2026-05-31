# OpenLearn Next V2 企业级架构重构设计文档

# 一、项目重新定位

OpenLearn Next 不再定位为：

```text
在线教学网站
```

而是：

# 「AI Native 教学 Runtime 平台」

系统核心目标：

- AI 原生
- Runtime 驱动
- 插件化
- 事件驱动
- 可扩展
- 多 Runtime
- 面向未来 AI 教学生态

系统未来支持：

- AI HTML课件
- Reveal.js课件
- Blockly实验
- Three.js实验
- WASM仿真
- AI Agent课堂
- 多人实时协作
- 实时白板
- AI行为分析
- 教学过程回放
- AI辅助教学
- AI生成课程

因此必须从：

```text
传统 CRUD LMS
```

升级为：

```text
Runtime Platform + Plugin Platform + AI Platform
```

---

# 二、V2 核心架构原则

## 1. Runtime First

所有动态能力必须运行在 Runtime 中。

包括：

- HTML课件
- AI Agent
- 插件
- Blockly
- WASM
- 实验系统

主系统不直接运行不可信逻辑。

---

## 2. Event Driven

所有关键行为必须事件化。

禁止：

```text
Action → DB
```

直接耦合。

必须：

```text
Action
  ↓
Event Bus
  ↓
Consumers
```

---

## 3. Plugin Native

插件必须是真正的插件。

插件必须具备：

- 生命周期
- 权限系统
- Runtime隔离
- Hook系统
- SDK
- Manifest
- Sandbox
- Capability声明

---

## 4. AI Native

AI 不再是 helper function。

AI 必须：

- Tool-based
- Permission-based
- Runtime-isolated
- Observable
- Auditable

---

# 三、总体目标

最终系统定位：

```text
AI Native Teaching Runtime Platform
```

系统本质：

```text
Runtime Platform
    +
Plugin Platform
    +
Realtime Collaboration
    +
AI Agent Platform
```

---

# 四、推荐总体架构

```text
┌────────────────────────────────────────────┐
│               Web App (Next.js)            │
├────────────────────────────────────────────┤
│ Teacher UI │ Student UI │ Admin UI │ API  │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│              Application Core              │
├────────────────────────────────────────────┤
│ Auth │ Feature Flags │ Permissions │ Cache │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│                 Event Bus                  │
├────────────────────────────────────────────┤
│ Redis Streams │ Kafka(Future) │ Consumers │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│               Runtime Layer                │
├────────────────────────────────────────────┤
│ Courseware Runtime                         │
│ Plugin Runtime                             │
│ AI Agent Runtime                           │
│ Blockly Runtime                            │
│ Experiment Runtime                         │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│               Sandbox Layer                │
├────────────────────────────────────────────┤
│ iframe │ Worker │ VM │ WASM Sandbox        │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│                 Data Layer                 │
├────────────────────────────────────────────┤
│ PostgreSQL │ Redis │ MinIO │ pgvector      │
└────────────────────────────────────────────┘
```

---

# 五、推荐技术栈

| 模块 | 技术 |
|---|---|
| 主框架 | Next.js App Router |
| 数据库 | PostgreSQL |
| ORM | Drizzle ORM |
| 实时系统 | WebSocket |
| Event Bus | Redis Streams |
| 向量搜索 | pgvector |
| 对象存储 | MinIO |
| Runtime隔离 | iframe + Worker |
| AI Runtime | 独立 Agent Runtime |
| Observability | OpenTelemetry |
| Metrics | Grafana |
| 队列 | BullMQ |
| 权限系统 | Capability Based |

---

# 六、目录结构设计

```text
/apps
  /web
  /runtime-host
  /ai-gateway

/packages
  /auth
  /event-bus
  /plugin-sdk
  /courseware-sdk
  /shared-types
  /observability
  /permissions

/features
  /courseware
    /api
    /runtime
    /sdk
    /events
    /storage
    /ui
    /permissions
    /analytics

  /classroom
    /api
    /realtime
    /presence
    /events
    /recording

  /ai
    /agents
    /tools
    /memory
    /workflows

/plugins
  /html-courseware
  /reveal-plugin
  /blockly-plugin

/runtimes
  /courseware-runtime
  /agent-runtime
  /plugin-runtime
```

---

# 七、插件系统设计

## 插件结构

```text
/plugins
  /html-courseware
    manifest.json
    runtime.ts
    permissions.json
    hooks.ts
```

## manifest.json

```json
{
  "id": "html-courseware",
  "name": "HTML Courseware",
  "version": "1.0.0",
  "runtime": "iframe",
  "permissions": [
    "courseware.submit",
    "courseware.events"
  ]
}
```

## 插件生命周期

```text
install
init
mount
ready
running
suspend
destroy
uninstall
```

---

# 八、Courseware Runtime

## Runtime 流程

```text
Next.js Main App
    ↓
Runtime Host
    ↓
iframe Sandbox
    ↓
TeachingBridge SDK
    ↓
Event Bus
```

## iframe 安全策略

推荐：

```html
sandbox="allow-scripts"
```

禁止：

```html
allow-same-origin
```

---

# 九、TeachingBridge SDK

```ts
interface TeachingBridgeAPI {
  submit(data: unknown): void

  save(data: unknown): void

  event(name: string, payload?: unknown): void

  ready(meta?: unknown): void

  collectForm(): Record<string, any>
}
```

---

# 十、数据库架构

## 推荐数据库

| 类型 | 技术 |
|---|---|
| 主数据库 | PostgreSQL |
| 实时状态 | Redis |
| 向量数据库 | pgvector |
| 文件存储 | MinIO |

## JSONB 设计

```sql
CREATE TABLE courseware_submissions (
  id UUID PRIMARY KEY,

  session_id UUID,

  data JSONB,

  created_at TIMESTAMP
)
```

---

# 十一、Event Bus 设计

```text
User Action
    ↓
Server Action
    ↓
Event Bus
    ↓
Consumers
    ├─ Analytics
    ├─ AI Analysis
    ├─ Notifications
    ├─ Replay
    └─ Audit Logs
```

---

# 十二、AI Runtime 设计

```text
AI Gateway
    ↓
Permission Layer
    ↓
Tool Runtime
    ↓
Sandbox
```

## AI Tool

```ts
interface AITool {
  id: string

  permissions: string[]

  invoke(input: unknown): Promise<unknown>
}
```

---

# 十三、实时系统

## 推荐方案

| 功能 | 技术 |
|---|---|
| WebSocket | Socket.IO |
| CRDT | Yjs |
| Presence | Redis |

---

# 十四、安全设计

## CSP

```http
Content-Security-Policy:
default-src 'none';
script-src 'self';
img-src data:;
style-src 'unsafe-inline';
```

## Runtime Isolation

| 类型 | 隔离 |
|---|---|
| HTML | iframe sandbox |
| AI | Worker |
| WASM | WASM sandbox |

---

# 十五、迁移路线

## Phase 1

- PostgreSQL
- Event Bus
- Runtime Host
- Feature Slice

## Phase 2

- Plugin Runtime
- Courseware Runtime
- Capability System
- WebSocket

## Phase 3

- AI Runtime
- CRDT
- Observability
- Knowledge Graph

## Phase 4

- Plugin Marketplace
- AI Agent Ecosystem
- Multi Runtime Federation

---

# 十六、最终总结

OpenLearn Next V2 的核心方向：

```text
AI Native Teaching Runtime Platform
```

而不是：

```text
普通在线教学网站
```

系统最终形态：

```text
Runtime Platform
    +
Plugin Platform
    +
Realtime Collaboration
    +
AI Agent Platform
```
