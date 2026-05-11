import { z } from "zod";

const scheduleAgendaStatusSchema = z.enum(["正常", "进行中", "即将开始", "已变更", "代课", "停课"]);

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
  date: z.string(),
  dateLabel: z.string(),
  weekLabel: z.string(),
  nextClassCountdownLabel: z.string().nullable().default(null),
  cards: z.array(TeacherDailyAgendaCardDTOSchema).default([]),
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
