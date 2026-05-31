# Phase 39: Async contracts and durable task truth - Patterns

**Generated:** 2026-05-18
**Status:** Ready for planning

## Target files and analogs

| Planned file | Role | Best analog | Why it matches |
|---|---|---|---|
| `src/features/async-tasks/shared/contract.ts` | Platform contract root | `src/features/runtime-platform/seams/transport/contract.ts` | 同样是 feature-root 下的 typed contract + Zod schema + inferred types |
| `src/features/async-tasks/shared/dto.ts` | Product-facing DTO schema | `src/lib/dto/course-import.ts` | 同样需要结构化 status / summary / result vocabulary |
| `src/features/async-tasks/server/registry.ts` | Typed registry definition | `src/features/runtime-platform/seams/transport/contract.ts` | 当前仓库没有直接 registry 样板，最接近的是 contract-first typed seam module |
| `src/lib/dal/async-tasks.ts` | DAL read model + status mapping | `src/lib/dal/course-import.ts` | 已体现 cached DAL、summary builder、DTO parse、main row + child rows read model |
| `src/db/schema.ts` additions | Durable main + history tables | existing `courseImportBatch/courseImportRow`, `runtimeStepStates/runtimeEventOutbox`, `transportDeliveryAttempts/transportConsumerTraces` | 仓库已经接受 latest snapshot + append-only history 双层持久化 |
| `src/actions/*` async enqueue action/seam integration | Server Action -> parse -> actor -> orchestrator | `src/actions/course-authoring-actions.ts` | 当前最稳的 server action boundary 模式 |
| `scripts/verify-phase39-async-tasks.ts` | Static guard + focused suites verifier | `scripts/verify-phase15-course-import.ts`, `scripts/verify-phase37-redis-fanout.ts` | 当前 phase verifier 的固定写法 |

## Extracted code patterns

### Pattern 1: Contract modules export schemas and inferred types together

From `src/features/runtime-platform/seams/transport/contract.ts`:

```ts
export const RuntimeTransportPublishInputSchema = RuntimeTransportEnvelopeSchema.extend({
  truthPersisted: z.boolean(),
});

export type RuntimeTransportPublishInput = z.infer<typeof RuntimeTransportPublishInputSchema>;
```

Planning implication:

- `async-tasks` contracts should keep `Schema + type` co-located.
- Platform enums should be explicit `z.enum([...])`, not freeform strings.

### Pattern 2: DAL read models are cache-tagged and DTO-validated

From `src/lib/dal/course-import.ts`:

```ts
async function getCachedCourseImportBatchDTO(input: { batchId: string; actorId: string; schoolIds: string[] }) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.teacherCourses(input.actorId));
  cacheTag(cacheTags.courseImportBatch(input.batchId));

  return CourseImportBatchDTOSchema.parse({ ... });
}
```

Planning implication:

- `async task list/detail` reads should live in DAL and use explicit cache tags.
- Final read models should return parsed DTOs, not raw rows.

### Pattern 3: Summary builders live near DAL mapping logic

From `src/lib/dal/course-import.ts`:

```ts
function buildReviewSummary(rows: CourseImportRowReviewDTO[]) {
  return {
    total: rows.length,
    readyToCreate: rows.filter((row) => row.status === "ready_to_create").length,
    matchedExisting: rows.filter((row) => row.status === "matched_existing").length,
  };
}
```

Planning implication:

- `latestProgress` / `outcomeSummary` / task list chips should be derived in dedicated mapper helpers.
- Planner should avoid pushing raw SQL/JSON mapping concerns into UI.

### Pattern 4: Server Actions do parse -> actor -> orchestrator/DAL -> tag invalidation

From `src/actions/course-authoring-actions.ts`:

```ts
const parsed = CourseCreateInputSchema.safeParse(normalized);
if (!parsed.success) return validationError();

const actor = await assertActiveTeacher();
const course = await createCourseForTeacherScoped(parsed.data);
invalidateCourseTags(actor.userId, course.id);
return { ok: true, data: course };
```

Planning implication:

- Async enqueue actions should preserve this exact shape.
- Queue/broker calls must not appear in the action layer.

### Pattern 5: Honest delivery attempts persist before/alongside external delivery

From `src/features/runtime-platform/seams/transport/gateway.ts`:

```ts
const [attempt] = await db
  .insert(transportDeliveryAttempts)
  .values({
    truthPersisted: event.truthPersisted,
    deliveryAttempted: Boolean(adapter),
    attemptStatus: adapter ? "pending" : "skipped",
  })
  .returning();
```

Planning implication:

- Async enqueue seam should persist durable task row / intent before claiming dispatch succeeded.
- `pending_enqueue` and `dispatch_failed` are aligned with existing repo honesty patterns.

### Pattern 6: Verifiers combine static source guards with focused test suites

From `scripts/verify-phase37-redis-fanout.ts`:

```ts
const staticChecks: StaticCheck[] = [ ... ];

if (failedChecks.length > 0) {
  process.exit(1);
}

runVitest(focusedSuites, "phase 37 focused suites");
runPnpm(["typecheck"], "pnpm typecheck");
```

Planning implication:

- Phase 39 verification should follow the same repo-standard verifier pattern.
- Plan tasks should reserve a dedicated verifier script instead of relying on ad hoc commands only.

## Constraints the executor must preserve

- UI components do not import DB or queue clients directly.
- DAL remains the only source of durable read models.
- Feature seam/orchestrator owns enqueue honesty.
- SQLite remains the user-visible truth layer even after BullMQ lands later.

---

*Phase: 39-async-contracts-and-durable-task-truth*
