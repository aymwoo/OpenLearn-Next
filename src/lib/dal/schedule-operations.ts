import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  courses,
  scheduleBellSlot,
  scheduleHolidayCalendar,
  scheduleHolidayDate,
  scheduleMutationAudit,
  scheduleOverride,
  scheduleRecurringEntry,
  scheduleTeachingAssignment,
  users,
} from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import {
  ScheduleHolidayDateInputSchema,
  ScheduleOperationsCenterDTOSchema,
  ScheduleOverrideInputSchema,
  type ScheduleHolidayDateInput,
  type ScheduleOverrideInput,
} from "@/lib/dto/schedule";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function assertSchoolScopeByRecurringEntry(recurringEntryId: string) {
  const scope = await assertActiveTeacher();
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

async function appendScheduleAudit(input: {
  schoolId: string;
  entityType: string;
  entityId: string;
  actionType: string;
  actorId: string;
  reason?: string | null;
  payloadJson: Record<string, unknown>;
}) {
  await db.insert(scheduleMutationAudit).values({
    schoolId: input.schoolId,
    entityType: input.entityType,
    entityId: input.entityId,
    actionType: input.actionType,
    actorId: input.actorId,
    reason: input.reason ?? null,
    payloadJson: input.payloadJson,
  });
}

export async function getScheduleOperationsCenterDTO(input?: { schoolId?: string }) {
  const scope = await assertActiveTeacher();
  const schoolId = input?.schoolId ?? scope.schoolIds[0] ?? null;
  if (!schoolId || !scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const calendar = await ensureDefaultHolidayCalendar(schoolId, scope.userId);
  const [recurringEntries, assignments, bellSlots, classRows, courseRows, teacherRows, holidayDates] = await Promise.all([
    db.query.scheduleRecurringEntry.findMany({ where: eq(scheduleRecurringEntry.schoolId, schoolId) }),
    db.query.scheduleTeachingAssignment.findMany({ where: eq(scheduleTeachingAssignment.schoolId, schoolId) }),
    db.query.scheduleBellSlot.findMany({ where: eq(scheduleBellSlot.schoolId, schoolId) }),
    db.query.classes.findMany({ where: eq(classes.schoolId, schoolId) }),
    db.query.courses.findMany({ where: eq(courses.schoolId, schoolId) }),
    db.query.users.findMany(),
    db.query.scheduleHolidayDate.findMany({ where: eq(scheduleHolidayDate.calendarId, calendar.id) }),
  ]);

  const assignmentMap = new Map(assignments.map((item) => [item.id, item]));
  const bellSlotMap = new Map(bellSlots.map((item) => [item.id, item]));
  const classMap = new Map(classRows.map((item) => [item.id, item.name]));
  const courseMap = new Map(courseRows.map((item) => [item.id, item.title]));
  const teacherMap = new Map(teacherRows.map((item) => [item.id, item.name ?? "教师"]));

  return ScheduleOperationsCenterDTOSchema.parse({
    schoolId,
    calendarId: calendar.id,
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

  const [created] = await db
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

  await appendScheduleAudit({
    schoolId: recurringEntry.schoolId,
    entityType: "scheduleOverride",
    entityId: created.id,
    actionType: "create",
    actorId: scope.userId,
    reason: parsed.reason,
    payloadJson: parsed,
  });

  return created;
}

export async function updateScheduleOverride(input: ScheduleOverrideInput & { overrideId: string }) {
  const parsed = ScheduleOverrideInputSchema.parse(input);
  const scope = await assertActiveTeacher();
  const existing = await db.query.scheduleOverride.findFirst({
    where: eq(scheduleOverride.id, input.overrideId),
  });
  if (!existing || !scope.schoolIds.includes(existing.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const [updated] = await db
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

  await appendScheduleAudit({
    schoolId: existing.schoolId,
    entityType: "scheduleOverride",
    entityId: updated.id,
    actionType: "update",
    actorId: scope.userId,
    reason: parsed.reason,
    payloadJson: parsed,
  });

  return updated;
}

export async function revokeScheduleOverride(input: { overrideId: string; reason: string }) {
  const scope = await assertActiveTeacher();
  const existing = await db.query.scheduleOverride.findFirst({ where: eq(scheduleOverride.id, input.overrideId) });
  if (!existing || !scope.schoolIds.includes(existing.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const [updated] = await db
    .update(scheduleOverride)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      updatedById: scope.userId,
      updatedAt: new Date(),
    })
    .where(eq(scheduleOverride.id, input.overrideId))
    .returning();

  await appendScheduleAudit({
    schoolId: existing.schoolId,
    entityType: "scheduleOverride",
    entityId: updated.id,
    actionType: "revoke",
    actorId: scope.userId,
    reason: input.reason,
    payloadJson: input,
  });

  return updated;
}

export async function saveHolidayCalendarDate(input: ScheduleHolidayDateInput) {
  const parsed = ScheduleHolidayDateInputSchema.parse(input);
  const scope = await assertActiveTeacher();
  const calendar = await db.query.scheduleHolidayCalendar.findFirst({ where: eq(scheduleHolidayCalendar.id, parsed.calendarId) });
  if (!calendar || !scope.schoolIds.includes(calendar.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const existing = await db.query.scheduleHolidayDate.findFirst({
    where: and(eq(scheduleHolidayDate.calendarId, parsed.calendarId), eq(scheduleHolidayDate.date, parsed.date)),
  });

  const row = existing
    ? (
        await db
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
      )[0]
    : (
        await db
          .insert(scheduleHolidayDate)
          .values({
            calendarId: parsed.calendarId,
            schoolId: calendar.schoolId,
            date: parsed.date,
            dayType: parsed.dayType,
            label: parsed.label,
            note: parsed.note ?? null,
            createdById: scope.userId,
            updatedById: scope.userId,
          })
          .returning()
      )[0];

  await appendScheduleAudit({
    schoolId: calendar.schoolId,
    entityType: "scheduleHolidayDate",
    entityId: row.id,
    actionType: existing ? "update" : "create",
    actorId: scope.userId,
    reason: parsed.label,
    payloadJson: parsed,
  });

  return row;
}

export async function removeHolidayCalendarDate(input: { holidayDateId: string }) {
  const scope = await assertActiveTeacher();
  const existing = await db.query.scheduleHolidayDate.findFirst({ where: eq(scheduleHolidayDate.id, input.holidayDateId) });
  if (!existing || !scope.schoolIds.includes(existing.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const [removed] = await db.delete(scheduleHolidayDate).where(eq(scheduleHolidayDate.id, input.holidayDateId)).returning();
  if (removed) {
    await appendScheduleAudit({
      schoolId: existing.schoolId,
      entityType: "scheduleHolidayDate",
      entityId: removed.id,
      actionType: "delete",
      actorId: scope.userId,
      reason: removed.label,
      payloadJson: input,
    });
  }

  return removed;
}
