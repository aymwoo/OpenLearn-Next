import { z } from "zod";

const scheduleAgendaStatusSchema = z.enum(["正常", "进行中", "即将开始", "已变更", "代课", "停课"]);

export const TeacherWeeklyScheduleWeekdayDTOSchema = z.object({
  key: z.string(),
  label: z.string(),
  shortLabel: z.string(),
  isToday: z.boolean().default(false),
});

export const TeacherWeeklyScheduleCellDTOSchema = z.object({
  id: z.string(),
  weekday: z.number().int().min(1).max(5),
  weekdayLabel: z.string(),
  timeLabel: z.string(),
  bellSlotLabel: z.string(),
  classLabel: z.string(),
  teacherLabel: z.string().nullable().default(null),
  locationLabel: z.string(),
  courseTitle: z.string(),
  status: scheduleAgendaStatusSchema,
  overrideSummary: z.string().nullable().default(null),
});

export const TeacherWeeklyScheduleRowDTOSchema = z.object({
  slotId: z.string(),
  bellSlotLabel: z.string(),
  timeLabel: z.string(),
  cells: z.array(z.array(TeacherWeeklyScheduleCellDTOSchema).default([])).length(5),
});

export const TeacherWeeklyScheduleDTOSchema = z.object({
  rangeLabel: z.string(),
  weekdays: z.array(TeacherWeeklyScheduleWeekdayDTOSchema).length(5),
  rows: z.array(TeacherWeeklyScheduleRowDTOSchema).default([]),
});

export const TeacherDailyAgendaCardDTOSchema = z.object({
  id: z.string(),
  recurringEntryId: z.string(),
  assignmentId: z.string(),
  timeLabel: z.string(),
  classLabel: z.string(),
  locationLabel: z.string(),
  status: scheduleAgendaStatusSchema,
  courseTitle: z.string(),
  overrideSummary: z.string().nullable().default(null),
  lessonLink: z
    .object({
      courseId: z.string(),
      lessonId: z.string(),
      lessonTitle: z.string(),
    })
    .nullable()
    .default(null),
});

export const TeacherDailyAgendaDTOSchema = z.object({
  teacherId: z.string(),
  schoolId: z.string(),
  viewMode: z.enum(["teacher", "admin_school"]).default("teacher"),
  date: z.string(),
  dateLabel: z.string(),
  weekLabel: z.string(),
  nextClassCountdownLabel: z.string().nullable().default(null),
  cards: z.array(TeacherDailyAgendaCardDTOSchema).default([]),
  weeklySchedule: TeacherWeeklyScheduleDTOSchema,
});

export const ClassDailyAgendaCardDTOSchema = z.object({
  id: z.string(),
  recurringEntryId: z.string(),
  assignmentId: z.string(),
  timeLabel: z.string(),
  teacherLabel: z.string(),
  locationLabel: z.string(),
  status: scheduleAgendaStatusSchema,
  courseTitle: z.string(),
  overrideSummary: z.string().nullable().default(null),
});

export type TeacherDailyAgendaCardDTO = z.infer<typeof TeacherDailyAgendaCardDTOSchema>;
export type TeacherDailyAgendaDTO = z.infer<typeof TeacherDailyAgendaDTOSchema>;
export type ClassDailyAgendaCardDTO = z.infer<typeof ClassDailyAgendaCardDTOSchema>;
export type TeacherWeeklyScheduleDTO = z.infer<typeof TeacherWeeklyScheduleDTOSchema>;
export type TeacherWeeklyScheduleRowDTO = z.infer<typeof TeacherWeeklyScheduleRowDTOSchema>;
export type TeacherWeeklyScheduleCellDTO = z.infer<typeof TeacherWeeklyScheduleCellDTOSchema>;
