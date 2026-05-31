# Phase 38 Fallback Matrix

本文件固定描述 `ws + ioredis` classroom transport 在不同运行状态下的真实行为。
它不是产品宣传文案，而是 closeout 用的 operator/reviewer 事实表。

## Matrix

| State | Trigger | Effective posture | Cross-instance guarantee | Operator visibility | Student impact | Durable truth |
| --- | --- | --- | --- | --- | --- | --- |
| `ws cutover success` | WebSocket handshake、producer、consumer 都正常 | classroom / player / runtime 走 WS-first delivery | 不要求；这里只证明 websocket cutover 成立 | 可从 `/classroom`、runtime inspector 看到正常 timeline | 学生继续在当前 runtime surface 学习 | SQLite + DAL + canonical runtime write path |
| `Redis optional disabled` | deploy 未提供 Redis capability，或 product toggle 仍为 `local_only` | 新 session 默认为 `local_only` | 否 | `/settings` 会显示 deploy 或 product posture | 学生面不看到 Redis-specific 文案 | SQLite + DAL + canonical runtime write path |
| `Redis enabled and healthy` | `REDIS_FANOUT_ENABLED=true`、`REDIS_URL` 存在、deploy allows Redis、product toggle 开启，且新 session snapshot 为 `redis_fanout` | WebSocket delivery + Redis fanout | 是 | `/settings`、runtime inspector、teacher `/classroom` 可看到 `redis_fanout` 正常姿态 | 学生继续使用当前 runtime / player，不额外感知 Redis | SQLite + DAL + canonical runtime write path |
| `Redis degraded local-only` | Redis publish、subscribe 或 reconnect path 失效 | publisher-instance 仍可 local-only fallback | 否；cross-instance attempt 记失败 | `/settings`、runtime inspector、teacher `/classroom` 明确显示 degraded | 学生继续使用当前学习面；不暴露 Redis-specific 复制文案 | SQLite + DAL + canonical runtime write path |
| `snapshot/SSE rollback posture` | websocket consumer 不可用、连接关闭、或需要 durable snapshot correction | teacher / player 回到 snapshot or SSE rollback surface | 否 | runtime inspector 仍可回看 transport trace；teacher 侧可感知 reconnect/fallback | 学生停留在同一学习 surface，并由 snapshot/SSE 恢复 | SQLite + DAL + canonical runtime write path |

## Interpretation notes

### 1. `ws cutover success`

- 这证明的是 WebSocket 已经成为正式 delivery path。
- 它不要求 Redis 一定参与。
- 对应 proof 主要来自 `verify:phase36`。

### 2. `Redis optional disabled`

- 这是默认本地开发姿态。
- 没有 Redis capability 时，`local_only` 是合法、诚实、被支持的默认行为。
- 这不是“功能未完成”，而是本 milestone 的显式设计。

### 3. `Redis enabled and healthy`

- 只有新建 `classroomSession` 在 launch 时 snapshot 到 `redis_fanout`，才进入这个姿态。
- 既有 session 不会热切换。

### 4. `Redis degraded local-only`

- Redis degraded 不等于课堂完全不可用。
- publisher 实例仍可继续向本实例连接投递。
- 但 cross-instance delivery 不能伪装成成功，这一点必须由 operator surface 看见。

### 5. `snapshot/SSE rollback posture`

- SSE rollback surface 仍然是设计内事实。
- 它说明 cutover 的目标是升级 delivery path，而不是删除所有旧 recovery mechanism。

## Surface visibility summary

| Surface | What it should show |
| --- | --- |
| `/settings` | deploy authority、product toggle、effective mode、Redis degraded reason |
| `/settings/labs/runtime-inspector` | single timeline、transport topology、receivedVia、fanoutMode、degradedReason |
| teacher `/classroom` | compact degraded banner: 当前仅保证本实例课堂同步 |
| student runtime / player | reconnect、snapshot fallback、current learning continuity；不暴露 Redis-specific copy |

## Non-negotiable truths

1. Redis 只是 delivery layer，不是新的 durable truth。
2. SSE rollback surface 仍然存在。
3. Redis fanout remains optional。
4. Redis degraded local-only 时，cross-instance failure 必须诚实记录。
