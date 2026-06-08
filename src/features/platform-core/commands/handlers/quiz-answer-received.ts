import "server-only";

import type { PlatformSuccessOrDomainEvent } from "@/features/platform-core/events/contracts";
import { publishTransportEvent } from "@/features/runtime-platform/seams";

import {
  PlatformCommandExecutionError,
  type PlatformCommand,
  type PlatformCommandDefinition,
} from "../contracts";

type QuizAnswerReceivedCommand = Extract<PlatformCommand, { type: "quiz.answer.received" }>;

type ExecutionResult = Awaited<ReturnType<PlatformCommandDefinition["execute"]>>;

function successResult(input: {
  resultSummary: Record<string, unknown> | null;
  invalidation?: { tags: string[] };
  emittedEvents?: PlatformSuccessOrDomainEvent[];
}): ExecutionResult {
  return {
    resultSummary: input.resultSummary,
    invalidation: input.invalidation ?? { tags: [] },
    emittedEvents: input.emittedEvents ?? [],
    failureEvent: null,
    failureAttribution: null,
  };
}

export async function authorizeQuizAnswerReceivedCommand(
  command: PlatformCommand,
): Promise<void> {
  if (command.actor.actorScope !== "system") {
    throw new Error("QUIZ_ANSWER_RECEIVED_SYSTEM_ONLY");
  }
}

export async function executeQuizAnswerReceivedCommand(
  input: { command: PlatformCommand; attemptNumber: number },
): Promise<ExecutionResult> {
  const command = input.command as QuizAnswerReceivedCommand;

  try {
    const transport = await publishTransportEvent({
      sessionId: command.payload.classroomSessionId,
      channel: "classroom-runtime",
      kind: command.type,
      correlationId: command.correlation.correlationId,
      truthPersisted: true,
      truthRef: {
        type: "classroom-event",
        id: command.id,
        classroomSessionId: command.payload.classroomSessionId,
        schoolId: command.scope.schoolId,
      },
      payload: command.payload,
    });

    return successResult({
      resultSummary: {
        commandType: command.type,
        classroomSessionId: command.payload.classroomSessionId,
        questionId: command.payload.questionId,
        responseType: command.payload.responseType,
        adapterMode: transport.adapterMode,
        attemptStatus: transport.attemptStatus,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "QUIZ_ANSWER_RECEIVED_DELIVERY_FAILED";

    throw new PlatformCommandExecutionError({
      message,
      failureAttribution: {
        scope: "plugin",
        pluginId: command.scope.pluginId,
        reasonCode: "quiz_answer_received_delivery_failed",
        recommendedRecoveryAction: "retry",
      },
      failureEvent: {
        eventType: "platform.command.failed",
        category: "outcome",
        aggregateType: "plugin",
        aggregateId: command.scope.pluginId,
        payload: {
          commandType: command.type,
          reasonCode: "quiz_answer_received_delivery_failed",
          failureAttribution: {
            scope: "plugin",
            pluginId: command.scope.pluginId,
            reasonCode: "quiz_answer_received_delivery_failed",
            recommendedRecoveryAction: "retry",
          },
        },
        audit: command.audit,
      },
    });
  }
}

export const quizAnswerReceivedHandler = {
  authorize: ({ command }: { command: PlatformCommand }) =>
    authorizeQuizAnswerReceivedCommand(command),
  execute: (executionInput: { command: PlatformCommand; attemptNumber: number }) =>
    executeQuizAnswerReceivedCommand(executionInput),
} satisfies Pick<PlatformCommandDefinition, "authorize" | "execute">;
