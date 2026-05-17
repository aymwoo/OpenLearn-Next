import { z } from "zod";

export const TeacherCourseStatusSchema = z.enum(["draft", "published", "archived"]);
export const CourseLifecycleActionSchema = z.enum(["publish", "unpublish", "archive"]);
export const CourseDeleteBlockedReasonCodeSchema = z.enum([
  "COURSE_HAS_LESSONS",
  "COURSE_HAS_CLASS_ASSOCIATIONS",
  "COURSE_HAS_ENROLLMENTS",
]);

export const CourseCreateInputSchema = z
  .object({
    schoolId: z.string().min(1),
    title: z.string().min(1),
    subject: z.string().min(1),
    grade: z.string().min(1),
    status: z.literal("draft").optional(),
  })
  .strict();

export const CourseUpdateInputSchema = z
  .object({
    courseId: z.string().min(1),
    title: z.string().min(1),
    subject: z.string().min(1),
    grade: z.string().min(1),
    status: TeacherCourseStatusSchema,
  })
  .strict();

export const CourseLifecycleInputSchema = z
  .object({
    courseId: z.string().min(1),
  })
  .strict();

export const CourseClassAssociationInputSchema = z
  .object({
    courseId: z.string().min(1),
    classId: z.string().min(1),
  })
  .strict();

export const CourseEnrollmentInputSchema = z
  .object({
    courseId: z.string().min(1),
    studentId: z.string().min(1),
  })
  .strict();

export const CourseDeleteInputSchema = z
  .object({
    courseId: z.string().min(1),
    confirmationText: z.string().trim().min(1),
  })
  .strict();

export const CourseDeleteBlockedReasonDTOSchema = z.object({
  code: CourseDeleteBlockedReasonCodeSchema,
  message: z.string(),
  count: z.number().int().positive(),
});

export const CourseDeleteEligibilityDTOSchema = z.object({
  canDelete: z.boolean(),
  reasons: z.array(CourseDeleteBlockedReasonDTOSchema).default([]),
});

export const TeacherCourseCardDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  ownerId: z.string(),
  title: z.string(),
  subject: z.string(),
  grade: z.string(),
  status: z.string(),
  lessonCount: z.number().int().nonnegative().default(0),
  classLabels: z.array(z.string()).default([]),
  enrollmentCount: z.number().int().nonnegative().default(0),
  updatedAt: z.string(),
});

export const TeacherCourseScopeSchoolDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const TeacherCourseCenterDTOSchema = z.object({
  includeArchived: z.boolean().default(false),
  defaultSchoolId: z.string().nullable(),
  availableSchools: z.array(TeacherCourseScopeSchoolDTOSchema).default([]),
  courses: z.array(TeacherCourseCardDTOSchema),
});

export const CourseLessonEntryDTOSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  objective: z.string(),
  status: z.string(),
  revision: z.number().int().nonnegative(),
  stepCount: z.number().int().nonnegative().default(0),
  updatedAt: z.string(),
});

export const CourseClassLinkDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const TeacherCourseAvailableClassDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const TeacherCourseMemberDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  studentNumber: z.string(),
  classLabels: z.array(z.string()).default([]),
  enrollmentStatus: z.literal("active"),
});

export const TeacherCourseEligibleStudentDTOSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  studentNumber: z.string(),
  classLabels: z.array(z.string()).default([]),
  isAlreadyEnrolled: z.boolean().default(false),
});

export const TeacherCourseDetailDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  ownerId: z.string(),
  title: z.string(),
  subject: z.string(),
  grade: z.string(),
  status: z.string(),
  lessonCount: z.number().int().nonnegative().default(0),
  classLabels: z.array(z.string()).default([]),
  classLinks: z.array(CourseClassLinkDTOSchema).default([]),
  availableClasses: z.array(TeacherCourseAvailableClassDTOSchema).default([]),
  members: z.array(TeacherCourseMemberDTOSchema).default([]),
  eligibleStudents: z.array(TeacherCourseEligibleStudentDTOSchema).default([]),
  enrollmentCount: z.number().int().nonnegative().default(0),
  deleteEligibility: CourseDeleteEligibilityDTOSchema,
  updatedAt: z.string(),
  lessons: z.array(CourseLessonEntryDTOSchema).default([]),
});

export const TeacherCourseLessonsEntryDTOSchema = z.object({
  course: TeacherCourseCardDTOSchema.extend({
    lessons: z.array(CourseLessonEntryDTOSchema).default([]),
  }),
  lessons: z.array(CourseLessonEntryDTOSchema).default([]),
});

export type TeacherCourseCardDTO = z.infer<typeof TeacherCourseCardDTOSchema>;
export type TeacherCourseScopeSchoolDTO = z.infer<typeof TeacherCourseScopeSchoolDTOSchema>;
export type TeacherCourseCenterDTO = z.infer<typeof TeacherCourseCenterDTOSchema>;
export type CourseLessonEntryDTO = z.infer<typeof CourseLessonEntryDTOSchema>;
export type CourseClassLinkDTO = z.infer<typeof CourseClassLinkDTOSchema>;
export type TeacherCourseAvailableClassDTO = z.infer<typeof TeacherCourseAvailableClassDTOSchema>;
export type TeacherCourseMemberDTO = z.infer<typeof TeacherCourseMemberDTOSchema>;
export type TeacherCourseEligibleStudentDTO = z.infer<typeof TeacherCourseEligibleStudentDTOSchema>;
export type CourseDeleteBlockedReasonDTO = z.infer<typeof CourseDeleteBlockedReasonDTOSchema>;
export type CourseDeleteEligibilityDTO = z.infer<typeof CourseDeleteEligibilityDTOSchema>;
export type TeacherCourseDetailDTO = z.infer<typeof TeacherCourseDetailDTOSchema>;
export type TeacherCourseLessonsEntryDTO = z.infer<typeof TeacherCourseLessonsEntryDTOSchema>;
export type CourseCreateInput = z.infer<typeof CourseCreateInputSchema>;
export type CourseUpdateInput = z.infer<typeof CourseUpdateInputSchema>;
export type CourseLifecycleAction = z.infer<typeof CourseLifecycleActionSchema>;
export type CourseClassAssociationInput = z.infer<typeof CourseClassAssociationInputSchema>;
export type CourseEnrollmentInput = z.infer<typeof CourseEnrollmentInputSchema>;
export type CourseDeleteInput = z.infer<typeof CourseDeleteInputSchema>;
