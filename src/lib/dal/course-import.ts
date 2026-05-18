import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { asyncTaskEvents, asyncTasks, courseImportBatch, courseImportRow, courses } from "@/db/schema";
import type { AsyncTaskListItemDTO } from "@/features/async-tasks";
import { AsyncTaskDetailDTOSchema } from "@/features/async-tasks/shared/dto";
import { getEntityAsyncTaskListDTO } from "@/lib/dal/async-tasks";
import { toAsyncTaskDetailDTOInput } from "@/features/async-tasks/server/mapper";
import { enqueueAsyncTask } from "@/features/async-tasks/server/enqueue";
import { cacheTags } from "@/lib/cache-policy";
import {
  ApplyCourseImportInputSchema,
  CourseImportApplyTriggerResultSchema,
  CourseImportAsyncTaskSummarySchema,
  CourseImportAsyncTaskResultSchema,
  CourseImportBatchDTOSchema,
  CourseImportDraftInputSchema,
  type CourseImportApplySummary,
  type CourseImportApplyTriggerResult,
  type CourseImportAsyncTaskPayload,
  type CourseImportDraftInput,
  type CourseImportDraftRowInput,
  type CourseImportMatchedCourse,
  type CourseImportRowDecision,
  type CourseImportRowReviewDTO,
  type CourseImportRowStatus,
  type CourseImportAsyncTaskSummary,
  type CourseImportValidationIssue,
} from "@/lib/dto/course-import";
import { createCourseForTeacherScoped, updateMatchedCourseStatusForTeacherScoped } from "@/lib/dal/course-authoring";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";

const COURSE_IMPORT_ACTIVE_TASK_STATUSES = [
  "pending_enqueue",
  "dispatching",
  "queued",
  "running",
  "retrying",
  "stalled_recovery",
] as const;

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeCell(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildMatchKey(row: Pick<CourseImportDraftRowInput, "title" | "subject" | "grade">) {
  return [row.title, row.subject, row.grade].map(normalizeCell).join("::").toLocaleLowerCase("zh-CN");
}

function createRowIssue(code: string, message: string, field: string | null = null): CourseImportValidationIssue {
  return { code, message, field };
}

function buildMatchedCourse(course: typeof courses.$inferSelect, actorId: string): CourseImportMatchedCourse {
  return {
    id: course.id,
    ownerId: course.ownerId,
    title: course.title,
    subject: course.subject,
    grade: course.grade,
    status: course.status as CourseImportMatchedCourse["status"],
    canUpdate: course.ownerId === actorId,
  };
}

function buildReviewSummary(rows: CourseImportRowReviewDTO[]) {
  return {
    total: rows.length,
    readyToCreate: rows.filter((row) => row.status === "ready_to_create").length,
    matchedExisting: rows.filter((row) => row.status === "matched_existing").length,
    sameFileConflict: rows.filter((row) => row.status === "same_file_conflict").length,
    invalid: rows.filter((row) => row.status === "invalid").length,
    blocked: rows.filter((row) => row.status === "blocked").length,
  };
}

function buildApplySummary(rows: CourseImportRowReviewDTO[]): CourseImportApplySummary {
  return {
    created: rows.filter((row) => row.result === "created").length,
    updated: rows.filter((row) => row.result === "updated").length,
    skipped: rows.filter((row) => row.result === "skipped").length,
    failed: rows.filter((row) => row.result === "failed").length,
  };
}

function getAsyncSurfaceStatusLabel(status: CourseImportAsyncTaskSummary["status"]) {
  switch (status) {
    case "queued":
      return "排队中";
    case "running":
      return "导入中";
    case "retrying":
      return "重试中";
    case "completed":
      return "已完成";
    case "partially_completed":
      return "已完成，但有失败项";
    case "failed":
      return "导入失败";
    case "dispatch_failed":
      return "未入队";
  }
}

function normalizeTaskStatusForCourseImport(task: AsyncTaskListItemDTO): CourseImportAsyncTaskSummary["status"] {
  switch (task.status) {
    case "pending_enqueue":
    case "dispatching":
    case "queued":
    case "stalled_recovery":
      return "queued";
    case "running":
      return "running";
    case "retrying":
      return "retrying";
    case "completed":
      return "completed";
    case "partially_completed":
      return "partially_completed";
    case "failed":
    case "cancelled":
      return "failed";
    case "dispatch_failed":
      return "dispatch_failed";
  }
}

function mapAsyncTaskToCourseImportSummary(input: {
  batchId: string;
  rowCount: number;
  task: AsyncTaskListItemDTO;
}): CourseImportAsyncTaskSummary {
  const normalizedStatus = normalizeTaskStatusForCourseImport(input.task);
  const detailRecord = input.task.result?.detail ?? {};
  const resultCounts = detailRecord.applySummary ?? input.task.result?.counts ?? null;
  const counts = resultCounts
    ? {
        created: Number((resultCounts as Record<string, unknown>).created ?? 0),
        updated: Number((resultCounts as Record<string, unknown>).updated ?? 0),
        skipped: Number((resultCounts as Record<string, unknown>).skipped ?? 0),
        failed: Number((resultCounts as Record<string, unknown>).failed ?? 0),
      }
    : null;
  const progressCounters = input.task.progress?.counters;
  const processedRows = progressCounters
    ? progressCounters.completed + progressCounters.failed + progressCounters.skipped
    : counts
      ? counts.created + counts.updated + counts.failed + counts.skipped
      : null;
  const totalRows = progressCounters?.total ?? (counts ? counts.created + counts.updated + counts.failed + counts.skipped : input.rowCount);
  const latestError = normalizedStatus === "retrying"
    ? "系统正在根据重试策略继续处理该批次。"
    : normalizedStatus === "failed"
      ? "导入任务未能完成，请检查失败原因后重新创建新任务。"
      : normalizedStatus === "dispatch_failed"
        ? "导入任务还没有成功进入队列。请先检查当前批次是否仍可应用，然后重新触发导入。"
        : null;
  const terminalHeadline =
    normalizedStatus === "partially_completed"
      ? "已完成，但有失败项"
      : normalizedStatus === "completed"
        ? "导入已完成"
        : normalizedStatus === "failed"
          ? "导入失败"
          : normalizedStatus === "dispatch_failed"
            ? "未成功进入队列"
            : null;
  const terminalGuidance =
    normalizedStatus === "partially_completed" || normalizedStatus === "failed" || normalizedStatus === "dispatch_failed"
      ? "请根据失败原因修正 CSV 或处理冲突后，重新创建新的导入任务。"
      : null;

  return CourseImportAsyncTaskSummarySchema.parse({
    taskId: input.task.id,
    status: normalizedStatus,
    statusLabel: getAsyncSurfaceStatusLabel(normalizedStatus),
    isActive: normalizedStatus === "queued" || normalizedStatus === "running" || normalizedStatus === "retrying",
    isTerminal:
      normalizedStatus === "completed" ||
      normalizedStatus === "partially_completed" ||
      normalizedStatus === "failed" ||
      normalizedStatus === "dispatch_failed",
    shouldFreezeReviewDecisions:
      normalizedStatus === "queued" ||
      normalizedStatus === "running" ||
      normalizedStatus === "retrying" ||
      normalizedStatus === "completed" ||
      normalizedStatus === "partially_completed" ||
      normalizedStatus === "failed",
    progressPercent: input.task.progress?.percentComplete ?? null,
    progressLabel: input.task.progress?.stageLabelKey ?? input.task.progress?.stage ?? null,
    progressNote: input.task.progress?.messageKey ?? null,
    processedRows,
    totalRows,
    latestError,
    terminalHeadline,
    terminalGuidance,
    counts,
    batchDetailHref: `/teacher/courses/import/${input.batchId}`,
    lastUpdatedAt: input.task.updatedAt,
  });
}

async function listSchoolCourses(schoolId: string) {
  return db.query.courses.findMany({ where: eq(courses.schoolId, schoolId) });
}

function classifyDraftRows(input: {
  rows: CourseImportDraftRowInput[];
  schoolCourses: Array<typeof courses.$inferSelect>;
  actorId: string;
}) {
  const duplicateCountByKey = new Map<string, number>();
  for (const row of input.rows) {
    const key = buildMatchKey(row);
    duplicateCountByKey.set(key, (duplicateCountByKey.get(key) ?? 0) + 1);
  }

  const schoolCourseByKey = new Map(input.schoolCourses.map((course) => [buildMatchKey(course), course]));

  return input.rows.map((row, index) => {
    const matchKey = buildMatchKey(row);
    const matchedCourse = schoolCourseByKey.get(matchKey) ?? null;
    const validationIssues: CourseImportValidationIssue[] = [];
    let status: CourseImportRowStatus = "ready_to_create";

    if ((duplicateCountByKey.get(matchKey) ?? 0) > 1) {
      status = "same_file_conflict";
      validationIssues.push(createRowIssue("SAME_FILE_CONFLICT", "同一批次内存在重复课程键，请保留唯一一行后再导入。"));
    } else if (matchedCourse) {
      if (matchedCourse.ownerId === input.actorId) {
        status = "matched_existing";
      } else {
        status = "blocked";
        validationIssues.push(createRowIssue("FOREIGN_OWNED_MATCH", "命中了同校其他教师的课程，当前批次不能更新该课程。"));
      }
    }

    return {
      id: `draft-row-${index + 1}`,
      sourceRowKey: String(index + 1),
      matchKey,
      row,
      status,
      validationIssues,
      matchedCourse: matchedCourse ? buildMatchedCourse(matchedCourse, input.actorId) : null,
      decision: status === "matched_existing" ? "skip" : null,
      result: null,
      resultReason: null,
    } satisfies CourseImportRowReviewDTO;
  });
}

function inferBatchStatus(rows: CourseImportRowReviewDTO[]) {
  if (rows.some((row) => row.status === "same_file_conflict" || row.status === "invalid" || row.status === "blocked")) {
    return "in_review" as const;
  }

  if (rows.some((row) => row.status === "matched_existing")) {
    return "in_review" as const;
  }

  return "ready_to_apply" as const;
}

function rowFromStoredRecord(row: typeof courseImportRow.$inferSelect) {
  return {
    id: row.id,
    sourceRowKey: row.sourceRowKey,
    matchKey: row.matchKey,
    row: row.normalizedRowJson as CourseImportDraftRowInput,
    status: row.status as CourseImportRowStatus,
    validationIssues: (row.validationIssuesJson as CourseImportValidationIssue[] | null) ?? [],
    matchedCourse: (row.matchedCourseSnapshotJson as CourseImportMatchedCourse | null) ?? null,
    decision: (row.decision as CourseImportRowDecision | null) ?? null,
    result: row.result ?? null,
    resultReason: row.resultReason ?? null,
  } satisfies CourseImportRowReviewDTO;
}

async function readStoredBatchRows(batchId: string) {
  const rows = await db.query.courseImportRow.findMany({ where: eq(courseImportRow.batchId, batchId) });
  return rows.map(rowFromStoredRecord);
}

export async function draftCourseImport(input: CourseImportDraftInput) {
  const scope = await assertActiveTeacher();
  const parsed = CourseImportDraftInputSchema.parse(input);

  if (!scope.schoolIds.includes(parsed.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const schoolCourses = await listSchoolCourses(parsed.schoolId);
  const reviewRows = classifyDraftRows({
    rows: parsed.rows,
    schoolCourses,
    actorId: scope.userId,
  });

  const [batch] = await db
    .insert(courseImportBatch)
    .values({
      schoolId: parsed.schoolId,
      actorId: scope.userId,
      sourceType: parsed.sourceType,
      sourceLabel: parsed.sourceLabel,
      status: inferBatchStatus(reviewRows),
      rowCount: reviewRows.length,
    })
    .returning();

  await db.insert(courseImportRow).values(
    reviewRows.map((row) => ({
      batchId: batch.id,
      sourceRowKey: row.sourceRowKey,
      matchKey: row.matchKey,
      rawPayloadJson: row.row,
      normalizedRowJson: row.row,
      validationIssuesJson: row.validationIssues,
      matchedCourseSnapshotJson: row.matchedCourse,
      status: row.status,
      decision: row.decision,
    })),
  );

  return getCourseImportBatchDTO({ batchId: batch.id });
}

async function getCachedCourseImportBatchDTO(input: { batchId: string; actorId: string; schoolIds: string[] }) {
  "use cache";

  cacheLife("minutes");
  cacheTag(cacheTags.teacherCourses(input.actorId));
  cacheTag(cacheTags.courseImportBatch(input.batchId));

  const batch = await db.query.courseImportBatch.findFirst({ where: eq(courseImportBatch.id, input.batchId) });
  if (!batch || !input.schoolIds.includes(batch.schoolId)) {
    throw new Error("COURSE_IMPORT_BATCH_NOT_FOUND");
  }

  const rows = await readStoredBatchRows(batch.id);
  const latestAsyncTask = (
    await getEntityAsyncTaskListDTO({
      entityType: "course_import_batch",
      entityId: batch.id,
      schoolId: batch.schoolId,
      limit: 1,
    })
  )[0] ?? null;
  const asyncTaskSummary = latestAsyncTask
    ? mapAsyncTaskToCourseImportSummary({
        batchId: batch.id,
        rowCount: batch.rowCount,
        task: latestAsyncTask,
      })
    : null;

  return CourseImportBatchDTOSchema.parse({
    id: batch.id,
    schoolId: batch.schoolId,
    actorId: batch.actorId,
    sourceType: batch.sourceType,
    sourceLabel: batch.sourceLabel,
    status: batch.status,
    rowCount: batch.rowCount,
    summary: buildReviewSummary(rows),
    applySummary: {
      created: batch.createdCount,
      updated: batch.updatedCount,
      skipped: batch.skippedCount,
      failed: batch.failedCount,
    },
    latestAsyncTask,
    asyncTaskSummary,
    rows,
    createdAt: toIso(batch.createdAt),
    updatedAt: toIso(batch.updatedAt),
    appliedAt: toIso(batch.appliedAt),
  });
}

export async function getCourseImportBatchDTO(input: { batchId: string }) {
  const scope = await assertActiveTeacher();
  return getCachedCourseImportBatchDTO({
    batchId: input.batchId,
    actorId: scope.userId,
    schoolIds: scope.schoolIds,
  });
}

async function persistRowApplyResult(input: {
  rowId: string;
  status?: CourseImportRowStatus;
  matchedCourse?: CourseImportMatchedCourse | null;
  decision?: CourseImportRowDecision | null;
  validationIssues?: CourseImportValidationIssue[];
  result: "created" | "updated" | "skipped" | "failed";
  resultReason: string;
  appliedCourseId?: string | null;
}) {
  await db
    .update(courseImportRow)
    .set({
      status: input.status,
      matchedCourseSnapshotJson: input.matchedCourse,
      decision: input.decision,
      validationIssuesJson: input.validationIssues,
      result: input.result,
      resultReason: input.resultReason,
      appliedCourseId: input.appliedCourseId,
      updatedAt: new Date(),
    })
    .where(eq(courseImportRow.id, input.rowId));
}

async function getAsyncTaskDetailSnapshot(taskId: string) {
  const task = await db.query.asyncTasks.findFirst({ where: eq(asyncTasks.id, taskId) });

  if (!task) {
    throw new Error("ASYNC_TASK_NOT_FOUND");
  }

  const events = await db.query.asyncTaskEvents.findMany({
    where: eq(asyncTaskEvents.taskId, taskId),
    orderBy: [desc(asyncTaskEvents.createdAt)],
  });

  return AsyncTaskDetailDTOSchema.parse(toAsyncTaskDetailDTOInput(task, events));
}

async function getCourseImportBatchForActor(input: { batchId: string; schoolIds: string[]; actorId: string }) {
  const batch = await db.query.courseImportBatch.findFirst({ where: eq(courseImportBatch.id, input.batchId) });

  if (!batch || !input.schoolIds.includes(batch.schoolId) || batch.actorId !== input.actorId) {
    throw new Error("COURSE_IMPORT_BATCH_NOT_FOUND");
  }

  if (batch.status === "draft") {
    throw new Error("COURSE_IMPORT_BATCH_NOT_READY");
  }

  return batch;
}

async function findActiveCourseImportTask(batchId: string, schoolId: string) {
  return db.query.asyncTasks.findFirst({
    where: and(
      eq(asyncTasks.entityType, "course_import_batch"),
      eq(asyncTasks.entityId, batchId),
      eq(asyncTasks.schoolId, schoolId),
      inArray(asyncTasks.status, [...COURSE_IMPORT_ACTIVE_TASK_STATUSES]),
    ),
    orderBy: [desc(asyncTasks.createdAt)],
  });
}

async function refreshStoredBatchRowsForAttempt(input: {
  batchId: string;
  schoolId: string;
  actorId: string;
  matchedRowDecisions: Map<string, CourseImportRowDecision>;
  resetResults: boolean;
}) {
  const storedRows = await readStoredBatchRows(input.batchId);
  const schoolCourses = await listSchoolCourses(input.schoolId);
  const schoolCourseByKey = new Map(schoolCourses.map((course) => [buildMatchKey(course), course]));

  for (const row of storedRows) {
    const latestMatch = schoolCourseByKey.get(row.matchKey) ?? null;
    const validationIssues: CourseImportValidationIssue[] = [];
    let status: CourseImportRowStatus = "ready_to_create";
    let matchedCourse: CourseImportMatchedCourse | null = null;
    let decision: CourseImportRowDecision | null = null;

    if (latestMatch) {
      matchedCourse = buildMatchedCourse(latestMatch, input.actorId);

      if (latestMatch.ownerId === input.actorId) {
        status = "matched_existing";
        decision = input.matchedRowDecisions.get(row.id) ?? row.decision ?? "skip";
      } else {
        status = "blocked";
        matchedCourse = buildMatchedCourse(latestMatch, input.actorId);
        validationIssues.push(
          createRowIssue("FOREIGN_OWNED_MATCH", "命中了同校其他教师课程，不能更新。"),
        );
      }
    }

    await db
      .update(courseImportRow)
      .set({
        status,
        matchedCourseSnapshotJson: matchedCourse,
        validationIssuesJson: validationIssues,
        decision,
        result: input.resetResults ? null : row.result,
        resultReason: input.resetResults ? null : row.resultReason,
        appliedCourseId: input.resetResults ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(courseImportRow.id, row.id));
  }
}

function buildCourseImportTaskMessage(input: {
  reusedExistingTask: boolean;
  taskStatus: string;
  dispatchFailed: boolean;
}) {
  if (input.reusedExistingTask) {
    return "这批导入已在处理中，已复用当前任务。";
  }

  if (input.dispatchFailed || input.taskStatus === "dispatch_failed") {
    return "导入任务创建成功，但当前未成功入队，请稍后重试。";
  }

  return "导入任务已创建，正在排队处理中。";
}

function toCourseImportApplyTriggerResult(input: {
  batchId: string;
  schoolId: string;
  task: Awaited<ReturnType<typeof getAsyncTaskDetailSnapshot>>;
  reusedExistingTask: boolean;
}) {
  return CourseImportApplyTriggerResultSchema.parse({
    batchId: input.batchId,
    schoolId: input.schoolId,
    taskId: input.task.id,
    taskStatus: input.task.status,
    enqueueIntentStatus: input.task.enqueueIntentStatus,
    reusedExistingTask: input.reusedExistingTask,
    dispatchFailed: input.task.status === "dispatch_failed",
    message: buildCourseImportTaskMessage({
      reusedExistingTask: input.reusedExistingTask,
      taskStatus: input.task.status,
      dispatchFailed: input.task.status === "dispatch_failed",
    }),
    task: input.task,
  });
}

export async function prepareCourseImportApplyTask(input: {
  batchId: string;
  matchedRowDecisions: Array<{ rowId: string; decision: CourseImportRowDecision }>;
}): Promise<CourseImportApplyTriggerResult> {
  const scope = await assertActiveTeacher();
  const parsed = ApplyCourseImportInputSchema.parse(input);
  const batch = await getCourseImportBatchForActor({
    batchId: parsed.batchId,
    actorId: scope.userId,
    schoolIds: scope.schoolIds,
  });
  const existingActiveTask = await findActiveCourseImportTask(batch.id, batch.schoolId);

  if (existingActiveTask) {
    const task = await getAsyncTaskDetailSnapshot(existingActiveTask.id);

    return toCourseImportApplyTriggerResult({
      batchId: batch.id,
      schoolId: batch.schoolId,
      task,
      reusedExistingTask: true,
    });
  }

  const priorTasks = await db.query.asyncTasks.findMany({
    where: and(
      eq(asyncTasks.entityType, "course_import_batch"),
      eq(asyncTasks.entityId, batch.id),
      eq(asyncTasks.schoolId, batch.schoolId),
    ),
    orderBy: [desc(asyncTasks.createdAt)],
    limit: 1,
  });

  await refreshStoredBatchRowsForAttempt({
    batchId: batch.id,
    schoolId: batch.schoolId,
    actorId: scope.userId,
    matchedRowDecisions: new Map(parsed.matchedRowDecisions.map((item) => [item.rowId, item.decision])),
    resetResults: priorTasks.length > 0,
  });

  const refreshedRows = await readStoredBatchRows(batch.id);
  await db
    .update(courseImportBatch)
    .set({
      status: inferBatchStatus(refreshedRows),
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      appliedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(courseImportBatch.id, batch.id));

  const task = await enqueueAsyncTask({
    actorId: scope.userId,
    schoolId: batch.schoolId,
    taskType: "course_import.apply_batch",
    entityRef: {
      entityType: "course_import_batch",
      entityId: batch.id,
      entityLabel: batch.sourceLabel,
    },
    payload: {
      batchId: batch.id,
      schoolId: batch.schoolId,
      actorId: scope.userId,
    } satisfies CourseImportAsyncTaskPayload,
    dispatchRequested: true,
  });

  return toCourseImportApplyTriggerResult({
    batchId: batch.id,
    schoolId: batch.schoolId,
    task,
    reusedExistingTask: false,
  });
}

export async function executeCourseImportApplyTask(payload: CourseImportAsyncTaskPayload) {
  const parsedPayload = payload;
  const batch = await db.query.courseImportBatch.findFirst({ where: eq(courseImportBatch.id, parsedPayload.batchId) });

  if (!batch || batch.schoolId !== parsedPayload.schoolId || batch.actorId !== parsedPayload.actorId) {
    throw new Error("COURSE_IMPORT_BATCH_NOT_FOUND");
  }

  const stagedRows = await readStoredBatchRows(batch.id);
  const schoolCourses = await listSchoolCourses(batch.schoolId);
  const schoolCourseByKey = new Map(schoolCourses.map((course) => [buildMatchKey(course), course]));

  const finalRows: CourseImportRowReviewDTO[] = [];

  for (const row of stagedRows) {
    if (
      row.result &&
      (row.result === "created" || row.result === "updated" || row.result === "skipped")
    ) {
      finalRows.push(row);
      continue;
    }

    const latestMatch = schoolCourseByKey.get(row.matchKey) ?? null;
    const nextDecision = row.decision ?? "skip";

    if (row.status === "same_file_conflict" || row.status === "invalid" || row.status === "blocked") {
      const resultReason = row.validationIssues[0]?.message ?? "当前行仍存在阻断项。";
      finalRows.push({ ...row, result: "failed", resultReason });
      await persistRowApplyResult({ rowId: row.id, result: "failed", resultReason });
      continue;
    }

    if (!latestMatch) {
      try {
        const created = await createCourseForTeacherScoped({
          schoolId: batch.schoolId,
          title: row.row.title,
          subject: row.row.subject,
          grade: row.row.grade,
          status: "draft",
        });
        finalRows.push({
          ...row,
          status: "ready_to_create",
          matchedCourse: null,
          decision: null,
          result: "created",
          resultReason: "已创建为草稿课程。",
        });
        await persistRowApplyResult({
          rowId: row.id,
          status: "ready_to_create",
          matchedCourse: null,
          decision: null,
          result: "created",
          resultReason: "已创建为草稿课程。",
          appliedCourseId: created.id,
        });
      } catch (error) {
        const resultReason = error instanceof Error ? error.message : "课程创建失败，请稍后重试。";
        finalRows.push({ ...row, result: "failed", resultReason });
        await persistRowApplyResult({
          rowId: row.id,
          status: row.status,
          matchedCourse: row.matchedCourse,
          decision: row.decision,
          validationIssues: row.validationIssues,
          result: "failed",
          resultReason,
        });
      }
      continue;
    }

    if (latestMatch.ownerId !== parsedPayload.actorId) {
      const validationIssues = [createRowIssue("FOREIGN_OWNED_MATCH", "命中了同校其他教师课程，不能更新。")];
      const matchedCourse = buildMatchedCourse(latestMatch, parsedPayload.actorId);
      finalRows.push({
        ...row,
        status: "blocked",
        matchedCourse,
        decision: null,
        validationIssues,
        result: "failed",
        resultReason: "命中了同校其他教师课程，不能更新。",
      });
      await persistRowApplyResult({
        rowId: row.id,
        status: "blocked",
        matchedCourse,
        decision: null,
        validationIssues,
        result: "failed",
        resultReason: "命中了同校其他教师课程，不能更新。",
      });
      continue;
    }

    if (nextDecision === "skip") {
      const matchedCourse = buildMatchedCourse(latestMatch, parsedPayload.actorId);
      const resultReason = latestMatch.status === row.row.status ? "课程状态无变化，已跳过。" : "教师选择跳过该命中课程。";
      finalRows.push({
        ...row,
        status: "matched_existing",
        matchedCourse,
        decision: "skip",
        result: "skipped",
        resultReason,
      });
      await persistRowApplyResult({
        rowId: row.id,
        status: "matched_existing",
        matchedCourse,
        decision: "skip",
        result: "skipped",
        resultReason,
        appliedCourseId: latestMatch.id,
      });
      continue;
    }

    if (latestMatch.status === row.row.status) {
      const matchedCourse = buildMatchedCourse(latestMatch, parsedPayload.actorId);
      finalRows.push({
        ...row,
        status: "matched_existing",
        matchedCourse,
        decision: "update",
        result: "skipped",
        resultReason: "课程状态无变化，已跳过。",
      });
      await persistRowApplyResult({
        rowId: row.id,
        status: "matched_existing",
        matchedCourse,
        decision: "update",
        result: "skipped",
        resultReason: "课程状态无变化，已跳过。",
        appliedCourseId: latestMatch.id,
      });
      continue;
    }

    try {
      await updateMatchedCourseStatusForTeacherScoped({
        courseId: latestMatch.id,
        status: row.row.status,
      });
      const matchedCourse = { ...buildMatchedCourse(latestMatch, parsedPayload.actorId), status: row.row.status };
      finalRows.push({
        ...row,
        status: "matched_existing",
        matchedCourse,
        decision: "update",
        result: "updated",
        resultReason: "已按审核决定更新课程状态。",
      });
      await persistRowApplyResult({
        rowId: row.id,
        status: "matched_existing",
        matchedCourse,
        decision: "update",
        result: "updated",
        resultReason: "已按审核决定更新课程状态。",
        appliedCourseId: latestMatch.id,
      });
    } catch (error) {
      const matchedCourse = buildMatchedCourse(latestMatch, parsedPayload.actorId);
      const resultReason = error instanceof Error ? error.message : "课程更新失败，请稍后重试。";
      finalRows.push({
        ...row,
        status: "matched_existing",
        matchedCourse,
        decision: "update",
        result: "failed",
        resultReason,
      });
      await persistRowApplyResult({
        rowId: row.id,
        status: "matched_existing",
        matchedCourse,
        decision: "update",
        validationIssues: row.validationIssues,
        result: "failed",
        resultReason,
        appliedCourseId: latestMatch.id,
      });
    }
  }

  const summary = buildApplySummary(finalRows);
  const nextStatus = summary.failed > 0 ? "partially_applied" : "applied";

  await db
    .update(courseImportBatch)
    .set({
      status: nextStatus,
      createdCount: summary.created,
      updatedCount: summary.updated,
      skippedCount: summary.skipped,
      failedCount: summary.failed,
      updatedAt: new Date(),
      appliedAt: new Date(),
    })
    .where(eq(courseImportBatch.id, batch.id));

  return CourseImportAsyncTaskResultSchema.parse({
    batchId: batch.id,
    schoolId: batch.schoolId,
    actorId: batch.actorId,
    batchStatus: nextStatus,
    applySummary: summary,
    failedRowCount: summary.failed,
    outcome: summary.failed > 0 ? "partially_completed" : "completed",
    titleKey:
      summary.failed > 0
        ? "asyncTasks.courseImport.applyBatch.result.partial"
        : "asyncTasks.courseImport.applyBatch.result.completed",
    summaryKey:
      summary.failed > 0
        ? "asyncTasks.courseImport.applyBatch.result.partialSummary"
        : "asyncTasks.courseImport.applyBatch.result.completedSummary",
    counts: {
      total: finalRows.length,
      succeeded: summary.created + summary.updated,
      partiallySucceeded: summary.failed > 0 ? summary.created + summary.updated : 0,
      failed: summary.failed,
      skipped: summary.skipped,
    },
    detail: {
      batchId: batch.id,
      schoolId: batch.schoolId,
      batchStatus: nextStatus,
      applySummary: summary,
    },
  });
}
