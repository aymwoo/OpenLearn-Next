import "server-only";

import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platformCommandAttempts, platformCommands } from "@/db/schema";
import {
  dispatchPlatformCommand,
  type PersistedPlatformCommandRecord,
  type PlatformCommandStore,
} from "@/features/platform-core/commands/bus";
import type {
  PlatformCommand,
  PlatformCommandDispatchResult,
  PlatformCommandStatus,
} from "@/features/platform-core/commands/contracts";
import { defaultInProcessPlatformEventAdapter } from "@/features/platform-core/events/adapters/in-process";

type ProduceQuizAnswerReceivedInput = {
  actorId: string;
  schoolId: string;
  correlationId?: string | null;
  payload: {
    questionId: string;
    studentId: string;
    responseType: "single_choice" | "multi_choice" | "true_false" | "fill_blank" | "ordering";
    payload: unknown;
    receivedAt: number;
    classroomSessionId: string;
  };
};

type ProducerResult<TData = Record<string, unknown> | null> = {
  success: boolean;
  data: TData;
  commandId: string;
  attemptNumber: number;
  invalidationTags: string[];
};

function mapPersistedCommand(record: typeof platformCommands.$inferSelect): PersistedPlatformCommandRecord {
  return {
    command: {
      id: record.id,
      type: record.commandType as PlatformCommand["type"],
      actor: {
        actorId: record.actorId,
        actorScope: record.actorScope,
      },
      scope: record.scopeJson as PlatformCommand["scope"],
      payload: record.payloadJson as PlatformCommand["payload"],
      correlation: record.correlationJson as PlatformCommand["correlation"],
      audit: (record.auditSummaryJson as PlatformCommand["audit"] | null) ?? {
        delegatedActor: null,
        approval: null,
      },
      dedupeKey: record.dedupeKey,
    } as PlatformCommand,
    dedupeKey: record.dedupeKey,
    status: record.status as PlatformCommandStatus,
    latestAttemptNumber: record.latestAttemptNumber,
    resultSummary: (record.resultSummaryJson as Record<string, unknown> | null) ?? null,
    failureDetail: (record.failureDetailJson as Record<string, unknown> | null) ?? null,
  };
}

const platformCommandStore: PlatformCommandStore = {
  async getCommandByDedupeKey(dedupeKey) {
    const record = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.dedupeKey, dedupeKey),
    });

    return record ? mapPersistedCommand(record) : null;
  },
  async insertCommand(input) {
    const existingById = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.id, input.command.id),
    });

    if (existingById) {
      return { command: mapPersistedCommand(existingById).command, created: false };
    }

    const existing = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.dedupeKey, input.dedupeKey),
    });

    if (existing) {
      return { command: mapPersistedCommand(existing).command, created: false };
    }

    const [created] = await db
      .insert(platformCommands)
      .values({
        id: input.command.id,
        actorId: input.command.actor.actorId,
        schoolId: input.command.scope.schoolId,
        commandType: input.command.type,
        status: input.status,
        dedupeKey: input.dedupeKey,
        actorScope: input.command.actor.actorScope,
        scopeJson: input.command.scope,
        payloadJson: input.command.payload,
        correlationJson: input.command.correlation,
        auditSummaryJson: input.command.audit,
        latestAttemptNumber: input.latestAttemptNumber,
      })
      .returning();

    return { command: mapPersistedCommand(created).command, created: true };
  },
  async appendAttempt(input) {
    await db.insert(platformCommandAttempts).values({
      commandId: input.commandId,
      attemptNumber: input.attemptNumber,
      status: input.status,
      resultSummaryJson: input.resultSummary ?? null,
      failureDetailJson: input.failureDetail ?? null,
      startedAt: new Date(),
      completedAt: input.status === "running" ? null : new Date(),
    });
  },
  async updateCommandSummary(input) {
    await db
      .update(platformCommands)
      .set({
        status: input.status,
        latestAttemptNumber: input.latestAttemptNumber,
        resultSummaryJson: input.resultSummary ?? null,
        failureDetailJson: input.failureDetail ?? null,
        updatedAt: new Date(),
        completedAt:
          input.status === "succeeded" || input.status === "failed"
            ? new Date()
            : null,
      })
      .where(eq(platformCommands.id, input.commandId));
  },
  async getCommand(commandId) {
    const record = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.id, commandId),
    });

    return record ? mapPersistedCommand(record) : null;
  },
  async listAttempts(commandId) {
    const rows = await db.query.platformCommandAttempts.findMany({
      where: eq(platformCommandAttempts.commandId, commandId),
    });

    return rows.map((row) => ({
      commandId: row.commandId,
      attemptNumber: row.attemptNumber,
      status: row.status as PlatformCommandStatus,
      resultSummary: (row.resultSummaryJson as Record<string, unknown> | null) ?? null,
      failureDetail: (row.failureDetailJson as Record<string, unknown> | null) ?? null,
    }));
  },
};

function normalizeProducerResult(
  result: PlatformCommandDispatchResult,
): ProducerResult {
  return {
    success: result.status === "succeeded",
    data: result.resultSummary,
    commandId: result.commandId,
    attemptNumber: result.attemptNumber,
    invalidationTags: result.invalidation.tags,
  };
}

export async function produceQuizAnswerReceived(
  input: ProduceQuizAnswerReceivedInput,
): Promise<ProducerResult> {
  const correlationId =
    input.correlationId?.trim() ||
    createHash("sha256")
      .update(JSON.stringify(input.payload))
      .digest("hex");
  const dedupeKey = `quiz.answer.received:${correlationId}`;

  const result = await dispatchPlatformCommand(
    {
      id: dedupeKey,
      type: "quiz.answer.received",
      actor: { actorId: input.actorId, actorScope: "system" },
      scope: {
        schoolId: input.schoolId,
        pluginId: "quiz",
      },
      payload: input.payload,
      correlation: {
        correlationId,
        causationId: null,
        producer: "classroom.submit-quiz-sample-answer",
      },
      dedupeKey,
      audit: {
        delegatedActor: null,
        approval: null,
      },
    },
    {
      store: platformCommandStore,
      publicationPort: defaultInProcessPlatformEventAdapter,
    },
  );

  return normalizeProducerResult(result);
}
