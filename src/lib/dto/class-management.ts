import { z } from "zod";

export const StudentGenderSchema = z.enum(["male", "female"]);

export function normalizeStudentGender(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  if (["男", "male", "m", "boy"].includes(normalizedValue)) {
    return "male";
  }

  if (["女", "female", "f", "girl"].includes(normalizedValue)) {
    return "female";
  }

  return null;
}

export const ClassStudentDTOSchema = z.object({
  userId: z.string(),
  name: z.string(),
  studentNumber: z.string(),
  gender: StudentGenderSchema.nullable(),
});

export const TeacherClassDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  studentCount: z.number().int().nonnegative(),
  students: z.array(ClassStudentDTOSchema),
});

export const TeacherClassManagementDTOSchema = z.object({
  schoolId: z.string(),
  classes: z.array(TeacherClassDTOSchema),
});

export const UpdateClassNameInputSchema = z.object({
  classId: z.string().min(1),
  name: z.string().trim().min(1, "班级名称不能为空。"),
});

export const ImportClassesInputSchema = z.object({
  schoolId: z.string().min(1),
  classNames: z.array(z.string().trim().min(1)).min(1),
});

export const ImportRosterRowInputSchema = z.object({
  className: z.string().trim().min(1),
  studentName: z.string().trim().min(1),
  studentNumber: z.string().trim().min(1),
  gender: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    return normalizeStudentGender(value) ?? value;
  }, StudentGenderSchema),
});

export const ImportClassRosterInputSchema = z.object({
  schoolId: z.string().min(1),
  rows: z.array(ImportRosterRowInputSchema).min(1),
  createMissingClasses: z.boolean().optional().default(false),
});

export const ResetStudentPasswordsInputSchema = z.object({
  studentIds: z.array(z.string().trim().min(1)).min(1),
  password: z.string().trim().min(1, "请输入新密码。"),
});

export const DeleteStudentsInputSchema = z.object({
  studentIds: z.array(z.string().trim().min(1)).min(1),
});

export const DeleteClassesInputSchema = z.object({
  classIds: z.array(z.string().trim().min(1)).min(1),
});

export type ClassStudentDTO = z.infer<typeof ClassStudentDTOSchema>;
export type TeacherClassDTO = z.infer<typeof TeacherClassDTOSchema>;
export type TeacherClassManagementDTO = z.infer<typeof TeacherClassManagementDTOSchema>;
export type UpdateClassNameInput = z.infer<typeof UpdateClassNameInputSchema>;
export type ImportClassesInput = z.infer<typeof ImportClassesInputSchema>;
export type ImportRosterRowInput = z.infer<typeof ImportRosterRowInputSchema>;
export type ImportClassRosterInput = z.infer<typeof ImportClassRosterInputSchema>;
export type ResetStudentPasswordsInput = z.infer<typeof ResetStudentPasswordsInputSchema>;
export type DeleteStudentsInput = z.infer<typeof DeleteStudentsInputSchema>;
export type DeleteClassesInput = z.infer<typeof DeleteClassesInputSchema>;
export type StudentGender = z.infer<typeof StudentGenderSchema>;
