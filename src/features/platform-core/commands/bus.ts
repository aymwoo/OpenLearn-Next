import "server-only";

import {
  appendPlatformEvents,
  type PersistedPlatformEventDispatchRecord,
  type PersistedPlatformEventRecord,
} from "@/features/platform-core/events/ledger";
import type {
  PlatformEvent,
  PlatformEventPublicationPort,
} from "@/features/platform-core/events/contracts";

import {
  PlatformCommandExecutionError,
  PlatformCommandDispatchResultSchema,
  PlatformCommandSchema,
  PlatformCommandValidationError,
  type PlatformCommand,
  type PlatformCommandDefinition,
  type PlatformCommandDispatchResult,
  type PlatformCommandInvalidation,
  type PlatformCommandStatus,
  type PlatformCommandType,
} from "./contracts";
import { platformCommandRegistry } from "./registry";

export type PersistedPlatformCommandRecord = {
  command: PlatformCommand;
  dedupeKey: string;
  status: PlatformCommandStatus;
  latestAttemptNumber: number;
  resultSummary: Record<string, unknown> | null;
  failureDetail: Record<string, unknown> | null;
};

export type PlatformCommandStore = {
  getCommandByDedupeKey: (dedupeKey: string) => Promise<PersistedPlatformCommandRecord | null>;
  insertCommand: (input: {
    command: PlatformCommand;
    dedupeKey: string;
    status: PlatformCommandStatus;
    latestAttemptNumber: number;
  }) => Promise<{ command: PlatformCommand; created: boolean }>;
  appendAttempt: (input: {
    commandId: string;
    attemptNumber: number;
    status: PlatformCommandStatus;
    resultSummary?: Record<string, unknown> | null;
    failureDetail?: Record<string, unknown> | null;
  }) => Promise<void>;
  updateCommandSummary: (input: {
    commandId: string;
    status: PlatformCommandStatus;
    latestAttemptNumber: number;
    resultSummary?: Record<string, unknown> | null;
    failureDetail?: Record<string, unknown> | null;
  }) => Promise<void>;
  getCommand: (commandId: string) => Promise<PersistedPlatformCommandRecord | null>;
  listAttempts: (commandId: string) => Promise<Array<{
    commandId: string;
    attemptNumber: number;
    status: PlatformCommandStatus;
    resultSummary: Record<string, unknown> | null;
    failureDetail: Record<string, unknown> | null;
  }>>;
};

export type PlatformCommandBusDependencies = {
  definitions?: Partial<Record<PlatformCommandType, PlatformCommandDefinition>>;
  store: PlatformCommandStore;
  publicationPort?: PlatformEventPublicationPort;
  persistPlatformEvents?: (input: {
    commandId: string;
    attemptNumber: number;
    correlationId: string;
    causationId?: string | null;
    invalidationTags: string[];
    failureAttribution?: PlatformCommandExecutionError["failureAttribution"] | null;
    events: PlatformEvent[];
  }) => Promise<{
    events: PersistedPlatformEventRecord[];
    dispatches: PersistedPlatformEventDispatchRecord[];
  }>;
};

type DedupeResolution = {
  dedupeKey: string;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function buildPlatformCommandDedupeKey(command: PlatformCommand): string {
  if (command.dedupeKey) {
    return command.dedupeKey;
  }

  return `${command.type}:${stableStringify(command.scope)}:${stableStringify(command.payload)}`;
}

function resolvePlatformCommandDedupe(command: PlatformCommand, definition: PlatformCommandDefinition): DedupeResolution {
  if (definition.dedupe === "required") {
    return { dedupeKey: buildPlatformCommandDedupeKey(command) };
  }

  if (command.dedupeKey) {
    return { dedupeKey: command.dedupeKey };
  }

  return { dedupeKey: `${buildPlatformCommandDedupeKey(command)}:dispatch:${command.id}` };
}

function readDefinition(
  commandType: PlatformCommandType,
  definitions?: Partial<Record<PlatformCommandType, PlatformCommandDefinition>>,
) {
  const definition = definitions?.[commandType] ?? platformCommandRegistry[commandType];

  if (!definition) {
    throw new PlatformCommandValidationError(`PLATFORM_COMMAND_TYPE_NOT_FOUND:${commandType}`);
  }

  return definition;
}

function validate(commandInput: unknown, definition: PlatformCommandDefinition): PlatformCommand {
  const parsedCommand = PlatformCommandSchema.safeParse(commandInput);

  if (!parsedCommand.success) {
    throw new PlatformCommandValidationError(parsedCommand.error.message);
  }

  const parsedPayload = definition.payloadSchema.safeParse(parsedCommand.data.payload);
  if (!parsedPayload.success) {
    throw new PlatformCommandValidationError(parsedPayload.error.message);
  }

  return {
    ...parsedCommand.data,
    payload: parsedPayload.data,
  } as PlatformCommand;
}

function inferFailureSemantics(command: PlatformCommand, error: unknown) {
  if (error instanceof PlatformCommandExecutionError) {
    return {
      failureAttribution: error.failureAttribution,
      failureEvent: error.failureEvent,
    };
  }

  const message = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : "PLATFORM_COMMAND_EXECUTION_FAILED";

  const failureAttribution = message === "TEACHER_AUTH_REQUIRED" || message === "AUTH_REQUIRED"
    ? {
        scope: "operator" as const,
        pluginId: command.scope.pluginId,
        reasonCode: "authorization_required",
        recommendedRecoveryAction: "reauthenticate",
      }
    : message.includes("DEPENDENCY") || message.includes("RECONCILE_BLOCKED")
      ? {
          scope: "dependency" as const,
          pluginId: command.scope.pluginId,
          reasonCode: message.includes("CYCLE") ? "dependency_cycle" : "dependency_missing",
          recommendedRecoveryAction: "reconcile",
        }
      : message.includes("CLEANUP_CONFIRMATION_REQUIRED")
        ? {
            scope: "operator" as const,
            pluginId: command.scope.pluginId,
            reasonCode: "cleanup_confirmation_required",
            recommendedRecoveryAction: "confirm_cleanup",
          }
        : message.includes("NOT_FOUND")
          ? {
              scope: "plugin" as const,
              pluginId: command.scope.pluginId,
              reasonCode: "not_installed",
              recommendedRecoveryAction: "install",
            }
          : {
              scope: "plugin" as const,
              pluginId: command.scope.pluginId,
              reasonCode: "command_execution_failed",
              recommendedRecoveryAction: "retry",
            };

  return {
    failureAttribution,
    failureEvent: {
      eventType: "platform.command.failed" as const,
      category: "outcome" as const,
      aggregateType: "plugin" as const,
      aggregateId: command.scope.pluginId,
      payload: {
        commandType: command.type,
        reasonCode: failureAttribution.reasonCode,
        failureAttribution,
      },
    },
  };
}

async function publishPersistedIfNeeded(
  publicationPort: PlatformEventPublicationPort | undefined,
  input: {
    commandId: string;
    attemptNumber: number;
    events: PersistedPlatformEventRecord[];
    dispatches: PersistedPlatformEventDispatchRecord[];
  },
) {
  if (!publicationPort || input.dispatches.length === 0) {
    return;
  }

  await publicationPort.publishPersisted({
    commandId: input.commandId,
    attemptNumber: input.attemptNumber,
    eventIds: input.events.map((event) => event.id),
    dispatchIds: input.dispatches.map((dispatch) => dispatch.id),
  });
}

export async function dispatchPlatformCommand(
  commandInput: unknown,
  dependencies: PlatformCommandBusDependencies,
): Promise<PlatformCommandDispatchResult> {
  // validate
  const preview = PlatformCommandSchema.safeParse(commandInput);
  if (!preview.success) {
    throw new PlatformCommandValidationError(preview.error.message);
  }

  const definition = readDefinition(preview.data.type, dependencies.definitions);
  const parsedCommand = validate(commandInput, definition);
  const command = { ...parsedCommand } as PlatformCommand;
  const { dedupeKey } = resolvePlatformCommandDedupe(command, definition);

  const persisted = await dependencies.store.insertCommand({
    command,
    dedupeKey,
    status: "pending",
    latestAttemptNumber: 0,
  });

  if (!persisted.created) {
    const existing = await dependencies.store.getCommand(persisted.command.id);

    if (existing && existing.status !== "pending") {
      return PlatformCommandDispatchResultSchema.parse({
        commandId: existing.command.id,
        attemptNumber: existing.latestAttemptNumber,
        status: existing.status,
        resultSummary: existing.resultSummary,
        invalidation: { tags: [] },
      });
    }
  }

  const activeCommandId = persisted.command.id;
  command.id = activeCommandId;
  const existingRecord = await dependencies.store.getCommand(activeCommandId);
  const attemptNumber = (existingRecord?.latestAttemptNumber ?? 0) + 1;
  const persistEvents = dependencies.persistPlatformEvents ?? appendPlatformEvents;

  try {
    await definition.authorize({ command });

    await dependencies.store.updateCommandSummary({
      commandId: activeCommandId,
      status: "running",
      latestAttemptNumber: attemptNumber,
    });

    // execute
    const execution = await definition.execute({ command, attemptNumber });
    const invalidation: PlatformCommandInvalidation = execution.invalidation ?? { tags: [] };

    // record success
    await dependencies.store.appendAttempt({
      commandId: activeCommandId,
      attemptNumber,
      status: "succeeded",
      resultSummary: execution.resultSummary,
    });

    // record result
    await dependencies.store.updateCommandSummary({
      commandId: activeCommandId,
      status: "succeeded",
      latestAttemptNumber: attemptNumber,
      resultSummary: execution.resultSummary,
      failureDetail: null,
    });

    const persistedEvents = await persistEvents({
      commandId: activeCommandId,
      attemptNumber,
      correlationId: command.correlation.correlationId,
      causationId: command.correlation.causationId,
      invalidationTags: invalidation.tags,
      failureAttribution: null,
      events: execution.emittedEvents ?? [],
    });

    await publishPersistedIfNeeded(dependencies.publicationPort, {
      commandId: activeCommandId,
      attemptNumber,
      events: persistedEvents.events,
      dispatches: persistedEvents.dispatches,
    });

    return PlatformCommandDispatchResultSchema.parse({
      commandId: activeCommandId,
      attemptNumber,
      status: "succeeded",
      resultSummary: execution.resultSummary,
      invalidation,
    });
  } catch (error) {
    const failureDetail = {
      message: error instanceof Error ? error.message : "PLATFORM_COMMAND_EXECUTION_FAILED",
    };
    const failure = inferFailureSemantics(command, error);

    // record failure
    await dependencies.store.appendAttempt({
      commandId: activeCommandId,
      attemptNumber,
      status: "failed",
      failureDetail,
    });

    await dependencies.store.updateCommandSummary({
      commandId: activeCommandId,
      status: "failed",
      latestAttemptNumber: attemptNumber,
      failureDetail,
      resultSummary: null,
    });

    const persistedEvents = await persistEvents({
      commandId: activeCommandId,
      attemptNumber,
      correlationId: command.correlation.correlationId,
      causationId: command.correlation.causationId,
      invalidationTags: [],
      failureAttribution: failure.failureAttribution,
      events: [failure.failureEvent],
    });

    await publishPersistedIfNeeded(dependencies.publicationPort, {
      commandId: activeCommandId,
      attemptNumber,
      events: persistedEvents.events,
      dispatches: persistedEvents.dispatches,
    });

    throw error;
  }
}
