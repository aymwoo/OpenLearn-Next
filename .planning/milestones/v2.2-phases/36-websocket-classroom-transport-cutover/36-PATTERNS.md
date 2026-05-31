# Phase 36: WebSocket classroom transport cutover - Pattern Map

**Mapped:** 2026-05-18  
**Files analyzed:** 17  
**Analogs found:** 17 / 17

## File Classification

| 新增/修改文件 | 角色 | 数据流 | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/api/ws/classroom/[sessionId]/route.ts` | route | request-response | `src/app/api/classroom/[sessionId]/events/route.ts` | role-match |
| `server.ts` | runtime-host | request-response | `src/app/api/classroom/[sessionId]/events/route.ts` + 当前 `server.ts` | partial |
| `src/features/runtime-platform/seams/transport/ws-auth.ts` | middleware | request-response | `src/lib/dal/runtime-inspector.ts` | data-flow-match |
| `src/features/runtime-platform/seams/transport/ws-server.ts` | gateway | streaming | `src/app/api/classroom/[sessionId]/events/route.ts` | data-flow-match |
| `src/features/runtime-platform/seams/transport/ws-adapter.ts` | adapter | event-driven | `src/features/runtime-platform/classroom/runtime-session.ts` | data-flow-match |
| `src/features/runtime-platform/seams/transport/gateway.ts` | gateway | event-driven | 当前 `src/features/runtime-platform/seams/transport/gateway.ts` | exact |
| `src/features/runtime-platform/seams/transport/contract.ts` | contract | transform | 当前 `src/features/runtime-platform/seams/transport/contract.ts` | exact |
| `src/features/runtime-platform/seams/transport/ws-envelope.ts` | contract | request-response | 当前 `src/features/runtime-platform/seams/transport/ws-envelope.ts` | exact |
| `src/lib/dal/classroom.ts` | service / DAL | CRUD + request-response | `src/lib/dal/learning.ts` + `src/lib/dal/classroom.ts` | role-match |
| `src/components/classroom/classroom-live-snapshot-refresh.tsx` | component | streaming | 当前 `src/components/classroom/classroom-live-snapshot-refresh.tsx` | exact |
| `src/components/learning/classroom-runtime-client.tsx` | component | streaming + request-response | 当前 `src/components/learning/classroom-runtime-client.tsx` | exact |
| `src/components/classroom/classroom-control-panel.tsx` | component | request-response | 当前 `src/components/classroom/classroom-control-panel.tsx` | exact |
| `src/components/classroom/classroom-control-panel.test.tsx` | test | request-response | `src/components/classroom/classroom-live-snapshot-refresh.test.tsx` + `src/actions/classroom-actions.test.ts` | role-match |
| `scripts/verify-phase36-websocket-cutover.ts` | script / verifier | batch | `scripts/verify-phase31-transport-inspector.ts` | role-match |
| `src/features/runtime-platform/seams/transport/gateway.test.ts` | test | event-driven | 当前 `src/features/runtime-platform/seams/transport/gateway.test.ts` | exact |
| `src/features/runtime-platform/seams/transport/ws-auth.test.ts` | test | request-response | 当前 `src/features/runtime-platform/seams/transport/ws-auth.test.ts` | partial |
| `src/components/classroom/classroom-live-snapshot-refresh.test.tsx` | test | streaming | 当前 `src/components/classroom/classroom-live-snapshot-refresh.test.tsx` | exact |
| `src/components/learning/classroom-runtime-client.test.tsx` | test | streaming + request-response | `src/components/classroom/classroom-live-snapshot-refresh.test.tsx` + `src/actions/classroom-actions.test.ts` | role-match |

## Pattern Assignments

### `src/features/runtime-platform/seams/transport/ws-auth.ts`

**目标：** 修正真实 handshake/auth 边界，按真实 Drizzle schema 校验 actor、membership、school、session scope。  
**主 analog：** `src/lib/dal/runtime-inspector.ts`、`src/lib/dal/classroom.ts`、`src/db/schema.ts`

**为什么选它们**

- `runtime-inspector.ts` 已经用“先取当前 actor，再按 active memberships 聚合 schoolIds，再判 scope”的真实模式。
- `classroom.ts` 已经有 teacher / participant 的 session-scope 校验模式。
- `schema.ts` 给出真实字段：`memberships.schoolId/status`、`classMembers.userId/role`、`classroomSessions.teacherId/classId`，可直接反证当前 `ws-auth.ts` 的伪字段问题。

**Schema truth**

- `src/db/schema.ts:65-83`
- `src/db/schema.ts:96-113`
- `src/db/schema.ts:453-485`

```ts
export const memberships = sqliteTable(
  "membership",
  {
    userId: text("userId").notNull(),
    schoolId: text("schoolId").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
  },
)

export const classMembers = sqliteTable(
  "classMember",
  {
    classId: text("classId").notNull(),
    userId: text("userId").notNull(),
    role: text("role").notNull(),
  },
)

export const classroomSessions = sqliteTable(
  "classroomSession",
  {
    classId: text("classId").notNull(),
    teacherId: text("teacherId").notNull(),
  },
)
```

**Actor / school scope pattern** (`src/lib/dal/runtime-inspector.ts:36-67`)

```ts
const memberships = await getUserMembershipsDTO(user.id)
const activeMemberships = memberships.filter((membership) => membership.status === "active")
const activeSchoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))]

if (activeMemberships.some((membership) => membership.role === "developer")) {
  return { role: "developer" as const, actorId: user.id, schoolIds: activeSchoolIds }
}
```

**Teacher session scope pattern** (`src/lib/dal/classroom.ts:910-919`)

```ts
async function getTeacherSessionScope(sessionId: string) {
  const scope = await assertActiveTeacher()
  const session = await getSessionWithLessonSteps(sessionId)

  if (session.teacherId !== scope.userId) {
    throw new Error("TEACHER_AUTH_REQUIRED")
  }

  return { scope, session }
}
```

**明确不要复制的现状** (`src/features/runtime-platform/seams/transport/ws-auth.ts:90-120`)

```ts
eq(memberships.schoolId, session.schoolId)
eq(classMembers.studentId, userId)
eq(classMembers.status, "active")
```

> 这些字段/关系与真实 schema 不符。gap-closure 时应改成：
> `session.teacherId` 直判 teacher；学生走 `classMembers.classId + userId + role=student`；
> school scope 从 active membership / class / session 关系显式推导，不从伪列读取。

---

### `src/lib/dal/classroom.ts`（为 ws server 增加显式 actor-context snapshot read）

**目标：** 提供 `getClassroomSnapshotForActor(...)` 一类显式 actor-context 读取，避免 raw Node upgrade 直接调用依赖 `auth()` 的 `getClassroomSnapshotDTO()`。  
**主 analog：** `src/lib/dal/learning.ts`、`src/lib/dal/classroom.ts`

**显式 scope 返回模式** (`src/lib/dal/learning.ts:403-421`)

```ts
async function assertActiveStudent(): Promise<StudentScope> {
  const actor = await getCurrentActorDTO()
  const memberships = await getUserMembershipsDTO(actor.id)
  const schoolIds = actor.activeMembershipRoles.includes("student")
    ? memberships
        .filter((membership) => membership.role === "student" && membership.status === "active")
        .map((membership) => membership.schoolId)
    : []

  return { userId: actor.id, studentName: actor.name ?? "同学", schoolIds }
}
```

**现有 request-scoped anti-pattern** (`src/lib/dal/classroom.ts:1688-1700`)

```ts
export async function getClassroomSnapshotDTO(input: { sessionId: string }) {
  const session = await getSessionWithLessonSteps(input.sessionId)

  const user = await getCurrentUserDTO()
  if (!user) {
    throw new Error("TEACHER_AUTH_REQUIRED")
  }

  const isTeacher = session.teacherId === user.id
  if (!isTeacher) {
    await ensureClassroomParticipant({ sessionId: session.id, studentId: user.id })
  }
```

**可复用的 participant 校验片段** (`src/lib/dal/classroom.ts:1006-1026`)

```ts
export async function ensureClassroomParticipant(input: { sessionId: string; studentId: string }) {
  const session = await getSessionWithLessonSteps(input.sessionId)
  const classMember = await getStudentClassMember(session.classId, input.studentId)
  if (!classMember) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED")
  }
}
```

**复制建议**

- 复制 `learning.ts` 的“显式 scope object”返回方式。
- 复制 `classroom.ts` 的 session / participant 校验逻辑。
- 不要在新 helper 里调用 `getCurrentUserDTO()`；actor 必须由 ws handshake 结果显式传入。

---

### `src/features/runtime-platform/seams/transport/ws-server.ts`

**目标：** 把真实 upgrade、handshake、snapshot push、message validation、trace 写入收口到同一处，但不越过 DAL/auth 边界。  
**主 analog：** `server.ts`、`src/app/api/classroom/[sessionId]/events/route.ts`、`src/features/runtime-platform/host-actions/runtime-host.ts`

**Node host init pattern** (`server.ts:11-25`)

```ts
const httpServer = createServer()
const app = next({ httpServer, turbopack: dev })

app.prepare().then(() => {
  classroomWebSocketTransportServer.initialize(httpServer)

  httpServer.on("request", (req, res) => {
    void handle(req, res)
  })
})
```

**SSE trace + stream lifecycle pattern** (`src/app/api/classroom/[sessionId]/events/route.ts:20-68`)

```ts
const fetchSnapshot = async () => {
  const res = await fetch(snapshotUrl, { headers: cookie ? { Cookie: cookie } : {}, cache: "no-store" })
  const parsed = ClassroomSnapshotDTOSchema.safeParse(await res.json())

  if (parsed.success) {
    controller.enqueue(encoder.encode(`event: snapshot\nid: ${snapshot.version}\ndata: ${payload}\n\n`))
    void recordTransportConsumerTrace({
      sessionId,
      correlationId: `classroom:${sessionId}:snapshot:${snapshot.version}`,
      adapterId: "transport-sse-adapter",
      adapterMode: "sse",
      traceType: "snapshot",
      status: "emitted",
    })
  }
}
```

**Canonical publish boundary** (`src/features/runtime-platform/host-actions/runtime-host.ts:158-191`)

```ts
const envelope = {
  version: RUNTIME_CONTRACT_VERSION,
  messageId: crypto.randomUUID(),
  correlationId,
  runtimeInstanceId: input.runtimeInstanceId,
  kind: "host-action-result" as const,
  requestKind,
  status: "ok" as const,
  result,
}

await publishTransportEvent({
  sessionId: result.sessionId,
  channel: "classroom-runtime",
  kind: `runtime.host-result.${requestKind}`,
  correlationId,
  truthPersisted: true,
  truthRef: { ... },
  payload: envelope,
})
```

**复制建议**

- 升级边界复制 `server.ts` 的初始化方式。
- trace / close / failed 路径复制 SSE route 的 `recordTransportConsumerTrace()` 节奏。
- runtime 相关消息不要在 ws server 里直接“发明新 kind”；沿用 canonical publish metadata。
- `sendSnapshot()` 不应继续直接调用 `getClassroomSnapshotDTO()`；应改用显式 actor-context DAL helper。

---

### `src/app/api/ws/classroom/[sessionId]/route.ts`

**目标：** 保持 App Router 的薄 route posture，只做说明面与 HTTP fallback，不把真实 upgrade 逻辑塞回 route handler。  
**主 analog：** `src/app/api/classroom/[sessionId]/events/route.ts`

**Headers / no-store pattern** (`src/app/api/classroom/[sessionId]/events/route.ts:122-129`)

```ts
return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    "Connection": "keep-alive",
    "X-Content-Type-Options": "nosniff",
  },
})
```

**当前 426 说明面可保留的薄边界** (`src/app/api/ws/classroom/[sessionId]/route.ts:11-29`)

```ts
return Response.json(
  {
    sessionId,
    transport: "websocket",
    upgradeRequired: true,
    rollbackSurface: `/api/classroom/${sessionId}/events`,
  },
  {
    status: 426,
    headers: {
      "Cache-Control": "no-store",
      "X-OpenLearn-Transport": "websocket",
      Upgrade: "websocket",
    },
  },
)
```

**复制建议**

- route 文件继续薄，只承认 upgradeRequired / rollbackSurface。
- 不要把 DB 或 handshake scope 校验搬进 App Router `GET`。
- 真实 `route -> ws-auth` 关系如果要补，应该通过文档/注释/导出约束明确“授权边界在 server.ts -> ws-server.ts”。

---

### `src/features/runtime-platform/seams/transport/gateway.ts`

**目标：** 继续保持 canonical publish + attempt trace + supplemental adapter fanout 的单一入口。  
**主 analog：** 当前 `src/features/runtime-platform/seams/transport/gateway.ts`

**Primary + supplemental adapter pattern** (`src/features/runtime-platform/seams/transport/gateway.ts:75-165`)

```ts
const event = RuntimeTransportPublishInputSchema.parse(input)
const adapter = resolveTransportAdapter(event)
const supplementalAdapters = resolveSupplementalTransportAdapters(event, adapter)

const [attempt] = await db.insert(transportDeliveryAttempts).values({
  kind: event.kind,
  adapterId: adapter?.id ?? null,
  attemptStatus: adapter ? "pending" : "skipped",
}).returning()

await adapter.deliver(event)

if (supplementalAdapters.length > 0) {
  await Promise.allSettled(
    supplementalAdapters.map((secondaryAdapter) => secondaryAdapter.deliver(event)),
  )
}
```

**Consumer trace write pattern** (`src/features/runtime-platform/seams/transport/gateway.ts:167-201`)

```ts
const [row] = await db.insert(transportConsumerTraces).values({
  attemptId: attempt?.id ?? trace.attemptId ?? null,
  classroomSessionId: trace.sessionId,
  correlationId: trace.correlationId,
  adapterId: trace.adapterId,
  adapterMode: trace.adapterMode,
  traceType: trace.traceType,
  status: trace.status,
}).returning()
```

**Schema boundary to copy from** (`src/db/schema.ts:694-769`)

```ts
adapterMode: text("adapterMode", { enum: ["sse", "websocket"] })
traceType: text("traceType", {
  enum: ["snapshot", "keepalive", "stream_closed", "stream_failed"],
}).notNull()
```

**复制建议**

- `gateway.ts` 是所有 transport trace / adapter fanout 的 truthy edge，继续把 ws 放在这里，不新开第二条 publish path。
- gap-closure 时先对齐 `contract.ts`、DB enum、`ws-server.ts` 使用的 traceType / kind，再补测试。

---

### `src/features/runtime-platform/seams/transport/ws-adapter.ts`

**目标：** transport gateway 到 ws consumer 的镜像层必须保留 canonical kind / actor metadata，不能压扁语义。  
**主 analog：** `src/features/runtime-platform/classroom/runtime-session.ts`

**Canonical transport publish shape** (`src/features/runtime-platform/classroom/runtime-session.ts:248-272`)

```ts
return publishTransportEvent({
  sessionId: input.classroomSessionId,
  channel: "classroom-runtime",
  kind: input.kind,
  correlationId: input.correlationId,
  truthPersisted: true,
  truthRef: {
    type: input.truthRefType,
    id: input.truthRefId,
    runtimeSessionId: input.runtimeSessionId,
    classroomSessionId: input.classroomSessionId,
    schoolId: input.schoolId,
  },
  payload: input.payload,
})
```

**当前不要继续复制的压扁模式** (`src/features/runtime-platform/seams/transport/ws-adapter.ts:22-28,42-60`)

```ts
export function resolveWebSocketTransportKind(kind: string) {
  if (kind.startsWith("runtime.")) {
    return "runtime.event" as const
  }

  return "classroom.snapshot" as const
}
```

```ts
actor: {
  userId: parsed.truthRef.runtimeSessionId ?? parsed.truthRef.id,
  scope: parsed.kind.startsWith("runtime.") ? "runtime" : "teacher",
  schoolId: parsed.truthRef.schoolId ?? "unknown-school",
},
```

**复制建议**

- 复制 `runtime-session.ts` 的 `kind/correlationId/truthRef` 原样透传思路。
- 拿不到真实 actor 时，用显式 `system/runtime` 缺省，不要伪装成 `teacher`。
- `ws-adapter.ts` 应该做“映射”，不是“语义重写”。

---

### `src/features/runtime-platform/seams/transport/contract.ts` + `ws-envelope.ts`

**目标：** 统一 transport gateway、ws server/client、DB trace 的枚举与 envelope。  
**主 analog：** 当前 `contract.ts`、当前 `ws-envelope.ts`

**Transport trace enum pattern** (`src/features/runtime-platform/seams/transport/contract.ts:12-25`)

```ts
export const RuntimeTransportConsumerTraceTypeSchema = z.enum([
  "snapshot",
  "keepalive",
  "stream_closed",
  "stream_failed",
  "runtime_event",
])
```

**WS envelope pattern** (`src/features/runtime-platform/seams/transport/ws-envelope.ts:49-69,104-121`)

```ts
const ClassroomWebSocketEnvelopeBaseSchema = z.object({
  messageId: z.string().min(1),
  sessionId: z.string().min(1),
  actor: ClassroomWebSocketActorSchema,
  kind: ClassroomWebSocketMessageKindSchema,
  sentAt: z.string().datetime(),
  correlation: ClassroomWebSocketCorrelationSchema,
  payload: z.record(z.string(), z.unknown()),
}).strict()
```

```ts
export function buildClassroomWebSocketServerEnvelope(input: BuildServerEnvelopeInput) {
  return ClassroomWebSocketServerEnvelopeSchema.parse({
    messageId: crypto.randomUUID(),
    sessionId: input.sessionId,
    actor: input.actor,
    kind: input.kind,
    sentAt: new Date().toISOString(),
    correlation: { correlationId: input.correlationId, truthPersisted: input.truthPersisted ?? true },
    payload: input.payload,
  })
}
```

**测试锁枚举模式** (`src/features/runtime-platform/seams/transport/ws-envelope.test.ts:10-19`)

```ts
expect(ClassroomWebSocketMessageKindSchema.options).toEqual([
  "teacher.control",
  "classroom.snapshot",
  "runtime.command",
  "runtime.event",
  "transport.keepalive",
  "transport.error",
])
```

**复制建议**

- 先把 `kind`、`traceType`、DB enum 对齐，再动 handler 分支。
- `ws-server.ts` 的分支判断必须只消费 `ws-envelope.ts` 已声明的 kind。

---

### `src/components/classroom/classroom-live-snapshot-refresh.tsx`

**目标：** classroom 页面 consumer cutover 保持 WS-first、SSE rollback、snapshot-version gate。  
**主 analog：** 当前 `src/components/classroom/classroom-live-snapshot-refresh.tsx`

**WS-first with SSE fallback** (`src/components/classroom/classroom-live-snapshot-refresh.tsx:22-92`)

```ts
let source: EventSource | null = null
let socket: WebSocket | null = null

try {
  socket = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/ws/classroom/${sessionId}`)
  socket.addEventListener("message", (event) => {
    applySnapshotSignal(event.data)
  })
} catch {
  socket = null
}

if (!socket) {
  source = new EventSource(`/api/classroom/${sessionId}/events`)
  source.addEventListener("snapshot", handleSnapshot)
}
```

**Version gate / payload unwrap pattern** (`src/components/classroom/classroom-live-snapshot-refresh.tsx:26-51`)

```ts
const snapshotPayload =
  data && typeof data === "object" && "payload" in data
    ? (data as { payload?: { snapshot?: unknown } }).payload?.snapshot ?? null
    : data

const parsed = ClassroomSnapshotDTOSchema.safeParse(snapshotPayload)
if (!parsed.success || parsed.data.version <= latestVersionRef.current) {
  return
}
```

**复制建议**

- 继续复用 `payload.snapshot` 兼容解包方式。
- 只在 version 增长时 `router.refresh()`。
- 新 ws contract 落地后，优先改“消息识别”，不要改 fallback posture。

---

### `src/components/learning/classroom-runtime-client.tsx`

**目标：** player/runtime consumer cutover 保留 presence、durable snapshot fallback、manual reconnect。  
**主 analog：** 当前 `src/components/learning/classroom-runtime-client.tsx`

**Presence ping pattern** (`src/components/learning/classroom-runtime-client.tsx:341-352`)

```ts
const touchPresence = useCallback(async (connectionState, currentStepId) => {
  if (!sessionId) return
  try {
    await touchClassroomPresenceAction({ sessionId, connectionState, currentStepId })
  } catch {
    // ignore presence update failures in the player shell
  }
}, [sessionId])
```

**Durable snapshot fallback pattern** (`src/components/learning/classroom-runtime-client.tsx:354-382`)

```ts
const snapshot = await fetchDurableSnapshot(sessionId)
if (snapshot) {
  applySnapshot(snapshot, 'connected')
  await touchPresence('connected', snapshot.activeStepId)
} else {
  setRuntime((prev) => ({ ...prev, connectionState: 'snapshot_fallback' }))
}
```

**WS-first / SSE fallback runtime pattern** (`src/components/learning/classroom-runtime-client.tsx:409-495`)

```ts
socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws/classroom/${sessionId}`)

socket.onopen = () => {
  void touchPresence('connected', currentRuntimeStepId)
  setRuntime((prev) => ({ ...prev, connectionState: 'connected' }))
}

socket.onmessage = async (event) => {
  await handleIncomingSnapshot(event.data)
}

source = new EventSource(`/api/classroom/${sessionId}/events`)
```

**复制建议**

- 新 WS consumer 先复用这里的 `handleIncomingSnapshot -> fetchDurableSnapshot -> applySnapshot` 链。
- 不要让 client 直接信任 ws payload 作为业务真相；继续先对 durable snapshot 对齐。

---

### `src/components/classroom/classroom-control-panel.tsx`

**目标：** 在 verification gap 驱动下，把 teacher control / teacher runtime control 的 producer 收口到 authenticated websocket，同时保留 Server Action / DTO rollback 边界，不新开直写课堂真相。  
**主 analog：** 当前 `src/components/classroom/classroom-control-panel.tsx` + `src/actions/classroom-actions.ts`

**Teacher action FormData pattern** (`src/components/classroom/classroom-control-panel.tsx:74-121`)

```ts
const formData = new FormData()
formData.append('sessionId', currentSnapshot.sessionId)
formData.append('expectedVersion', String(currentSnapshot.version))
const result = await changeClassroomStepAction(formData)

if (!result.ok && result.error === 'VERSION_CONFLICT') {
  setConflict(hasLatestSnapshot(result) ? result : null)
} else if (result.ok) {
  router.refresh()
}
```

**Server Action cache/tag pattern** (`src/actions/classroom-actions.ts:122-145,147-170,172-195`)

```ts
const result = await changeClassroomActiveStep(parsed.data)
if (result.sessionId) {
  updateTag(cacheTags.classroom(result.sessionId))
}
return { ok: true, data: result }
```

**复制建议**

- 这是一个有意偏离旧 pattern 的 gap-closure：Phase 36 允许 `classroom-control-panel.tsx` 成为 authenticated websocket producer 入口。
- `teacher.control` 与最小 teacher-scoped `runtime.command` 都先走 websocket envelope，但失败时必须回退到现有 action -> DAL -> publishTransportEvent canonical 写链。
- `classroom-control-panel.tsx` 可以新增 websocket producer，但不能直接写数据库，也不能发明绕开 `recordRuntimeTeacherControlAction()` 的平行 runtime 协议。

---

### `src/components/classroom/classroom-control-panel.test.tsx`

**目标：** 为 teacher-side producer cutover 建立 focused 测试闭环，证明 `teacher.control` / `runtime.command` 的 websocket 发送、`transport.error` fallback 与 server-action rollback 都被覆盖。  
**主 analog：** `src/components/classroom/classroom-live-snapshot-refresh.test.tsx` + `src/actions/classroom-actions.test.ts`

**为什么选它们**

- `classroom-live-snapshot-refresh.test.tsx` 已经展示了 `MockWebSocket` / fallback transport 的组件级测试姿态。
- `classroom-actions.test.ts` 已经锁定了现有 classroom/runtime action 名称，可作为 rollback 路径断言来源。

**复制建议**

- 使用 `MockWebSocket` 或等价 stub，显式断言发出的 envelope `kind` 为 `teacher.control` / `runtime.command`。
- 对 `transport.error`、send throw、closed socket 分支分别断言回退到 `changeClassroomStepAction()` / `changeClassroomModeAction()` / `changeClassroomSlideAction()` / `recordRuntimeTeacherControlAction()`。
- 不要只测“点击后调用了某个 handler”；必须锁定 envelope kind、fallback 分支与 rollback action 名称。

---

### `scripts/verify-phase36-websocket-cutover.ts`

**目标：** 做 36-03 focused verification：真实 route auth、message validation、consumer parity、typecheck。  
**主 analog：** `scripts/verify-phase31-transport-inspector.ts`、`scripts/verify-phase24-classroom-evaluation.ts`、`scripts/verify-phase35-milestone-close.ts`

**Static guard + focused suites pattern** (`scripts/verify-phase31-transport-inspector.ts:41-112`)

```ts
const checks = [ ... ]
const failed = checks.filter((check) => !check.passed)

run([
  "exec",
  "vitest",
  "--run",
  "src/features/runtime-platform/seams/transport/gateway.test.ts",
  ...
], "phase 31 focused suites")
```

**nonCommentIncludes pattern** (`scripts/verify-phase24-classroom-evaluation.ts:13-31,40-109`)

```ts
function withoutLineComments(source: string) {
  return source.split("\n").map((line) => line.replace(/\/\/.*$/, "")).join("\n")
}

function nonCommentIncludes(source: string, token: string) {
  return withoutLineComments(source).includes(token)
}
```

**typecheck + scoped gate pattern** (`scripts/verify-phase35-milestone-close.ts:37-139`)

```ts
runPnpm(["typecheck"], "full typecheck")
const lintResult = capturePnpm(["lint"])
const lintErrors = parseLintErrors(lintResult.output)
```

**复制建议**

- 36 verifier 结构建议：
  1. 静态 guard：禁止 `classMembers.studentId/status`、禁止 `transport.ping` 等漂移 token；
  2. focused tests：`gateway.test.ts`、`ws-auth.test.ts`、`classroom-live-snapshot-refresh.test.tsx`、新增 runtime consumer suite；
  3. `pnpm typecheck` 必跑；
  4. 输出 honest fallback / rollback posture。

---

### Focused test files

#### `src/features/runtime-platform/seams/transport/gateway.test.ts`

**可复制模式** (`src/features/runtime-platform/seams/transport/gateway.test.ts:83-217`)

```ts
const result = await publishTransportEvent({ ... })

expect(deliverMock).toHaveBeenCalledWith(expect.objectContaining({ kind: "runtime.ready" }))
expect(websocketDeliverMock).toHaveBeenCalledWith(expect.objectContaining({ kind: "runtime.ready" }))
expect(result).toMatchObject({ attemptStatus: "delivered" })
```

- 适合新增：supplemental ws reject 时的 trace / observability 断言。

#### `src/features/runtime-platform/seams/transport/ws-auth.test.ts`

**可复制结构，不可复制 fixture 字段** (`src/features/runtime-platform/seams/transport/ws-auth.test.ts:28-125`)

```ts
await expect(authenticateClassroomWebSocket(request as never, "session-1")).resolves.toMatchObject({
  actorScope: "teacher",
})

await expect(authenticateClassroomWebSocket(request as never, "session-1")).rejects.toEqual(
  expect.objectContaining({ code: "WEBSOCKET_SCOPE_MISMATCH", status: 403 }),
)
```

- 结构可复用：teacher success / scope mismatch / student success。  
- fixture 必须改成真实 schema：`classMembers.userId/role`，不要再用 `studentId/status`。

#### `src/components/classroom/classroom-live-snapshot-refresh.test.tsx`

**事件流 consumer test 模式** (`src/components/classroom/classroom-live-snapshot-refresh.test.tsx:16-181`)

```ts
class MockEventSource { ... }

render(<ClassroomLiveSnapshotRefresh sessionId="session-1" initialVersion={3} />)
MockEventSource.instances[0]?.emit("snapshot", { version: 4, ... })
expect(refreshMock).toHaveBeenCalledTimes(1)
```

- 新增 ws consumer test 时，直接照这个模式扩成 `MockWebSocket + fallback to EventSource`。

#### `src/components/learning/classroom-runtime-client.test.tsx`（建议新增）

**主 analog：** `classroom-live-snapshot-refresh.test.tsx` + `src/actions/classroom-actions.test.ts:397-464`

**可复制断言点**

```ts
expect(mockUpdateClassroomParticipantConnection).toHaveBeenCalledWith({
  sessionId: "session-1",
  studentId: "student-1",
  connectionState: "connected",
  currentStepId: "step-1",
})
```

- 新测试要覆盖：`socket.onopen` 触发 presence、`socket.onerror/onclose` 进入 reconnecting、durable snapshot 恢复后回到 connected。

## Shared Patterns

### 1. 真实 handshake / auth 边界

**来源：** `src/lib/dal/runtime-inspector.ts:36-88`、`src/lib/dal/classroom.ts:910-919`、`src/db/schema.ts:65-113,453-485`

- 先从 actor/membership 得到 `schoolIds`。
- 再按 `session.teacherId` / `classMembers.classId + userId + role` 判 actorScope。
- 最后才允许注册 ws connection。

### 2. 显式 actor-context DAL 读取

**来源：** `src/lib/dal/learning.ts:403-421`、`src/lib/dal/classroom.ts:1006-1026`

- 新 DAL helper 接收显式 `actorId / actorScope / schoolId / sessionId`。
- 不在 raw ws upgrade 回调里调用依赖 `auth()` 的 DAL。

### 3. transport gateway trace / adapter

**来源：** `src/features/runtime-platform/seams/transport/gateway.ts:75-201`、`src/features/runtime-platform/classroom/runtime-session.ts:248-272`

- 业务写链完成后统一 `publishTransportEvent()`。
- trace 由 gateway 统一记，不让 consumer 自己成为第二真相源。

### 4. classroom / player runtime consumer

**来源：** `src/components/classroom/classroom-live-snapshot-refresh.tsx:22-92`、`src/components/learning/classroom-runtime-client.tsx:341-495`

- WS-first。
- SSE 继续作为 rollback surface。
- client 收到 ws payload 后仍以 durable snapshot 校正 UI state。

### 5. phase verifier 脚本

**来源：** `scripts/verify-phase31-transport-inspector.ts`、`scripts/verify-phase24-classroom-evaluation.ts`、`scripts/verify-phase35-milestone-close.ts`

- 静态 guards + focused tests + typecheck。
- verifier 要诚实输出 fallback / rollback posture，不用 prose claim 代替证据。

### 6. focused tests

**来源：** `gateway.test.ts`、`ws-envelope.test.ts`、`classroom-live-snapshot-refresh.test.tsx`、`classroom-actions.test.ts`

- 锁枚举；
- 锁 action/write-path；
- 锁 client reconnect / fallback；
- 锁 actor/session scope，不只做 mock happy path。

## No Analog Found

| 文件 | 角色 | 数据流 | 原因 |
|---|---|---|---|
| `src/features/runtime-platform/seams/transport/ws-server.test.ts` | test | streaming | 仓库里没有现成的 raw Node `upgrade` 集成测试；建议沿用 `classroom-live-snapshot-refresh.test.tsx` 的 fake transport 模式 + `verify-phase31` 的静态 guard 组合。 |

## Metadata

**Analog search scope:** `src/features/runtime-platform/**`, `src/lib/dal/**`, `src/components/classroom/**`, `src/components/learning/**`, `src/app/api/**`, `scripts/verify-phase*.ts`, `src/db/schema.ts`  
**Files scanned:** 30+  
**Pattern extraction date:** 2026-05-18
