import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./registry", () => ({
  platformCommandRegistry: {},
}));

import {
  buildPlatformCommandDedupeKey,
  dispatchPlatformCommand,
  type PlatformCommandBusDependencies,
  type PlatformCommandStore,
} from "./bus";
import {
  PlatformCommandValidationError,
  PlatformCommandPayloadSchemas,
  type PlatformCommand,
  type PlatformCommandDefinition,
} from "./contracts";

function createStore(): PlatformCommandStore {
  const commands = new Map<string, {
    command: PlatformCommand;
    dedupeKey: string;
    status: "pending" | "running" | "succeeded" | "failed";
    latestAttemptNumber: number;
    resultSummary: Record<string, unknown> | null;
    failureDetail: Record<string, unknown> | null;
  }>();
  const attempts: Array<{
    commandId: string;
    attemptNumber: number;
    status: "pending" | "running" | "succeeded" | "failed";
    resultSummary: Record<string, unknown> | null;
    failureDetail: Record<string, unknown> | null;
  }> = [];

  return {
    async getCommandByDedupeKey(dedupeKey) {
      return Array.from(commands.values()).find((record) => record.dedupeKey === dedupeKey) ?? null;
    },
    async insertCommand(input) {
      const existing = Array.from(commands.values()).find((record) => record.dedupeKey === input.dedupeKey);

      if (existing) {
        return { command: existing.command, created: false };
      }

      const record = {
        command: input.command,
        dedupeKey: input.dedupeKey,
        status: input.status,
        latestAttemptNumber: input.latestAttemptNumber,
        resultSummary: null,
        failureDetail: null,
      };
      commands.set(input.command.id, record);

      return { command: record.command, created: true };
    },
    async appendAttempt(input) {
      attempts.push({
        commandId: input.commandId,
        attemptNumber: input.attemptNumber,
        status: input.status,
        resultSummary: input.resultSummary ?? null,
        failureDetail: input.failureDetail ?? null,
      });
    },
    async updateCommandSummary(input) {
      const record = commands.get(input.commandId);

      if (!record) {
        throw new Error("COMMAND_NOT_FOUND");
      }

      record.status = input.status;
      record.latestAttemptNumber = input.latestAttemptNumber;
      record.resultSummary = input.resultSummary ?? null;
      record.failureDetail = input.failureDetail ?? null;
    },
    async getCommand(commandId) {
      return commands.get(commandId) ?? null;
    },
    async listAttempts(commandId) {
      return attempts.filter((attempt) => attempt.commandId === commandId);
    },
  };
}

describe("dispatchPlatformCommand", () => {
  let authorize: ReturnType<typeof vi.fn>;
  let execute: ReturnType<typeof vi.fn>;
  let definition: PlatformCommandDefinition;
  let dependencies: PlatformCommandBusDependencies;
  let command: PlatformCommand;

  beforeEach(() => {
    authorize = vi.fn(async () => undefined);
    execute = vi.fn(async () => ({
      resultSummary: { ok: true },
      invalidation: { tags: ["plugin:registry"] },
    }));

    definition = {
      commandType: "plugin.enable",
      payloadSchema: PlatformCommandPayloadSchemas["plugin.enable"],
      dedupe: "required",
      authorize: authorize as PlatformCommandDefinition<"plugin.enable">["authorize"],
      execute: execute as PlatformCommandDefinition<"plugin.enable">["execute"],
    };

    dependencies = {
      definitions: {
        "plugin.enable": definition,
      },
      store: createStore(),
    };

    command = {
      id: "command-1",
      type: "plugin.enable",
      actor: {
        actorId: "teacher-1",
        actorScope: "teacher",
      },
      scope: {
        schoolId: "school-1",
        pluginId: "plugin-1",
      },
      payload: {
        schoolId: "school-1",
        pluginId: "plugin-1",
        enabledBy: "teacher-1",
      },
      correlation: {
        correlationId: "corr-1",
        causationId: null,
        producer: "test-suite",
      },
    };
  });

  it("rejects invalid envelope or payload before any ledger write", async () => {
    await expect(
      dispatchPlatformCommand(
        {
          ...command,
          payload: {
            schoolId: "school-1",
            pluginId: "",
            enabledBy: "teacher-1",
          },
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(PlatformCommandValidationError);

    const stored = await dependencies.store.listAttempts(command.id);
    expect(stored).toHaveLength(0);
    expect(authorize).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("dedupes duplicate side-effect-sensitive commands onto one stable command row", async () => {
    const first = await dispatchPlatformCommand(command, dependencies);
    const duplicate = await dispatchPlatformCommand({
      ...command,
      id: "command-2",
      correlation: {
        correlationId: "corr-2",
        causationId: null,
        producer: "duplicate-producer",
      },
    }, dependencies);

    expect(first.commandId).toBe(command.id);
    expect(duplicate.commandId).toBe(command.id);
    expect(duplicate.attemptNumber).toBe(1);

    const attempts = await dependencies.store.listAttempts(command.id);
    expect(attempts).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("records a successful dispatch result summary and invalidation intent", async () => {
    const result = await dispatchPlatformCommand(command, dependencies);

    expect(result).toMatchObject({
      commandId: "command-1",
      attemptNumber: 1,
      status: "succeeded",
      resultSummary: { ok: true },
      invalidation: { tags: ["plugin:registry"] },
    });

    expect(authorize).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);

    const stored = await dependencies.store.getCommand(command.id);
    expect(stored?.status).toBe("succeeded");
    expect(stored?.latestAttemptNumber).toBe(1);
  });

  it("records authorization failures as failed instead of leaving the command running", async () => {
    authorize.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    await expect(dispatchPlatformCommand(command, dependencies)).rejects.toThrow("TEACHER_AUTH_REQUIRED");

    const stored = await dependencies.store.getCommand(command.id);
    const attempts = await dependencies.store.listAttempts(command.id);

    expect(stored?.status).toBe("failed");
    expect(stored?.latestAttemptNumber).toBe(1);
    expect(attempts).toEqual([
      expect.objectContaining({
        commandId: command.id,
        attemptNumber: 1,
        status: "failed",
        failureDetail: { message: "TEACHER_AUTH_REQUIRED" },
      }),
    ]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("uses a per-dispatch unique dedupe key for optional dedupe commands without an explicit dedupe key", async () => {
    const optionalDefinition: PlatformCommandDefinition<"plugin.uninstall.preflight"> = {
      commandType: "plugin.uninstall.preflight",
      payloadSchema: PlatformCommandPayloadSchemas["plugin.uninstall.preflight"],
      dedupe: "optional",
      authorize: authorize as PlatformCommandDefinition<"plugin.uninstall.preflight">["authorize"],
      execute: execute as PlatformCommandDefinition<"plugin.uninstall.preflight">["execute"],
    };

    const optionalDependencies: PlatformCommandBusDependencies = {
      definitions: {
        "plugin.uninstall.preflight": optionalDefinition,
      },
      store: createStore(),
    };

    const preflightCommand: PlatformCommand = {
      id: "preflight-1",
      type: "plugin.uninstall.preflight",
      actor: command.actor,
      scope: command.scope,
      payload: {
        schoolId: "school-1",
        pluginId: "plugin-1",
      },
      correlation: command.correlation,
    };

    const first = await dispatchPlatformCommand(preflightCommand, optionalDependencies);
    const second = await dispatchPlatformCommand({
      ...preflightCommand,
      id: "preflight-2",
      correlation: {
        correlationId: "corr-2",
        causationId: null,
        producer: "duplicate-producer",
      },
    }, optionalDependencies);

    expect(first.commandId).toBe("preflight-1");
    expect(second.commandId).toBe("preflight-2");
  });
});

describe("buildPlatformCommandDedupeKey", () => {
  it("derives a stable fallback dedupe key from command intent", () => {
    const dedupeKey = buildPlatformCommandDedupeKey({
      id: "command-1",
      type: "plugin.disable",
      actor: {
        actorId: "teacher-1",
        actorScope: "teacher",
      },
      scope: {
        schoolId: "school-1",
        pluginId: "plugin-1",
      },
      payload: {
        schoolId: "school-1",
        pluginId: "plugin-1",
        disabledBy: "teacher-1",
      },
      correlation: {
        correlationId: "corr-1",
        causationId: null,
        producer: "test-suite",
      },
    });

    expect(dedupeKey).toContain("plugin.disable");
    expect(dedupeKey).toContain("school-1");
    expect(dedupeKey).toContain("plugin-1");
  });
});
