# Phase 57: Classroom Runtime Sample Chain - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 16
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/dto/classroom.ts` | model | transform | `src/lib/dto/classroom.ts` | exact |
| `src/lib/dto/learning.ts` | model | transform | `src/lib/dto/learning.ts` | exact |
| `src/actions/classroom-actions.ts` | controller | request-response | `src/actions/classroom-actions.ts` | exact |
| `src/lib/dal/classroom.ts` | service | event-driven | `src/lib/dal/classroom.ts` | exact |
| `src/lib/dal/learning.ts` | service | CRUD | `src/lib/dal/learning.ts` | exact |
| `src/features/runtime-platform/classroom/runtime-session.ts` | service | event-driven | `src/features/runtime-platform/classroom/runtime-session.ts` | exact |
| `src/components/classroom/classroom-launch-panel.tsx` | component | request-response | `src/components/classroom/classroom-launch-panel.tsx` | exact |
| `src/components/classroom/classroom-control-panel.tsx` | component | event-driven | `src/components/classroom/classroom-control-panel.tsx` | exact |
| `src/components/learning/classroom-runtime-client.tsx` | component | streaming | `src/components/learning/classroom-runtime-client.tsx` | exact |
| `src/components/classroom/classroom-roster-panel.tsx` | component | request-response | `src/components/classroom/classroom-roster-panel.tsx` | exact |
| `src/components/classroom/classroom-student-detail-panel.tsx` | component | request-response | `src/components/classroom/classroom-student-detail-panel.tsx` | exact |
| `src/components/surfaces/classroom-console-surface.tsx` | component | request-response | `src/components/surfaces/classroom-console-surface.tsx` | exact |
| `src/lib/dal/classroom.test.ts` | test | event-driven | `src/lib/dal/classroom.test.ts` | exact |
| `src/features/runtime-platform/classroom/runtime-session.test.ts` | test | event-driven | `src/features/runtime-platform/classroom/runtime-session.test.ts` | exact |
| `src/actions/classroom-actions.test.ts` | test | request-response | `src/actions/classroom-actions.test.ts` | exact |
| `src/components/learning/classroom-runtime-client.test.tsx` | test | streaming | `src/components/learning/classroom-runtime-client.test.tsx` | exact |

## Pattern Assignments

### `src/lib/dto/classroom.ts` (model, transform)

**Analog:** `src/lib/dto/classroom.ts`

**Imports/schema composition** (`src/lib/dto/classroom.ts:1-24`):
```ts
import { z } from "zod";

import {
  RuntimeBootstrapRequestEnvelopeSchema,
  RuntimeReadyRequestEnvelopeSchema,
  RuntimeInteractionRequestEnvelopeSchema,
  RuntimeSaveRequestEnvelopeSchema,
  RuntimeSubmitRequestEnvelopeSchema,
  RuntimeTeacherControlRequestEnvelopeSchema,
  TeachingBridgeResultEnvelopeSchema,
} from "@/features/runtime-platform/contracts/bridge";
```

**Launch readiness shape** (`src/lib/dto/classroom.ts:163-181`):
```ts
export const ClassroomLaunchReadinessIssueDTOSchema = z.object({
  code: ClassroomLaunchReadinessIssueCodeSchema,
  message: z.string(),
  stepId: z.string().nullable().optional(),
});

export const ClassroomLaunchReadinessDTOSchema = z.object({
  blockingIssues: z.array(ClassroomLaunchReadinessIssueDTOSchema),
  attentionIssues: z.array(ClassroomLaunchReadinessIssueDTOSchema),
  advisoryIssues: z.array(ClassroomLaunchReadinessIssueDTOSchema),
});
```

**Snapshot DTO nesting pattern** (`src/lib/dto/classroom.ts:527-562`):
```ts
export const ClassroomSnapshotDTOSchema = z.object({
  sessionId: z.string(),
  activeStepId: z.string(),
  locked: z.boolean(),
  status: z.enum(["live", "ended"]),
  version: z.number().int(),
  participants: z.array(ClassroomParticipantMonitoringDTOSchema),
  monitoringSummary: ClassroomRosterSummaryDTOSchema,
  steps: z.array(ClassroomStepDTOSchema),
  slideState: ClassroomSlideStateDTOSchema.nullable().default(null),
  transportStatus: z.object({
    fanoutMode: z.enum(["local_only", "redis_fanout"]),
    degraded: z.boolean(),
    degradedReason: z.string().nullable(),
  }),
  teacherTimeline: z.array(ClassroomTeacherTimelineEntryDTOSchema).default([]),
});
```

**Copy forward:** 新增 voting round / aggregation 字段时，继续用窄枚举 + 嵌套 DTO + `.default()`，不要塞散乱 `Record<string, unknown>`。

---

### `src/lib/dto/learning.ts` (model, transform)

**Analog:** `src/lib/dto/learning.ts`

**Runtime state contract** (`src/lib/dto/learning.ts:26-54`):
```ts
export const RuntimeStepStateDTOSchema = z.object({
  forcedStepId: z.string().nullable(),
  forcedLabel: z.string().default("老师指定"),
  locked: z.boolean().default(false),
  classroomSessionId: z.string().nullable().default(null),
  classroomVersion: z.number().int().nullable().default(null),
  connectionState: z.enum(["connected", "reconnecting", "offline", "snapshot_fallback"]).default("offline"),
  lastFailedAction: z.enum(["runtime-save", "runtime-submit"]).nullable().default(null),
  latestRuntimeStateSummary: z.record(z.string(), z.unknown()).default({}),
  runtimeRecoveryStatus: z.enum(["unavailable", "available", "restored"]).default("unavailable"),
});
```

**Player shell/personal split** (`src/lib/dto/learning.ts:154-187`):
```ts
export const StudentPlayerDTOSchema = z.object({
  shell: z.object({
    lessonId: z.string(),
    publishedVersionId: z.string(),
    title: z.string(),
    objective: z.string(),
    steps: z.array(LearningStepDTOSchema),
  }),
  progress: z.object({ ... }),
  stepActivities: z.array(StudentStepActivityDTOSchema).default([]),
  runtime: RuntimeStepStateDTOSchema,
});

export const StudentPlayerShellDTOSchema = StudentPlayerDTOSchema.shape.shell;
export const StudentPlayerPersonalDTOSchema = StudentPlayerDTOSchema.omit({ shell: true });
```

**Copy forward:** voting 的“已提交，等待老师结束”应先落 `runtime` 子对象，不要破坏 shell/personal split。

---

### `src/actions/classroom-actions.ts` (controller, request-response)

**Analog:** `src/actions/classroom-actions.ts`

**Imports + server action posture** (`src/actions/classroom-actions.ts:1-25`):
```ts
"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import {
  launchClassroomSession,
  saveRuntimeSessionState,
  submitRuntimeSessionState,
  recordRuntimeTeacherControl,
} from "@/lib/dal/classroom";
import { cacheTags } from "@/lib/cache-policy";
```

**Validation/error helper pattern** (`src/actions/classroom-actions.ts:55-104`):
```ts
function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) {
    return input;
  }
  return Object.fromEntries(input.entries());
}

function handleClassroomActionError(error: unknown, fallbackMessage = "操作失败，请重试。") {
  if (error instanceof z.ZodError) {
    return validationError();
  }
  if (error instanceof Error) {
    return { ok: false as const, error: error.message || "CLASSROOM_ACTION_FAILED", message: error.message || fallbackMessage };
  }
  return { ok: false as const, error: "CLASSROOM_ACTION_FAILED", message: fallbackMessage };
}
```

**Mutation + cache invalidation pattern** (`src/actions/classroom-actions.ts:357-367`):
```ts
const result = RuntimeSubmitResultSchema.parse(await submitRuntimeSessionState(parsed.data));
updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId));
updateTag(cacheTags.progress(result.lessonId, result.actorId));
updateTag(cacheTags.submission(result.lessonId, result.actorId));
updateTag(cacheTags.teacherReview(result.lessonId));
```

**Teacher control fallback pattern** (`src/actions/classroom-actions.ts:373-384`):
```ts
export async function recordRuntimeTeacherControlAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = RecordRuntimeTeacherControlInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();

  try {
    const result = await recordRuntimeTeacherControl(parsed.data);
    updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId));
    return { ok: true, data: result };
  } catch (error) {
    return handleClassroomActionError(error);
  }
}
```

**Copy forward:** 新增 trigger/end voting action 时，复用同一 `safeParse -> DAL -> updateTag -> ActionResult` 结构。

---

### `src/lib/dal/classroom.ts` (service, event-driven)

**Analog:** `src/lib/dal/classroom.ts`

**Launch binds published snapshot** (`src/lib/dal/classroom.ts:3234-3332`):
```ts
const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, payload.lessonId) });
if (!lesson || lesson.status !== "published" || !lesson.publishedVersionId || lesson.publishedVersionId !== payload.publishedVersionId) {
  throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
}

const published = await db.query.publishedLessonVersions.findFirst({
  where: eq(publishedLessonVersions.id, lesson.publishedVersionId)
});
const snapshot = parseSnapshot(published.snapshotJson);
const steps = parseSnapshotSteps(snapshot, lesson.id);
```

**Teacher control/version conflict pattern** (`src/lib/dal/classroom.ts:1948-2029`):
```ts
if (session.version !== input.expectedVersion) {
  return ClassroomActionResultDTOSchema.parse({
    ok: false,
    sessionId: session.id,
    error: "VERSION_CONFLICT",
    code: "conflict",
    expectedVersion: input.expectedVersion,
    serverVersion: session.version,
    snapshot: await getClassroomSnapshotForActor({ ... }),
  });
}

const [event] = await db.insert(classroomEvents).values({
  sessionId: session.id,
  version: updated.version,
  type: "active_step_changed",
  actorId: input.actorId,
  payloadJson: { activeStepId: input.targetStepId, slideIndex: 0 },
}).returning();

await publishClassroomTransportEvent({ ... kind: "active_step_changed" ... });
```

**Aggregation/read-model pattern** (`src/lib/dal/classroom.ts:2278-2408`):
```ts
const studentSummaries = participants.map((participant) => {
  const taskAttempts = latestTaskByStudent.get(participant.studentId) ?? [];
  const quizAttemptsForStudent = latestQuizByStudent.get(participant.studentId) ?? [];
  const missingSubmissionCount = steps.filter((step) => {
    if (step.type === "task") {
      return !taskAttempts.some((attempt) => attempt.stepId === step.id);
    }
    return !quizAttemptsForStudent.some((attempt) => attempt.stepId === step.id);
  }).length;
  const needsFollowUp = latestParticipationLevel === "attention" || hasUnevaluatedSignal || missingSubmissionCount > 0;
  return { ... needsFollowUp, pendingFeedbackCount };
});

const stepSummaries = steps.map((step) => {
  const submissionCount = step.type === "task"
    ? latestTaskRows.filter((row) => row.stepId === step.id).length
    : step.type === "quiz"
      ? latestQuizRows.filter((row) => row.stepId === step.id).length
      : evidenceRows.filter((row) => row.stepId === step.id && row.sourceType === "student-quick-response").length;
  return { stepId: step.id, stepTitle: step.title, completionCount, submissionCount, attentionCount, totalStudents: participants.length };
});
```

**Copy forward:** voting 汇总/未完成名单/冻结视图应继续在 DAL 聚合，别在 client 重放事件流。

---

### `src/lib/dal/learning.ts` (service, CRUD)

**Analog:** `src/lib/dal/learning.ts`

**Append-only latest marker pattern** (`src/lib/dal/learning.ts:585-617`):
```ts
const previous = await tx.query.taskSubmissions.findMany({ ... orderBy: desc(taskSubmissions.attemptNo) });
const attemptNo = (previous[0]?.attemptNo ?? 0) + 1;

await tx.update(taskSubmissions)
  .set({ isLatest: false })
  .where(and(
    eq(taskSubmissions.publishedVersionId, input.publishedVersionId),
    eq(taskSubmissions.stepId, input.stepId),
    eq(taskSubmissions.studentId, input.studentId),
  ));

const [row] = await tx.insert(taskSubmissions).values({
  ...,
  attemptNo,
  payloadJson: input.payload,
  isLatest: true,
}).returning();
```

**Quiz twin pattern** (`src/lib/dal/learning.ts:628-661`):
```ts
await tx.update(quizAttempts)
  .set({ isLatest: false })
  .where(and(
    eq(quizAttempts.publishedVersionId, input.publishedVersionId),
    eq(quizAttempts.stepId, input.stepId),
    eq(quizAttempts.studentId, input.studentId),
  ));
```

**Runtime recovery read seam** (`src/lib/dal/learning.ts:831-887`):
```ts
const latestRuntime = currentQuickResponseStepId
  ? await getLatestRuntimeRecoverySummary({
      lessonId: input.lessonId,
      stepId: currentQuickResponseStepId,
      actorId: scope.userId,
    })
  : null;

runtime: {
  ...,
  latestRuntimeStateSummary: latestRuntime?.summary ?? {},
  runtimeRecoveryStatus: latestRuntime ? (classroomSessionId ? "restored" : "available") : "unavailable",
}
```

**Copy forward:** 同轮覆盖最后一次提交应继续沿 `isLatest`；same-payload dedupe/cutoff 校验应加在写入前，不要改掉 append-only 模式。

---

### `src/features/runtime-platform/classroom/runtime-session.ts` (service, event-driven)

**Analog:** `src/features/runtime-platform/classroom/runtime-session.ts`

**Published snapshot runtime context** (`src/features/runtime-platform/classroom/runtime-session.ts:139-182`):
```ts
const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, input.classroomSessionId) });
const published = await db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) });
const snapshot = parseSnapshot(published.snapshotJson);
const snapshotStep = (snapshot.steps ?? []).find((step) => step.id === input.stepId);
const payload = lessonStepPayloadSchema.parse(snapshotStep.payload);

if (!payload.runtime) {
  throw new Error("RUNTIME_DESCRIPTOR_REQUIRED");
}
```

**Save/submit split** (`src/features/runtime-platform/classroom/runtime-session.ts:647-734`, `736-907`):
```ts
export async function saveRuntimeState(...) {
  const state = await appendRuntimeState({ kind: "saved", ... });
  await createRuntimeOutboxEvent({ eventType: "runtime.state.saved", ... });
}

export async function submitRuntimeState(...) {
  const state = await appendRuntimeState({ kind: "submitted", ... });
  if (bridgeTargets.includes("classroom-evidence")) {
    await recordRuntimeClassroomEvidence({ ... });
  }
  if (bridgeTargets.includes("task-submission")) {
    await recordRuntimeTaskSubmission({ ... });
  }
  if (bridgeTargets.includes("quiz-attempt")) {
    await recordRuntimeQuizAttempt({ ... });
  }
  await recordRuntimeProgressCompletion({ ... });
}
```

**Recovery summary** (`src/features/runtime-platform/classroom/runtime-session.ts:935-969`):
```ts
export async function getLatestRuntimeRecoverySummary(input: { lessonId: string; stepId: string; actorId: string; }) {
  const session = await db.query.runtimeStepSessions.findFirst({ ... eq(runtimeStepSessions.isLatest, true) ... });
  const state = await getLatestRuntimeState(session.id);
  return {
    sessionId: session.id,
    runtimeId: session.runtimeId,
    runtimeVersion: session.runtimeVersion,
    stateVersion: state.stateVersion,
    kind: state.kind,
    summary: state.summaryJson as Record<string, unknown>,
  };
}
```

**Copy forward:** voting dedupe、teacher-ended cutoff、submitted-waiting proofSummary 都应优先落在 `submitRuntimeState()` 这条主链。

---

### `src/components/classroom/classroom-launch-panel.tsx` (component, request-response)

**Analog:** `src/components/classroom/classroom-launch-panel.tsx`

**Action submit pattern** (`src/components/classroom/classroom-launch-panel.tsx:61-90`):
```tsx
const formData = new FormData()
formData.append('lessonId', selectedLessonId)
formData.append('publishedVersionId', selectedLesson!.publishedVersionId)
formData.append('classId', selectedClassId)

const result = await launchClassroomSessionAction(formData)
if (result.ok) {
  const sessionId = ...
  router.push(`/classroom?sessionId=${encodeURIComponent(sessionId)}`)
} else {
  setError(result.message)
}
```

**Readiness presentation pattern** (`src/components/classroom/classroom-launch-panel.tsx:183-208`):
```tsx
<ReadinessGroup
  title="阻断项"
  issues={selectedLesson?.launchReadiness.blockingIssues ?? []}
  emptyLabel="当前没有阻断项，可以继续选择整班并开启课堂。"
  tone="blocking"
/>
<ReadinessGroup title="需关注" issues={selectedLesson?.launchReadiness.attentionIssues ?? []} tone="attention" />
<ReadinessGroup title="建议完善" issues={selectedLesson?.launchReadiness.advisoryIssues ?? []} tone="advisory" />
```

**Copy forward:** voting readiness 仍然复用这三层，不新增二次确认 modal。

---

### `src/components/classroom/classroom-control-panel.tsx` (component, event-driven)

**Analog:** `src/components/classroom/classroom-control-panel.tsx`

**Socket-first, action-fallback control** (`src/components/classroom/classroom-control-panel.tsx:108-160`):
```tsx
const sendTeacherControl = (payload: { command: 'focus-step' | 'lock' | 'unlock' | 'set-slide'; ... }) => {
  return socketRef.current?.send({ kind: 'teacher.control', payload }) ?? { ok: false as const, reason: 'socket_unavailable' as const }
}

const wsResult = sendRuntimeCommand()
if (wsResult.ok) {
  return
}

await fallbackRuntimeCommand()
router.refresh()
```

**Conflict-aware handlers** (`src/components/classroom/classroom-control-panel.tsx:162-239`):
```tsx
const result = await changeClassroomStepAction(formData)
if (!result.ok && result.error === 'VERSION_CONFLICT') {
  setConflict(hasLatestSnapshot(result) ? result : null)
} else if (result.ok) {
  router.refresh()
}
```

**Teacher feedback block pattern** (`src/components/classroom/classroom-control-panel.tsx:394-421`):
```tsx
{showRuntimeProofFeedback ? (
  <Card className="bg-surface-container-low p-5 sm:p-6">
    <p className="text-sm text-on-surface-variant">proof first-feedback</p>
    <h3 className="mt-2 text-2xl font-semibold text-on-surface">...</h3>
    {runtimeInspectorHref ? (
      <Button asChild variant="secondary"><Link href={runtimeInspectorHref}>查看运行轨迹</Link></Button>
    ) : null}
  </Card>
) : null}
```

**Copy forward:** trigger/end voting 按现有 `teacher.control` + `runtime.command` 双轨做；结果汇总块插在主舞台下、名册上方最贴合现有信息架构。

---

### `src/components/learning/classroom-runtime-client.tsx` (component, streaming)

**Analog:** `src/components/learning/classroom-runtime-client.tsx`

**Runtime host seam** (`src/components/learning/classroom-runtime-client.tsx:105-127`):
```tsx
if (runtimeDescriptor) {
  return (
    <RuntimeHostClient
      descriptor={runtimeDescriptor}
      surface="student-player"
      actorScope="student"
      lessonId={player.shell.lessonId}
      stepId={step.id}
      classroomSessionId={player.runtime.classroomSessionId}
      latestRuntimeStateSummary={player.runtime.latestRuntimeStateSummary}
      note={player.runtime.runtimeRecoveryStatus === 'restored' ? '已恢复上次 runtime 状态...' : '当前步骤通过共享 runtime host 渲染...' }
    />
  )
}
```

**Reconnect + durable snapshot parity** (`src/components/learning/classroom-runtime-client.tsx:356-466`):
```tsx
const res = await fetch(`/api/classroom/${sid}/snapshot`, { cache: 'no-store' })
...
const applySnapshot = (snapshot: ClassroomSnapshotDTO, state: 'connected' | 'reconnecting' | 'snapshot_fallback') => {
  let forcedStepId = null
  let teacherRecommendedStepId = null
  const locked = Boolean(snapshot.locked)
  if (locked) {
    forcedStepId = snapshot.activeStepId
  } else {
    teacherRecommendedStepId = snapshot.activeStepId
  }
  setRuntime((prev) => ({ ...prev, forcedStepId, locked, classroomVersion: snapshot.version, connectionState: state }))
}
```

**Status banner** (`src/components/learning/classroom-runtime-client.tsx:501-515`):
```tsx
{sessionId && (snapshotStatusCopy || runtime.connectionState === 'snapshot_fallback') && (
  <div className="mb-5 rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
    <Badge variant={runtime.connectionState === 'connected' ? 'accent' : 'accent'}>
      {runtime.connectionState === 'connected' ? '课堂已连接' : '正在重新连接'}
    </Badge>
    {runtime.connectionState === 'snapshot_fallback' && (
      <Button onClick={handleManualRefresh}>重新连接课堂</Button>
    )}
  </div>
)}
```

**Copy forward:** “已提交、等待老师结束”应作为当前 step 内状态提示，不要自动跳下一步或切结果页。

---

### `src/components/classroom/classroom-roster-panel.tsx` (component, request-response)

**Analog:** `src/components/classroom/classroom-roster-panel.tsx`

**Same-route detail routing** (`src/components/classroom/classroom-roster-panel.tsx:22-30`):
```tsx
const params = new URLSearchParams(searchParams.toString())
if (sessionId) {
  params.set('sessionId', sessionId)
}
params.set('studentId', studentId)
params.set('detailTab', 'evidence')
router.push(`${pathname}?${params.toString()}`)
```

**Metric tiles + participant card** (`src/components/classroom/classroom-roster-panel.tsx:45-50`, `53-84`):
```tsx
<RosterMetric label="已连接" value={`${monitoringSummary.connectedCount}`} detail={`共 ${participants.length} 人`} />
<RosterMetric label="需要关注" value={`${monitoringSummary.needsAttentionCount}`} detail="优先干预对象" />
<RosterMetric label="已提交" value={`${monitoringSummary.submittedCount}`} detail="当前环节已有回应" />

{participant.attentionReasons.map((reason) => (
  <span key={`${participant.studentId}-${reason}`} className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-medium text-primary">
    {reason}
  </span>
))}
```

**Copy forward:** “未完成名单”最适合做成这里的一个独立列表/过滤分组，而不是另起页面。

---

### `src/components/classroom/classroom-student-detail-panel.tsx` (component, request-response)

**Analog:** `src/components/classroom/classroom-student-detail-panel.tsx`

**Folded tab/detail pattern** (`src/components/classroom/classroom-student-detail-panel.tsx:52-58`, `85-102`):
```tsx
const switchTab = (nextTab: ClassroomStudentDetailTab) => {
  const params = new URLSearchParams(searchParams.toString())
  params.set('sessionId', sessionId)
  params.set('studentId', detail.studentId)
  params.set('detailTab', nextTab)
  router.push(`${pathname}?${params.toString()}`)
}
```

**Evidence item renderer** (`src/components/classroom/classroom-student-detail-panel.tsx:104-140`):
```tsx
detail.unifiedEvidenceItems.map((entry) => (
  <article key={entry.id} className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
    <p className="mt-3 text-sm leading-7 text-on-surface">{entry.detail}</p>
    {entry.feedbackTarget ? (
      <FeedbackComposer
        targetType={entry.feedbackTarget.targetType}
        targetId={entry.feedbackTarget.targetId}
        latestFeedback={entry.feedbackTarget.latestFeedback}
      />
    ) : null}
  </article>
))
```

**Copy forward:** 实名 voting 明细保持默认折叠，沿用这个 detail panel 的按需展开机制。

---

### `src/components/surfaces/classroom-console-surface.tsx` (component, request-response)

**Analog:** `src/components/surfaces/classroom-console-surface.tsx`

**Single-stage + tonal side panels shell** (`src/components/surfaces/classroom-console-surface.tsx:84-178`):
```tsx
<section className={cn("overflow-hidden bg-surface-container-low", teacherSurfaceRhythm.shell)}>
  <div className={cn("bg-linear-135 from-primary to-primary-container text-on-primary", teacherSurfaceRhythm.gradientHeroContent)}>
    ...
  </div>
</section>

<section className={cn(teacherSurfaceRhythm.sectionCompact, 'bg-surface-container-low')}>
  <Badge className="bg-surface-container-lowest text-on-surface-variant">单一主舞台 + 次级 tonal panels</Badge>
</section>

<ClassroomControlPanel ... />
```

**Copy forward:** voting 结果面板必须留在这套 shell 里，不新建结果页。

---

### `src/lib/dal/classroom.test.ts` (test, event-driven)

**Analog:** `src/lib/dal/classroom.test.ts`

**Source-anchored assertions** (`src/lib/dal/classroom.test.ts:463-481`):
```ts
expect(source).toContain("publishClassroomTransportEvent");
expect(source).toContain('kind: "active_step_changed"');
expect(source).toContain("recordRuntimeClassroomEvidence");
expect(source).toContain('sourceType: "student-submission"');
```

**DTO/read-model fixture style** (`src/lib/dal/classroom.test.ts:668-797`, `1097-1118`):
```ts
expect(dto.monitoringSummary).toEqual({ ... });
expect(dto.participants).toEqual([
  expect.objectContaining({
    studentId: "student-1",
    runtimeProof: expect.objectContaining({ status: "submitted" }),
  }),
]);

expect(detail?.evaluationEntries).toHaveLength(1);
expect(detail?.evidenceEntries).toHaveLength(1);
expect(detail?.unifiedEvidenceItems.some((item) => item.kind === "task")).toBe(true);
```

**Copy forward:** voting aggregation/frozen results/incomplete roster tests应继续走“mock read rows -> assert DTO shape”风格。

---

### `src/features/runtime-platform/classroom/runtime-session.test.ts` (test, event-driven)

**Analog:** `src/features/runtime-platform/classroom/runtime-session.test.ts`

**Boundary test style** (`src/features/runtime-platform/classroom/runtime-session.test.ts:67-93`):
```ts
const saveStart = source.indexOf("export async function saveRuntimeState");
const submitStart = source.indexOf("export async function submitRuntimeState");
const saveSource = source.slice(saveStart, submitStart);

expect(saveSource).not.toContain("recordRuntimeTaskSubmission");
expect(saveSource).not.toContain("recordRuntimeQuizAttempt");
expect(source).toContain("runtimeSessionId: runtimeSession.sessionId");
expect(source).toContain("proofSummary");
```

**Copy forward:** same-payload dedupe / teacher-ended cutoff 先补 source-anchored guards，再补行为用例。

---

### `src/actions/classroom-actions.test.ts` (test, request-response)

**Analog:** `src/actions/classroom-actions.test.ts`

**Action result shape tests** (`src/actions/classroom-actions.test.ts:140-159`, `768-773`):
```ts
expect(result).toEqual({
  ok: false,
  error: "VERSION_CONFLICT",
  message: "课堂状态已经被更新。请先恢复最新状态，再继续操作。",
  latest: mockSnapshot,
  attemptedAction: { actionType: "change_step", targetStepId: "step-1" },
});

expect(actionSource).toContain("updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId))");
expect(actionSource).toContain("updateTag(cacheTags.progress(result.lessonId, result.actorId))");
```

**Copy forward:** teacher trigger/end voting action 测试应继续断言 `ActionResult` 和 `updateTag()`，不是只测 DAL mock 被调用。

---

### `src/components/learning/classroom-runtime-client.test.tsx` (test, streaming)

**Analog:** `src/components/learning/classroom-runtime-client.test.tsx`

**Transport mock style** (`src/components/learning/classroom-runtime-client.test.tsx:31-89`):
```ts
class MockEventSource { ... }
class MockWebSocket { ... }
```

**Reconnect/runtime-event assertions** (`src/components/learning/classroom-runtime-client.test.tsx:200-301`):
```ts
expect(classroomActionMocks.touchClassroomPresenceAction).toHaveBeenCalledWith({
  sessionId: 'session-1',
  connectionState: 'connected',
  currentStepId: 'step-1',
})

expect(fetch).toHaveBeenCalledWith('/api/classroom/session-1/snapshot', { cache: 'no-store' })
expect(screen.getByRole('button', { name: '重新连接课堂' })).toBeTruthy()
```

**Copy forward:** voting reconnect / submitted-state restore 的前端测试继续用 websocket + durable snapshot 双通道 mock。

## Shared Patterns

### Published snapshot is runtime truth
**Source:** `src/lib/dal/classroom.ts:3274-3287`, `src/features/runtime-platform/classroom/runtime-session.ts:151-182`
**Apply to:** DTO, DAL, runtime submit, teacher aggregation
```ts
const published = await db.query.publishedLessonVersions.findFirst({
  where: eq(publishedLessonVersions.id, session.publishedVersionId),
});
const snapshot = parseSnapshot(published.snapshotJson);
const snapshotStep = (snapshot.steps ?? []).find((step) => step.id === input.stepId);
const payload = lessonStepPayloadSchema.parse(snapshotStep.payload);
```

### Server Action boundary = `safeParse` + `updateTag`
**Source:** `src/actions/classroom-actions.ts:107-119`, `357-367`
**Apply to:** all new teacher voting actions / fallback actions
```ts
const parsed = SomeSchema.safeParse(normalizeInput(input));
if (!parsed.success) return validationError();

const result = await someDal(parsed.data);
updateTag(cacheTags.classroom(...));
return { ok: true, data: result };
```

### Teacher control must preserve version-conflict semantics
**Source:** `src/lib/dal/classroom.ts:1948-2029`, `3335-3489`
**Apply to:** voting trigger/end round controls
```ts
if (session.version !== input.expectedVersion) {
  return ClassroomActionResultDTOSchema.parse({
    ok: false,
    error: "VERSION_CONFLICT",
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}
```

### Canonical submit is append-only latest, not overwrite-in-place
**Source:** `src/lib/dal/learning.ts:585-617`, `628-661`
**Apply to:** voting overwrite-last semantics
```ts
await tx.update(taskSubmissions).set({ isLatest: false }).where(...);
await tx.insert(taskSubmissions).values({ attemptNo, payloadJson: input.payload, isLatest: true });
```

### Save vs submit must stay split
**Source:** `src/features/runtime-platform/classroom/runtime-session.ts:671-724`, `760-907`
**Apply to:** voting draft/save, submitted-waiting, cutoff checks
```ts
// saveRuntimeState -> state only
// submitRuntimeState -> evidence + submission/attempt + progress + outbox
```

### Student reconnect uses durable snapshot parity, not socket-only trust
**Source:** `src/components/learning/classroom-runtime-client.tsx:356-423`
**Apply to:** reconnect, submitted-state restore
```tsx
const snapshot = await fetchDurableSnapshot(sessionId)
if (snapshot) {
  applySnapshot(snapshot, 'connected')
  await touchPresence('connected', snapshot.activeStepId)
}
```

### Teacher result detail stays same-route and folded
**Source:** `src/components/classroom/classroom-roster-panel.tsx:22-30`, `src/components/classroom/classroom-student-detail-panel.tsx:52-58`
**Apply to:**实名 voting detail / incomplete drill-down
```tsx
params.set('studentId', studentId)
params.set('detailTab', 'evidence')
router.push(`${pathname}?${params.toString()}`)
```

## No Analog Found

None. 当前 Phase 57 需求都能直接落在既有 classroom/runtime/learning seams 上，无需另造第二套 runtime 或结果页。

## Metadata

**Analog search scope:** `src/actions`, `src/components/classroom`, `src/components/learning`, `src/components/surfaces`, `src/lib/dal`, `src/lib/dto`, `src/features/runtime-platform/classroom`
**Files scanned:** 18 targeted files + grep/glob search over `src/**/*.{ts,tsx}`
**Pattern extraction date:** 2026-05-25
