import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  courses,
  scheduleBellSlot,
  scheduleHolidayCalendar,
  scheduleHolidayDate,
  scheduleOverride,
  scheduleRecurringEntry,
  scheduleTeachingAssignment,
  users,
} from "@/db/schema";
import { assertScheduleTeacherScope } from "@/features/schedule/shared/auth";
import {
  ScheduleHolidayDateInputSchema,
  ScheduleOperationsCenterDTOSchema,
  ScheduleOverrideInputSchema,
  type ScheduleHolidayDateInput,
  type ScheduleOverrideInput,
} from "@/features/schedule/shared/dto/operations";
import { appendScheduleAudit } from "@/features/schedule/shared/audit";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function assertSchoolScopeByRecurringEntry(recurringEntryId: string) {
  const scope = await assertScheduleTeacherScope();
  const recurringEntry = await db.query.scheduleRecurringEntry.findFirst({
    where: eq(scheduleRecurringEntry.id, recurringEntryId),
  });

  if (!recurringEntry || !scope.schoolIds.includes(recurringEntry.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return { scope, recurringEntry };
}

async function ensureDefaultHolidayCalendar(schoolId: string, actorId: string) {
  const existing = await db.query.scheduleHolidayCalendar.findFirst({
    where: eq(scheduleHolidayCalendar.schoolId, schoolId),
  });
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(scheduleHolidayCalendar)
    .values({
      schoolId,
      name: "默认校历",
      createdById: actorId,
      updatedById: actorId,
    })
    .returning();

  return created;
}

async function getScheduleHolidayCalendar(schoolId: string) {
  return db.query.scheduleHolidayCalendar.findFirst({
    where: eq(scheduleHolidayCalendar.schoolId, schoolId),
  });
}

export async function getScheduleOperationsCenterDTO(input?: { schoolId?: string }) {
  const scope = await assertScheduleTeacherScope();
  const schoolId = input?.schoolId ?? scope.schoolIds[0] ?? null;
  if (!schoolId || !scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const calendar = await getScheduleHolidayCalendar(schoolId);
  const [recurringEntries, assignments, bellSlots, classRows, courseRows, teacherRows, holidayDates] = await Promise.all([
    db.query.scheduleRecurringEntry.findMany({ where: eq(scheduleRecurringEntry.schoolId, schoolId) }),
    db.query.scheduleTeachingAssignment.findMany({ where: eq(scheduleTeachingAssignment.schoolId, schoolId) }),
    db.query.scheduleBellSlot.findMany({ where: eq(scheduleBellSlot.schoolId, schoolId) }),
    db.query.classes.findMany({ where: eq(classes.schoolId, schoolId) }),
    db.query.courses.findMany({ where: eq(courses.schoolId, schoolId) }),
    db.query.users.findMany(),
    calendar ? db.query.scheduleHolidayDate.findMany({ where: eq(scheduleHolidayDate.calendarId, calendar.id) }) : Promise.resolve([]),
  ]);

  const assignmentMap = new Map(assignments.map((item) => [item.id, item]));
  const bellSlotMap = new Map(bellSlots.map((item) => [item.id, item]));
  const classMap = new Map(classRows.map((item) => [item.id, item.name]));
  const courseMap = new Map(courseRows.map((item) => [item.id, item.title]));
  const teacherMap = new Map(teacherRows.map((item) => [item.id, item.name ?? "教师"]));

  return ScheduleOperationsCenterDTOSchema.parse({
    schoolId,
    calendarId: calendar?.id ?? null,
    recurringEntries: recurringEntries
      .map((entry) => {
        const assignment = assignmentMap.get(entry.assignmentId);
        const slot = bellSlotMap.get(entry.bellSlotId);
        if (!assignment || !slot) {
          return null;
        }

        return {
          recurringEntryId: entry.id,
          assignmentId: assignment.id,
          classLabel: classMap.get(assignment.classId) ?? "班级待定",
          teacherLabel: teacherMap.get(assignment.teacherId) ?? "教师待定",
          courseTitle: courseMap.get(assignment.courseId) ?? "课程待定",
          weekdayLabel: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][entry.weekday] ?? "未知",
          bellSlotLabel: slot.label,
          timeLabel: `${slot.startsAt} - ${slot.endsAt}`,
          roomLabel: assignment.roomLabel ?? entry.roomLabel ?? null,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((left, right) => left.timeLabel.localeCompare(right.timeLabel)),
    holidayDates: holidayDates.map((item) => ({
      id: item.id,
      date: item.date,
      dayType: item.dayType,
      label: item.label,
      note: item.note ?? null,
    })),
  });
}

export async function createScheduleOverride(input: ScheduleOverrideInput) {
  const parsed = ScheduleOverrideInputSchema.parse(input);
  const { scope, recurringEntry } = await assertSchoolScopeByRecurringEntry(parsed.recurringEntryId);
  const assignment = await db.query.scheduleTeachingAssignment.findFirst({
    where: eq(scheduleTeachingAssignment.id, recurringEntry.assignmentId),
  });
  const bellSlot = await db.query.scheduleBellSlot.findFirst({
    where: eq(scheduleBellSlot.id, recurringEntry.bellSlotId),
  });
  if (!assignment || !bellSlot) {
    throw new Error("SCHEDULE_OVERRIDE_BLOCKED");
  }

  if (parsed.action === "substitute" && !parsed.substituteTeacherId) {
    throw new Error("SCHEDULE_OVERRIDE_BLOCKED");
  }
  if (parsed.action === "move" && !parsed.replacementBellSlotId && !parsed.replacementRoomLabel) {
    throw new Error("SCHEDULE_OVERRIDE_BLOCKED");
  }

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(scheduleOverride)
      .values({
        schoolId: recurringEntry.schoolId,
        assignmentId: assignment.id,
        recurringEntryId: recurringEntry.id,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        effectiveDate: parsed.effectiveDate,
        actionType: parsed.action,
        reason: parsed.reason,
        substituteTeacherId: parsed.substituteTeacherId ?? null,
        replacementBellSlotId: parsed.replacementBellSlotId ?? null,
        replacementRoomLabel: parsed.replacementRoomLabel ?? null,
        originalTeacherId: assignment.teacherId,
        originalBellSlotId: bellSlot.id,
        originalRoomLabel: assignment.roomLabel ?? recurringEntry.roomLabel ?? null,
        status: "active",
        createdById: scope.userId,
        updatedById: scope.userId,
      })
      .returning();

    await appendScheduleAudit(tx, {
      schoolId: recurringEntry.schoolId,
      entityType: "scheduleOverride",
      entityId: row.id,
      actionType: "create",
      actorId: scope.userId,
      reason: parsed.reason,
      payloadJson: parsed,
    });

    return row;
  });

  return created;
}

export async function updateScheduleOverride(input: ScheduleOverrideInput & { overrideId: string }) {
  const parsed = ScheduleOverrideInputSchema.parse(input);
  const scope = await assertScheduleTeacherScope();
  const existing = await db.query.scheduleOverride.findFirst({
    where: eq(scheduleOverride.id, input.overrideId),
  });
  if (!existing || !scope.schoolIds.includes(existing.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(scheduleOverride)
      .set({
        effectiveDate: parsed.effectiveDate,
        actionType: parsed.action,
        reason: parsed.reason,
        substituteTeacherId: parsed.substituteTeacherId ?? null,
        replacementBellSlotId: parsed.replacementBellSlotId ?? null,
        replacementRoomLabel: parsed.replacementRoomLabel ?? null,
        updatedById: scope.userId,
        updatedAt: new Date(),
      })
      .where(eq(scheduleOverride.id, input.overrideId))
      .returning();

    await appendScheduleAudit(tx, {
      schoolId: existing.schoolId,
      entityType: "scheduleOverride",
      entityId: row.id,
      actionType: "update",
      actorId: scope.userId,
      reason: parsed.reason,
      payloadJson: parsed,
    });

    return row;
  });

  return updated;
}

export async function revokeScheduleOverride(input: { overrideId: string; reason: string }) {
  const scope = await assertScheduleTeacherScope();
  const existing = await db.query.scheduleOverride.findFirst({ where: eq(scheduleOverride.id, input.overrideId) });
  if (!existing || !scope.schoolIds.includes(existing.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(scheduleOverride)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        updatedById: scope.userId,
        updatedAt: new Date(),
      })
      .where(eq(scheduleOverride.id, input.overrideId))
      .returning();

    await appendScheduleAudit(tx, {
      schoolId: existing.schoolId,
      entityType: "scheduleOverride",
      entityId: row.id,
      actionType: "revoke",
      actorId: scope.userId,
      reason: input.reason,
      payloadJson: input,
    });

    return row;
  });

  return updated;
}

export async function saveHolidayCalendarDate(input: ScheduleHolidayDateInput) {
  const parsed = ScheduleHolidayDateInputSchema.parse(input);
  const scope = await assertScheduleTeacherScope();
  const calendar = parsed.calendarId
    ? await db.query.scheduleHolidayCalendar.findFirst({ where: eq(scheduleHolidayCalendar.id, parsed.calendarId) })
    : scope.schoolIds.includes(parsed.schoolId)
      ? await ensureDefaultHolidayCalendar(parsed.schoolId, scope.userId)
      : null;
  if (!calendar || !scope.schoolIds.includes(calendar.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const existing = await db.query.scheduleHolidayDate.findFirst({
    where: and(eq(scheduleHolidayDate.calendarId, calendar.id), eq(scheduleHolidayDate.date, parsed.date)),
  });

  const row = await db.transaction(async (tx) => {
    const [saved] = existing
      ? await tx
          .update(scheduleHolidayDate)
          .set({
            dayType: parsed.dayType,
            label: parsed.label,
            note: parsed.note ?? null,
            updatedById: scope.userId,
            updatedAt: new Date(),
          })
          .where(eq(scheduleHolidayDate.id, existing.id))
          .returning()
      : await tx
          .insert(scheduleHolidayDate)
          .values({
            calendarId: calendar.id,
            schoolId: calendar.schoolId,
            date: parsed.date,
            dayType: parsed.dayType,
            label: parsed.label,
            note: parsed.note ?? null,
            createdById: scope.userId,
            updatedById: scope.userId,
          })
          .returning();

    await appendScheduleAudit(tx, {
      schoolId: calendar.schoolId,
      entityType: "scheduleHolidayDate",
      entityId: saved.id,
      actionType: existing ? "update" : "create",
      actorId: scope.userId,
      reason: parsed.label,
      payloadJson: parsed,
    });

    return saved;
  });

  return row;
}

export async function removeHolidayCalendarDate(input: { holidayDateId: string }) {
  const scope = await assertScheduleTeacherScope();
  const existing = await db.query.scheduleHolidayDate.findFirst({ where: eq(scheduleHolidayDate.id, input.holidayDateId) });
  if (!existing || !scope.schoolIds.includes(existing.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const removed = await db.transaction(async (tx) => {
    const [row] = await tx.delete(scheduleHolidayDate).where(eq(scheduleHolidayDate.id, input.holidayDateId)).returning();
    if (!row) {
      return row;
    }

    await appendScheduleAudit(tx, {
      schoolId: existing.schoolId,
      entityType: "scheduleHolidayDate",
      entityId: row.id,
      actionType: "delete",
      actorId: scope.userId,
      reason: row.label,
      payloadJson: input,
    });

    return row;
  });

  return removed;
}
