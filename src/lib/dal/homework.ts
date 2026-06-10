import "server-only";

import { z } from "zod";

import { dispatchPluginDataAccess } from "@/features/platform-core/plugin-data-access/facade";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import {
  HomeworkAssignmentDTOSchema,
  HomeworkSubmissionDTOSchema,
} from "@/lib/dto/plugin-data-model";

// ── 内部 helper ──────────────────────────────────────────────────────────────

async function requireActorId(): Promise<string> {
  const user = await getCurrentUserDTO();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return user.id;
}

// ── assignments ─────────────────────────────────────────────────────────────

/** 教师创建 homework 作业定义，经 dispatchPluginDataAccess 写入 assignments 表。 */
export async function insertHomeworkAssignment(rawInput: unknown) {
  const input = HomeworkAssignmentDTOSchema.parse(rawInput);
  const actor = await requireActorId();
  return dispatchPluginDataAccess({
    actor,
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
}

const GetHomeworkAssignmentsInputSchema = z.strictObject({
  classroomSession: z.string().min(1),
});

/** 按 classroomSession 查询作业列表（走声明索引 schoolId+classroomSession）。 */
export async function getHomeworkAssignments(rawInput: unknown) {
  const input = GetHomeworkAssignmentsInputSchema.parse(rawInput);
  const actor = await requireActorId();
  return dispatchPluginDataAccess({
    actor,
    pluginKey: "homework",
    verb: "getByIndex",
    table: "plugin_owned_homework_assignments",
    index: ["schoolId", "classroomSession"],
    eq: { classroomSession: input.classroomSession },
  });
}

// ── submissions（append-only / isLatest）────────────────────────────────────

/**
 * 学生提交作业：走 upsert 动词，Command Bus 自动完成
 * UPDATE isLatest=false → INSERT isLatest=true 的 append-only 事务。
 * uniques 声明为 [classroomSession, student, assignment]，重复提交保留历史。
 */
export async function submitHomework(rawInput: unknown) {
  const input = HomeworkSubmissionDTOSchema.parse(rawInput);
  const actor = await requireActorId();
  return dispatchPluginDataAccess({
    actor,
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
}

const GetLatestSubmissionInputSchema = z.strictObject({
  classroomSession: z.string().min(1),
  student: z.string().min(1),
  assignment: z.string().min(1),
});

/**
 * 获取学生对指定作业的最新提交（isLatest=true）。
 * 走声明索引 ["schoolId","classroomSession","assignment"] 查询后过滤 student+isLatest。
 */
export async function getLatestSubmission(rawInput: unknown) {
  const input = GetLatestSubmissionInputSchema.parse(rawInput);
  const actor = await requireActorId();
  const rows = (await dispatchPluginDataAccess({
    actor,
    pluginKey: "homework",
    verb: "getByIndex",
    table: "plugin_owned_homework_submissions",
    index: ["schoolId", "classroomSession", "assignment"],
    eq: { classroomSession: input.classroomSession, assignment: input.assignment },
  })) as Array<Record<string, unknown>>;

  return (
    rows.find(
      (row) => row.student === input.student && row.isLatest === true,
    ) ?? null
  );
}

// ── grades ───────────────────────────────────────────────────────────────────

const GetHomeworkGradesInputSchema = z.strictObject({
  classroomSession: z.string().min(1),
  student: z.string().min(1),
  submission: z.string().min(1),
});

/**
 * 获取教师对指定提交的批改结果。
 * 走声明索引 ["schoolId","classroomSession","submission"] 查询后过滤 student。
 */
export async function getHomeworkGrades(rawInput: unknown) {
  const input = GetHomeworkGradesInputSchema.parse(rawInput);
  const actor = await requireActorId();
  const rows = (await dispatchPluginDataAccess({
    actor,
    pluginKey: "homework",
    verb: "getByIndex",
    table: "plugin_owned_homework_grades",
    index: ["schoolId", "classroomSession", "submission"],
    eq: { classroomSession: input.classroomSession, submission: input.submission },
  })) as Array<Record<string, unknown>>;

  return rows.find((row) => row.student === input.student) ?? null;
}
