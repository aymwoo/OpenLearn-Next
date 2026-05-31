import { z } from "zod";

export const ScheduleOverrideActionSchema = z.enum(["substitute", "cancel", "move"]);

export const ScheduleOverrideInputSchema = z
  .object({
    recurringEntryId: z.string().min(1),
    effectiveDate: z.string().min(1),
    action: ScheduleOverrideActionSchema,
    reason: z.string().min(1),
    substituteTeacherId: z.string().nullable().optional(),
    replacementBellSlotId: z.string().nullable().optional(),
    replacementRoomLabel: z.string().nullable().optional(),
  })
  .strict();

export const ScheduleHolidayDateInputSchema = z
  .object({
    schoolId: z.string().min(1),
    calendarId: z.string().min(1).nullable().optional(),
    date: z.string().min(1),
    dayType: z.enum(["holiday", "non_teaching", "make_up", "teaching"]),
    label: z.string().min(1),
    note: z.string().trim().nullable().optional(),
  })
  .strict();

export const ScheduleRecurringSummaryDTOSchema = z.object({
  recurringEntryId: z.string(),
  assignmentId: z.string(),
  classLabel: z.string(),
  teacherLabel: z.string(),
  courseTitle: z.string(),
  weekdayLabel: z.string(),
  bellSlotLabel: z.string(),
  timeLabel: z.string(),
  roomLabel: z.string().nullable().default(null),
});

export const ScheduleHolidayDateDTOSchema = z.object({
  id: z.string(),
  date: z.string(),
  dayType: z.enum(["holiday", "non_teaching", "make_up", "teaching"]),
  label: z.string(),
  note: z.string().nullable().default(null),
});

export const ScheduleOperationsCenterDTOSchema = z.object({
  schoolId: z.string(),
  calendarId: z.string().nullable().default(null),
  recurringEntries: z.array(ScheduleRecurringSummaryDTOSchema).default([]),
  holidayDates: z.array(ScheduleHolidayDateDTOSchema).default([]),
});

export type ScheduleOverrideAction = z.infer<typeof ScheduleOverrideActionSchema>;
export type ScheduleOverrideInput = z.infer<typeof ScheduleOverrideInputSchema>;
export type ScheduleHolidayDateInput = z.infer<typeof ScheduleHolidayDateInputSchema>;
export type ScheduleRecurringSummaryDTO = z.infer<typeof ScheduleRecurringSummaryDTOSchema>;
export type ScheduleHolidayDateDTO = z.infer<typeof ScheduleHolidayDateDTOSchema>;
export type ScheduleOperationsCenterDTO = z.infer<typeof ScheduleOperationsCenterDTOSchema>;
