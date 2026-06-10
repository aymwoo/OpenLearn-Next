import "server-only";

import { z } from "zod";

import {
  HomeworkAssignmentDTOSchema,
  HomeworkSubmissionDTOSchema,
  HomeworkGradeDTOSchema,
} from "@/lib/dto/plugin-data-model";
import { dispatchPluginDataAccess } from "@/features/platform-core/plugin-data-access/facade";

// ── DAL input schemas（extend DTO with actorId）────────────────────────────

const CreateAssignmentInputSchema = HomeworkAssignmentDTOSchema.extend({
  actorId: z.string().min(1),
});
const SubmitHomeworkInputSchema = HomeworkSubmissionDTOSchema.extend({
  actorId: z.string().min(1),
});
const GradeHomeworkInputSchema = HomeworkGradeDTOSchema.extend({
  actorId: z.string().min(1),
});

// ── Assignments ────────────────────────────────────────────────────────────

/** 教师创建 homework 作业（经 dispatchPluginDataAccess insert）。 */
export async function createHomeworkAssignment(rawInput: unknown) {
  const input = CreateAssignmentInputSchema.parse(rawInput);

  const result = await dispatchPluginDataAccess({
    actor: input.actorId,
    pluginKey: "homework",
    verb: "insert",
    table: "plugin_owned_homework_assignments",
    values: {
      classroomSession: input.classroomSession,
      title: input.title,
      description: input.description ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
    },
  });

  return result;
}

/** 按 classroomSession 查询作业列表（经 dispatchPluginDataAccess getByIndex）。 */
export async function getHomeworkAssignments(rawInput: unknown) {
  const input = z
    .object({ actorId: z.string().min(1), classroomSession: z.string().min(1) })
    .parse(rawInput);

  return dispatchPluginDataAccess({
    actor: input.actorId,
    pluginKey: "homework",
    verb: "getByIndex",
    table: "plugin_owned_homework_assignments",
    index: ["schoolId", "classroomSession"],
    eq: { classroomSession: input.classroomSession },
  });
}

// ── Submissions（append-only via upsert）───────────────────────────────────

/**
 * 学生提交作业 —— upsert 自动处理 append-only：
 *   Command Bus 的 upsert 会撤销旧 isLatest（保留历史）+ 插入新 isLatest 行。
 */
export async function submitHomework(rawInput: unknown) {
  const input = SubmitHomeworkInputSchema.parse(rawInput);

  const result = await dispatchPluginDataAccess({
    actor: input.actorId,
    pluginKey: "homework",
    verb: "upsert",
    table: "plugin_owned_homework_submissions",
    values: {
      classroomSession: input.classroomSession,
      student: input.student,
      assignment: input.assignment,
      content: input.content,
      attachmentUrl: input.attachmentUrl ?? null,
    },
  });

  return result;
}

/** 获取学生对某作业的最新提交。 */
export async function getLatestSubmission(rawInput: unknown) {
  const input = z
    .object({
      actorId: z.string().min(1),
      classroomSession: z.string().min(1),
      student: z.string().min(1),
      assignment: z.string().min(1),
    })
    .parse(rawInput);

  return dispatchPluginDataAccess({
    actor: input.actorId,
    pluginKey: "homework",
    verb: "getByIndex",
    table: "plugin_owned_homework_submissions",
    index: ["schoolId", "classroomSession", "assignment"],
    eq: { classroomSession: input.classroomSession, assignment: input.assignment },
  });
}

/** 获取某作业的所有提交（按 classroomSession + assignment）。 */
export async function getHomeworkSubmissions(rawInput: unknown) {
  const input = z
    .object({
      actorId: z.string().min(1),
      classroomSession: z.string().min(1),
      assignment: z.string().min(1),
    })
    .parse(rawInput);

  return dispatchPluginDataAccess({
    actor: input.actorId,
    pluginKey: "homework",
    verb: "getByIndex",
    table: "plugin_owned_homework_submissions",
    index: ["schoolId", "classroomSession", "assignment"],
    eq: { classroomSession: input.classroomSession, assignment: input.assignment },
  });
}

// ── Grades（append-only via upsert）────────────────────────────────────────

/**
 * 教师打分/评语 —— upsert 自动处理 append-only：
 *   教师可多次修改分数/评语，保留批改历史。
 */
export async function gradeHomework(rawInput: unknown) {
  const input = GradeHomeworkInputSchema.parse(rawInput);

  const result = await dispatchPluginDataAccess({
    actor: input.actorId,
    pluginKey: "homework",
    verb: "upsert",
    table: "plugin_owned_homework_grades",
    values: {
      classroomSession: input.classroomSession,
      student: input.student,
      submission: input.submission,
      score: input.score ?? null,
      comment: input.comment ?? null,
    },
  });

  return result;
}

/** 获取学生对某提交的批改结果。 */
export async function getHomeworkGrades(rawInput: unknown) {
  const input = z
    .object({
      actorId: z.string().min(1),
      classroomSession: z.string().min(1),
      student: z.string().min(1),
      submission: z.string().min(1),
    })
    .parse(rawInput);

  return dispatchPluginDataAccess({
    actor: input.actorId,
    pluginKey: "homework",
    verb: "getByIndex",
    table: "plugin_owned_homework_grades",
    index: ["schoolId", "classroomSession", "submission"],
    eq: { classroomSession: input.classroomSession, submission: input.submission },
  });
}
