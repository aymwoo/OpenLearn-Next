import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const schemaSource = readFileSync("src/features/platform-core/events/ledger.ts", "utf8");

describe("platform event ledger guards", () => {
  it("does not import runtimeEventOutbox or runtime transport truth", () => {
    expect(schemaSource).not.toContain("runtimeEventOutbox");
    expect(schemaSource).not.toContain("runtime-platform/seams/event-bus");
  });
});

async function bootstrapPlatformEventSchema(databaseUrl: string) {
  const client = createClient({ url: databaseUrl });

  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE school (
      id TEXT PRIMARY KEY NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE platformCommand (
      id TEXT PRIMARY KEY NOT NULL,
      actorId TEXT NOT NULL,
      schoolId TEXT NOT NULL,
      commandType TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      dedupeKey TEXT NOT NULL,
      actorScope TEXT NOT NULL,
      scopeJson TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      correlationJson TEXT NOT NULL,
      auditSummaryJson TEXT,
      resultSummaryJson TEXT,
      failureDetailJson TEXT,
      invalidationTagsJson TEXT,
      failureAttributionJson TEXT,
      latestAttemptNumber INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER,
      updatedAt INTEGER,
      completedAt INTEGER,
      FOREIGN KEY (actorId) REFERENCES user(id) ON DELETE cascade,
      FOREIGN KEY (schoolId) REFERENCES school(id) ON DELETE cascade
    )
  `);
  await client.execute("CREATE UNIQUE INDEX platformCommands_dedupeKey_unique ON platformCommand (dedupeKey)");
  await client.execute(`
    CREATE TABLE platformCommandAttempt (
      id TEXT PRIMARY KEY NOT NULL,
      commandId TEXT NOT NULL,
      attemptNumber INTEGER NOT NULL,
      status TEXT NOT NULL,
      resultSummaryJson TEXT,
      failureDetailJson TEXT,
      startedAt INTEGER,
      completedAt INTEGER,
      createdAt INTEGER,
      FOREIGN KEY (commandId) REFERENCES platformCommand(id) ON DELETE cascade
    )
  `);
  await client.execute("CREATE UNIQUE INDEX platformCommandAttempts_command_attempt_unique ON platformCommandAttempt (commandId, attemptNumber)");
  await client.execute(`
    CREATE TABLE platformEvent (
      id TEXT PRIMARY KEY NOT NULL,
      commandId TEXT NOT NULL,
      attemptNumber INTEGER NOT NULL,
      eventOrdinal INTEGER NOT NULL,
      correlationId TEXT NOT NULL,
      causationId TEXT,
      eventType TEXT NOT NULL,
      category TEXT NOT NULL,
      aggregateType TEXT NOT NULL,
      aggregateId TEXT NOT NULL,
      payloadSummaryJson TEXT NOT NULL,
      auditSummaryJson TEXT,
      createdAt INTEGER,
      FOREIGN KEY (commandId) REFERENCES platformCommand(id) ON DELETE cascade
    )
  `);
  await client.execute("CREATE UNIQUE INDEX platformEvents_command_attempt_ordinal_unique ON platformEvent (commandId, attemptNumber, eventOrdinal)");
  await client.execute(`
    CREATE TABLE platformEventDispatch (
      id TEXT PRIMARY KEY NOT NULL,
      eventId TEXT NOT NULL,
      commandId TEXT NOT NULL,
      attemptNumber INTEGER NOT NULL,
      correlationId TEXT NOT NULL,
      causationId TEXT,
      dispatchChannel TEXT NOT NULL,
      dispatchStatus TEXT NOT NULL DEFAULT 'pending',
      adapterId TEXT,
      failureReason TEXT,
      createdAt INTEGER,
      deliveredAt INTEGER,
      failedAt INTEGER,
      FOREIGN KEY (eventId) REFERENCES platformEvent(id) ON DELETE cascade,
      FOREIGN KEY (commandId) REFERENCES platformCommand(id) ON DELETE cascade
    )
  `);
  await client.execute("CREATE UNIQUE INDEX platformEventDispatches_event_channel_unique ON platformEventDispatch (eventId, dispatchChannel)");

  await client.execute("INSERT INTO user (id) VALUES ('teacher-1')");
  await client.execute("INSERT INTO school (id) VALUES ('school-1')");
  await client.execute(`
    INSERT INTO platformCommand (
      id, actorId, schoolId, commandType, status, dedupeKey, actorScope, scopeJson, payloadJson, correlationJson, latestAttemptNumber, createdAt, updatedAt
    ) VALUES (
      'command-1', 'teacher-1', 'school-1', 'plugin.enable', 'running', 'dedupe-1', 'teacher', '{"schoolId":"school-1","pluginId":"plugin-1"}', '{"schoolId":"school-1","pluginId":"plugin-1","enabledBy":"teacher-1"}', '{"correlationId":"corr-1","causationId":null,"producer":"test"}', 1, 0, 0
    )
  `);
  await client.execute(`
    INSERT INTO platformCommandAttempt (
      id, commandId, attemptNumber, status, createdAt
    ) VALUES (
      'attempt-1', 'command-1', 1, 'running', 0
    )
  `);

  await (client as { close?: () => Promise<void> | void }).close?.();
}

describe("platform event ledger persistence", () => {
  let databasePath: string;
  let databaseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    databasePath = join("/tmp/opencode", `platform-events-${randomUUID()}.db`);
    databaseUrl = `file:${databasePath}`;
    process.env.DB_FILE_NAME = databaseUrl;
    await bootstrapPlatformEventSchema(databaseUrl);
  });

  afterEach(() => {
    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
  });

  it("appends success events linked to one command attempt and creates dispatch rows", async () => {
    const { appendPlatformEvents, loadPlatformDispatchesByCommand, loadPlatformEventsByCommand } = await import("./ledger");
    const { db } = await import("@/db");
    const { platformCommands } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const result = await appendPlatformEvents({
      commandId: "command-1",
      attemptNumber: 1,
      correlationId: "corr-1",
      invalidationTags: ["plugin:registry", "plugin:plugin-1"],
      events: [
        {
          eventType: "platform.command.succeeded",
          category: "outcome",
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payload: {
            commandType: "plugin.enable",
            invalidationTags: ["plugin:registry", "plugin:plugin-1"],
            resultSummary: { pluginId: "plugin-1", lifecycleState: "enabled" },
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
        },
        {
          eventType: "plugin.lifecycle.changed",
          category: "domain",
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payload: {
            pluginId: "plugin-1",
            fromState: "installed",
            toState: "enabled",
            reasonCode: "enabled",
            transitionCounter: 1,
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
        },
      ],
    });

    expect(result.events).toHaveLength(2);
    expect(result.dispatches).toHaveLength(2);

    const events = await loadPlatformEventsByCommand("command-1");
    const dispatches = await loadPlatformDispatchesByCommand("command-1");

    expect(events.map((event) => event.attemptNumber)).toEqual([1, 1]);
    expect(dispatches.map((dispatch) => dispatch.dispatchStatus)).toEqual(["pending", "pending"]);
    expect(events[0]?.auditSummaryJson).toEqual({
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
    });

    await db.update(platformCommands).set({
      auditSummaryJson: {
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
    }).where(eq(platformCommands.id, "command-1"));

    const command = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.id, "command-1"),
    });
    expect(command?.auditSummaryJson).toEqual({
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
    });
  });

  it("persists failure summary on command row while storing only one generic failure event", async () => {
    const { appendPlatformEvents, loadPlatformEventsByCommand } = await import("./ledger");
    const { db } = await import("@/db");
    const { platformCommands } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    await appendPlatformEvents({
      commandId: "command-1",
      attemptNumber: 1,
      correlationId: "corr-1",
      invalidationTags: [],
      failureAttribution: {
        scope: "plugin",
        pluginId: "plugin-1",
        reasonCode: "activation_failed",
        recommendedRecoveryAction: "retry",
      },
      events: [
        {
          eventType: "platform.command.failed",
          category: "outcome",
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payload: {
            commandType: "plugin.enable",
            reasonCode: "activation_failed",
            failureAttribution: {
              scope: "plugin",
              pluginId: "plugin-1",
              reasonCode: "activation_failed",
              recommendedRecoveryAction: "retry",
            },
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
        },
      ],
    });

    const events = await loadPlatformEventsByCommand("command-1");
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("platform.command.failed");
    expect(events[0]?.auditSummaryJson).toEqual({
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
    });

    const command = await db.query.platformCommands.findFirst({
      where: eq(platformCommands.id, "command-1"),
    });
    expect(command?.failureAttributionJson).toEqual({
      scope: "plugin",
      pluginId: "plugin-1",
      reasonCode: "activation_failed",
      recommendedRecoveryAction: "retry",
    });
    expect(command?.invalidationTagsJson).toEqual([]);
  });

  it("marks dispatch delivery result without touching runtime outbox truth", async () => {
    const { appendPlatformEvents, loadPlatformDispatchesByCommand, markPlatformEventDispatch } = await import("./ledger");

    const { dispatches } = await appendPlatformEvents({
      commandId: "command-1",
      attemptNumber: 1,
      correlationId: "corr-1",
      invalidationTags: [],
      events: [
        {
          eventType: "platform.command.succeeded",
          category: "outcome",
          aggregateType: "plugin",
          aggregateId: "plugin-1",
          payload: {
            commandType: "plugin.enable",
            invalidationTags: [],
            resultSummary: { pluginId: "plugin-1", lifecycleState: "enabled" },
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
        },
      ],
    });

    await markPlatformEventDispatch({
      dispatchId: dispatches[0]!.id,
      status: "failed",
      failureReason: "SUBSCRIBER_DOWN",
      adapterId: "in-process-default",
    });

    const updated = await loadPlatformDispatchesByCommand("command-1");
    expect(updated[0]?.dispatchStatus).toBe("failed");
    expect(updated[0]?.failureReason).toBe("SUBSCRIBER_DOWN");
    expect(updated[0]?.adapterId).toBe("in-process-default");
  });
});
