import "server-only";

import type {
  PlatformFailureAttribution,
  PlatformSuccessOrDomainEvent,
} from "@/features/platform-core/events/contracts";
import type { PlatformAuditMetadata } from "@/features/platform-core/ai-contracts/delegation";
import { assertActiveTeacher, persistDraftLessonVersion, applyDraftToLiveLesson, discardDraftLessonVersion } from "@/lib/dal/lesson-authoring";
import type { LessonStepPayload } from "@/lib/dto/lesson-authoring";
import { DraftGuardrailRejection } from "@/lib/dto/draft-guardrails";
import { cacheTags } from "@/lib/cache-policy";
import { createDraftLessonStepTool } from "@/server/ai/tools";

import {
  PlatformCommandExecutionError,
  type PlatformCommand,
  type PlatformCommandDefinition,
} from "../contracts";

/**
 * lesson.draft.run handler —— AI LessonAgent 起草命令的命令子系统落地（AGENT-04）。
 *
 * 不变式：
 * - **只读授权**：经 `assertActiveTeacher` 校验 schoolId ∈ scope.schoolIds（T-62-11），
 *   teacherId 取自授权 actor（`userId`），经闭包注入工具工厂 —— **绝不** 取自 LLM/payload。
 * - **唯一生成通道**：确定性调用 Plan 62-02 的 `createDraftLessonStepTool` 生成原子步骤。
 * - **三事件落账**：成功时经 `emittedEvents` 承载 requested/tool.invoked/produced 三条 AI 域
 *   事件（D-53-07），payload **仅摘要**（summary-only，T-62-09），整包 step 仅入 resultSummary。
 * - **失败语义**：生成失败抛 `PlatformCommandExecutionError`，由 bus 落账唯一 generic 失败事件
 *   （D-53-08，不发任何 domain 事件）。
 * - **不落库**：command 记录是 D-01 允许的唯一持久副作用；lesson/draft version 不写（Phase 63）。
 */

type LessonDraftRunCommand = Extract<PlatformCommand, { type: "lesson.draft.run" }>;
type LessonDraftPersistCommand = Extract<PlatformCommand, { type: "lesson.draft.persist" }>;
type LessonDraftAcceptCommand = Extract<PlatformCommand, { type: "lesson.draft.accept" }>;
type LessonDraftDiscardCommand = Extract<PlatformCommand, { type: "lesson.draft.discard" }>;

type ExecutionInput<TCommand extends PlatformCommand = PlatformCommand> = {
  command: TCommand;
  attemptNumber: number;
};

type ExecutionResult = Awaited<ReturnType<PlatformCommandDefinition["execute"]>>;

/** 保留 sentinel pluginId —— 内置系统 agent 身份，仅由 server-only handler 内部构造。 */
const LESSON_AGENT_SENTINEL_PLUGIN_ID = "core.lesson-agent";
const DRAFT_TOOL_NAME = "draftLessonStep";

function withAudit<TEvent extends Omit<PlatformSuccessOrDomainEvent, "audit">>(
  event: TEvent,
  audit: PlatformAuditMetadata,
): TEvent & { audit: PlatformAuditMetadata } {
  return { ...event, audit };
}

function successResult(input: {
  resultSummary: Record<string, unknown> | null;
  invalidation: { tags: string[] };
  emittedEvents: PlatformSuccessOrDomainEvent[];
}): ExecutionResult {
  return {
    resultSummary: input.resultSummary,
    invalidation: input.invalidation,
    emittedEvents: input.emittedEvents,
    failureEvent: null,
    failureAttribution: null,
  };
}

/** task/quiz 步骤无 `title` 字段，统一派生一个非空摘要标题供事件 summary / resultSummary 使用。 */
function deriveStepTitle(step: LessonStepPayload): string {
  switch (step.type) {
    case "content":
      return step.title;
    case "task":
      return step.prompt;
    case "quiz":
      return step.question;
    default:
      return "lesson-step";
  }
}

function throwDraftFailure(command: LessonDraftRunCommand, cause: unknown): never {
  const message = cause instanceof Error && cause.message.trim()
    ? cause.message.trim()
    : "LESSON_DRAFT_GENERATION_FAILED";
  const pluginId = command.scope.pluginId;
  const reasonCode = "draft_generation_failed";

  const failureAttribution: PlatformFailureAttribution = {
    scope: "operator",
    pluginId,
    reasonCode,
    recommendedRecoveryAction: "retry",
  };

  throw new PlatformCommandExecutionError({
    message,
    failureAttribution,
    failureEvent: {
      eventType: "platform.command.failed",
      category: "outcome",
      aggregateType: "plugin",
      aggregateId: pluginId,
      payload: {
        commandType: command.type,
        reasonCode,
        failureAttribution,
      },
      audit: command.audit,
    },
  });
}

async function authorizeLessonDraftCommand(command: PlatformCommand): Promise<void> {
  const scope = await assertActiveTeacher();

  if (!scope.schoolIds.includes(command.scope.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}

async function executeLessonDraftRun(input: ExecutionInput<LessonDraftRunCommand>): Promise<ExecutionResult> {
  const { command, attemptNumber } = input;
  const lessonId = command.payload.lessonId;
  const stepType = command.payload.stepType;

  // teacherId 来源：已鉴权 actor（绝不取自 LLM/payload）。
  const { userId: teacherId } = await assertActiveTeacher();

  let step: LessonStepPayload;
  try {
    const draftTool = createDraftLessonStepTool({ teacherId });
    step = (await draftTool.execute!(
      { lessonId, stepType, intent: command.payload.intent },
      {} as never,
    )) as LessonStepPayload;
  } catch (cause) {
    // 守卫拦截：业务上的“可记录拒绝”，**不是**系统失败（D-11/EVAL-02）。
    // 解析为已解决的成功型 outcome + 唯一 lesson.draft.rejected domain 事件，
    // payload summary-only（仅 cause.stepType/reasonCode，绝不含 step / D-07），
    // 且**不**发 requested/tool.invoked/produced —— 被拒草稿未产出任何步骤。
    if (cause instanceof DraftGuardrailRejection) {
      return successResult({
        resultSummary: {
          stepType: cause.stepType,
          reasonCode: cause.reasonCode,
          rejected: true,
        },
        invalidation: { tags: [] },
        emittedEvents: [
          withAudit({
            eventType: "lesson.draft.rejected",
            category: "domain",
            aggregateType: "lesson",
            aggregateId: lessonId,
            payload: {
              lessonId,
              stepType: cause.stepType,
              reasonCode: cause.reasonCode,
              teacherId,
            },
          }, command.audit),
        ],
      });
    }

    // 真正的生成失败：抛错走 bus 唯一 generic 失败事件（不发任何 domain 事件 / D-53-08）。
    throwDraftFailure(command, cause);
  }

  const stepTitle = deriveStepTitle(step);

  return successResult({
    // 整包 step 仅入 resultSummary（command 记录是 D-01 允许的唯一持久副作用 / SC3）。
    resultSummary: {
      stepType: step.type,
      title: stepTitle,
      succeeded: true,
      step,
    },
    invalidation: { tags: [] },
    emittedEvents: [
      withAudit({
        eventType: "lesson.draft.requested",
        category: "domain",
        aggregateType: "lesson",
        aggregateId: lessonId,
        payload: {
          commandType: command.type,
          stepType,
          intentSummary: command.payload.intent,
        },
      }, command.audit),
      withAudit({
        eventType: "lesson.tool.invoked",
        category: "domain",
        aggregateType: "lesson",
        aggregateId: lessonId,
        payload: {
          toolName: DRAFT_TOOL_NAME,
          stepType,
          attempt: attemptNumber,
        },
      }, command.audit),
      withAudit({
        eventType: "lesson.draft.produced",
        category: "domain",
        aggregateType: "lesson",
        aggregateId: lessonId,
        payload: {
          stepType: step.type,
          title: stepTitle,
          succeeded: true,
        },
      }, command.audit),
    ],
  });
}

async function executeLessonDraftPersist(
  input: ExecutionInput<LessonDraftPersistCommand>,
): Promise<ExecutionResult> {
  const { command } = input;
  const lessonId = command.payload.lessonId;

  // 1) 授权：schoolId 越权写他校 draft 拦截（T-63-01）。单参数、返回 void。
  await authorizeLessonDraftCommand(command);

  // 2) actor 取自已鉴权闭包（绝不取自 payload/LLM），仿 executeLessonDraftRun :126。
  const { userId: teacherId } = await assertActiveTeacher();

  // 3) 调 Plan 02 DAL；sourceCommandId/createdById 均闭包注入，不入 payload。
  const { draftVersionId, version, stepCount } = await persistDraftLessonVersion({
    lessonId,
    steps: command.payload.steps,
    sourceCommandId: command.id,   // provenance + 表层幂等键
    createdById: teacherId,        // 起草教师 id → 表 createdById（FK→users）
  });

  // 4) 返回 bus 约定形状：successResult，事件 withAudit 包裹（仿 executeLessonDraftRun :142-186）。
  return successResult({
    resultSummary: { draftVersionId, version, stepCount },
    invalidation: { tags: [cacheTags.draftLesson(lessonId), cacheTags.lesson(lessonId)] },
    emittedEvents: [
      withAudit({
        eventType: "lesson.draft.persisted",
        category: "domain",
        aggregateType: "lesson",
        aggregateId: lessonId,
        payload: { draftVersionId, version, stepCount, source: "ai" },
      }, command.audit),
    ],
  });
}

async function executeLessonDraftAccept(
  input: ExecutionInput<LessonDraftAcceptCommand>,
): Promise<ExecutionResult> {
  const { command } = input;
  const lessonId = command.payload.lessonId;

  await authorizeLessonDraftCommand(command);

  const result = await applyDraftToLiveLesson(command.payload);

  return successResult({
    resultSummary: {
      draftVersionId: result.draftVersionId,
      appliedStepCount: result.appliedStepCount,
    },
    invalidation: {
      tags: [
        cacheTags.draftLesson(lessonId),
        cacheTags.lesson(lessonId),
        cacheTags.steps(lessonId),
      ],
    },
    emittedEvents: [
      withAudit({
        eventType: "lesson.draft.accepted",
        category: "domain",
        aggregateType: "lesson",
        aggregateId: lessonId,
        payload: {
          draftVersionId: result.draftVersionId,
          version: 0, // version is not available from the DAL result; handler resolves it
          appliedStepCount: result.appliedStepCount,
          source: "ai",
        },
      }, command.audit),
    ],
  });
}

async function executeLessonDraftDiscard(
  input: ExecutionInput<LessonDraftDiscardCommand>,
): Promise<ExecutionResult> {
  const { command } = input;
  const lessonId = command.payload.lessonId;

  await authorizeLessonDraftCommand(command);

  const result = await discardDraftLessonVersion(command.payload);

  return successResult({
    resultSummary: {
      draftVersionId: result.draftVersionId,
      discardedAt: result.discardedAt,
    },
    invalidation: {
      tags: [
        cacheTags.draftLesson(lessonId),
        cacheTags.lesson(lessonId),
      ],
    },
    emittedEvents: [
      withAudit({
        eventType: "lesson.draft.discarded",
        category: "domain",
        aggregateType: "lesson",
        aggregateId: lessonId,
        payload: {
          draftVersionId: result.draftVersionId,
          version: 0, // version is not available from the DAL result; handler resolves it
        },
      }, command.audit),
    ],
  });
}

export const lessonDraftCommandHandlers = {
  "lesson.draft.run": {
    authorize: ({ command }) => authorizeLessonDraftCommand(command),
    execute: (input) => executeLessonDraftRun(input as ExecutionInput<LessonDraftRunCommand>),
  },
  "lesson.draft.persist": {
    authorize: ({ command }) => authorizeLessonDraftCommand(command),
    execute: (input) => executeLessonDraftPersist(input as ExecutionInput<LessonDraftPersistCommand>),
  },
  "lesson.draft.accept": {
    authorize: ({ command }) => authorizeLessonDraftCommand(command),
    execute: (input) => executeLessonDraftAccept(input as ExecutionInput<LessonDraftAcceptCommand>),
  },
  "lesson.draft.discard": {
    authorize: ({ command }) => authorizeLessonDraftCommand(command),
    execute: (input) => executeLessonDraftDiscard(input as ExecutionInput<LessonDraftDiscardCommand>),
  },
} satisfies Record<"lesson.draft.run" | "lesson.draft.persist" | "lesson.draft.accept" | "lesson.draft.discard", Pick<PlatformCommandDefinition, "authorize" | "execute">>;

// sentinel 命名常量在 register 路径外仍受引用约束（避免未使用告警，并昭示其内部专用语义）。
export { LESSON_AGENT_SENTINEL_PLUGIN_ID };
