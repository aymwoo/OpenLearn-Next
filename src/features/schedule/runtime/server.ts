import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import {
  classes,
  courses,
  scheduleBellSlot,
  scheduleHolidayDate,
  scheduleOverride,
  scheduleRecurringEntry,
  scheduleTeachingAssignment,
  scheduleTerm,
  users,
} from "@/db/schema";
import { assertScheduleTeacherScope } from "@/features/schedule/shared/auth";
import { scheduleCacheTags } from "@/features/schedule/shared/cache";
import {
  ClassDailyAgendaCardDTOSchema,
  TeacherDailyAgendaCardDTOSchema,
  TeacherDailyAgendaDTOSchema,
  TeacherWeeklyScheduleCellDTOSchema,
} from "@/features/schedule/shared/dto/runtime";

function dateKey(input?: string) {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(input).toISOString().slice(0, 10);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function timeNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function parseMinutes(label: string) {
  const [hours, minutes] = label.split(":").map((value) => Number(value));
  return hours * 60 + minutes;
}

function weekdayOf(date: string) {
  return toDate(date).getUTCDay();
}

function weekdayLabel(date: string) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekdayOf(date)] ?? "未知";
}

function addDays(date: string, days: number) {
  const next = toDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function weekRange(date: string) {
  const todayWeekday = weekdayOf(date);
  const mondayOffset = todayWeekday === 0 ? -6 : 1 - todayWeekday;
  const monday = addDays(date, mondayOffset);
  const days = Array.from({ length: 5 }, (_, index) => addDays(monday, index));
  return {
    monday,
    friday: days[4],
    days,
  };
}

function weekRangeLabel(start: string, end: string) {
  return `${start.slice(5)} - ${end.slice(5)}`;
}

function agendaStatus(slot: { startsAt: string; endsAt: string }, overrideAction?: "substitute" | "cancel" | "move" | null) {
  if (overrideAction === "cancel") {
    return "停课" as const;
  }
  if (overrideAction === "substitute") {
    return "代课" as const;
  }
  if (overrideAction === "move") {
    return "已变更" as const;
  }

  const now = timeNowMinutes();
  const start = parseMinutes(slot.startsAt);
  const end = parseMinutes(slot.endsAt);

  if (now >= start && now <= end) {
    return "进行中" as const;
  }
  if (start - now <= 30 && start - now > 0) {
    return "即将开始" as const;
  }

  return "正常" as const;
}

type RuntimeEntry = typeof scheduleRecurringEntry.$inferSelect;

async function loadAgendaRuntimeRecords(input: { date: string; teacherId?: string; classId?: string; schoolIds: string[] }) {
  const terms = input.schoolIds.length
    ? await db.query.scheduleTerm.findMany({
        where: inArray(scheduleTerm.schoolId, input.schoolIds),
      })
    : [];
  const activeTermIds = terms
    .filter((term) => term.startsOn <= input.date && term.endsOn >= input.date)
    .map((term) => term.id);

  const assignments = activeTermIds.length
    ? await db.query.scheduleTeachingAssignment.findMany({
        where:
          input.teacherId
            ? and(inArray(scheduleTeachingAssignment.termId, activeTermIds), eq(scheduleTeachingAssignment.teacherId, input.teacherId))
            : and(inArray(scheduleTeachingAssignment.termId, activeTermIds), eq(scheduleTeachingAssignment.classId, input.classId!)),
      })
    : [];

  const baseAssignmentIds = assignments.map((assignment) => assignment.id);
  const overrides = await db.query.scheduleOverride.findMany({
    where:
      input.teacherId
        ? and(
            inArray(scheduleOverride.schoolId, input.schoolIds),
            eq(scheduleOverride.effectiveDate, input.date),
            or(eq(scheduleOverride.teacherId, input.teacherId), eq(scheduleOverride.substituteTeacherId, input.teacherId)),
          )
        : and(inArray(scheduleOverride.schoolId, input.schoolIds), eq(scheduleOverride.effectiveDate, input.date), eq(scheduleOverride.classId, input.classId!)),
  });

  const overrideEntryIds = overrides.map((override) => override.recurringEntryId);
  const recurringEntries = [...new Map(
    (
      await db.query.scheduleRecurringEntry.findMany({
        where:
          baseAssignmentIds.length > 0 || overrideEntryIds.length > 0
            ? or(
                ...(baseAssignmentIds.length > 0 ? [inArray(scheduleRecurringEntry.assignmentId, baseAssignmentIds)] : []),
                ...(overrideEntryIds.length > 0 ? [inArray(scheduleRecurringEntry.id, overrideEntryIds)] : []),
              )
            : eq(scheduleRecurringEntry.id, "__none__"),
      })
    ).map((entry) => [entry.id, entry] as const),
  ).values()];

  const assignmentIds = [...new Set(recurringEntries.map((entry) => entry.assignmentId))];
  const allAssignments = assignmentIds.length
    ? await db.query.scheduleTeachingAssignment.findMany({
        where: inArray(scheduleTeachingAssignment.id, assignmentIds),
      })
    : [];
  const classIds = [...new Set(allAssignments.map((assignment) => assignment.classId))];
  const courseIds = [...new Set(allAssignments.map((assignment) => assignment.courseId))];
  const teacherIds = [...new Set([...allAssignments.map((assignment) => assignment.teacherId), ...overrides.map((item) => item.substituteTeacherId).filter(Boolean) as string[]])];
  const bellSlotIds = [...new Set([...recurringEntries.map((entry) => entry.bellSlotId), ...overrides.map((override) => override.replacementBellSlotId).filter(Boolean) as string[]])];

  const [classRows, courseRows, teacherRows, bellSlots, holidayDates] = await Promise.all([
    classIds.length ? db.query.classes.findMany({ where: inArray(classes.id, classIds) }) : Promise.resolve([]),
    courseIds.length ? db.query.courses.findMany({ where: inArray(courses.id, courseIds) }) : Promise.resolve([]),
    teacherIds.length ? db.query.users.findMany({ where: inArray(users.id, teacherIds) }) : Promise.resolve([]),
    bellSlotIds.length ? db.query.scheduleBellSlot.findMany({ where: inArray(scheduleBellSlot.id, bellSlotIds) }) : Promise.resolve([]),
    db.query.scheduleHolidayDate.findMany({
      where: and(inArray(scheduleHolidayDate.schoolId, input.schoolIds), eq(scheduleHolidayDate.date, input.date)),
    }),
  ]);

  return {
    recurringEntries,
    assignments: allAssignments,
    overrides,
    classRows,
    courseRows,
    teacherRows,
    bellSlots,
    holidayDates,
  };
}

function buildTeacherCard(args: {
  entry: RuntimeEntry;
  assignment: typeof scheduleTeachingAssignment.$inferSelect;
  slot: typeof scheduleBellSlot.$inferSelect;
  override?: typeof scheduleOverride.$inferSelect;
  classLabel: string;
  courseTitle: string;
  locationLabel: string;
  holidayLabel?: string | null;
}) {
  const cardSlot = args.override?.replacementBellSlotId ? args.slot : args.slot;
  const overrideSummary = args.holidayLabel ?? (args.override ? args.override.reason : null);
  const status = args.holidayLabel
    ? ("停课" as const)
    : agendaStatus(cardSlot, args.override?.actionType ?? null);

  return TeacherDailyAgendaCardDTOSchema.parse({
    id: `${args.entry.id}:${args.override?.id ?? "base"}`,
    recurringEntryId: args.entry.id,
    assignmentId: args.assignment.id,
    timeLabel: `${cardSlot.startsAt} - ${cardSlot.endsAt}`,
    classLabel: args.classLabel,
    locationLabel: args.override?.replacementRoomLabel ?? args.locationLabel,
    status,
    courseTitle: args.courseTitle,
    overrideSummary,
    lessonLink: args.entry.lessonId ? { courseId: args.assignment.courseId, lessonId: args.entry.lessonId, lessonTitle: args.courseTitle } : null,
  });
}

function buildWeeklySchedule(args: {
  runtime: Awaited<ReturnType<typeof loadAgendaRuntimeRecords>>;
  requestedDate: string;
}) {
  const assignmentMap = new Map(args.runtime.assignments.map((item) => [item.id, item]));
  const classMap = new Map(args.runtime.classRows.map((item) => [item.id, item.name]));
  const courseMap = new Map(args.runtime.courseRows.map((item) => [item.id, item.title]));
  const slotMap = new Map(args.runtime.bellSlots.map((item) => [item.id, item]));
  const overrideMap = new Map(
    args.runtime.overrides.map((item) => [`${item.recurringEntryId}:${item.effectiveDate}`, item] as const),
  );
  const holidayMap = new Map(args.runtime.holidayDates.map((item) => [item.date, item]));
  const { days, monday, friday } = weekRange(args.requestedDate);

  const slotRows = [...args.runtime.bellSlots].sort((left, right) => left.sortOrder - right.sortOrder);
  const entryMap = new Map<string, RuntimeEntry>();
  for (const entry of args.runtime.recurringEntries) {
    entryMap.set(`${entry.weekday}:${entry.bellSlotId}`, entry);
  }

  return {
    rangeLabel: weekRangeLabel(monday, friday),
    weekdays: days.map((day, index) => ({
      key: day,
      label: `${weekdayLabel(day)} ${day.slice(5)}`,
      shortLabel: weekdayLabel(day),
      isToday: day === args.requestedDate,
    })),
    rows: slotRows.map((slot) => ({
      slotId: slot.id,
      bellSlotLabel: slot.label,
      timeLabel: `${slot.startsAt} - ${slot.endsAt}`,
      cells: days.map((day, index) => {
        const weekday = index + 1;
        const entry = entryMap.get(`${weekday}:${slot.id}`);
        if (!entry) {
          return null;
        }

        const assignment = assignmentMap.get(entry.assignmentId);
        if (!assignment) {
          return null;
        }

        const override = overrideMap.get(`${entry.id}:${day}`);
        const holiday = holidayMap.get(day);
        const holidayLabel = holiday && holiday.dayType !== "teaching" && holiday.dayType !== "make_up" ? holiday.label : null;
        const resolvedSlot = slotMap.get(override?.replacementBellSlotId ?? entry.bellSlotId) ?? slot;

        return TeacherWeeklyScheduleCellDTOSchema.parse({
          id: `${entry.id}:${day}`,
          weekday,
          weekdayLabel: weekdayLabel(day),
          timeLabel: `${resolvedSlot.startsAt} - ${resolvedSlot.endsAt}`,
          bellSlotLabel: resolvedSlot.label,
          classLabel: classMap.get(assignment.classId) ?? "未命名班级",
          locationLabel: override?.replacementRoomLabel ?? assignment.roomLabel ?? entry.roomLabel ?? "地点待定",
          courseTitle: courseMap.get(assignment.courseId) ?? "未命名课程",
          status: holidayLabel ? "停课" : agendaStatus(resolvedSlot, override?.actionType ?? null),
          overrideSummary: holidayLabel ?? override?.reason ?? null,
        });
      }),
    })),
  };
}

async function getCachedTeacherDailyAgenda(actorId: string, schoolIds: string[], requestedDate: string) {
  "use cache";

  cacheLife("minutes");
  cacheTag(scheduleCacheTags.teacherAgenda(actorId, requestedDate));

  const runtime = await loadAgendaRuntimeRecords({ date: requestedDate, teacherId: actorId, schoolIds });
  const assignmentMap = new Map(runtime.assignments.map((item) => [item.id, item]));
  const classMap = new Map(runtime.classRows.map((item) => [item.id, item.name]));
  const courseMap = new Map(runtime.courseRows.map((item) => [item.id, item.title]));
  const slotMap = new Map(runtime.bellSlots.map((item) => [item.id, item]));
  const holidayMap = new Map(runtime.holidayDates.map((item) => [item.schoolId, item]));
  const overrideMap = new Map(runtime.overrides.map((item) => [item.recurringEntryId, item]));

  const cards = runtime.recurringEntries
    .filter((entry) => entry.weekday === weekdayOf(requestedDate))
    .map((entry) => {
      const assignment = assignmentMap.get(entry.assignmentId);
      if (!assignment) {
        return null;
      }
      const override = overrideMap.get(entry.id);
      const holiday = holidayMap.get(entry.schoolId);
      const holidayLabel = holiday && holiday.dayType !== "teaching" && holiday.dayType !== "make_up" ? holiday.label : null;
      const slot = slotMap.get(override?.replacementBellSlotId ?? entry.bellSlotId);
      if (!slot) {
        return null;
      }

      return buildTeacherCard({
        entry,
        assignment,
        slot,
        override,
        classLabel: classMap.get(assignment.classId) ?? "未命名班级",
        courseTitle: courseMap.get(assignment.courseId) ?? "未命名课程",
        locationLabel: assignment.roomLabel ?? entry.roomLabel ?? "地点待定",
        holidayLabel,
      });
    })
    .filter((card): card is ReturnType<typeof TeacherDailyAgendaCardDTOSchema.parse> => Boolean(card))
    .sort((left, right) => left.timeLabel.localeCompare(right.timeLabel));

  const weeklySchedule = buildWeeklySchedule({ runtime, requestedDate });

  return TeacherDailyAgendaDTOSchema.parse({
    teacherId: actorId,
    schoolId: schoolIds[0] ?? "",
    date: requestedDate,
    dateLabel: requestedDate,
    weekLabel: weekdayLabel(requestedDate),
    nextClassCountdownLabel: cards[0] ? `下一节课 ${cards[0].timeLabel}` : null,
    cards,
    weeklySchedule,
  });
}

export async function getTeacherDailyAgendaDTO(input?: { date?: string; teacherId?: string }) {
  const scope = await assertScheduleTeacherScope();
  const requestedDate = dateKey(input?.date);
  const actorId = input?.teacherId ?? scope.userId;
  if (input?.teacherId && input.teacherId !== scope.userId) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return getCachedTeacherDailyAgenda(actorId, scope.schoolIds, requestedDate);
}

async function getCachedClassAgenda(classId: string, schoolIds: string[], requestedDate: string) {
  "use cache";

  cacheLife("minutes");
  cacheTag(scheduleCacheTags.classAgenda(classId, requestedDate));

  const runtime = await loadAgendaRuntimeRecords({ date: requestedDate, classId, schoolIds });
  const assignmentMap = new Map(runtime.assignments.map((item) => [item.id, item]));
  const courseMap = new Map(runtime.courseRows.map((item) => [item.id, item.title]));
  const teacherMap = new Map(runtime.teacherRows.map((item) => [item.id, item.name ?? "教师"]));
  const slotMap = new Map(runtime.bellSlots.map((item) => [item.id, item]));
  const holidayMap = new Map(runtime.holidayDates.map((item) => [item.schoolId, item]));
  const overrideMap = new Map(runtime.overrides.map((item) => [item.recurringEntryId, item]));

  return runtime.recurringEntries
    .filter((entry) => entry.weekday === weekdayOf(requestedDate))
    .map((entry) => {
      const assignment = assignmentMap.get(entry.assignmentId);
      if (!assignment) {
        return null;
      }
      const override = overrideMap.get(entry.id);
      const holiday = holidayMap.get(entry.schoolId);
      const slot = slotMap.get(override?.replacementBellSlotId ?? entry.bellSlotId);
      if (!slot) {
        return null;
      }

      return ClassDailyAgendaCardDTOSchema.parse({
        id: `${entry.id}:${override?.id ?? "base"}`,
        recurringEntryId: entry.id,
        assignmentId: assignment.id,
        timeLabel: `${slot.startsAt} - ${slot.endsAt}`,
        teacherLabel: teacherMap.get(override?.substituteTeacherId ?? assignment.teacherId) ?? "教师待定",
        locationLabel: override?.replacementRoomLabel ?? assignment.roomLabel ?? entry.roomLabel ?? "地点待定",
        status:
          holiday && holiday.dayType !== "teaching" && holiday.dayType !== "make_up"
            ? "停课"
            : agendaStatus(slot, override?.actionType ?? null),
        courseTitle: courseMap.get(assignment.courseId) ?? "未命名课程",
        overrideSummary: holiday?.label ?? override?.reason ?? null,
      });
    })
    .filter((card): card is ReturnType<typeof ClassDailyAgendaCardDTOSchema.parse> => Boolean(card))
    .sort((left, right) => left.timeLabel.localeCompare(right.timeLabel));
}

export async function getClassDailyAgendaDTO(input: { date?: string; classId: string }) {
  const scope = await assertScheduleTeacherScope();
  return getCachedClassAgenda(input.classId, scope.schoolIds, dateKey(input.date));
}
