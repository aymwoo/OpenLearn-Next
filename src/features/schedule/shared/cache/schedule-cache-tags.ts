import { cacheTags } from "@/lib/cache-policy";

type UpdateTagFn = (tag: string) => void;

export const scheduleCacheTags = {
  importBatch: (batchId: string) => cacheTags.scheduleImportBatch(batchId),
  importSchool: (schoolId: string) => cacheTags.scheduleImportSchool(schoolId),
  teacherAgenda: (teacherId: string, dateKey: string) => cacheTags.teacherScheduleAgenda(teacherId, dateKey),
  classAgenda: (classId: string, dateKey: string) => cacheTags.classScheduleAgenda(classId, dateKey),
  calendar: (schoolId: string) => cacheTags.scheduleCalendar(schoolId),
  reminder: (schoolId: string) => cacheTags.scheduleReminder(schoolId),
  assistantProposal: (proposalId: string) => cacheTags.scheduleAssistantProposal(proposalId),
} as const;

export function getTodayScheduleDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function invalidateScheduleImportTags(
  updateTag: UpdateTagFn,
  input: { actorId: string; schoolId: string; batchId: string; dateKey?: string },
) {
  updateTag(scheduleCacheTags.importBatch(input.batchId));
  updateTag(scheduleCacheTags.importSchool(input.schoolId));
  updateTag(scheduleCacheTags.teacherAgenda(input.actorId, input.dateKey ?? getTodayScheduleDateKey()));
}

export function invalidateScheduleOperationTags(
  updateTag: UpdateTagFn,
  input: {
    actorId: string;
    schoolId: string;
    classId?: string | null;
    effectiveDate?: string | null;
    proposalId?: string | null;
  },
) {
  updateTag(scheduleCacheTags.calendar(input.schoolId));
  if (input.classId && input.effectiveDate) {
    updateTag(scheduleCacheTags.classAgenda(input.classId, input.effectiveDate));
    updateTag(scheduleCacheTags.teacherAgenda(input.actorId, input.effectiveDate));
  }
  if (input.proposalId) {
    updateTag(scheduleCacheTags.assistantProposal(input.proposalId));
  }
}

export function invalidateScheduleReminderTags(updateTag: UpdateTagFn, schoolId: string) {
  updateTag(scheduleCacheTags.reminder(schoolId));
}

export function invalidateScheduleAssistantTags(
  updateTag: UpdateTagFn,
  input: { proposalId: string; schoolId?: string | null },
) {
  updateTag(scheduleCacheTags.assistantProposal(input.proposalId));
  if (input.schoolId) {
    updateTag(scheduleCacheTags.importSchool(input.schoolId));
  }
}
