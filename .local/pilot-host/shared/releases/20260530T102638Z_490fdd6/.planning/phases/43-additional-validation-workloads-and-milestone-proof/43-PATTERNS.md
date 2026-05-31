# Phase 43: Additional validation workloads and milestone proof - Pattern Map

**Mapped:** 2026-05-19  
**Files analyzed:** 16  
**Analogs found:** 15 / 16

## File Classification

| 新增/修改文件 | 角色 | 数据流 | 最接近 analog | 匹配度 |
|---|---|---|---|---|
| `src/features/async-tasks/server/registry.ts` | config | transform | `src/features/async-tasks/server/registry.ts` | exact |
| `src/features/async-tasks/worker/registry.ts` | config | event-driven | `src/features/async-tasks/worker/registry.ts` | exact |
| `src/features/async-tasks/worker/processors/schedule-reminder.ts` | service | scheduled / request-response | `src/features/async-tasks/worker/processors/course-import.ts` | role-match |
| `src/features/async-tasks/worker/processors/classroom-session-summary.ts` | service | event-driven / derived-write | `src/features/async-tasks/worker/processors/course-import.ts` | role-match |
| `src/features/async-tasks/worker/processors/resource-knowledge-source.ts` | service | batch / transform | `src/features/async-tasks/worker/processors/course-import.ts` | role-match |
| `src/features/async-tasks/server/registry.reliability.test.ts` | test | transform | `src/features/async-tasks/server/registry.reliability.test.ts` | exact |
| `src/features/schedule/reminders/server.ts` | service | CRUD / scheduled | `src/features/schedule/reminders/server.ts` | exact |
| `src/features/schedule/reminders/actions.ts` | controller | request-response | `src/features/schedule/reminders/actions.ts` | exact |
| `src/components/surfaces/schedule-reminder-surface.tsx` | component | request-response | `src/components/surfaces/schedule-reminder-surface.tsx` | exact |
| `src/components/surfaces/schedule-reminder-surface.test.tsx` | test | request-response | `src/components/surfaces/schedule-reminder-surface.test.tsx` | exact |
| `src/lib/dal/classroom.ts` | service | event-driven / derived-write | `src/lib/dal/classroom.ts` | exact |
| `src/lib/dal/ai-rag.ts` | service | CRUD / transform | `src/lib/dal/ai-rag.ts` | exact |
| `src/actions/ai-rag-actions.ts` | controller | request-response | `src/actions/ai-rag-actions.ts` | exact |
| `src/components/surfaces/library-surface.tsx` | component | request-response | `src/components/surfaces/library-surface.tsx` | exact |
| `scripts/verify-phase43-validation-workloads.ts` | test | batch | `scripts/verify-phase42-operator-recovery.ts` | role-match |
| `.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-WORKLOAD-PROOF.md` | artifact | batch | 无 | none |

## Pattern Assignments

### `src/features/async-tasks/server/registry.ts`（config, transform）

**主 analog：** `src/features/async-tasks/server/registry.ts`

**任务定义模式**（lines 90-147）：
```ts
export const platformHealthCheckTaskDefinition = createAsyncTaskDefinition({
  taskType: "platform.healthcheck",
  featureArea: "platform",
  visibilityScope: "actor_owned",
  entityRefKind: "system_health_check",
  labelKey: "asyncTasks.platform.healthCheck.label",
  summaryKey: "asyncTasks.platform.healthCheck.summary",
  payloadSchema: AsyncTaskPlatformHealthCheckPayloadSchema,
  progressSchema: AsyncTaskProgressSnapshotSchema,
  resultSchema: AsyncTaskPlatformHealthCheckResultSchema,
  reliability: {
    queueName: "platform-health",
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1_000,
    },
    deadLetter: {
      terminalStatus: "failed",
      eventType: "task.failed",
    },
    idempotency: {
      strategy: "task_id",
    },
  },
});

export const courseImportApplyBatchTaskDefinition = createAsyncTaskDefinition({
  taskType: "course_import.apply_batch",
  featureArea: "course_import",
  visibilityScope: "school_operator",
  entityRefKind: "course_import_batch",
  labelKey: "asyncTasks.courseImport.applyBatch.label",
  summaryKey: "asyncTasks.courseImport.applyBatch.summary",
  payloadSchema: CourseImportAsyncTaskPayloadSchema,
  progressSchema: AsyncTaskProgressSnapshotSchema,
  resultSchema: CourseImportAsyncTaskResultSchema,
  operatorRecovery: {
    enabled: true,
    mode: "same_task_new_attempt",
    terminalStatuses: ["failed"],
  },
  reliability: {
    queueName: "course-import",
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2_000,
    },
    deadLetter: {
      terminalStatus: "failed",
      eventType: "task.failed",
    },
    idempotency: {
      strategy: "task_id",
    },
  },
});
```

**注册表落点模式**（lines 149-152）：
```ts
export const asyncTaskRegistry = {
  [platformHealthCheckTaskDefinition.taskType]: platformHealthCheckTaskDefinition,
  [courseImportApplyBatchTaskDefinition.taskType]: courseImportApplyBatchTaskDefinition,
} satisfies Record<string, AsyncTaskDefinition>;
```

**Planner 复制点：** Phase 43 的三个新 task family 都应继续走 `createAsyncTaskDefinition()`，显式填 `featureArea`、`visibilityScope`、`entityRefKind`、`operatorRecovery`、`reliability`；不要手写自由对象。

---

### `src/features/async-tasks/worker/registry.ts`（config, event-driven）

**主 analog：** `src/features/async-tasks/worker/registry.ts`

**processor 路由模式**（lines 14-32）：
```ts
const asyncTaskWorkerProcessors: Record<string, AsyncTaskProcessor> = {
  "course_import.apply_batch": async (job: Job) => processCourseImportApplyBatchJob(job),
  "platform.healthcheck": async (job: Job) => processPlatformHealthcheckJob(job),
};

export function getAsyncTaskWorkerProcessor(taskType: string) {
  return asyncTaskWorkerProcessors[taskType] ?? null;
}

export function buildAsyncTaskQueueProcessor(queueName: string): AsyncTaskProcessor {
  return async (job) => {
    const processor = getAsyncTaskWorkerProcessor(job.name);

    if (!processor) {
      throw new Error(`ASYNC_TASK_PROCESSOR_NOT_FOUND:${queueName}:${job.name}`);
    }

    return processor(job);
  };
}
```

**Planner 复制点：** 新增 processor 只在这个 map 里注册；不要在 `bootstrap.ts` 里写 feature-specific 分支。

---

### `src/features/async-tasks/worker/processors/schedule-reminder.ts`（service, scheduled / request-response）

**主 analog：** `src/features/async-tasks/worker/processors/course-import.ts`  
**次 analog：** `src/server/schedule/reminder-dispatch.ts`

**processor 形状**（`course-import.ts` lines 14-33）：
```ts
export async function processCourseImportApplyBatchJob(job: ProgressCapableJob) {
  asyncTaskRegistry[job.name].payloadSchema.parse(job.data);
  const payload = CourseImportAsyncTaskPayloadSchema.parse(job.data);

  await job.updateProgress({
    stage: "running",
    stageLabelKey: "asyncTasks.stage.running",
    messageKey: "asyncTasks.courseImport.applyBatch.progress.running",
    percentComplete: 5,
    counters: null,
    detail: {
      jobId: job.id ?? null,
      batchId: payload.batchId,
      schoolId: payload.schoolId,
      actorId: payload.actorId,
    },
    updatedAt: new Date().toISOString(),
  });

  return executeCourseImportApplyTask(payload);
}
```

**实际发送边界**（`src/server/schedule/reminder-dispatch.ts` lines 9-27）：
```ts
export async function dispatchScheduleReminder(input: { channel: string; payload: Record<string, unknown> }) {
  if (!isSupportedScheduleReminderChannel(input.channel)) {
    throw new Error("SCHEDULE_REMINDER_BLOCKED");
  }

  assertNoSecretMaterial(input.payload);

  if (input.payload.simulateFailure === true) {
    return {
      status: "failed" as const,
      failureReason: "模拟发送失败",
    };
  }

  return {
    status: "sent" as const,
    failureReason: null,
  };
}
```

**测试形状**（`course-import.test.ts` lines 21-30, 57-68, 119-128）：
```ts
it("updates structured progress and returns a batch-import specific result summary", async () => {
  executeCourseImportApplyTask.mockResolvedValue({
    batchId: "batch-1",
    schoolId: "school-1",
    actorId: "teacher-1",
    batchStatus: "partially_applied",
  });

  const updateProgress = vi.fn(async () => undefined);

  const result = await processCourseImportApplyBatchJob({
    id: "job_1",
    name: "course_import.apply_batch",
    data: {
      batchId: "batch-1",
      schoolId: "school-1",
      actorId: "teacher-1",
    },
    updateProgress,
  });
});

it("delegates duplicate-delivery protection to durable row truth execution helper", () => {
  expect(processorSource).toContain("executeCourseImportApplyTask(payload)");
  expect(processorSource).not.toContain("createCourseForTeacherScoped");
  expect(processorSource).not.toContain("updateMatchedCourseStatusForTeacherScoped");
});
```

**Planner 复制点：** 这个新 processor 应只做 3 件事：parse payload、`job.updateProgress()`、委托 reminder DAL/dispatch helper。不要在 processor 里直接写 UI cache、权限判断或页面 copy。

---

### `src/features/async-tasks/worker/processors/classroom-session-summary.ts`（service, event-driven / derived-write）

**主 analog：** `src/features/async-tasks/worker/processors/course-import.ts`  
**次 analog：** `src/lib/dal/classroom.ts`

**事件事实源写法**（`classroom.ts` lines 1968-1983）：
```ts
const [event] = await db.insert(classroomEvents).values({
  sessionId: session.id,
  version: updated.version,
  type: "active_step_changed",
  actorId: input.actorId,
  payloadJson: { activeStepId: input.targetStepId, slideIndex: 0 },
}).returning();

await publishClassroomTransportEvent({
  sessionId: session.id,
  schoolId: input.schoolId,
  eventId: event.id,
  correlationId: `classroom:${session.id}:active_step_changed:${updated.version}`,
  kind: "active_step_changed",
  payload: { activeStepId: input.targetStepId, version: updated.version },
});
```

**finalize 触发事实**（`classroom.ts` lines 3226-3251）：
```ts
const [updated] = await db.update(classroomSessions)
  .set({
    status: "ended",
    endedAt: new Date(),
    updatedAt: new Date(),
    version: session.version + 1,
  })
  .where(eq(classroomSessions.id, session.id))
  .returning();

const [event] = await db.insert(classroomEvents).values({
  sessionId: session.id,
  version: updated.version,
  type: "ended",
  actorId: scope.userId,
  payloadJson: {},
}).returning();
```

**现有 recap 聚合入口**（`classroom.ts` lines 2117-2132）：
```ts
export async function getClassroomSessionRecapDTO(rawInput: unknown) {
  const input = GetClassroomSessionRecapInputSchema.parse(rawInput);
  const { session } = await getTeacherSessionScope(input.sessionId);

  if (session.status !== "ended") {
    throw new Error("CLASSROOM_RECAP_NOT_AVAILABLE");
  }

  const [lesson, clazz, published, participants, evidenceRows, timelineRows] = await Promise.all([
    db.query.lessons.findFirst({ where: eq(lessons.id, session.lessonId) }),
    db.query.classes.findFirst({ where: eq(classes.id, session.classId) }),
    db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) }),
    db.query.classroomParticipants.findMany({ where: eq(classroomParticipants.sessionId, session.id) }),
    db.query.classroomEvidence.findMany({ where: eq(classroomEvidence.sessionId, session.id) }),
    db.query.classroomTimeline.findMany({ where: eq(classroomTimeline.sessionId, session.id) }),
  ]);
```

**Planner 复制点：** 新 processor 的“输入事实”应复用 `classroomEvents` / recap 现有 vocabulary；输出必须是 derived artifact/read model，不能回写 `classroomSessions` canonical 状态。

---

### `src/features/async-tasks/worker/processors/resource-knowledge-source.ts`（service, batch / transform）

**主 analog：** `src/features/async-tasks/worker/processors/course-import.ts`  
**次 analog：** `src/lib/dal/ai-rag.ts`

**business truth 起点**（`ai-rag.ts` lines 53-84）：
```ts
export async function registerKnowledgeSourceForResource(input: { resourceId: string }): Promise<KnowledgeSourceDTO> {
  const scope = await assertActiveTeacher();
  
  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, input.resourceId),
  });

  if (!resource) {
    throw new Error("RESOURCE_NOT_FOUND");
  }

  if (!scope.schoolIds.includes(resource.schoolId)) {
    throw new Error("FORBIDDEN");
  }

  if (!resource.ragEligible) {
    throw new Error("RESOURCE_NOT_RAG_ELIGIBLE");
  }

  const [source] = await db
    .insert(knowledgeSources)
    .values({
      resourceId: input.resourceId,
      status: "pending",
    })
    .returning();
```

**chunk metadata 模式**（`ai-rag.ts` lines 86-107）：
```ts
export async function recordKnowledgeChunkMetadata(input: {
  sourceId: string;
  chunkIndex: number;
  textHash: string;
  tokenEstimate: number;
  payloadJson: JsonRecord;
  metadataJson: JsonRecord;
}) {
  await assertActiveTeacher();
  
  await db.insert(knowledgeChunks).values({
    sourceId: input.sourceId,
    chunkIndex: input.chunkIndex,
    textHash: input.textHash,
    tokenEstimate: input.tokenEstimate,
    payloadJson: input.payloadJson,
    metadataJson: input.metadataJson,
    indexingStatus: "pending",
  });
}
```

**Planner 复制点：** worker 不要新造另一套 resource 状态表；直接推进 `knowledgeSources.status` 与 `knowledgeChunks.indexingStatus`。

---

### `src/features/async-tasks/server/registry.reliability.test.ts`（test, transform）

**主 analog：** `src/features/async-tasks/server/registry.reliability.test.ts`

**可靠性断言模式**（lines 8-37）：
```ts
describe("async task registry reliability metadata", () => {
  it("declares retry, backoff, dead-letter, and idempotency posture explicitly", () => {
    expect(platformHealthCheckTaskDefinition.reliability).toMatchObject({
      queueName: "platform-health",
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      deadLetter: {
        terminalStatus: "failed",
      },
      idempotency: {
        strategy: "task_id",
      },
    });
  });

  it("locks local operator recovery metadata only for supported task types", () => {
    expect(courseImportApplyBatchTaskDefinition.operatorRecovery).toEqual({
      enabled: true,
      mode: "same_task_new_attempt",
      terminalStatuses: ["failed"],
    });
  });
});
```

**Planner 复制点：** 新 task family 都要补 registry metadata tests，重点断言 `queueName`、`visibilityScope`、`operatorRecovery`。

---

### `src/features/schedule/reminders/server.ts`（service, CRUD / scheduled）

**主 analog：** `src/features/schedule/reminders/server.ts`  
**次 analog：** `src/lib/dal/course-import.ts`

**planned dispatch business truth**（lines 25-47）：
```ts
async function planScheduleReminderDispatch(
  executor: Pick<typeof db, "insert">,
  input: {
    schoolId: string;
    ruleId: string;
    type: "pre_class" | "schedule_change";
    channel: string;
    recipientScope: string;
    offsetMinutes: number;
  },
) {
  await executor.insert(scheduleReminderDispatch).values({
    schoolId: input.schoolId,
    ruleId: input.ruleId,
    type: input.type,
    channel: input.channel,
    targetType: input.type === "pre_class" ? "upcoming_class" : "schedule_change",
    targetId: `${input.type}:${input.schoolId}`,
    targetLabel: input.type === "pre_class" ? "下一节课" : "最近一次调课",
    status: "planned",
    scheduledFor: new Date(Date.now() + input.offsetMinutes * 60_000),
    payloadJson: { recipientScope: input.recipientScope },
  });
}
```

**读取业务列表而不是任务中心**（lines 57-95）：
```ts
const [rules, deliveries] = await Promise.all([
  db.query.scheduleReminderRule.findMany({ where: eq(scheduleReminderRule.schoolId, schoolId) }),
  db.query.scheduleReminderDispatch.findMany({ where: eq(scheduleReminderDispatch.schoolId, schoolId) }),
]);

return ScheduleReminderCenterDTOSchema.parse({
  schoolId,
  rules: rules.map((rule) => ({
    id: rule.id,
    schoolId: rule.schoolId,
    type: rule.type,
    channel: rule.channel,
    recipientScope: rule.recipientScope,
    offsetMinutes: rule.offsetMinutes,
    enabled: Boolean(rule.enabled),
    latestStatus: latestStatusByType.get(rule.type)?.status ?? null,
  })),
  deliveries: [...deliveries]
    .sort((left, right) => Number(right.scheduledFor ?? 0) - Number(left.scheduledFor ?? 0))
    .slice(0, 12)
    .map((delivery) => ({
      id: delivery.id,
      ruleId: delivery.ruleId ?? null,
      type: delivery.type,
      channel: delivery.channel,
      status: delivery.status,
      targetLabel: delivery.targetLabel,
      scheduledFor: toIso(delivery.scheduledFor) ?? new Date(0).toISOString(),
      lastAttemptAt: toIso(delivery.lastAttemptAt),
      failureReason: delivery.failureReason ?? null,
    })),
});
```

**写入事务模式**（lines 110-155）：
```ts
await db.transaction(async (tx) => {
  const [row] = existing
    ? await tx
        .update(scheduleReminderRule)
        .set({
          channel: parsed.channel,
          recipientScope: parsed.recipientScope,
          offsetMinutes: parsed.offsetMinutes,
          enabled: parsed.enabled,
          updatedById: scope.userId,
          updatedAt: new Date(),
        })
        .where(eq(scheduleReminderRule.id, existing.id))
        .returning()
    : await tx
        .insert(scheduleReminderRule)
        .values({
          schoolId: parsed.schoolId,
          type: parsed.type,
          channel: parsed.channel,
          recipientScope: parsed.recipientScope,
          offsetMinutes: parsed.offsetMinutes,
          enabled: parsed.enabled,
          createdById: scope.userId,
          updatedById: scope.userId,
        })
        .returning();

  await planScheduleReminderDispatch(tx, {
    schoolId: parsed.schoolId,
    ruleId: row.id,
    type: row.type,
    channel: row.channel,
    recipientScope: row.recipientScope,
    offsetMinutes: row.offsetMinutes,
  });
});
```

**不应复制的旧恢复路径**（lines 160-205）：当前 `retryScheduleReminderDispatch()` 是 teacher 页面直调 `dispatchScheduleReminder()` 的同步重试；Phase 43 应把 recovery 收口到 operator，而不是继续在这里扩功能。

---

### `src/features/schedule/reminders/actions.ts`（controller, request-response）

**主 analog：** `src/features/schedule/reminders/actions.ts`

**Action + tag invalidation 模式**（lines 27-47）：
```ts
export async function saveScheduleReminderRuleAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const normalized = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const parsed = ScheduleReminderRuleInputSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR", message: "提醒配置不完整，请先检查输入。" };
  }

  try {
    const dto = await saveScheduleReminderRule(parsed.data);
    invalidateScheduleReminderTags(updateTag, parsed.data.schoolId);
    return { ok: true, data: dto };
  } catch (error) {
    return handleError(error);
  }
}
```

**refresh action 模式**（lines 53-59）：
```ts
export async function refreshScheduleReminderCenterAction(input?: { schoolId?: string }): Promise<ActionResult<unknown>> {
  try {
    const dto = await getScheduleReminderCenterDTO(input);
    return { ok: true, data: dto };
  } catch (error) {
    return handleError(error);
  }
}
```

**Planner 复制点：** 新 reminder enqueue / status refresh action 继续返回统一 `ActionResult`，并只做 schema 校验、调用 server 层、失效 tags。

---

### `src/components/surfaces/schedule-reminder-surface.tsx`（component, request-response）

**主 analog：** `src/components/surfaces/schedule-reminder-surface.tsx`

**业务视角而非任务中心**（lines 72-107）：
```tsx
<section className={teacherSurfaceRhythm.section}>
  <div className="space-y-3">
    {data.deliveries.map((delivery) => (
      <div key={delivery.id} className={cn(teacherSurfaceRhythm.cardInset, "flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between")}>
        <div>
          <p className="text-sm font-semibold text-on-surface">{delivery.targetLabel}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{delivery.channel} · {delivery.scheduledFor}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge>{STATUS_LABEL[delivery.status]}</Badge>
          {delivery.status !== "sent" ? (
            <Button disabled={isPending} variant="secondary" onClick={() => retryDelivery(delivery.id)}>
              重试
            </Button>
          ) : null}
        </div>
      </div>
    ))}
  </div>
</section>
```

**触发 action + refresh 模式**（lines 25-55）：
```tsx
function submitRule(type: "pre_class" | "schedule_change") {
  startTransition(async () => {
    const result = await saveScheduleReminderRuleAction({
      schoolId: data.schoolId,
      type,
      channel: "wecom-notify",
      recipientScope: "teacher",
      offsetMinutes: type === "pre_class" ? 20 : 0,
      enabled: true,
    });
    if (!result.ok) {
      setFeedback({ tone: "error", message: result.message });
      return;
    }

    setFeedback({ tone: "success", message: "提醒规则已保存，并已刷新最近执行状态。" });
    router.refresh();
  });
}
```

**测试模式**（`schedule-reminder-surface.test.tsx` lines 27-65）：
```tsx
it("shows the two first-release reminder categories and honest delivery states", () => {
  render(
    <ScheduleReminderSurface
      data={{
        schoolId: "school-1",
        rules: [
          {
            id: "rule-1",
            schoolId: "school-1",
            type: "pre_class",
            channel: "wecom-notify",
            recipientScope: "teacher",
            offsetMinutes: 20,
            enabled: true,
            latestStatus: "planned",
          },
        ],
        deliveries: [
          {
            id: "delivery-1",
            ruleId: "rule-1",
            type: "pre_class",
            channel: "wecom-notify",
            status: "retry_required",
            targetLabel: "下一节课",
            scheduledFor: "2026-05-11T08:00:00.000Z",
            lastAttemptAt: null,
            failureReason: null,
          },
        ],
      }}
    />,
  );
});
```

**Planner 复制点：** 页面继续渲染 `rules + deliveries` 业务实体；Phase 43 若移除 teacher retry，UI 仍应保留“诚实状态”结构，不要改成 async task list/table。

---

### `src/lib/dal/classroom.ts`（service, event-driven / derived-write）

**主 analog：** `src/lib/dal/classroom.ts`

**append-only event 写法**（lines 1968-1983, 2025-2040, 3236-3251）：
```ts
const [event] = await db.insert(classroomEvents).values({
  sessionId: session.id,
  version: updated.version,
  type: "active_step_changed",
  actorId: input.actorId,
  payloadJson: { activeStepId: input.targetStepId, slideIndex: 0 },
}).returning();

const [event] = await db.insert(classroomEvents).values({
  sessionId: session.id,
  version: updated.version,
  type: "lock_mode_changed",
  actorId: input.actorId,
  payloadJson: { locked },
}).returning();

const [event] = await db.insert(classroomEvents).values({
  sessionId: session.id,
  version: updated.version,
  type: "ended",
  actorId: scope.userId,
  payloadJson: {},
}).returning();
```

**recap 聚合读取模式**（lines 2117-2132）：
```ts
export async function getClassroomSessionRecapDTO(rawInput: unknown) {
  const input = GetClassroomSessionRecapInputSchema.parse(rawInput);
  const { session } = await getTeacherSessionScope(input.sessionId);

  if (session.status !== "ended") {
    throw new Error("CLASSROOM_RECAP_NOT_AVAILABLE");
  }

  const [lesson, clazz, published, participants, evidenceRows, timelineRows] = await Promise.all([
    db.query.lessons.findFirst({ where: eq(lessons.id, session.lessonId) }),
    db.query.classes.findFirst({ where: eq(classes.id, session.classId) }),
    db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) }),
    db.query.classroomParticipants.findMany({ where: eq(classroomParticipants.sessionId, session.id) }),
    db.query.classroomEvidence.findMany({ where: eq(classroomEvidence.sessionId, session.id) }),
    db.query.classroomTimeline.findMany({ where: eq(classroomTimeline.sessionId, session.id) }),
  ]);
```

**Planner 复制点：** derived workload 的 enqueue 触发点应靠近这些 canonical event insert 位置；summary builder 继续复用 recap 的聚合 vocabulary。

---

### `src/lib/dal/ai-rag.ts`（service, CRUD / transform）

**主 analog：** `src/lib/dal/ai-rag.ts`

**资格校验 + durable truth 模式**（lines 53-84）：
```ts
const resource = await db.query.resources.findFirst({
  where: eq(resources.id, input.resourceId),
});

if (!resource) {
  throw new Error("RESOURCE_NOT_FOUND");
}

if (!scope.schoolIds.includes(resource.schoolId)) {
  throw new Error("FORBIDDEN");
}

if (!resource.ragEligible) {
  throw new Error("RESOURCE_NOT_RAG_ELIGIBLE");
}

const [source] = await db
  .insert(knowledgeSources)
  .values({
    resourceId: input.resourceId,
    status: "pending",
  })
  .returning();
```

**chunk 元数据模式**（lines 98-106）：
```ts
await db.insert(knowledgeChunks).values({
  sourceId: input.sourceId,
  chunkIndex: input.chunkIndex,
  textHash: input.textHash,
  tokenEstimate: input.tokenEstimate,
  payloadJson: input.payloadJson,
  metadataJson: input.metadataJson,
  indexingStatus: "pending",
});
```

**Planner 复制点：** Phase 43 应在这个 DAL 里补 `processing/completed/failed` 推进逻辑，而不是只停留在 `pending` 注册。

---

### `src/actions/ai-rag-actions.ts`（controller, request-response）

**主 analog：** `src/actions/ai-rag-actions.ts`

**最小触发 action 模式**（lines 59-75）：
```ts
const RegisterKnowledgeSourceInputSchema = z.object({
  resourceId: z.string().min(1),
});

export async function registerKnowledgeSourceAction(input: z.infer<typeof RegisterKnowledgeSourceInputSchema>) {
  const parsed = RegisterKnowledgeSourceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "AI 提案信息不完整，请检查后再提交。" };
  }

  try {
    const source = await registerKnowledgeSourceForResource(parsed.data);
    return { ok: true, data: source };
  } catch (error) {
    console.error("registerKnowledgeSourceAction error:", error);
    return { ok: false, error: "AI/RAG 合同操作失败，请重试。" };
  }
}
```

**测试模式**（`ai-rag-actions.test.ts` lines 158-201）：
```ts
describe("registerKnowledgeSourceAction — Zod validation", () => {
  it("registers knowledge source on valid input", async () => {
    const { registerKnowledgeSourceAction } = await import("./ai-rag-actions");

    mockAIRagDAL.registerKnowledgeSourceForResource.mockResolvedValueOnce({
      id: "source-1",
      resourceId: "resource-1",
      status: "pending",
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await registerKnowledgeSourceAction({ resourceId: "resource-1" });

    expect(result).toMatchObject({ ok: true, data: expect.objectContaining({ id: "source-1" }) });
  });
});
```

**Planner 复制点：** 如果 Phase 43 增加 resource async 触发 action，沿用这个 `safeParse -> DAL -> generic error` 结构即可。

---

### `src/components/surfaces/library-surface.tsx`（component, request-response）

**主 analog：** `src/components/surfaces/library-surface.tsx`

**业务状态卡片模式**（lines 110-153）：
```tsx
{resources.map((item) => (
  <Card
    key={item.id}
    className="min-h-56 bg-surface-container-lowest p-5"
  >
    <div className="mb-2 flex flex-wrap gap-2">
      <Badge variant="default">{item.classification}</Badge>
      <Badge variant={item.ragEligible ? "success" : "default"}>
        {item.ragEligible ? "可进入 RAG" : "RAG 未启用"}
      </Badge>
    </div>
    <h3 className="mt-3 text-2xl font-semibold">{item.title}</h3>
    <p className="mt-2 text-sm text-on-surface-variant">
      可见性: {item.visibility} | 所有者: {item.ownerId}
    </p>
    {item.url && (
      <p className="mt-2 truncate text-sm text-primary">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.url}
        </a>
      </p>
    )}
  </Card>
))}
```

**Planner 复制点：** 资源中心继续看 `resource / knowledgeSource` 业务状态，不直接暴露 async task 行。Phase 43 若补 ingest/indexing 状态，应延续卡片 badge/说明文本，不切成 operator table。

---

### `scripts/verify-phase43-validation-workloads.ts`（test, batch）

**主 analog：** `scripts/verify-phase42-operator-recovery.ts`  
**次 analog：** `scripts/verify-phase41-batch-import.ts`

**静态检查表结构**（`verify-phase42-operator-recovery.ts` lines 97-157）：
```ts
const staticChecks: StaticCheck[] = [
  {
    label: "settings surface exposes async operator quick link",
    passed: nonCommentIncludes(settingsSource, "/settings/labs/async-tasks"),
  },
  {
    label: "recovery service uses BullMQ retry and recovery audit events",
    passed:
      nonCommentIncludes(recoverySource, "Job.fromId")
      && nonCommentIncludes(recoverySource, "canOperatorAccessTask(task, scope)")
      && nonCommentIncludes(recoverySource, 'eq(asyncTasks.status, "failed")')
      && nonCommentIncludes(recoverySource, "await job.retry()")
      && nonCommentIncludes(recoverySource, "task.operator_recovery_requested")
      && nonCommentIncludes(recoverySource, "task.retry_seeded")
      && nonCommentIncludes(recoverySource, "task.operator_recovery_failed")
      && !nonCommentIncludes(recoverySource, "enqueueAsyncTask("),
  },
];
```

**前置 phase 回归链**（`verify-phase42-operator-recovery.ts` lines 170-185）：
```ts
runVitest(
  [
    "src/features/async-tasks/server/registry.reliability.test.ts",
    "src/features/async-tasks/worker/bootstrap.test.ts",
    "src/lib/dal/async-task-operator.test.ts",
  ],
  "phase 42 focused suites",
);

run("node", ["--import", "tsx", "scripts/verify-phase41-batch-import.ts"], "phase 41 regression");
```

**focused suites + copy contract**（`verify-phase41-batch-import.ts` lines 156-174）：
```ts
runVitest(
  [
    "src/actions/course-import-actions.test.ts",
    "src/lib/dal/course-import.test.ts",
    "src/features/async-tasks/worker/processors/course-import.test.ts",
  ],
  "phase 41 backend focused suites",
);

console.log("Phase 41 batch import verification passed");
console.log("- Active-task reuse, partial-success summaries, honest UI copy, and recent-task re-entry posture remain locked.");
```

**Planner 复制点：** Phase 43 verifier 也应采用：`staticChecks[] + focused vitest + prior phase regressions + human-readable console summary`，并显式校验四类 workload 的 coverage matrix。

---

## Shared Patterns

### 1. 统一 enqueue seam + honest dispatch posture
**来源：** `src/features/async-tasks/server/enqueue.ts` lines 32-46, 52-91, 122-180, 232-236

```ts
export async function enqueueAsyncTask(input: EnqueueAsyncTaskInput) {
  const definition = asyncTaskRegistry[input.taskType];

  if (!definition) {
    throw new Error("ASYNC_TASK_TYPE_NOT_FOUND");
  }

  const payload = definition.payloadSchema.parse(input.payload);
  const normalizedEntityRef = {
    entityType: input.entityRef.entityType,
    entityId: input.entityRef.entityId,
    entityLabel: input.entityRef.entityLabel ?? null,
  };

  const [task] = await db
    .insert(asyncTasks)
    .values({
      actorId: input.actorId,
      schoolId: input.schoolId,
      taskType: definition.taskType,
      featureArea: definition.featureArea,
      status: input.dispatchFailureReason ? "dispatch_failed" : initialStatus,
      enqueueIntentStatus: initialEnqueueIntentStatus,
      visibilityScope: definition.visibilityScope,
      entityType: normalizedEntityRef.entityType,
      entityId: normalizedEntityRef.entityId,
      entityLabel: normalizedEntityRef.entityLabel,
      labelKey: definition.labelKey,
      summaryKey: definition.summaryKey,
      payloadJson: payload,
    })
    .returning();

  const job = await queue.add(definition.taskType, payload, dispatchOptions);
```

**适用：** 全部新 task family。  
**Planner 说明：** reminder / classroom summary / knowledgeSource 都必须先落 SQLite ledger，再进入队列；不能让 BullMQ 成为真相源。

### 2. Job id / 幂等键统一由 shared helper 生成
**来源：** `src/features/async-tasks/shared/idempotency.ts` lines 11-32

```ts
export function buildAsyncTaskJobId(input: AsyncTaskIdentityInput) {
  switch (input.reliability.idempotency?.strategy) {
    case "task_type_and_task_id":
      return `${input.taskType}:${input.taskId}`;
    case "task_id":
    default:
      return input.taskId;
  }
}

export function buildAsyncTaskJobOptions(input: AsyncTaskIdentityInput): JobsOptions {
  const { reliability } = input;

  return {
    jobId: buildAsyncTaskJobId(input),
    attempts: reliability.attempts,
    backoff: reliability.backoff,
  } satisfies JobsOptions;
}
```

**适用：** scheduled reminder / derived summary / resource ingest。  
**Planner 说明：** 不要在 processor 或 feature 层再手搓 jobId。

### 3. QueueEvents 投影负责把 runtime state 收口到 durable truth
**来源：** `src/features/async-tasks/infra/queue-events.ts` lines 206-240, 242-285, 306-358, 424-483

```ts
case "waiting": {
  return {
    status,
    enqueueIntentStatus: "dispatched",
    latestProgressJson: buildProgressSnapshot({
      stage: status,
      messageKey:
        status === "retrying"
          ? "asyncTasks.progress.retrying"
          : "asyncTasks.progress.queued",
    }),
    eventType: status === "retrying" ? "task.retrying" : "task.queued",
  };
}

case "completed": {
  const completedResult = buildCompletedResultSummary({
    queueName: input.queueName,
    jobId,
    attemptNumber: task.latestAttemptNumber,
    returnvalue: input.payload.returnvalue,
  });

  return {
    status: completedResult.status,
    latestResultJson: completedResult.result,
    completedAt: now,
    eventType: completedResult.eventType,
  };
}
```

**适用：** 全部 worker。  
**Planner 说明：** processor 只负责 return result summary；状态翻译由 QueueEvents projection 完成。

### 4. Operator recovery 固定走同一姿态
**来源：** `src/features/async-tasks/server/recovery.ts` lines 52-90, 98-171, 180-240

```ts
export async function retryAsyncTaskForOperator(input: { taskId: string }) {
  const scope = await resolveOperatorScope();
  const task = await db.query.asyncTasks.findFirst({
    where: eq(asyncTasks.id, input.taskId),
  });

  if (!canOperatorAccessTask(task, scope)) {
    throw new Error("ASYNC_TASK_OPERATOR_FORBIDDEN");
  }

  const queue = await getAsyncTaskQueue(task.taskType as keyof typeof asyncTaskRegistry);
  const job = await Job.fromId(queue, queueJobId);

  await tx.insert(asyncTaskEvents).values([
    {
      taskId: task.id,
      eventType: "task.operator_recovery_requested",
      status: "retrying",
    },
    {
      taskId: task.id,
      eventType: "task.retry_seeded",
      status: "retrying",
    },
  ]);

  await job.retry();
}
```

**适用：** reminder delivery 失败、resource ingest 失败、classroom summary 失败。  
**Planner 说明：** teacher 页不要重复造 retry；全部走 operator recovery。

### 5. Server Action 统一做 tag/path 失效
**来源：** `src/actions/async-task-operator-actions.ts` lines 62-69、`src/actions/course-import-actions.ts` lines 54-65, 91-99

```ts
const result = await retryAsyncTaskForOperator(parsed.data);
updateTag(cacheTags.asyncTask(result.taskId));
updateTag(cacheTags.asyncTaskEntity(result.entityType, result.entityId));
updateTag(cacheTags.asyncTaskList(result.actorId));
revalidatePath("/settings/labs/async-tasks");
revalidatePath(`/settings/labs/async-tasks/${result.taskId}`);
```

**适用：** reminder/resource/classroom 相关 action。  
**Planner 说明：** 不在 component 里直接碰 cache；继续收口到 action 层。

### 6. 业务真相 schema 继续留在业务表
**来源：** `src/db/schema.ts` lines 258-331, 334-367, 955-974, 1515-1544

```ts
export const asyncTasks = sqliteTable("asyncTask", {
  taskType: text("taskType").notNull(),
  featureArea: text("featureArea", {
    enum: ["platform", "course_import", "schedule", "runtime", "resource_processing", "notifications"],
  }).notNull(),
  status: text("status", {
    enum: ["pending_enqueue", "dispatching", "dispatch_failed", "queued", "running", "retrying", "stalled_recovery", "completed", "partially_completed", "failed", "cancelled"],
  }).notNull().default("pending_enqueue"),
});

export const knowledgeSources = sqliteTable("knowledgeSource", {
  resourceId: text("resourceId").notNull().references(() => resources.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).notNull().default("pending"),
});

export const knowledgeChunks = sqliteTable("knowledgeChunk", {
  sourceId: text("sourceId").notNull().references(() => knowledgeSources.id, { onDelete: "cascade" }),
  indexingStatus: text("indexingStatus", { enum: ["pending", "indexed", "failed"] }).notNull().default("pending"),
});

export const scheduleReminderDispatch = sqliteTable("scheduleReminderDispatch", {
  status: text("status", { enum: ["planned", "sent", "failed", "retry_required"] }).notNull().default("planned"),
  scheduledFor: integer("scheduledFor", { mode: "timestamp_ms" }).notNull(),
});
```

**适用：** reminder/resource/classroom derived artifact。  
**Planner 说明：** task ledger 是平台真相；`scheduleReminderDispatch`、`knowledgeSources/Chunks`、classroom summary artifact 才是 feature 真相。

## No Analog Found

| 文件 | 角色 | 数据流 | 原因 |
|---|---|---|---|
| `.planning/phases/43-additional-validation-workloads-and-milestone-proof/43-WORKLOAD-PROOF.md` | artifact | batch | 现有 repo 有 verifier script analog，但没有完全对应的“人工可读 workload coverage matrix”文档模板。建议沿用 `scripts/verify-phase4x*.ts` 的 summary 文案风格，自行组织矩阵。 |

## Metadata

**Analog search scope:** `src/features/async-tasks/{server,worker,infra}`, `src/features/schedule/reminders`, `src/lib/dal`, `src/actions`, `src/components/surfaces`, `src/db/schema.ts`, `scripts/verify-phase*.ts`  
**Files scanned:** 约 143 个候选文件（按本次 glob 结果汇总）  
**Pattern extraction date:** 2026-05-19
