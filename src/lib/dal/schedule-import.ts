import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  courses,
  memberships,
  scheduleBellSlot,
  scheduleImportBatch,
  scheduleImportRow,
  scheduleRecurringEntry,
  scheduleTeachingAssignment,
  scheduleTerm,
  scheduleWeekPattern,
  users,
} from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import {
  ApproveScheduleImportInputSchema,
  ScheduleImportBatchDTOSchema,
  ScheduleImportDraftInputSchema,
  type ApproveScheduleImportInput,
  type ScheduleImportBatchDTO,
  type ScheduleImportDraftInput,
  type ScheduleImportDraftRowInput,
  type ScheduleImportRowStatus,
  type ScheduleImportValidationIssue,
} from "@/lib/dto/schedule";

type ScheduleDbLike = Pick<typeof db, "query" | "insert" | "update">;

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function getWeekdayLabel(weekday: number) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekday] ?? "未知";
}

function createBlockingError(error: string, message: string, issues: unknown[]) {
  return Object.assign(new Error(error), { code: error, userMessage: message, issues });
}

async function assertScheduleSchoolScope(schoolId: string) {
  const scope = await assertActiveTeacher();
  if (!scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return scope;
}

async function getTeacherDirectory(schoolId: string) {
  const teacherMemberships = await db.query.memberships.findMany({
    where: and(eq(memberships.schoolId, schoolId), eq(memberships.role, "teacher"), eq(memberships.status, "active")),
  });
  const teacherIds = teacherMemberships.map((membership) => membership.userId);
  const teacherUsers = teacherIds.length
    ? await db.query.users.findMany({
        where: inArray(users.id, teacherIds),
      })
    : [];

  return new Map(teacherUsers.map((teacher) => [teacher.name?.trim() ?? "", teacher]));
}

async function ensureScheduleTerm(tx: ScheduleDbLike, schoolId: string, termName: string) {
  const existing = await tx.query.scheduleTerm.findFirst({
    where: and(eq(scheduleTerm.schoolId, schoolId), eq(scheduleTerm.name, termName)),
  });

  if (existing) {
    return existing;
  }

  const currentYear = new Date().getUTCFullYear();
  const [created] = await tx
    .insert(scheduleTerm)
    .values({
      schoolId,
      name: termName,
      startsOn: `${currentYear}-01-01`,
      endsOn: `${currentYear}-12-31`,
      isActive: true,
    })
    .returning();

  return created;
}

async function ensureWeekPattern(tx: ScheduleDbLike, schoolId: string, termId: string) {
  const existing = await tx.query.scheduleWeekPattern.findFirst({
    where: and(eq(scheduleWeekPattern.schoolId, schoolId), eq(scheduleWeekPattern.termId, termId), eq(scheduleWeekPattern.name, "每周")),
  });

  if (existing) {
    return existing;
  }

  const [created] = await tx
    .insert(scheduleWeekPattern)
    .values({
      schoolId,
      termId,
      name: "每周",
      cycleLength: 1,
      anchorDate: `${new Date().getUTCFullYear()}-01-01`,
      patternJson: { everyWeek: true },
    })
    .returning();

  return created;
}

async function ensureBellSlot(tx: ScheduleDbLike, schoolId: string, bellSlotLabel: string) {
  const existing = await tx.query.scheduleBellSlot.findFirst({
    where: and(eq(scheduleBellSlot.schoolId, schoolId), eq(scheduleBellSlot.label, bellSlotLabel)),
  });

  if (existing) {
    return existing;
  }

  const allSlots = await tx.query.scheduleBellSlot.findMany({
    where: eq(scheduleBellSlot.schoolId, schoolId),
  });
  const sortOrder = allSlots.length + 1;
  const startHour = 7 + sortOrder;
  const [created] = await tx
    .insert(scheduleBellSlot)
    .values({
      schoolId,
      label: bellSlotLabel,
      startsAt: `${String(startHour).padStart(2, "0")}:00`,
      endsAt: `${String(startHour).padStart(2, "0")}:45`,
      sortOrder,
    })
    .returning();

  return created;
}

async function ensureTeachingAssignment(tx: ScheduleDbLike, input: {
  schoolId: string;
  classId: string;
  courseId: string;
  teacherId: string;
  termId: string;
  roomLabel: string | null;
}) {
  const existing = await tx.query.scheduleTeachingAssignment.findFirst({
    where: and(
      eq(scheduleTeachingAssignment.schoolId, input.schoolId),
      eq(scheduleTeachingAssignment.classId, input.classId),
      eq(scheduleTeachingAssignment.courseId, input.courseId),
      eq(scheduleTeachingAssignment.teacherId, input.teacherId),
      eq(scheduleTeachingAssignment.termId, input.termId),
    ),
  });

  if (existing) {
    return existing;
  }

  const [created] = await tx
    .insert(scheduleTeachingAssignment)
    .values({
      schoolId: input.schoolId,
      classId: input.classId,
      courseId: input.courseId,
      teacherId: input.teacherId,
      termId: input.termId,
      roomLabel: input.roomLabel,
      status: "active",
    })
    .returning();

  return created;
}

function classifyDraftRow(args: {
  row: ScheduleImportDraftRowInput;
  existingConflict: boolean;
  duplicateConflict: boolean;
  classId: string | null;
  courseId: string | null;
  teacherId: string | null;
}) {
  const validationIssues: ScheduleImportValidationIssue[] = [];

  if (args.row.weekday < 0 || args.row.weekday > 6) {
    validationIssues.push({
      code: "INVALID_WEEKDAY",
      message: "星期字段无效，请改为 0-6 范围内的数字。",
      field: "weekday",
      severity: "error",
    });
  }

  const mappingIssues: ScheduleImportValidationIssue[] = [];
  if (!args.classId) {
    mappingIssues.push({
      code: "CLASS_NOT_FOUND",
      message: "未找到对应班级，请先确认班级名称或创建班级映射。",
      field: "className",
      severity: "error",
    });
  }
  if (!args.courseId) {
    mappingIssues.push({
      code: "COURSE_NOT_FOUND",
      message: "未找到对应课程，请先确认课程标题或创建课程。",
      field: "courseTitle",
      severity: "error",
    });
  }
  if (!args.teacherId) {
    mappingIssues.push({
      code: "TEACHER_NOT_FOUND",
      message: "未找到对应教师，请先确认教师姓名或教师成员关系。",
      field: "teacherName",
      severity: "error",
    });
  }

  if (validationIssues.length > 0) {
    return {
      status: "validation_failed" as const,
      validationIssues,
      conflictSummary: [],
    };
  }

  if (mappingIssues.length > 0) {
    return {
      status: "mapping_review" as const,
      validationIssues: mappingIssues,
      conflictSummary: [],
    };
  }

  const conflictSummary = [] as Array<{
    code: string;
    title: string;
    description: string;
    conflictingTargetLabel: string | null;
  }>;

  if (args.duplicateConflict) {
    conflictSummary.push({
      code: "DUPLICATE_IN_BATCH",
      title: "同一批次重复",
      description: "这条记录与当前导入批次中的另一条记录重复，请合并或拒绝其中一条。",
      conflictingTargetLabel: `${args.row.className} / ${args.row.bellSlotLabel}`,
    });
  }

  if (args.existingConflict) {
    conflictSummary.push({
      code: "EXISTING_RECURRING_CONFLICT",
      title: "与现有课表冲突",
      description: "该班级在同一节次已经存在已入库课表，请先调课或拒绝本条导入。",
      conflictingTargetLabel: `${args.row.className} / ${args.row.bellSlotLabel}`,
    });
  }

  if (conflictSummary.length > 0) {
    return {
      status: "conflict_review" as const,
      validationIssues: [],
      conflictSummary,
    };
  }

  return {
    status: "ready_to_apply" as const,
    validationIssues: [],
    conflictSummary: [],
  };
}

async function loadScheduleImportBatchDTO(batchId: string): Promise<ScheduleImportBatchDTO> {
  const batch = await db.query.scheduleImportBatch.findFirst({
    where: eq(scheduleImportBatch.id, batchId),
  });

  if (!batch) {
    throw new Error("SCHEDULE_IMPORT_BATCH_NOT_FOUND");
  }

  const rows = await db.query.scheduleImportRow.findMany({
    where: eq(scheduleImportRow.batchId, batchId),
  });

  return ScheduleImportBatchDTOSchema.parse({
    id: batch.id,
    schoolId: batch.schoolId,
    sourceType: batch.sourceType,
    sourceLabel: batch.sourceLabel,
    status: batch.status,
    rowCount: batch.rowCount,
    approvedRowCount: batch.approvedRowCount,
    rejectedRowCount: batch.rejectedRowCount,
    createdAt: toIso(batch.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(batch.updatedAt) ?? new Date(0).toISOString(),
    rows: rows
      .sort((left, right) => String(left.sourceRowKey).localeCompare(String(right.sourceRowKey)))
      .map((row) => ({
        id: row.id,
        sourceRowKey: row.sourceRowKey,
        status: row.status,
        approvalState: row.approvalState,
        validationIssues: Array.isArray(row.validationIssuesJson) ? row.validationIssuesJson : [],
        mappingSummary: row.mappingSummaryJson ?? null,
        conflictSummary: Array.isArray(row.conflictSummaryJson) ? row.conflictSummaryJson : [],
        approvalNote: row.approvalNote ?? null,
        reviewedById: row.reviewedById ?? null,
        reviewedAt: toIso(row.reviewedAt),
      })),
  });
}

export async function draftScheduleImport(input: ScheduleImportDraftInput) {
  const parsed = ScheduleImportDraftInputSchema.parse(input);
  const scope = await assertScheduleSchoolScope(parsed.schoolId);

  const [schoolClasses, schoolCourses, teacherByName, bellSlots, assignments, recurringEntries] = await Promise.all([
    db.query.classes.findMany({ where: eq(classes.schoolId, parsed.schoolId) }),
    db.query.courses.findMany({ where: eq(courses.schoolId, parsed.schoolId) }),
    getTeacherDirectory(parsed.schoolId),
    db.query.scheduleBellSlot.findMany({ where: eq(scheduleBellSlot.schoolId, parsed.schoolId) }),
    db.query.scheduleTeachingAssignment.findMany({ where: eq(scheduleTeachingAssignment.schoolId, parsed.schoolId) }),
    db.query.scheduleRecurringEntry.findMany({ where: eq(scheduleRecurringEntry.schoolId, parsed.schoolId) }),
  ]);

  const classByName = new Map(schoolClasses.map((item) => [item.name.trim(), item]));
  const courseByTitle = new Map(schoolCourses.map((item) => [item.title.trim(), item]));
  const bellSlotByLabel = new Map(bellSlots.map((item) => [item.label.trim(), item]));
  const assignmentByIdentity = new Map<string, (typeof assignments)[number]>(
    assignments.map((item) => [`${item.classId}:${item.courseId}:${item.teacherId}`, item] as const),
  );
  const recurringConflictKeys = new Set(
    recurringEntries.map((entry) => `${entry.assignmentId}:${entry.weekday}:${entry.bellSlotId}`),
  );

  const seenImportKeys = new Set<string>();

  const rowDrafts = parsed.rows.map((row) => {
    const mappedClass = classByName.get(row.className.trim()) ?? null;
    const mappedCourse = courseByTitle.get(row.courseTitle.trim()) ?? null;
    const mappedTeacher = teacherByName.get(row.teacherName.trim()) ?? null;
    const mappedBellSlot = bellSlotByLabel.get(row.bellSlotLabel.trim()) ?? null;
    const assignmentKey: string | null = mappedClass && mappedCourse && mappedTeacher ? `${mappedClass.id}:${mappedCourse.id}:${mappedTeacher.id}` : null;
    const assignment = assignmentKey ? assignmentByIdentity.get(assignmentKey) ?? null : null;
    const recurringKey = assignment && mappedBellSlot ? `${assignment.id}:${row.weekday}:${mappedBellSlot.id}` : null;
    const duplicateKey = `${row.termName}:${row.weekday}:${row.bellSlotLabel}:${row.className}:${row.teacherName}`;
    const duplicateConflict = seenImportKeys.has(duplicateKey);
    seenImportKeys.add(duplicateKey);

    const classified = classifyDraftRow({
      row,
      existingConflict: Boolean(recurringKey && recurringConflictKeys.has(recurringKey)),
      duplicateConflict,
      classId: mappedClass?.id ?? null,
      courseId: mappedCourse?.id ?? null,
      teacherId: mappedTeacher?.id ?? null,
    });

    return {
      sourceRowKey: row.sourceRowKey,
      rawPayloadJson: row,
      normalizedDraftJson:
        mappedClass && mappedCourse && mappedTeacher
          ? {
              schoolId: parsed.schoolId,
              termName: row.termName,
              weekday: row.weekday,
              bellSlotLabel: row.bellSlotLabel,
              classId: mappedClass.id,
              courseId: mappedCourse.id,
              teacherId: mappedTeacher.id,
              roomLabel: row.roomLabel,
            }
          : null,
      validationIssuesJson: classified.validationIssues,
      mappingSummaryJson: {
        termName: row.termName,
        weekdayLabel: getWeekdayLabel(row.weekday),
        bellSlotLabel: row.bellSlotLabel,
        className: row.className,
        courseTitle: row.courseTitle,
        teacherName: row.teacherName,
        roomLabel: row.roomLabel,
      },
      conflictSummaryJson: classified.conflictSummary,
      status: classified.status,
    };
  });

  const batchStatus = rowDrafts.every((row) => row.status === "ready_to_apply") ? "ready_to_apply" : "in_review";

  const batch = await db.transaction(async (tx) => {
    const [createdBatch] = await tx
      .insert(scheduleImportBatch)
      .values({
        schoolId: parsed.schoolId,
        sourceType: parsed.sourceType,
        sourceLabel: parsed.sourceLabel,
        connectorKey: parsed.connectorKey ?? null,
        uploadedById: scope.userId,
        status: batchStatus,
        rowCount: rowDrafts.length,
        approvedRowCount: 0,
        rejectedRowCount: 0,
      })
      .returning();

    await tx.insert(scheduleImportRow).values(
      rowDrafts.map((row) => ({
        batchId: createdBatch.id,
        sourceRowKey: row.sourceRowKey,
        rawPayloadJson: row.rawPayloadJson,
        normalizedDraftJson: row.normalizedDraftJson,
        validationIssuesJson: row.validationIssuesJson,
        mappingSummaryJson: row.mappingSummaryJson,
        conflictSummaryJson: row.conflictSummaryJson,
        status: row.status,
        approvalState: "pending" as const,
      })),
    );

    return createdBatch;
  });

  return loadScheduleImportBatchDTO(batch.id);
}

export async function getLatestScheduleImportBatchDTO(input?: { schoolId?: string; batchId?: string }) {
  const scope = await assertActiveTeacher();
  const schoolId = input?.schoolId ?? scope.schoolIds[0] ?? null;
  if (!schoolId || !scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  if (input?.batchId) {
    return loadScheduleImportBatchDTO(input.batchId);
  }

  const batches = await db.query.scheduleImportBatch.findMany({
    where: eq(scheduleImportBatch.schoolId, schoolId),
  });
  const latest = [...batches].sort((left, right) => Number(right.createdAt ?? 0) - Number(left.createdAt ?? 0))[0];
  return latest ? loadScheduleImportBatchDTO(latest.id) : null;
}

export async function approveScheduleImport(input: ApproveScheduleImportInput) {
  const parsed = ApproveScheduleImportInputSchema.parse(input);
  const batch = await db.query.scheduleImportBatch.findFirst({
    where: eq(scheduleImportBatch.id, parsed.batchId),
  });

  if (!batch) {
    throw new Error("SCHEDULE_IMPORT_BATCH_NOT_FOUND");
  }

  const scope = await assertScheduleSchoolScope(batch.schoolId);
  const rows = await db.query.scheduleImportRow.findMany({
    where: eq(scheduleImportRow.batchId, parsed.batchId),
  });

  const approvedSet = new Set(parsed.approvedRowIds.length > 0 ? parsed.approvedRowIds : rows.filter((row) => row.status === "ready_to_apply").map((row) => row.id));
  const rejectedSet = new Set(parsed.rejectedRowIds);
  const unresolvedBlockers = rows.filter(
    (row) => ["pending_review", "validation_failed", "mapping_review", "conflict_review"].includes(row.status) && !rejectedSet.has(row.id),
  );

  if (unresolvedBlockers.length > 0) {
    throw createBlockingError(
      "APPROVE_IMPORT_BLOCKED",
      "还有未解决的导入阻断项，请先处理冲突、映射或校验失败行。",
      unresolvedBlockers.map((row) => ({
        id: row.id,
        sourceRowKey: row.sourceRowKey,
        status: row.status,
      })),
    );
  }

  await db.transaction(async (tx) => {
    for (const row of rows) {
      if (rejectedSet.has(row.id)) {
        await tx
          .update(scheduleImportRow)
          .set({
            status: "rejected",
            approvalState: "rejected",
            approvalNote: parsed.approvalNote ?? null,
            reviewedById: scope.userId,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(scheduleImportRow.id, row.id));
        continue;
      }

      if (!approvedSet.has(row.id)) {
        continue;
      }

      const normalizedDraft = row.normalizedDraftJson as {
        termName: string;
        weekday: number;
        bellSlotLabel: string;
        classId: string;
        courseId: string;
        teacherId: string;
        roomLabel: string | null;
      } | null;

      if (!normalizedDraft) {
        throw createBlockingError(
          "APPROVE_IMPORT_BLOCKED",
          "存在无法映射的导入行，暂时不能写入标准课表。",
          [{ id: row.id, sourceRowKey: row.sourceRowKey }],
        );
      }

      const term = await ensureScheduleTerm(tx, batch.schoolId, normalizedDraft.termName);
      const weekPattern = await ensureWeekPattern(tx, batch.schoolId, term.id);
      const bellSlot = await ensureBellSlot(tx, batch.schoolId, normalizedDraft.bellSlotLabel);
      const assignment = await ensureTeachingAssignment(tx, {
        schoolId: batch.schoolId,
        classId: normalizedDraft.classId,
        courseId: normalizedDraft.courseId,
        teacherId: normalizedDraft.teacherId,
        termId: term.id,
        roomLabel: normalizedDraft.roomLabel,
      });

      const existingRecurring = await tx.query.scheduleRecurringEntry.findFirst({
        where: and(
          eq(scheduleRecurringEntry.assignmentId, assignment.id),
          eq(scheduleRecurringEntry.weekPatternId, weekPattern.id),
          eq(scheduleRecurringEntry.weekday, normalizedDraft.weekday),
          eq(scheduleRecurringEntry.bellSlotId, bellSlot.id),
        ),
      });

      if (!existingRecurring) {
        await tx.insert(scheduleRecurringEntry).values({
          schoolId: batch.schoolId,
          assignmentId: assignment.id,
          termId: term.id,
          weekPatternId: weekPattern.id,
          weekday: normalizedDraft.weekday,
          bellSlotId: bellSlot.id,
          roomLabel: normalizedDraft.roomLabel,
          sourceBatchId: batch.id,
          sourceRowId: row.id,
        });
      }

      await tx
        .update(scheduleImportRow)
        .set({
          status: "approved",
          approvalState: "approved",
          approvalNote: parsed.approvalNote ?? null,
          reviewedById: scope.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scheduleImportRow.id, row.id));
    }

    const approvedCount = rows.filter((row) => approvedSet.has(row.id)).length;
    const rejectedCount = rows.filter((row) => rejectedSet.has(row.id)).length;
    await tx
      .update(scheduleImportBatch)
      .set({
        approvedRowCount: approvedCount,
        rejectedRowCount: rejectedCount,
        status: approvedCount === rows.length - rejectedCount ? "applied" : "partially_applied",
        updatedAt: new Date(),
      })
      .where(eq(scheduleImportBatch.id, batch.id));
  });

  return loadScheduleImportBatchDTO(batch.id);
}

export type ScheduleImportActionError = Error & {
  code?: string;
  userMessage?: string;
  issues?: unknown[];
};
