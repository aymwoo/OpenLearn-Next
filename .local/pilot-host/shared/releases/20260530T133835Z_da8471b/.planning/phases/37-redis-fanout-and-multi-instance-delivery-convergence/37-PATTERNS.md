# Phase 37: Redis fanout and multi-instance delivery convergence - Pattern Map

**Mapped:** 2026-05-18  
**Files analyzed:** 20  
**Analogs found:** 19 / 20

## File Classification

| 文件 | 变更性质 | 角色 | 数据流 | Closest Analog | Match Quality | Planner 注意点 |
|---|---|---|---|---|---|---|
| `src/features/runtime-platform/seams/transport/ws-adapter.ts` | 必须修改 | adapter | event-driven | `src/features/runtime-platform/seams/transport/ws-adapter.ts` | exact | 不要把 Redis 提升成第三 transport mode；仍是 websocket adapter 内部拓扑扩展。 |
| `src/features/runtime-platform/seams/transport/gateway.ts` | 必须修改 | gateway | event-driven | `src/features/runtime-platform/seams/transport/gateway.ts` | exact | `publishTransportEvent()` 仍是唯一 publish 入口；degraded 也必须从这里落 attempt truth。 |
| `src/features/runtime-platform/seams/transport/contract.ts` | 必须修改 | contract | transform | `src/features/runtime-platform/seams/transport/contract.ts` | exact | 优先扩 detail / trace vocabulary，不要把 outer `RuntimeTransportModeSchema` 直接改成 `redis`。 |
| `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` | 必须修改 | registry / utility | event-driven | `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` | exact | 继续只做本实例最后一跳，不要变成 Redis truth cache。 |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | 必须轻改 | gateway | streaming | `src/features/runtime-platform/seams/transport/ws-server.ts` | exact | 只挂接 subscribe lifecycle；不要把 Redis publish 搬进 inbound handler。 |
| `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` | 新增文件建议 | service / connection-factory | request-response + event-driven | `src/features/runtime-platform/seams/event-bus/default-adapter.ts` | data-flow-match | 适合做 singleton pub/sub 连接与 health snapshot。 |
| `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` | 新增文件建议 | service | pub-sub + event-driven | `src/features/runtime-platform/seams/event-bus/default-adapter.ts` + `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` | partial | 负责 ref-count、publish、subscribe、degraded fallback；不要绕开 gateway。 |
| `src/features/runtime-platform/seams/transport/redis-fanout-topics.ts` | 新增文件建议 | utility | transform | `src/features/runtime-platform/seams/transport/contract.ts` | partial | 纯函数命名器；唯一没有直接完整 analog 的文件。 |
| `src/features/runtime-platform/seams/index.ts` | 必须轻改 | config / export | transform | `src/features/runtime-platform/seams/index.ts` | exact | 只能表达 websocket capability 扩展，不要把 supportedAdapters 改成 `redis`。 |
| `src/db/schema.ts` | 必须修改 | schema / model | CRUD + transform | `src/db/schema.ts` | exact | 沿用 typed table + enum + json detail + index 风格；新增全局设置表与 session snapshot 字段。 |
| `src/lib/dal/classroom.ts` | 必须修改 | service / DAL | CRUD + request-response | `src/lib/dal/classroom.ts` | exact | `launchClassroomSession()` 是 transport mode snapshot 唯一正确落点。 |
| `src/lib/dal/system-transport-settings.ts` | 新增文件建议 | service / DAL | CRUD + request-response | `src/lib/dal/themes.ts` + `src/lib/dal/plugins.ts` + `src/lib/dal/runtime-inspector.ts` | role-match | 读 deploy authority + DB setting + role scope，返回 effective mode。 |
| `src/lib/dto/system-transport-settings.ts` | 新增文件建议 | DTO / contract | transform | `src/lib/dto/runtime-inspector.ts` + `src/lib/dto/membership.ts` | role-match | 用 Zod 固化 global setting、health、authority reason。 |
| `src/components/surfaces/settings-surface.tsx` | 必须修改 | component / surface | request-response | `src/components/surfaces/settings-surface.tsx` | exact | 复用 server-first settings surface；不新建 utilitarian admin console。 |
| `src/actions/system-transport-settings-actions.ts` | 新增文件建议 | action | request-response | `src/actions/theme-actions.ts` | role-match | 只复用 server action / `updateTag` 模式，不复用 cookie persistence。 |
| `src/lib/dal/runtime-inspector.ts` | 必须修改 | service / DAL | transform + request-response | `src/lib/dal/runtime-inspector.ts` | exact | 继续从 persisted attempts/traces 聚合；可补充 instance-memory health 注释性快照，但不要替代 DB 证据链。 |
| `src/lib/dto/runtime-inspector.ts` | 必须修改 | DTO / contract | transform | `src/lib/dto/runtime-inspector.ts` | exact | 扩 transport topology / degraded reason 字段。 |
| `src/components/surfaces/runtime-inspector-surface.tsx` | 必须修改 | component / surface | request-response | `src/components/surfaces/runtime-inspector-surface.tsx` | exact | 继续单时间线，不分 tabs；明确显示 `redis_fanout` / `local_only` / degraded。 |
| `src/components/classroom/classroom-control-panel.tsx` | 必须轻改 | component | streaming + request-response | `src/components/classroom/classroom-control-panel.tsx` | exact | 教师面可显示简洁 degradation banner；学生面不要出现 Redis 文案。 |
| `scripts/verify-phase37-redis-fanout.ts` | 新增文件建议 | script / verifier | batch | `scripts/verify-phase36-websocket-cutover.ts` | role-match | 延续“静态 guard + focused suites + typecheck + honest output”。 |
| `package.json` | 必须修改 | config | batch | `package.json` | exact | 增加 `verify:phase37`，必要时再加 `verify:phase37:redis`。 |
| `scripts/bootstrap-dev-db.ts` | 新增/轻改建议 | bootstrap script | batch | `scripts/bootstrap-dev-db.ts` | exact | 仅做 dev 默认 posture 提示或 seed singleton setting；默认应落 `local_only`。 |
| `src/features/runtime-platform/seams/event-bus/default-adapter.ts` | 只读参考不要改 | reference | pub-sub | `src/features/runtime-platform/seams/event-bus/default-adapter.ts` | exact-reference | 可借鉴 singleton subscriber map / unsubscribe 清理，但 Phase 37 不改 event-bus seam。 |
| `src/actions/theme-actions.ts` | 只读参考不要改 | reference | request-response | `src/actions/theme-actions.ts` | exact-reference | 只借 server action + cache invalidation 手法；不能借 cookie 持久化。 |

## Pattern Assignments

### 1. `src/features/runtime-platform/seams/transport/ws-adapter.ts`（必须修改）

**Analog:** `src/features/runtime-platform/seams/transport/ws-adapter.ts`  
**辅助 analog:** `src/features/runtime-platform/seams/transport/ws-connection-registry.ts`

**为什么复用它**

- 这里已经是 websocket delivery 的唯一 adapter 边界。
- 当前实现把 canonical envelope 转成 ws envelope，再交给 registry；Phase 37 最小改法就是“保留映射层，改委托目标”。

**当前 core pattern**

- `src/features/runtime-platform/seams/transport/ws-adapter.ts:45-75`

```ts
class WebSocketRuntimeTransportAdapter implements RuntimeTransportAdapter {
  readonly id = "transport-websocket-adapter";
  readonly mode = "websocket" as const;

  async deliver(envelope: RuntimeTransportEnvelope): Promise<void> {
    const parsed = RuntimeTransportEnvelopeSchema.parse(envelope);

    classroomWebSocketConnectionRegistry.broadcast(
      parsed.sessionId,
      buildClassroomWebSocketServerEnvelope({
        sessionId: parsed.sessionId,
        actor: resolveEnvelopeActor(parsed),
        kind: resolveWebSocketTransportKind(parsed.kind),
        correlationId: parsed.correlationId,
        causationId: parsed.truthRef.id,
        payload: {
          channel: parsed.channel,
          kind: parsed.kind,
          correlationId: parsed.correlationId,
          truthRef: parsed.truthRef,
          ...parsed.payload,
        },
        truthPersisted: true,
      }),
    );
  }
}
```

**Planner 复制点**

- 保留 `RuntimeTransportEnvelopeSchema.parse(envelope)` 的 schema-first posture。
- 保留 `buildClassroomWebSocketServerEnvelope(...)` 的 canonical metadata 透传。
- 把 `classroomWebSocketConnectionRegistry.broadcast(...)` 改成 `redisFanoutManager.deliver(...)` 或等价委托，不要在 adapter 内自己写 Redis publish 细节。

**禁止偏航**

- 不要把 `mode` 改成 `redis`。
- 不要在 adapter 里读取全局当前设置；应读取 session snapshot 或由 manager/DAL 统一解析。

---

### 2. `src/features/runtime-platform/seams/transport/gateway.ts`（必须修改）

**Analog:** `src/features/runtime-platform/seams/transport/gateway.ts`

**为什么复用它**

- 当前仓库所有 transport attempt / consumer trace 都在这里落 durable 证据。
- Redis degraded honesty 只能从这里统一表达，否则 planner 会再造第二条 publish truth。

**当前 single-entry pattern**

- `src/features/runtime-platform/seams/transport/gateway.ts:75-100`

```ts
export async function publishTransportEvent(input: RuntimeTransportPublishInput): Promise<RuntimeTransportPublishResult> {
  const event = RuntimeTransportPublishInputSchema.parse(input);
  const adapter = resolveTransportAdapter(event);
  const supplementalAdapters = resolveSupplementalTransportAdapters(event, adapter);

  const [attempt] = await db
    .insert(transportDeliveryAttempts)
    .values({
      runtimeSessionId: event.truthRef.runtimeSessionId ?? null,
      classroomSessionId: event.truthRef.classroomSessionId ?? event.sessionId,
      channel: event.channel,
      kind: event.kind,
      adapterId: adapter?.id ?? null,
      adapterMode: adapter?.mode ?? null,
      attemptStatus: adapter ? "pending" : "skipped",
      payloadSummaryJson: summarizePayload(event.payload),
    })
    .returning();
```

**当前 failure / trace pattern**

- `src/features/runtime-platform/seams/transport/gateway.ts:133-148`
- `src/features/runtime-platform/seams/transport/gateway.ts:170-191`

```ts
return recordTransportConsumerTrace({
  attemptId: attempt.id,
  sessionId: event.sessionId,
  correlationId: event.correlationId,
  adapterId: secondaryAdapter.id,
  adapterMode: secondaryAdapter.mode,
  traceType: "stream_failed",
  status: "failed",
  detail: {
    supplemental: true,
    primaryAdapterId: adapter.id,
    failureReason,
    kind: event.kind,
  },
});
```

```ts
await db
  .update(transportDeliveryAttempts)
  .set({
    deliveryAttempted: true,
    attemptStatus: "failed",
    failureReason,
    failedAt: new Date(),
  })
```

**Planner 复制点**

- Redis fanout 成功/失败都必须复用 `transportDeliveryAttempts` 更新模式。
- 如果是 `redis_fanout` session 但只发生 local fallback，attempt 仍应记 `failed`，并把 degraded reason 写到 `failureReason` / `payloadSummaryJson`。
- `recordTransportConsumerTrace()` 继续作为 subscriber receive / local emit / stream_failed 的统一记账入口。

---

### 3. `src/features/runtime-platform/seams/transport/contract.ts`（必须修改）

**Analog:** `src/features/runtime-platform/seams/transport/contract.ts`

**关键模式**

- `src/features/runtime-platform/seams/transport/contract.ts:3-24`

```ts
export const RuntimeTransportModeSchema = z.enum(["sse", "websocket"]);

export const RuntimeTransportAttemptStatusSchema = z.enum([
  "pending",
  "delivered",
  "failed",
  "skipped",
]);

export const RuntimeTransportConsumerTraceTypeSchema = z.enum([
  "snapshot",
  "keepalive",
  "stream_closed",
  "stream_failed",
  "runtime_event",
]);
```

**Planner 复制点**

- 保持 outer `RuntimeTransportModeSchema = sse | websocket`。
- Phase 37 更适合扩 `detail` / `payloadSummaryJson` / trace vocabulary，而不是把 Redis 塞成第三 transport mode。
- 若需表达 `fanoutMode`，优先新增 `local_only | redis_fanout` 作为 session snapshot / DTO vocabulary，而非 adapterMode。

---

### 4. `src/features/runtime-platform/seams/transport/ws-connection-registry.ts`（必须修改）

**Analog:** `src/features/runtime-platform/seams/transport/ws-connection-registry.ts`

**当前 registry pattern**

- `src/features/runtime-platform/seams/transport/ws-connection-registry.ts:34-63`
- `src/features/runtime-platform/seams/transport/ws-connection-registry.ts:95-105`

```ts
class ClassroomWebSocketConnectionRegistry {
  private readonly bySession = new Map<string, Map<string, ConnectionRecord>>();

  register(input: { sessionId: string; actorId: string; actorScope: ClassroomWebSocketActorScope; schoolId: string; socket: WebSocket; }) {
    const parsed = ClassroomWebSocketConnectionRegistrationSchema.parse(input);
    const id = crypto.randomUUID();
    ...
    const sessionBucket = this.bySession.get(parsed.sessionId) ?? new Map<string, ConnectionRecord>();
    sessionBucket.set(id, record);
    this.bySession.set(parsed.sessionId, sessionBucket);
    return record;
  }
```

```ts
broadcast(sessionId: string, envelope: ClassroomWebSocketServerEnvelope) {
  const payload = JSON.stringify(envelope);

  for (const connection of this.listBySession(sessionId)) {
    if (connection.socket.readyState !== connection.socket.OPEN) {
      this.unregister(sessionId, connection.id);
      continue;
    }

    connection.socket.send(payload);
  }
}
```

**Planner 复制点**

- 保留 `sessionId -> connections` 的本实例 ownership。
- 适合新增“注册后返回 session owner count / 当前 connectionCount”的 helper，供 Redis manager 做 subscribe ref-count。
- 不要在 registry 中加入 Redis client；registry 只做 final-hop local broadcast。

---

### 5. `src/features/runtime-platform/seams/transport/ws-server.ts`（必须轻改）

**Analog:** `src/features/runtime-platform/seams/transport/ws-server.ts`

**当前连接生命周期 pattern**

- `src/features/runtime-platform/seams/transport/ws-server.ts:370-406`

```ts
this.server.on(
  "connection",
  async (ws: WebSocket, _request: IncomingMessage, context: ClassroomWebSocketContext) => {
    const connection = classroomWebSocketConnectionRegistry.register({
      sessionId: context.sessionId,
      actorId: context.userId,
      actorScope: context.actorScope,
      schoolId: context.schoolId,
      socket: ws,
    });

    await sendClassroomSnapshot(ws, context, crypto.randomUUID());

    ws.on("close", async () => {
      classroomWebSocketConnectionRegistry.unregister(context.sessionId, connection.id);
      await recordTransportConsumerTrace({
        sessionId: context.sessionId,
        correlationId: `classroom:${context.sessionId}:connection:${connection.id}:closed`,
        adapterId: "transport-websocket-adapter",
        adapterMode: "websocket",
        traceType: "stream_closed",
        status: "closed",
      });
    });
  },
);
```

**Planner 复制点**

- Redis subscribe lifecycle 应挂在 register/unregister 之后，而不是 message handler 里。
- `sendClassroomSnapshot()` 与 inbound teacher/runtime handler 不应直接耦合 Redis。
- 关闭连接后的 `recordTransportConsumerTrace()` 模式应继续沿用。

---

### 6. `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`（新增建议）

**Closest analog:** `src/features/runtime-platform/seams/event-bus/default-adapter.ts`

**为什么选它**

- 仓库里最接近“单例连接 + subscriber map + 清理”的是 event-bus default adapter。
- Phase 37 虽然不是 event-bus，但它的 in-memory subscriber lifecycle 很适合借形状。

**可复制形状**

- `src/features/runtime-platform/seams/event-bus/default-adapter.ts:20-58`

```ts
class DefaultRuntimeEventBusAdapter implements RuntimeEventBusAdapter {
  readonly id = "event-bus-default-adapter";
  private readonly subscribers = new Map<string, Set<RuntimeEventHandler>>();

  async publish(event: RuntimeEventEnvelope): Promise<void> {
    const parsed = RuntimeEventEnvelopeSchema.parse(event);
    const handlers = this.subscribers.get(parsed.topic);
    if (!handlers || handlers.size === 0) {
      return;
    }
    await Promise.all([...handlers].map((handler) => handler(parsed)));
  }

  subscribe(topic: string, handler: RuntimeEventHandler): () => void {
    const listeners = this.subscribers.get(topic) ?? new Set<RuntimeEventHandler>();
    listeners.add(handler);
    this.subscribers.set(topic, listeners);
    return () => { ... }
  }
}
```

**Planner 复制点**

- 新文件适合做 singleton `pub` / `sub` 工厂与 `getHealthSnapshot()`。
- 只借“单例 + 清理 + 明确 subscribe/unsubscribe”形状，不借 event-bus contract 本身。
- 连接健康应暴露 memory snapshot，供 settings/inspector 读取。

---

### 7. `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts`（新增建议）

**Closest analog:** `src/features/runtime-platform/seams/event-bus/default-adapter.ts` + `src/features/runtime-platform/seams/transport/ws-connection-registry.ts`

**推荐职责**

- `publish(...)`
- `ensureSubscribed(sessionId, subchannel)`
- `releaseSubscription(sessionId, subchannel)`
- `getHealthSnapshot()`
- `deliverToLocalRegistry(...)`

**Planner 注意点**

- 正常路径统一由 subscriber 回调 fanout 到 local registry，避免 publisher 本地直发 + subscriber 再直发的重复投递。
- degraded 时才允许 publisher instance 做 local fallback。
- manager 只接受 canonical envelope；不能让业务层直接 import 它来发 Redis。

---

### 8. `src/features/runtime-platform/seams/transport/redis-fanout-topics.ts`（新增建议）

**Closest analog:** `src/features/runtime-platform/seams/transport/contract.ts`  
**Match gap:** 仓库没有现成 topic-builder 文件。

**可复制的约束来源**

- `src/features/runtime-platform/seams/transport/contract.ts:41-48`

```ts
export const RuntimeTransportEnvelopeSchema = z.object({
  sessionId: z.string().min(1),
  channel: z.string().min(1),
  kind: z.string().min(1),
  correlationId: z.string().min(1),
  truthRef: RuntimeTransportTruthRefSchema,
  payload: z.record(z.string(), z.unknown()),
});
```

**Planner 注意点**

- topic builder 应消费 `sessionId + channel`，而不是重写业务 vocabulary。
- 建议输出 `namespace:classroom-session:${sessionId}:${subchannel}` 之类纯函数结果。
- 固定只做 `classroom` / `runtime` 两级子 channel；不要细分到 per-command。

---

### 9. `src/db/schema.ts`（必须修改）

**Analog:** `src/db/schema.ts`

**当前 session truth pattern**

- `src/db/schema.ts:453-485`

```ts
export const classroomSessions = sqliteTable(
  "classroomSession",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    classId: text("classId").notNull().references(() => classes.id, { onDelete: "cascade" }),
    teacherId: text("teacherId").notNull().references(() => users.id, { onDelete: "cascade" }),
    activeStepId: text("activeStepId").notNull().references(() => lessonSteps.id, { onDelete: "cascade" }),
    locked: integer("locked", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["live", "ended"] }).notNull().default("live"),
    version: integer("version").notNull().default(1),
  },
)
```

**当前 transport evidence pattern**

- `src/db/schema.ts:694-769`

```ts
export const transportDeliveryAttempts = sqliteTable(
  "transportDeliveryAttempt",
  {
    adapterMode: text("adapterMode", { enum: ["sse", "websocket"] }),
    attemptStatus: text("attemptStatus", { enum: ["pending", "delivered", "failed", "skipped"] }).notNull().default("pending"),
    payloadSummaryJson: text("payloadSummaryJson", { mode: "json" }).notNull(),
    failureReason: text("failureReason"),
  },
)

export const transportConsumerTraces = sqliteTable(
  "transportConsumerTrace",
  {
    adapterMode: text("adapterMode", { enum: ["sse", "websocket"] }).notNull(),
    traceType: text("traceType", { enum: ["snapshot", "keepalive", "stream_closed", "stream_failed", "runtime_event"] }).notNull(),
    detailJson: text("detailJson", { mode: "json" }).notNull(),
  },
)
```

**Planner 复制点**

- 新增 `systemTransportSettings` 时沿用 typed table，不要上来造泛型 KV config 表。
- 给 `classroomSessions` 新增 `transportModeSnapshot` 时沿用 enum text 列风格。
- Redis 细节优先放 `payloadSummaryJson` / `detailJson`，避免过早炸出很多新列。
- 所有 FK 继续 `onDelete: "cascade"`。

---

### 10. `src/lib/dal/classroom.ts`（必须修改）

**Analog:** `src/lib/dal/classroom.ts`

**当前 canonical publish helper**

- `src/lib/dal/classroom.ts:92-114`

```ts
async function publishClassroomTransportEvent(input: {
  sessionId: string;
  schoolId?: string | null;
  eventId: string;
  correlationId: string;
  kind: "launched" | "active_step_changed" | "lock_mode_changed" | "slide_changed" | "ended";
  payload: Record<string, unknown>;
}) {
  return publishTransportEvent({
    sessionId: input.sessionId,
    channel: "classroom-events",
    kind: input.kind,
    correlationId: input.correlationId,
    truthPersisted: true,
    truthRef: {
      type: "classroom-event",
      id: input.eventId,
      classroomSessionId: input.sessionId,
      schoolId: input.schoolId ?? undefined,
    },
    payload: input.payload,
  });
}
```

**当前 session create transaction pattern**

- `src/lib/dal/classroom.ts:2887-2983`

```ts
export async function launchClassroomSession(input: unknown) {
  const payload = LaunchClassroomInputSchema.parse(input);
  const scope = await assertActiveTeacher();
  ...
  const { session, launchEventId } = await db.transaction(async (tx) => {
    const [newSession] = await tx.insert(classroomSessions).values({
      lessonId: payload.lessonId,
      publishedVersionId: payload.publishedVersionId,
      classId: payload.classId,
      teacherId: scope.userId,
      activeStepId: firstStep.id,
      locked: false,
      status: "live",
      version: 1,
    }).returning();
    ...
    return { session: newSession, launchEventId: launchEvent.id };
  });

  await publishClassroomTransportEvent({
    sessionId: session.id,
    schoolId: clazz.schoolId,
    eventId: launchEventId,
    correlationId: `classroom:${session.id}:launched:${session.version}`,
    kind: "launched",
    payload: { activeStepId: session.activeStepId, locked: session.locked, version: session.version },
  });
}
```

**Planner 复制点**

- 在 transaction 里插入 `classroomSessions` 时一次性写 `transportModeSnapshot`。
- snapshot 决策只能发生在这里；后面的 `changeClassroom*` 不要重新读全局当前设置。
- 继续保持“先 durable truth、再 publishTransportEvent()”顺序。

---

### 11. `src/lib/dal/system-transport-settings.ts`（新增建议）

**Closest analog:** `src/lib/dal/themes.ts` + `src/lib/dal/plugins.ts` + `src/lib/dal/runtime-inspector.ts`

**角色 / 权限 analog**

- `src/lib/dal/runtime-inspector.ts:36-68`

```ts
async function resolveInspectorScope() {
  const user = await getCurrentUserDTO();
  const memberships = await getUserMembershipsDTO(user.id);
  const activeMemberships = memberships.filter((membership) => membership.status === "active");

  if (activeMemberships.some((membership) => membership.role === "developer")) {
    return { role: "developer" as const, actorId: user.id, schoolIds: activeSchoolIds };
  }

  if (activeMemberships.some((membership) => membership.role === "admin")) {
    return { role: "admin" as const, actorId: user.id, schoolIds: activeSchoolIds };
  }
}
```

**DAL read pattern**

- `src/lib/dal/themes.ts:59-67`

```ts
export async function getValidThemesForSchool(schoolId: string): Promise<ThemeRegistryDTO[]> {
  const rows = await db.query.themeTokenRegistries.findMany({
    where: and(eq(themeTokenRegistries.schoolId, schoolId), eq(themeTokenRegistries.validationStatus, "valid")),
  });

  return rows.map(toThemeDTO).sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}
```

**mutation auth pattern**

- `src/lib/dal/plugins.ts:57-66`

```ts
async function assertTeacherManagerScope(input: PluginManagerScopeInput) {
  assertActorId(input.actorId);

  const scope = await assertActiveTeacher();
  if (scope.userId !== input.actorId || !scope.schoolIds.includes(input.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}
```

**Planner 复制点**

- 新 DAL 需要自己定义 `developer/super_admin` 权限断言，不要硬套 teacher-only scope。
- 读模型应同时返回：deploy authority、DB toggle、redis reachable、effective mode、reason code。
- 这里是 settings / classroom launch / verifier 的共同真相入口。

---

### 12. `src/components/surfaces/settings-surface.tsx`（必须修改）

**Analog:** `src/components/surfaces/settings-surface.tsx`

**当前 server-first surface pattern**

- `src/components/surfaces/settings-surface.tsx:62-70`

```ts
export async function SettingsSurface({ mode }: SettingsSurfaceProps) {
  const schoolIds = await getCurrentUserSchoolIds();
  const schoolId = schoolIds[0] ?? null;

  if (mode === "labs") {
    return <LabsSettingsSurface schoolId={schoolId} />;
  }

  return <GeneralSettingsSurface schoolId={schoolId} />;
}
```

**当前 general settings section pattern**

- `src/components/surfaces/settings-surface.tsx:147-169`

```tsx
<div className={teacherSurfaceRhythm.hero}>
  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
    <div className={surfaceWidths.heroTitle}>
      <Badge variant="accent" className="bg-surface-container-lowest">
        通用设置
      </Badge>
      <h2 className="mt-4 text-[2.2rem] font-semibold tracking-[-0.02em]">
        管理系统界面与基础功能偏好
      </h2>
    </div>
    <Button className="text-base">保存更改</Button>
  </div>
</div>
```

**Planner 复制点**

- Redis 全局设置优先并入现有 general settings 或 labs settings 区块，不要新开独立管理台。
- 继续用 server component 直接拿 DAL DTO，再配合 server action form 提交。
- UI 需要区分：deploy disallowed / deploy allowed but product disabled / redis enabled / degraded。

---

### 13. `src/actions/system-transport-settings-actions.ts`（新增建议）

**Closest analog:** `src/actions/theme-actions.ts`

**当前 action + cache invalidation pattern**

- `src/actions/theme-actions.ts:39-64`
- `src/actions/theme-actions.ts:68-88`

```ts
export async function setActiveThemeAction(input: FormData | Record<string, unknown>) {
  const parsed = SetActiveThemeSchema.safeParse(normalizeInput(input));
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    ...
    revalidatePath("/", "layout");
    return { success: true, data: { themeId } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "THEME_SET_FAILED" };
  }
}
```

```ts
updateTag(cacheTags.themeRegistry);
updateTag(cacheTags.theme(theme.id));
revalidatePath("/", "layout");
```

**Planner 复制点**

- 复用：`safeParse -> try/catch -> success/error object -> updateTag/revalidatePath`。
- 不复用：theme cookie persistence。
- 新 action 应调用 `lib/dal/system-transport-settings.ts`，而不是自己直连 DB 逻辑散落在 action 层。

---

### 14. `src/lib/dal/runtime-inspector.ts` + `src/lib/dto/runtime-inspector.ts` + `src/components/surfaces/runtime-inspector-surface.tsx`（必须修改）

**Analog:** 当前 runtime inspector 三件套

**当前 timeline aggregation pattern**

- `src/lib/dal/runtime-inspector.ts:136-158`
- `src/lib/dal/runtime-inspector.ts:213-245`

```ts
const [lifecycleRows, governanceRows, transportRows, consumerRows, classroomRows, pluginAuditRows] =
  await Promise.all([
    db.query.runtimeLifecycleTransitions.findMany(...),
    db.query.governanceAudits.findMany(...),
    db.query.transportDeliveryAttempts.findMany(...),
    db.query.transportConsumerTraces.findMany(...),
  ]);
```

```ts
for (const row of transportRows) {
  timeline.push({
    id: `transport-${row.id}`,
    lane: "transport",
    title: `${row.channel} / ${row.kind}`,
    detail: row.failureReason ?? row.attemptStatus,
    correlationId: row.correlationId,
    status: row.attemptStatus,
  });
}
```

**当前 DTO pattern**

- `src/lib/dto/runtime-inspector.ts:45-76`

```ts
export const RuntimeInspectorHealthSummaryDTOSchema = z.object({
  lifecycleState: z.string(),
  governanceDecision: RuntimeInspectorHealthDecisionSchema,
  transportAttemptStatus: RuntimeInspectorHealthTransportSchema,
  consumerTraceStatus: RuntimeInspectorHealthConsumerSchema,
  allowedCount: z.number().int().nonnegative(),
  deniedCount: z.number().int().nonnegative(),
  deliveredCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
});
```

**当前 surface pattern**

- `src/components/surfaces/runtime-inspector-surface.tsx:56-61`
- `src/components/surfaces/runtime-inspector-surface.tsx:96-125`

```tsx
<MetricCard icon={<Activity className="size-4" />} label="Lifecycle" value={inspector.health.lifecycleState} />
<MetricCard icon={<ShieldCheck className="size-4" />} label="Governance" value={inspector.health.governanceDecision} />
<MetricCard icon={<Signal className="size-4" />} label="Transport" value={inspector.health.transportAttemptStatus} />
<MetricCard icon={<TimerReset className="size-4" />} label="Consumer" value={inspector.health.consumerTraceStatus} />
```

```tsx
{inspector.timeline.map((item) => (
  <article key={item.id} ...>
    <Badge ...>{item.lane}</Badge>
    {item.status ? <Badge ...>{item.status}</Badge> : null}
    <h3 ...>{item.title}</h3>
    <p ...>{item.detail}</p>
  </article>
))}
```

**Planner 复制点**

- 继续“单时间线 + summary metrics”模型，不分 tabs。
- Redis 相关扩展应进入 transport/consumer lane 与 health summary，而不是建第二 inspector 页面。
- 可以增加 `transportTopology`、`degraded`、`degradedReason`、`fanoutMode`、`receivedVia` 等 DTO 字段。

---

### 15. `src/components/classroom/classroom-control-panel.tsx`（必须轻改）

**Analog:** `src/components/classroom/classroom-control-panel.tsx`

**当前 operator feedback pattern**

- `src/components/classroom/classroom-control-panel.tsx:394-421`

```tsx
{showRuntimeProofFeedback ? (
  <Card className="bg-surface-container-low p-5 sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm text-on-surface-variant">proof first-feedback</p>
        <h3 className="mt-2 text-2xl font-semibold text-on-surface">
          ...
        </h3>
      </div>
      {runtimeInspectorHref ? (
        <Button asChild variant="secondary" className="min-h-[44px] px-5">
          <Link href={runtimeInspectorHref}>查看运行轨迹</Link>
        </Button>
      ) : null}
    </div>
  </Card>
) : null}
```

**Planner 复制点**

- Redis degraded 提示适合复用这种“上方运营提示卡 + drill-down 链接”模式。
- 只给 teacher/operator 提示，不要把 Redis 状态塞给 student runtime client。
- 文案应明确“当前仅保证本实例同步，跨实例 fanout 已失效”。

---

### 16. `scripts/verify-phase37-redis-fanout.ts` + `package.json`（新增/必须修改）

**Analog:** `scripts/verify-phase36-websocket-cutover.ts` + `package.json`

**当前 verifier structure**

- `scripts/verify-phase36-websocket-cutover.ts:25-52`
- `scripts/verify-phase36-websocket-cutover.ts:65-124`
- `scripts/verify-phase36-websocket-cutover.ts:136-152`

```ts
function runVitest(paths: readonly string[], label: string) {
  const directRunner = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  ...
  runPnpm(["exec", "vitest", "--run", ...paths], label);
}
```

```ts
const staticChecks: StaticCheck[] = [
  {
    label: "package.json exposes verify:phase36",
    passed: packageSource.includes('"verify:phase36"'),
  },
  ...
];
```

```ts
runVitest(focusedSuites, "phase 36 focused suites");
runPnpm(["typecheck"], "pnpm typecheck");

console.log("Phase 36 websocket cutover verification passed");
console.log("- SSE rollback surface remains available via /api/classroom/:sessionId/events");
```

**当前 script registration pattern**

- `package.json:5-45`

```json
"scripts": {
  "verify:phase36": "node --import tsx scripts/verify-phase36-websocket-cutover.ts",
  "db:bootstrap:dev": "pnpm db:migrate && tsx scripts/bootstrap-dev-db.ts"
}
```

**Planner 复制点**

- 新 verifier 延续：静态 guard + focused suites + typecheck + honest output。
- 可选 Redis integration 建议按环境诚实 skip，不要假装本机默认有 Redis。
- `package.json` 只需沿用 phase script 命名规律。

---

### 17. `scripts/bootstrap-dev-db.ts`（新增/轻改建议）

**Analog:** `scripts/bootstrap-dev-db.ts`

**当前 bootstrap pattern**

- `scripts/bootstrap-dev-db.ts:557-595`

```ts
export async function bootstrapDevDb() {
  const seeded = await seedTestAccounts();
  const devClass = await getOrCreateClass(seeded.school.id);
  ...
  console.log("开发数据库 bootstrap 完成：");
  console.log(`- 学校：${seeded.school.name}`);
  console.log(`- 教师账号：${seeded.teacher.email} / password`);
}
```

**Planner 复制点**

- 如果需要 seed `systemTransportSettings` singleton，复用这里的“幂等 upsert + console note”姿势。
- 默认 seed 值应诚实是 `local_only` 或 product-disabled，不要在 dev bootstrap 里偷偷开 Redis。

## Shared Patterns

### A. 单一 canonical publish 入口

**来源：** `src/features/runtime-platform/seams/transport/gateway.ts:75-193`、`src/lib/dal/classroom.ts:92-114`

- 所有业务写链仍然 `truth persisted -> publishTransportEvent()`。
- Redis 只能作为 websocket delivery 内部能力，不能成为第二条 producer 路。

### B. session-snapshot 优先于全局当前值

**来源：** `src/lib/dal/classroom.ts:2887-2983`

- 只在 `launchClassroomSession()` 读取全局设置与 deploy authority。
- 后续 publish / handshake / subscribe 都读 `classroomSessions.transportModeSnapshot`。

### C. typed schema + json detail，而不是拍脑袋扩散状态

**来源：** `src/db/schema.ts:694-769`

- `payloadSummaryJson` / `detailJson` 已经是 transport 扩 detail 的现成落点。
- Redis 的 `fanoutMode`、`redisTopic`、`degradedReason`、`receivedVia` 优先塞到这些 JSON 中。

### D. settings / inspector 都是 server-first surface

**来源：** `src/components/surfaces/settings-surface.tsx:62-70`、`src/app/settings/page.tsx:1-11`、`src/app/settings/labs/runtime-inspector/page.tsx:8-19`

- UI 不直连 DB。
- route 继续薄，DAL 提供 DTO，surface 负责展示，action 负责 mutation。

### E. 教师态 degradation 提示复用现有 operator card 语言

**来源：** `src/components/classroom/classroom-control-panel.tsx:394-421`

- 用一张轻量但明确的提示卡展示 degrade。
- 提供去 inspector/settings 的 drill-down 链接。

## 只读参考不要改

| 文件 | 为什么只读参考 |
|---|---|
| `src/features/runtime-platform/seams/event-bus/default-adapter.ts` | 只借 singleton pub/sub 生命周期形状；Phase 37 不做 Redis Streams / event-bus cutover。 |
| `src/features/runtime-platform/seams/event-bus/contract.ts` | 明确 event-bus future vocabulary 已存在，避免把 websocket fanout 与 event-bus truth 混在一起。 |
| `src/actions/theme-actions.ts` | 只借 action + cache invalidation 模式；cookie persistence 与全局系统设置不相容。 |
| `.planning/phases/36-websocket-classroom-transport-cutover/36-PATTERNS.md` | 作为上一阶段 seam 边界与 honest rollback posture 的上游约束，不是本阶段要改的代码。 |

## No Analog Found

| 文件 | 角色 | 数据流 | 原因 |
|---|---|---|---|
| `src/features/runtime-platform/seams/transport/redis-fanout-topics.ts` | utility | transform | 仓库暂无专门 topic builder；只能借 `contract.ts` 的 envelope vocabulary 与现有 `channel` 命名边界。 |

## Metadata

**Analog search scope:** `src/features/runtime-platform/seams/**`, `src/lib/dal/**`, `src/lib/dto/**`, `src/components/surfaces/**`, `src/components/classroom/**`, `src/actions/**`, `src/db/schema.ts`, `scripts/**`, `package.json`  
**Files scanned:** 30+  
**Pattern extraction date:** 2026-05-18
