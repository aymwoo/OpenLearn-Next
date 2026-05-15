import "server-only";

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { courseImportBatch, courseImportRow, courses } from "@/db/schema";
import { cacheTags } from "@/lib/cache-policy";
import {
  ApplyCourseImportInputSchema,
  CourseImportApplyResultSchema,
  CourseImportBatchDTOSchema,
  CourseImportDraftInputSchema,
  type CourseImportApplySummary,
  type CourseImportDraftInput,
  type CourseImportDraftRowInput,
  type CourseImportMatchedCourse,
  type CourseImportRowDecision,
  type CourseImportRowReviewDTO,
  type CourseImportRowStatus,
  type CourseImportValidationIssue,
} from "@/lib/dto/course-import";
import { createCourseForTeacherScoped, updateMatchedCourseStatusForTeacherScoped } from "@/lib/dal/course-authoring";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";

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

export async function applyCourseImport(input: {
  batchId: string;
  matchedRowDecisions: Array<{ rowId: string; decision: CourseImportRowDecision }>;
}) {
  const scope = await assertActiveTeacher();
  const parsed = ApplyCourseImportInputSchema.parse(input);
  const batch = await db.query.courseImportBatch.findFirst({ where: eq(courseImportBatch.id, parsed.batchId) });

  if (!batch || !scope.schoolIds.includes(batch.schoolId)) {
    throw new Error("COURSE_IMPORT_BATCH_NOT_FOUND");
  }

  const stagedRows = await readStoredBatchRows(batch.id);
  const schoolCourses = await listSchoolCourses(batch.schoolId);
  const schoolCourseByKey = new Map(schoolCourses.map((course) => [buildMatchKey(course), course]));
  const decisionByRowId = new Map(parsed.matchedRowDecisions.map((item) => [item.rowId, item.decision]));

  const finalRows: CourseImportRowReviewDTO[] = [];

  for (const row of stagedRows) {
    const latestMatch = schoolCourseByKey.get(row.matchKey) ?? null;
    const nextDecision = decisionByRowId.get(row.id) ?? row.decision ?? "skip";

    if (row.status === "same_file_conflict" || row.status === "invalid" || row.status === "blocked") {
      const resultReason = row.validationIssues[0]?.message ?? "当前行仍存在阻断项。";
      finalRows.push({ ...row, result: "failed", resultReason });
      await persistRowApplyResult({ rowId: row.id, result: "failed", resultReason });
      continue;
    }

    if (!latestMatch) {
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
      continue;
    }

    if (latestMatch.ownerId !== scope.userId) {
      const validationIssues = [createRowIssue("FOREIGN_OWNED_MATCH", "命中了同校其他教师课程，不能更新。")];
      const matchedCourse = buildMatchedCourse(latestMatch, scope.userId);
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
      const matchedCourse = buildMatchedCourse(latestMatch, scope.userId);
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
      const matchedCourse = buildMatchedCourse(latestMatch, scope.userId);
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

    await updateMatchedCourseStatusForTeacherScoped({
      courseId: latestMatch.id,
      status: row.row.status,
    });
    const matchedCourse = { ...buildMatchedCourse(latestMatch, scope.userId), status: row.row.status };
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

  return CourseImportApplyResultSchema.parse({
    batchId: batch.id,
    schoolId: batch.schoolId,
    status: nextStatus,
    summary,
    rows: finalRows,
  });
}
