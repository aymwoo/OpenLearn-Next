import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  dispatchPlatformCommand: vi.fn(),
  publishPersisted: vi.fn(async () => undefined),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      platformCommands: {
        findFirst: vi.fn(),
      },
      platformCommandAttempts: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/features/platform-core/commands/bus", () => ({
  dispatchPlatformCommand: mocks.dispatchPlatformCommand,
}));

vi.mock("@/features/platform-core/events/adapters/in-process", () => ({
  defaultInProcessPlatformEventAdapter: {
    id: "in-process-default",
    ownership: {
      sourceOfTruth: "sqlite-platform-event-ledger",
      delivery: "in-process",
      posture: "ledger-first",
      notes: [],
    },
    describeOwnership: vi.fn(() => ({
      sourceOfTruth: "sqlite-platform-event-ledger",
      delivery: "in-process",
      posture: "ledger-first",
      notes: [],
    })),
    publishPersisted: mocks.publishPersisted,
    subscribe: vi.fn(() => () => undefined),
  },
}));

import { dispatchPluginGovernanceCommand } from "./plugin-governance";

describe("dispatchPluginGovernanceCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("injects the concrete publication port and hands persisted dispatch ids to the event bus", async () => {
    mocks.dispatchPlatformCommand.mockImplementation(async (_command, dependencies) => {
      await dependencies.publicationPort?.publishPersisted({
        commandId: "plugin.enable:corr-1",
        attemptNumber: 1,
        eventIds: ["event-1"],
        dispatchIds: ["dispatch-1"],
      });

      return {
        commandId: "plugin.enable:corr-1",
        attemptNumber: 1,
        status: "succeeded",
        resultSummary: { lifecycleState: "enabled" },
        invalidation: { tags: ["plugin:registry"] },
      };
    });

    const result = await dispatchPluginGovernanceCommand({
      type: "plugin.enable",
      source: "server-action",
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
        producer: "plugin-actions",
      },
    });

    expect(mocks.dispatchPlatformCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "plugin.enable",
        id: "plugin.enable:corr-1",
      }),
      expect.objectContaining({
        publicationPort: expect.objectContaining({
          id: "in-process-default",
          publishPersisted: mocks.publishPersisted,
        }),
        store: expect.any(Object),
      }),
    );
    expect(mocks.publishPersisted).toHaveBeenCalledWith({
      commandId: "plugin.enable:corr-1",
      attemptNumber: 1,
      eventIds: ["event-1"],
      dispatchIds: ["dispatch-1"],
    });
    expect(result).toEqual({
      success: true,
      data: { lifecycleState: "enabled" },
      commandId: "plugin.enable:corr-1",
      attemptNumber: 1,
      invalidationTags: ["plugin:registry"],
    });
  });

  it("forwards summary-only audit metadata to the command bus", async () => {
    mocks.dispatchPlatformCommand.mockResolvedValueOnce({
      commandId: "plugin.enable:corr-audit",
      attemptNumber: 1,
      status: "succeeded",
      resultSummary: { lifecycleState: "enabled" },
      invalidation: { tags: [] },
    });

    await dispatchPluginGovernanceCommand({
      type: "plugin.enable",
      source: "server-action",
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
        correlationId: "corr-audit",
        causationId: null,
        producer: "plugin-actions",
      },
      audit: {
        delegatedActor: {
          delegatedAgentId: "agent-1",
          delegatedAgentScope: "plugin",
          delegationReason: "Teacher-approved delegated execution",
          authorityPosture: "delegated-no-elevation",
        },
        approval: {
          status: "approved",
          summary: "Teacher approved delegated command",
          reference: {
            kind: "command",
            id: "approval-1",
            summary: "Approval reference",
          },
        },
      },
    });

    expect(mocks.dispatchPlatformCommand).toHaveBeenLastCalledWith(
      expect.objectContaining({
        audit: {
          delegatedActor: {
            delegatedAgentId: "agent-1",
            delegatedAgentScope: "plugin",
            delegationReason: "Teacher-approved delegated execution",
            authorityPosture: "delegated-no-elevation",
          },
          approval: {
            status: "approved",
            summary: "Teacher approved delegated command",
            reference: {
              kind: "command",
              id: "approval-1",
              summary: "Approval reference",
            },
          },
        },
      }),
      expect.any(Object),
    );
  });
});
