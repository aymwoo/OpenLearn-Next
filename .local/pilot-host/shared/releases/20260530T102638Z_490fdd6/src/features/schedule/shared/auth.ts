import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";

export type ScheduleTeacherScope = {
  userId: string;
  schoolIds: string[];
};

export async function assertScheduleTeacherScope(): Promise<ScheduleTeacherScope> {
  const scope = await assertActiveTeacher();
  return {
    userId: scope.userId,
    schoolIds: scope.schoolIds,
  };
}

export async function assertScheduleSchoolScope(schoolId: string): Promise<ScheduleTeacherScope> {
  const scope = await assertScheduleTeacherScope();
  if (!scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return scope;
}
