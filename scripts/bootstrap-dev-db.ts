import { pathToFileURL } from "node:url";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  classMembers,
  classes,
  courseClasses,
  courseEnrollments,
  courses,
  lessonSteps,
  lessons,
  pluginRegistrations,
  publishedLessonVersions,
} from "@/db/schema";
import { PluginManifestSchema } from "@/lib/dto/resource-ai";

import { seedTestAccounts } from "./seed-test-accounts";

const DEV_CLASS_NAME = "开发测试班级";
const DEV_COURSE_TITLE = "开发测试课程";
const DEV_COURSE_SUBJECT = "初中信息科技";
const DEV_COURSE_GRADE = "七年级";
const DEV_LESSON_TITLE = "开发测试课时";
const DEV_LESSON_OBJECTIVE = "帮助开发环境快速验证教师备课、学生学习与课堂联调链路。";

const DEV_STEP_DEFINITIONS = [
  {
    type: "content" as const,
    title: "导入：认识信息表达",
    rank: "a0",
    payload: {
      type: "content" as const,
      title: "导入：认识信息表达",
      body: "通过校园通知、课表和图片示例，引导学生理解信息表达的不同形式。",
      teacherNotes: "先让学生说出日常接触到的信息载体，再进入本节目标。",
      materialRefs: [],
    },
  },
  {
    type: "task" as const,
    title: "任务：整理生活中的信息载体",
    rank: "b0",
    payload: {
      type: "task" as const,
      prompt: "列出 3 种你今天接触到的信息载体，并说明它们分别传递了什么内容。",
      submissionType: "text" as const,
      successCriteria: "至少填写 3 项，且每项都包含载体与对应信息。",
      allowRetry: true,
      retryPolicy: "unlimited" as const,
      materialRefs: [],
    },
  },
  {
    type: "quiz" as const,
    title: "测验：选择合适的信息表达方式",
    rank: "c0",
    payload: {
      type: "quiz" as const,
      question: "如果需要在校园里快速提醒同学注意安全，最适合优先使用哪种表达方式？",
      options: ["口头提醒或广播", "超长文章说明", "复杂数据表格"],
      correctOptionIndex: 0,
      explanation: "需要优先选择传递速度快、理解门槛低的表达方式。",
      allowRetry: true,
      retryPolicy: "once" as const,
      revealCorrectAnswer: true,
    },
  },
];

const BUILT_IN_PLUGIN_DEFINITIONS = [
  {
    name: "教师讲授",
    manifest: {
      id: "builtin-teaching-step-direct-instruction",
      version: "1.0.0",
      permissions: ["lesson:write:suggestion"],
      anchors: ["lesson.sidebar"],
      actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
      builtIn: true,
      defaultEnabled: true,
      nonDeletable: true,
    },
  },
  {
    name: "问卷调查",
    manifest: {
      id: "builtin-teaching-step-survey",
      version: "1.0.0",
      permissions: ["lesson:write:suggestion"],
      anchors: ["lesson.sidebar"],
      actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
      builtIn: true,
      defaultEnabled: true,
      nonDeletable: true,
    },
  },
  {
    name: "学生探究",
    manifest: {
      id: "builtin-teaching-step-inquiry",
      version: "1.0.0",
      permissions: ["lesson:write:suggestion"],
      anchors: ["lesson.sidebar"],
      actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
      builtIn: true,
      defaultEnabled: true,
      nonDeletable: true,
    },
  },
  {
    name: "课堂测验",
    manifest: {
      id: "builtin-teaching-step-quiz",
      version: "1.0.0",
      permissions: ["lesson:write:suggestion"],
      anchors: ["lesson.sidebar"],
      actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
      builtIn: true,
      defaultEnabled: true,
      nonDeletable: true,
    },
  },
  {
    name: "评价",
    manifest: {
      id: "builtin-teaching-step-evaluation",
      version: "1.0.0",
      permissions: ["lesson:write:suggestion"],
      anchors: ["lesson.sidebar"],
      actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
      builtIn: true,
      defaultEnabled: true,
      nonDeletable: true,
    },
  },
] as const;

async function getOrCreateClass(schoolId: string) {
  const existing = await db.query.classes.findFirst({
    where: and(eq(classes.schoolId, schoolId), eq(classes.name, DEV_CLASS_NAME)),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db.insert(classes).values({ schoolId, name: DEV_CLASS_NAME }).returning();
  return created;
}

async function ensureClassMember(classId: string, userId: string, role: "teacher" | "student") {
  const existing = await db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)),
  });

  if (existing) {
    const [updated] = await db
      .update(classMembers)
      .set({ role })
      .where(eq(classMembers.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(classMembers).values({ classId, userId, role }).returning();
  return created;
}

async function getOrCreateCourse(schoolId: string, ownerId: string) {
  const existing = await db.query.courses.findFirst({
    where: and(eq(courses.schoolId, schoolId), eq(courses.title, DEV_COURSE_TITLE)),
  });

  if (existing) {
    const [updated] = await db
      .update(courses)
      .set({
        ownerId,
        subject: DEV_COURSE_SUBJECT,
        grade: DEV_COURSE_GRADE,
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(courses.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(courses)
    .values({
      schoolId,
      ownerId,
      title: DEV_COURSE_TITLE,
      subject: DEV_COURSE_SUBJECT,
      grade: DEV_COURSE_GRADE,
      status: "published",
    })
    .returning();

  return created;
}

async function ensureCourseClass(courseId: string, classId: string) {
  const existing = await db.query.courseClasses.findFirst({
    where: and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, classId)),
  });

  if (!existing) {
    await db.insert(courseClasses).values({ courseId, classId });
  }
}

async function ensureCourseEnrollment(courseId: string, studentId: string) {
  const existing = await db.query.courseEnrollments.findFirst({
    where: and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.studentId, studentId)),
  });

  if (existing) {
    await db
      .update(courseEnrollments)
      .set({ status: "active" })
      .where(eq(courseEnrollments.id, existing.id));
    return;
  }

  await db.insert(courseEnrollments).values({ courseId, studentId, status: "active" });
}

async function getOrCreateLesson(courseId: string, teacherId: string) {
  const existing = await db.query.lessons.findFirst({
    where: and(eq(lessons.courseId, courseId), eq(lessons.title, DEV_LESSON_TITLE)),
  });

  if (existing) {
    const [updated] = await db
      .update(lessons)
      .set({
        createdById: teacherId,
        objective: DEV_LESSON_OBJECTIVE,
        status: "draft",
        publishedVersionId: null,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(lessons)
    .values({
      courseId,
      createdById: teacherId,
      title: DEV_LESSON_TITLE,
      objective: DEV_LESSON_OBJECTIVE,
      status: "draft",
      revision: 1,
    })
    .returning();

  return created;
}

async function replaceLessonSteps(lessonId: string) {
  await db.delete(publishedLessonVersions).where(eq(publishedLessonVersions.lessonId, lessonId));
  await db.delete(lessonSteps).where(eq(lessonSteps.lessonId, lessonId));

  const createdSteps = [];

  for (const definition of DEV_STEP_DEFINITIONS) {
    const [step] = await db
      .insert(lessonSteps)
      .values({
        lessonId,
        type: definition.type,
        title: definition.title,
        rank: definition.rank,
        payloadJson: definition.payload,
      })
      .returning();

    createdSteps.push(step);
  }

  return createdSteps;
}

async function publishLessonVersion(input: {
  lessonId: string;
  teacherId: string;
  lessonTitle: string;
  lessonObjective: string;
  courseTitle: string;
  steps: Array<typeof lessonSteps.$inferSelect>;
}) {
  const snapshotJson = {
    lesson: {
      id: input.lessonId,
      title: input.lessonTitle,
      objective: input.lessonObjective,
      updatedAt: new Date().toISOString(),
    },
    course: {
      title: input.courseTitle,
    },
    steps: input.steps.map((step) => ({
      id: step.id,
      lessonId: step.lessonId,
      type: step.type,
      title: step.title,
      rank: step.rank,
      payload: step.payloadJson,
    })),
  };

  const [published] = await db
    .insert(publishedLessonVersions)
    .values({
      lessonId: input.lessonId,
      version: 1,
      snapshotJson,
      publishedById: input.teacherId,
    })
    .returning();

  await db
    .update(lessons)
    .set({
      status: "published",
      publishedVersionId: published.id,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, input.lessonId));

  return published;
}

async function upsertBuiltInPlugins(schoolId: string) {
  for (const definition of BUILT_IN_PLUGIN_DEFINITIONS) {
    const manifest = PluginManifestSchema.parse(definition.manifest);
    const existing = await db.query.pluginRegistrations.findFirst({
      where: and(eq(pluginRegistrations.schoolId, schoolId), eq(pluginRegistrations.name, definition.name)),
    });

    if (existing) {
      await db
        .update(pluginRegistrations)
        .set({
          manifestJson: manifest,
          enabled: true,
          killSwitchEnabled: false,
          updatedAt: new Date(),
        })
        .where(eq(pluginRegistrations.id, existing.id));

      continue;
    }

    await db.insert(pluginRegistrations).values({
      schoolId,
      name: definition.name,
      manifestJson: manifest,
      enabled: true,
      killSwitchEnabled: false,
    });
  }
}

export async function bootstrapDevDb() {
  const seeded = await seedTestAccounts();
  const devClass = await getOrCreateClass(seeded.school.id);

  await ensureClassMember(devClass.id, seeded.teacher.id, "teacher");
  await ensureClassMember(devClass.id, seeded.student.id, "student");

  const course = await getOrCreateCourse(seeded.school.id, seeded.teacher.id);
  await ensureCourseClass(course.id, devClass.id);
  await ensureCourseEnrollment(course.id, seeded.student.id);

  const lesson = await getOrCreateLesson(course.id, seeded.teacher.id);
  const steps = await replaceLessonSteps(lesson.id);
  const published = await publishLessonVersion({
    lessonId: lesson.id,
    teacherId: seeded.teacher.id,
    lessonTitle: DEV_LESSON_TITLE,
    lessonObjective: DEV_LESSON_OBJECTIVE,
    courseTitle: DEV_COURSE_TITLE,
    steps,
  });
  await upsertBuiltInPlugins(seeded.school.id);

  console.log("开发数据库 bootstrap 完成：");
  console.log(`- 学校：${seeded.school.name}`);
  console.log(`- 班级：${DEV_CLASS_NAME}`);
  console.log(`- 课程：${DEV_COURSE_TITLE}（${DEV_COURSE_GRADE} / ${DEV_COURSE_SUBJECT}）`);
  console.log(`- 课时：${DEV_LESSON_TITLE}`);
  console.log(`- 发布版本：v${published.version}`);
  console.log(`- 内置教学环节：${BUILT_IN_PLUGIN_DEFINITIONS.map((plugin) => plugin.name).join("、")}`);
  console.log(`- 教师账号：${seeded.teacher.email} / password`);
  console.log(`- 学生账号：${seeded.student.email} / password`);
}

async function main() {
  await bootstrapDevDb();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("开发数据库 bootstrap 失败：", error);
    process.exit(1);
  });
}
