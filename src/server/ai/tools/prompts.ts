import "server-only";

import type { TeacherLessonPreviewDTO } from "@/lib/dto/lesson-authoring";

/**
 * 起草 prompt 组装 —— Phase 62 的 prompt 内容编排半边（承接 D-11）。
 *
 * 职责边界：
 * - 只负责把「lesson 只读上下文 + 教师起草意图 + 目标步骤类型 + 安全约束」拼成
 *   一个完整 prompt 字符串，交给 Phase 61 facade（`aiGenerateObject`）生成。
 * - **绝不** import 任何 provider config / apiKey / env / DB 句柄 —— 本模块纯字符串编排。
 *
 * few-shot 默认值形状对齐 `resource-ai.ts` 的 `BUILT_IN_TEACHING_STEP_DEFINITIONS`
 * initialPayload（content/task/quiz 三类），避免另造第二套步骤模型。
 */

export type DraftStepType = "content" | "task" | "quiz";

export interface BuildDraftStepPromptInput {
  /** 目标步骤类型，严格对齐 lessonStepPayloadSchema discriminated union。 */
  stepType: DraftStepType;
  /** 教师起草意图（自然语言），已在 inputSchema 边界校验非空。 */
  intent: string;
  /** 只读 lesson 预览上下文（DAL 自带授权域，steps 已 hydrated + 过滤 archived）。 */
  context: TeacherLessonPreviewDTO;
}

/** 三类步骤的 few-shot 范例（形状对齐 dto，仅作生成参照，不作为返回值）。 */
const STEP_FEW_SHOT: Record<DraftStepType, string> = {
  content: [
    "范例（content 讲授步骤）：",
    JSON.stringify(
      {
        type: "content",
        title: "教师讲授",
        body: "围绕本节重点展开讲授，结合板书、示范或例题帮助学生建立知识框架。",
        teacherNotes: "先明确本环节目标，再补充示范或关键提示。",
        materialRefs: [],
      },
      null,
      2,
    ),
  ].join("\n"),
  task: [
    "范例（task 练习步骤）：",
    JSON.stringify(
      {
        type: "task",
        prompt: "请完成以下练习并提交你的解题过程。",
        submissionType: "text",
        successCriteria: "解题步骤完整、结论正确。",
        materialRefs: [],
      },
      null,
      2,
    ),
  ].join("\n"),
  quiz: [
    "范例（quiz 测验步骤）：",
    JSON.stringify(
      {
        type: "quiz",
        question: "下列哪一项是本节课的核心概念？",
        options: ["选项 A", "选项 B", "选项 C", "选项 D"],
        correctOptionIndex: 0,
        explanation: "结合本节讲授要点说明正确答案的理由。",
        materialRefs: [],
      },
      null,
      2,
    ),
  ].join("\n"),
};

/** 把已有步骤压成一行简短摘要，供模型理解课堂已有脉络。 */
function summarizeExistingSteps(context: TeacherLessonPreviewDTO): string {
  if (context.steps.length === 0) {
    return "（本节课暂无已有步骤）";
  }
  return context.steps
    .map((step, idx) => `${idx + 1}. [${step.type}] ${step.title}`)
    .join("\n");
}

/**
 * 组装一节课某个原子步骤的起草 prompt。
 *
 * @returns 完整 prompt 字符串（system 安全约束 + lesson 上下文 + few-shot + 起草指令）。
 */
export function buildDraftStepPrompt({ stepType, intent, context }: BuildDraftStepPromptInput): string {
  const { course, lesson } = context;

  return [
    "你是一名中小学教学设计助手，负责为教师起草单个课堂原子步骤。",
    "",
    "【安全与边界约束】",
    "- 只输出符合目标步骤类型 schema 的结构化 JSON，不要输出任何解释性散文。",
    "- 严禁输出任何密钥、凭证、provider 配置或系统内部标识。",
    "- 不得越权操作：你只负责生成步骤内容草稿，不执行任何数据写入。",
    "",
    "【课程上下文】",
    `- 学科：${course.subject}`,
    `- 年级：${course.grade}`,
    `- 课程：${course.title}`,
    `- 本节课标题：${lesson.title}`,
    `- 教学目标：${lesson.objective}`,
    "",
    "【本节课已有步骤】",
    summarizeExistingSteps(context),
    "",
    "【起草任务】",
    `- 目标步骤类型：${stepType}`,
    `- 教师起草意图：${intent}`,
    "",
    STEP_FEW_SHOT[stepType],
    "",
    `请据此生成一个 type="${stepType}" 的原子步骤，字段须完整、可直接用于课堂。`,
  ].join("\n");
}
