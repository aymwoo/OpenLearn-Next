import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { getTeacherLessonPreviewDTO } from "@/lib/dal/lesson-authoring";
import { lessonStepPayloadSchema, type LessonStepPayload } from "@/lib/dto/lesson-authoring";
import { aiGenerateObject } from "@/server/ai/providers";

import { buildDraftStepPrompt } from "./prompts";

/**
 * draftLessonStepTool 工厂 —— Phase 62 typed tool 层的能力核心（AGENT-01/02/03）。
 *
 * 设计约束（结构上不可越界）：
 * - **teacherId 闭包注入**（缓解 Spoofing / T-62-03）：教师标识由 factory 参数经闭包带入
 *   execute，**绝不**出现在 LLM 可控的 `inputSchema` 中。
 * - **边界 Zod 校验**（AGENT-01 / T-62-04）：`inputSchema` 在工具入口拒绝非法 lessonId /
 *   stepType / intent，非法 payload 永远进不到 execute。
 * - **唯一生成通道**（AGENT-02 / T-62-06）：只经 Phase 61 facade `aiGenerateObject` 生成，
 *   **不直连** `ai` 的 `generateObject`/`generateText`，不 import DB client / provider key /
 *   env，不使用 eval。
 * - **只读上下文**：仅调用只读 DAL `getTeacherLessonPreviewDTO`（自带授权域）。
 * - **纯内存返回不落库**（AGENT-03 / D-01）：execute 产出经 `lessonStepPayloadSchema` 校验的
 *   content/task/quiz 原子步骤包后直接返回，全程无任何写 DAL。
 */

/** 工具入口边界校验 schema —— **刻意不含 teacherId**（teacherId 经闭包注入）。 */
const draftStepInputSchema = z.object({
  lessonId: z.string().min(1),
  stepType: z.enum(["content", "task", "quiz"]),
  intent: z.string().min(1),
});

export interface CreateDraftLessonStepToolDeps {
  /** 已鉴权教师标识，仅作生成限流维度，经闭包注入 —— 非 LLM 参数。 */
  teacherId: string;
}

/**
 * 构造 draftLessonStepTool。
 *
 * @param deps.teacherId 已鉴权教师标识（闭包注入，排除出 inputSchema）。
 * @returns `ai` tool：inputSchema 边界校验 + facade 生成 + 内存返回原子步骤包。
 */
export function createDraftLessonStepTool({ teacherId }: CreateDraftLessonStepToolDeps) {
  return tool({
    description:
      "为指定课时起草单个课堂原子步骤（content/task/quiz）。在边界校验输入，经受控 AI 通道生成，纯内存返回不落库。",
    inputSchema: draftStepInputSchema,
    execute: async ({ lessonId, stepType, intent }): Promise<LessonStepPayload> => {
      // ① 只读上下文：DAL 自带授权域（assertActiveTeacher + getScopedLesson）。
      const context = await getTeacherLessonPreviewDTO({ lessonId });

      // ② 唯一生成通道：teacherId 来自闭包，schema 复用 lessonStepPayloadSchema。
      const step = await aiGenerateObject({
        teacherId,
        prompt: buildDraftStepPrompt({ stepType, intent, context }),
        schema: lessonStepPayloadSchema,
      });

      // ③ 纯内存返回，绝不写库（D-01 / AGENT-03）。
      return step;
    },
  });
}
