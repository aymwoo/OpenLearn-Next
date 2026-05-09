import { z } from "zod";

export const TeacherCourseStatusSchema = z.enum(["draft", "published", "archived"]);

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

export const TeacherCourseCenterDTOSchema = z.object({
  includeArchived: z.boolean().default(false),
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
  enrollmentCount: z.number().int().nonnegative().default(0),
  updatedAt: z.string(),
  lessons: z.array(CourseLessonEntryDTOSchema).default([]),
});

export type TeacherCourseCardDTO = z.infer<typeof TeacherCourseCardDTOSchema>;
export type TeacherCourseCenterDTO = z.infer<typeof TeacherCourseCenterDTOSchema>;
export type CourseLessonEntryDTO = z.infer<typeof CourseLessonEntryDTOSchema>;
export type CourseClassLinkDTO = z.infer<typeof CourseClassLinkDTOSchema>;
export type TeacherCourseDetailDTO = z.infer<typeof TeacherCourseDetailDTOSchema>;
export type CourseCreateInput = z.infer<typeof CourseCreateInputSchema>;
export type CourseUpdateInput = z.infer<typeof CourseUpdateInputSchema>;
