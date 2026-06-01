import "server-only";

import {
  DraftGuardrailRejection,
  GUARDRAIL_MAX_FIELD_LENGTH,
} from "@/lib/dto/draft-guardrails";
import type { LessonStepPayload } from "@/lib/dto/lesson-authoring";

/**
 * server-only 守卫校验器（EVAL-02 / 锁定决策 D-04）。
 *
 * `assertStepWithinGuardrails` 是 `createDraftLessonStepTool.execute` 在
 * `aiGenerateObject` 之后、`return step` 之前的唯一拦截点：把**不可信**的
 * 模型输出在离开工具前逐项拒绝，使任何越界步骤结构上不可能返回。
 *
 * 纯函数约束（与 lesson-draft.ts 同源）：**不**引入 DB / DAL / env / 网络 /
 * eval —— 只做确定性的结构判定，要么 assert 通过，要么抛
 * `DraftGuardrailRejection`（仅承载 `{ reasonCode, stepType }`，T-65-PII）。
 *
 * 拒绝**不**在此 catch：由命令处理器（65-04）区分越界拒绝与真实生成失败，
 * 并落 rejected 事件。
 */

const ALLOWED_STEP_TYPES = ["content", "task", "quiz"] as const;
type AllowedStepType = (typeof ALLOWED_STEP_TYPES)[number];

/** task.submissionType 合法域（与 lesson-authoring taskStepPayloadSchema 一致）。 */
const ALLOWED_SUBMISSION_TYPES = ["text", "image", "file", "link"];

/**
 * 注入 / 禁止内容 deny-list（大小写不敏感，逐字段扫描）。
 *
 * 刻意保留为具名常量，使 65-05 的静态检查可直接 grep `FORBIDDEN_MARKERS`。
 * 命中任一标记 → `DraftGuardrailRejection(forbidden_content)`（缓解 T-65-INJ）。
 */
export const FORBIDDEN_MARKERS: RegExp[] = [
  /ignore previous instructions/i,
  /<script/i,
  /eval\(/i,
  /drop table/i,
  /system prompt/i,
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** 汇集步骤所有自由文本字段，供 deny-list 扫描。 */
function collectText(step: Record<string, unknown>): string {
  const parts: unknown[] = [
    step.title,
    step.body,
    step.prompt,
    step.question,
    step.explanation,
    step.teacherNotes,
  ];
  if (Array.isArray(step.options)) {
    parts.push(...step.options);
  }
  return parts.filter((part): part is string => typeof part === "string").join("\n");
}

/**
 * 在模型输出离开工具前逐项校验；首个失败即抛 `DraftGuardrailRejection`。
 *
 * 校验顺序（确定性，便于反例稳定命中单一 reason code）：
 *   1. illegal_step_type — type 不在 {content,task,quiz}
 *   2. invalid_teaching_structure — 各类型的教学不变式（D-02）
 *   3. quiz_correct_index_out_of_range — quiz correctOptionIndex 越界
 *   4. oversize_field — body/prompt/question 超过 GUARDRAIL_MAX_FIELD_LENGTH
 *   5. forbidden_content — 任一文本字段命中 FORBIDDEN_MARKERS
 */
export function assertStepWithinGuardrails(step: unknown): asserts step is LessonStepPayload {
  const record = (typeof step === "object" && step !== null ? step : {}) as Record<
    string,
    unknown
  >;
  const rawType = record.type;

  // 1. illegal_step_type —— stepType 用 "content" 哨兵：拒绝对象只承载已知
  // 类型字段，绝不把任意 LLM 字面量回灌进类型化的 stepType（T-65-PII）。
  if (typeof rawType !== "string" || !ALLOWED_STEP_TYPES.includes(rawType as AllowedStepType)) {
    throw new DraftGuardrailRejection({ reasonCode: "illegal_step_type", stepType: "content" });
  }
  const stepType = rawType as AllowedStepType;

  // 2. invalid_teaching_structure（D-02 教学不变式）。
  if (stepType === "content") {
    if (!isNonEmptyString(record.title) || !isNonEmptyString(record.body)) {
      throw new DraftGuardrailRejection({ reasonCode: "invalid_teaching_structure", stepType });
    }
  } else if (stepType === "task") {
    if (
      !isNonEmptyString(record.prompt) ||
      typeof record.submissionType !== "string" ||
      !ALLOWED_SUBMISSION_TYPES.includes(record.submissionType)
    ) {
      throw new DraftGuardrailRejection({ reasonCode: "invalid_teaching_structure", stepType });
    }
  } else {
    // quiz
    if (
      !isNonEmptyString(record.question) ||
      !Array.isArray(record.options) ||
      record.options.length < 2
    ) {
      throw new DraftGuardrailRejection({ reasonCode: "invalid_teaching_structure", stepType });
    }
  }

  // 3. quiz_correct_index_out_of_range。
  if (stepType === "quiz") {
    const index = record.correctOptionIndex;
    const optionCount = (record.options as unknown[]).length;
    if (typeof index === "number" && (index < 0 || index >= optionCount)) {
      throw new DraftGuardrailRejection({
        reasonCode: "quiz_correct_index_out_of_range",
        stepType,
      });
    }
  }

  // 4. oversize_field —— 按类型选定确定性长度字段。
  const sizedField =
    stepType === "content"
      ? record.body
      : stepType === "task"
        ? record.prompt
        : record.question;
  if (typeof sizedField === "string" && sizedField.length > GUARDRAIL_MAX_FIELD_LENGTH) {
    throw new DraftGuardrailRejection({ reasonCode: "oversize_field", stepType });
  }

  // 5. forbidden_content —— 扫描全部自由文本字段。
  const haystack = collectText(record);
  if (FORBIDDEN_MARKERS.some((marker) => marker.test(haystack))) {
    throw new DraftGuardrailRejection({ reasonCode: "forbidden_content", stepType });
  }
}
