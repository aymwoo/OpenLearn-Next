import "server-only";

import {
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
  const dedupeKey = buildPlatformCommandDedupeKey(command);

  const persisted = await dependencies.store.insertCommand({
    command,
    dedupeKey,
    status: "pending",
    latestAttemptNumber: 0,
  });

  const activeCommandId = persisted.command.id;
  command.id = activeCommandId;
  const existingRecord = await dependencies.store.getCommand(activeCommandId);
  const attemptNumber = (existingRecord?.latestAttemptNumber ?? 0) + 1;

  // record running summary before handler execution
  await dependencies.store.updateCommandSummary({
    commandId: activeCommandId,
    status: "running",
    latestAttemptNumber: attemptNumber,
  });

  // authorize
  await definition.authorize({ command });

  try {
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

    throw error;
  }
}
