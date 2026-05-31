# Phase 40: BullMQ infra seam and worker reliability posture - Patterns

**Generated:** 2026-05-18
**Status:** Ready for planning

## Target files and analogs

| Planned file | Role | Best analog | Why it matches |
|---|---|---|---|
| `src/features/async-tasks/infra/connection.ts` | BullMQ Redis capability + connection factory | `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` | 同样需要 capability gating、health snapshot、connection observer、promise memoization |
| `src/features/async-tasks/infra/bullmq.ts` | Queue / Worker / QueueEvents factory | `src/features/runtime-platform/seams/transport/gateway.ts` | 都是 feature seam over external runtime substrate，而不是业务层直接 new client |
| `src/features/async-tasks/infra/queue-events.ts` | QueueEvents projector | `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` | 同样要 attach listener、记录 degraded/recovery posture、把 runtime 事件投影回 durable truth |
| `src/features/async-tasks/worker/bootstrap.ts` | Worker startup / graceful shutdown | `server.ts` | 都是 process bootstrap 入口，但本文件必须保持 worker-only 边界 |
| `src/server/workers/async-task-worker.ts` | Dedicated worker process entry | `server.ts` | 仓库已有独立 web entry；本文件是并列的 worker entry，而不是内联 side effect |
| `src/features/async-tasks/worker/registry.ts` | Processor registry | `src/features/async-tasks/server/registry.ts` | 当前仓库没有 BullMQ processor registry，最接近的是 typed task definition registry |
| `scripts/verify-phase40-*.ts` | Static guard + focused suites verifier | `scripts/verify-phase37-redis-fanout.ts`, `scripts/verify-phase39-async-tasks.ts` | 仓库 phase verifier 的固定写法 |

## Extracted code patterns

### Pattern 1: Redis connection modules expose capability and health snapshots

From `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`:

```ts
export function getRedisFanoutEnvironmentCapability() {
  const redisUrl = process.env.REDIS_URL?.trim() || null;
  const deployAllowsRedis =
    process.env.REDIS_FANOUT_ENABLED === "true" && Boolean(redisUrl);

  return {
    deployAllowsRedis,
    redisConfigured: Boolean(redisUrl),
    redisUrl,
  };
}
```

Planning implication:

- BullMQ connection module should expose explicit env capability, not hide env parsing in worker bootstrap.
- Health snapshot should be queryable and testable.

### Pattern 2: Connection observers centralize degraded posture

From `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`:

```ts
connection.on("ready", () => {
  setRedisConnectionState({
    redisReachable: true,
    connectionState: "ready",
    lastError: null,
  });
});
```

Planning implication:

- BullMQ connections should attach `connect/ready/reconnecting/error/close/end` listeners in one helper.
- Worker and QueueEvents degraded state must not be inferred only from thrown exceptions.

### Pattern 3: Listener attach happens once and restores desired state

From `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts`:

```ts
if (this.listenersAttached) {
  return;
}

connections.subscriber.on("ready", async () => {
  this.subscriberReady = true;
  this.subscribedTopics.clear();
  await this.restoreDesiredSubscriptions();
});
```

Planning implication:

- QueueEvents projector and worker bootstrap should be idempotent to initialize.
- Reconnect/restart behavior should restore runtime posture explicitly, not rely on accidental re-imports.

### Pattern 4: Canonical seam persists truth around external delivery

From `src/features/async-tasks/server/enqueue.ts`:

```ts
const [task] = await db
  .insert(asyncTasks)
  .values({ ... })
  .returning();

const events = await db.insert(asyncTaskEvents).values(eventRows).returning();
```

Planning implication:

- Queue dispatch should layer on top of the existing enqueue seam rather than bypass it.
- Queue add success/failure must be reflected back into the same durable task tables.

### Pattern 5: Entry scripts remain single-responsibility

From `server.ts`:

```ts
app.prepare().then(() => {
  classroomWebSocketTransportServer.initialize(httpServer);
  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

Planning implication:

- Worker entry should own worker bootstrap only.
- `server.ts` must remain web-only and should not import the worker module.

### Pattern 6: Verifiers guard source boundaries before running suites

From `scripts/verify-phase37-redis-fanout.ts`:

```ts
const staticChecks: StaticCheck[] = [ ... ];

if (failedChecks.length > 0) {
  process.exit(1);
}

runVitest(focusedSuites, "phase 37 focused suites");
```

Planning implication:

- Phase 40 verification should first assert boundary discipline:
  - no worker startup in `server.ts`
  - no direct `bullmq` import in actions/DAL
  - dedicated worker entry exists
  - graceful shutdown hooks exist

## Constraints the executor must preserve

- `server.ts` remains web-only.
- SQLite + DAL remains the only product-facing truth source for async task status.
- BullMQ connection policy is isolated from realtime Redis fanout policy.
- Worker processors do not import UI code or bypass cache invalidation discipline.
- Phase 40 proof uses a minimal platform task, not a real product workload.

---

*Phase: 40-bullmq-infra-seam-and-worker-reliability-posture*
