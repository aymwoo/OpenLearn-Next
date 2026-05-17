import "server-only";

export {
  assertActiveTeacher,
  getLessonEditorDTO,
  getTeacherAuthoringOverview,
} from "@/lib/dal/lesson-authoring";

export { listBuiltInTeachingStepTemplates } from "@/lib/dal/plugins";
export { getValidThemesForSchool } from "@/lib/dal/themes";
