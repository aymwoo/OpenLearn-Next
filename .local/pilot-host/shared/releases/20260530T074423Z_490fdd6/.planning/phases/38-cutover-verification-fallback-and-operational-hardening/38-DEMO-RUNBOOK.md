# Phase 38 Demo Runbook

本文件固定描述 `ws + ioredis` classroom transport 的 repo-local 演示与 smoke 路径。
按这里执行即可，不需要再 reverse-engineer 当前代码。

## 1. 默认本地姿态

仓库默认开发姿态是：

- `local_only`
- 单实例 local fanout
- 不要求 Redis 才能开发、调试或验证 websocket cutover

准备本地 demo 数据：

```bash
pnpm db:bootstrap:dev
```

该命令会明确输出：

- 全局 transport 默认：`local_only`
- 未提供 Redis 时默认保持单实例 local fanout
- 如需验证 Redis fanout，需要显式设置 `REDIS_FANOUT_ENABLED=true` 与 `REDIS_URL`

## 2. 基础 close gate

先运行 milestone 级 close gate：

```bash
pnpm verify:phase38
```

这会自动做三层检查：

1. `verify:phase36`
2. `verify:phase37`
3. Phase 38 closeout docs/static guards

## 3. 启动本地应用

```bash
pnpm dev
```

默认情况下，不设置任何 Redis 环境变量即可工作。

## 4. 登录账号

| Role | Account | Password | Use |
| --- | --- | --- | --- |
| Teacher | `teacher@example.com` | `password` | 进入 `/teacher/launch`、`/classroom`、`/settings`、runtime inspector |
| Student | `student@example.com` | `password` | 进入学生 runtime / player，验证实时学习链路 |

## 5. Local-only demo path

在不启用 Redis 的情况下，按下面顺序验证：

1. 教师登录并进入 `/teacher/launch`
2. 启动开发测试课堂
3. 打开 teacher `/classroom`
4. 学生登录进入对应 runtime / player
5. 验证 teacher control、student sync、runtime event、snapshot fallback 都能工作

此时要关注的不是 Redis，而是 websocket cutover 自身是否成立。

## 6. Redis smoke prerequisites

只有在想验证 optional Redis fanout 时，才需要显式提供以下环境：

```bash
REDIS_FANOUT_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379
```

可选：

```bash
RUNTIME_INSTANCE_ID=instance-a
REDIS_FANOUT_NAMESPACE=openlearn
```

然后运行：

```bash
pnpm verify:phase37:redis
```

或直接：

```bash
pnpm verify:phase38
```

在已设置 Redis env 的前提下，Phase 37 proof 会进入 Redis smoke 路径。

## 7. Dual-instance smoke guidance

如果要手工观察跨实例 fanout，可用两套实例 identity 启动两个 server 进程。

示意：

```bash
RUNTIME_INSTANCE_ID=instance-a pnpm dev
RUNTIME_INSTANCE_ID=instance-b pnpm dev
```

手工 smoke 时，重点不是“界面看起来没报错”，而是看以下观察点：

1. `/settings`
   - deploy authority
   - effective mode
   - 是否显示 Redis degraded
2. `/settings/labs/runtime-inspector`
   - transport topology
   - receivedVia
   - fanoutMode
   - degradedReason
3. teacher `/classroom`
   - 是否出现“当前仅保证本实例课堂同步” banner

## 8. Honest skip rules

如果没有提供 Redis capability：

- `verify:phase37` 输出 `Redis smoke skipped because deploy capability not provided`
- 这是合法结果
- 不代表 websocket cutover 失败
- 只代表 optional Redis fanout 没有进入专项验证路径

## 9. What to report during review

review 或 handoff 时，优先报告以下结论：

1. websocket baseline 是否通过 `verify:phase36`
2. optional Redis fanout 是否通过 `verify:phase37`
3. fallback posture 是否由 `/settings`、runtime inspector、teacher `/classroom` 诚实暴露
4. 当前是 `local_only`、`redis_fanout healthy`，还是 `Redis degraded local-only`

## 10. Out of scope

以下内容不属于这份 runbook 的 closeout 结论：

- PostgreSQL cutover
- BullMQ-backed fanout or async workers
- Redis Streams
- 第二 runtime
- 第三方 runtime/package
- AI runtime expansion
