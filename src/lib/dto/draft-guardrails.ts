import { z } from "zod";

/**
 * Draft guardrail 契约模块（最低层 `lib/dto`，**非 server-only**）。
 *
 * 该模块刻意放在 `src/lib/dto`（最低层），使得三个不同层都能 import 同一套
 * reason-code 词表与拒绝错误类型，而**不引入** `events → server/ai/tools`
 * 的跨层 import，也**不**因 server-only 标记而把 events/contracts
 * 或客户端拉进 server-only 边界：
 *   1. server-only 守卫校验器（65-02 的 `server/ai/tools/guardrails.ts`）；
 *   2. 拒绝事件 payload schema（`features/platform-core/events/contracts.ts`）；
 *   3. command handler。
 *
 * T-65-PII（D-07）结构保证：`DraftGuardrailRejection` 在源头只携带
 * `{ reasonCode, stepType }`，绝不携带 step 快照 / `*Json` / 自由文本，
 * 因此下游任何 emitter 都无法经由该拒绝对象泄漏草稿内容。
 */

export const GuardrailReasonCodeSchema = z.enum([
  "illegal_step_type",
  "oversize_field",
  "invalid_teaching_structure",
  "quiz_correct_index_out_of_range",
  "forbidden_content",
]);

export type GuardrailReasonCode = z.infer<typeof GuardrailReasonCodeSchema>;

/**
 * body/prompt/question 的确定性超长阈值（由 65-02 的 guardrails.ts 引用）。
 */
export const GUARDRAIL_MAX_FIELD_LENGTH = 8000;

type GuardrailStepType = "content" | "task" | "quiz";

/**
 * 守卫拒绝错误：结构上**只**承载 `{ reasonCode, stepType }`。
 *
 * 不接受、不存储任何 step payload、`*Json`、或自由文本字段 —— 这是
 * T-65-PII 在源头的结构性保证（D-07），由 draft-guardrails.test.ts 断言。
 */
export class DraftGuardrailRejection extends Error {
  readonly reasonCode: GuardrailReasonCode;
  readonly stepType: GuardrailStepType;

  constructor({
    reasonCode,
    stepType,
  }: {
    reasonCode: GuardrailReasonCode;
    stepType: GuardrailStepType;
  }) {
    super(`DRAFT_GUARDRAIL_REJECTED:${reasonCode}`);
    // 非枚举：使 Object.keys(rejection) 仅暴露 { reasonCode, stepType }，
    // 维持 T-65-PII 的结构断言（拒绝对象只承载这两个字段）。
    Object.defineProperty(this, "name", {
      value: "DraftGuardrailRejection",
      enumerable: false,
      configurable: true,
      writable: true,
    });
    this.reasonCode = reasonCode;
    this.stepType = stepType;
  }
}
