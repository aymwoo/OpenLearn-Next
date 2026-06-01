"use server";

import { z } from "zod";

import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getAgentRegistryDTO } from "@/lib/dal/ai-rag";
import { draftLessonStep } from "@/server/ai/agents/lesson-agent";

/**
 * 教师「AI 起草」触发 server action（D-02 后端 + D-03 flag 强制）。
 *
 * 不变式：
 * - **HARD-STOP（D-03）**：`lesson_agent_enabled` 经 `getAgentRegistryDTO` 在 authorize 边界判定；
 *   flag OFF → 返回 `AGENT_DISABLED` 且**在任何派发之前**短路，绝不调用 `draftLessonStep`
 *   （后端权威，UI 隐藏为次要防线 / T-66-09）。
 * - **身份 server 派生（T-66-07）**：schoolId 由 `assertActiveTeacher` 推导；client 传入的
 *   teacherId/courseId/schoolId 一律忽略，绝不进入转发给 `draftLessonStep` 的 payload。
 * - **输入收口（T-66-08）**：`.strict()` zod schema，stepType 枚举 + 非空 intent 在 action 入口校验。
 *
 * 执行顺序：parse/validate → assertActiveTeacher → flag check（hard-stop）→ draftLessonStep。
 */

const draftWithAgentSchema = z
  .object({
    lessonId: z.string().min(1),
    stepType: z.enum(["content", "task", "quiz"]),
    intent: z.string().min(1),
  })
  .strict();

type DraftWithAgentInput = z.infer<typeof draftWithAgentSchema>;

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string };

const LESSON_AGENT_KEY = "LessonAgent";

function validationError(): ActionResult<never> {
  return { ok: false, error: "VALIDATION_ERROR", message: "输入内容不完整，请检查后再试。" };
}

function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof Error && error.message === "TEACHER_AUTH_REQUIRED") {
    return { ok: false, error: "UNAUTHORIZED", message: "您没有权限执行此操作。" };
  }

  if (error instanceof z.ZodError) {
    return validationError();
  }

  return { ok: false, error: "AGENT_DRAFT_FAILED", message: "AI 起草失败，请稍后重试。" };
}

export async function draftLessonWithAgentAction(
  input: DraftWithAgentInput,
): Promise<ActionResult<Awaited<ReturnType<typeof draftLessonStep>>>> {
  const parsed = draftWithAgentSchema.safeParse(input);
  if (!parsed.success) {
    return validationError();
  }

  try {
    // 身份 server 派生：client 身份字段绝不参与；schoolId 取教师生效学校范围。
    const scope = await assertActiveTeacher();
    const schoolId = scope.schoolIds[0];

    // D-03 HARD-STOP：flag check 必须先于任何 draftLessonStep 调用。
    const registry = await getAgentRegistryDTO();
    const lessonAgent = registry.find((agent) => agent.agentKey === LESSON_AGENT_KEY);

    if (!lessonAgent?.enabled) {
      return { ok: false, error: "AGENT_DISABLED", message: "AI 课程助手当前未启用。" };
    }

    // payload 仅含 server 派生 schoolId + 已校验的 lessonId/stepType/intent。
    const result = await draftLessonStep({
      lessonId: parsed.data.lessonId,
      schoolId,
      stepType: parsed.data.stepType,
      intent: parsed.data.intent,
    });

    return { ok: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}
