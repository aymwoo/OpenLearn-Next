import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

async function bootstrapPlatformObservabilitySchema(databaseUrl: string) {
  const client = createClient({ url: databaseUrl });

  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute("CREATE TABLE user (id TEXT PRIMARY KEY NOT NULL)");
  await client.execute("CREATE TABLE school (id TEXT PRIMARY KEY NOT NULL)");
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

  await client.execute("INSERT INTO user (id) VALUES ('teacher-1')");
  await client.execute("INSERT INTO school (id) VALUES ('school-1')");
  await client.execute("INSERT INTO school (id) VALUES ('school-2')");

  await client.execute(`
    INSERT INTO platformCommand (
      id, actorId, schoolId, commandType, status, dedupeKey, actorScope, scopeJson, payloadJson, correlationJson,
      resultSummaryJson, invalidationTagsJson, failureAttributionJson, latestAttemptNumber, createdAt, updatedAt, completedAt
    ) VALUES
    (
      'command-1', 'teacher-1', 'school-1', 'plugin.enable', 'succeeded', 'dedupe-1', 'teacher',
      '{"schoolId":"school-1","pluginId":"plugin-1"}',
      '{"schoolId":"school-1","pluginId":"plugin-1","enabledBy":"teacher-1"}',
      '{"correlationId":"corr-1","causationId":null,"producer":"plugin-actions"}',
      '{"pluginId":"plugin-1","lifecycleState":"enabled"}',
      '["plugin:registry","plugin:plugin-1"]',
      NULL,
      2, 100, 300, 320
    ),
    (
      'command-2', 'teacher-1', 'school-1', 'plugin.resume', 'failed', 'dedupe-2', 'teacher',
      '{"schoolId":"school-1","pluginId":"plugin-2"}',
      '{"schoolId":"school-1","pluginId":"plugin-2","reason":"resume"}',
      '{"correlationId":"corr-2","causationId":null,"producer":"plugin-actions"}',
      NULL,
      '[]',
      '{"scope":"plugin","pluginId":"plugin-2","reasonCode":"activation_failed","recommendedRecoveryAction":"retry"}',
      1, 110, 250, 255
    ),
    (
      'command-3', 'teacher-1', 'school-1', 'plugin.reconcile', 'running', 'dedupe-3', 'teacher',
      '{"schoolId":"school-1","pluginId":"plugin-3"}',
      '{"schoolId":"school-1","pluginId":"plugin-3","reason":"manual"}',
      '{"correlationId":"corr-3","causationId":null,"producer":"plugin-actions"}',
      NULL,
      '[]',
      NULL,
      1, 120, 240, NULL
    ),
    (
      'command-foreign', 'teacher-1', 'school-2', 'plugin.enable', 'succeeded', 'dedupe-4', 'teacher',
      '{"schoolId":"school-2","pluginId":"plugin-9"}',
      '{"schoolId":"school-2","pluginId":"plugin-9","enabledBy":"teacher-1"}',
      '{"correlationId":"corr-9","causationId":null,"producer":"plugin-actions"}',
      '{"pluginId":"plugin-9","lifecycleState":"enabled"}',
      '["plugin:registry"]',
      NULL,
      1, 130, 260, 261
    )
  `);

  await client.execute(`
    INSERT INTO platformEvent (
      id, commandId, attemptNumber, eventOrdinal, correlationId, causationId, eventType, category, aggregateType, aggregateId, payloadSummaryJson, createdAt
    ) VALUES
    (
      'event-1', 'command-1', 1, 1, 'corr-1', NULL, 'platform.command.failed', 'outcome', 'plugin', 'plugin-1',
      '{"commandType":"plugin.enable","reasonCode":"activation_failed","failureAttribution":{"scope":"plugin","pluginId":"plugin-1","reasonCode":"activation_failed","recommendedRecoveryAction":"retry"}}',
      150
    ),
    (
      'event-2', 'command-1', 2, 1, 'corr-1', NULL, 'platform.command.succeeded', 'outcome', 'plugin', 'plugin-1',
      '{"commandType":"plugin.enable","invalidationTags":["plugin:registry","plugin:plugin-1"],"resultSummary":{"pluginId":"plugin-1","lifecycleState":"enabled"}}',
      200
    ),
    (
      'event-3', 'command-1', 2, 2, 'corr-1', NULL, 'plugin.lifecycle.changed', 'domain', 'plugin', 'plugin-1',
      '{"pluginId":"plugin-1","fromState":"installed","toState":"enabled","reasonCode":"enabled","transitionCounter":2}',
      201
    ),
    (
      'event-4', 'command-2', 1, 1, 'corr-2', NULL, 'platform.command.failed', 'outcome', 'plugin', 'plugin-2',
      '{"commandType":"plugin.resume","reasonCode":"activation_failed","failureAttribution":{"scope":"plugin","pluginId":"plugin-2","reasonCode":"activation_failed","recommendedRecoveryAction":"retry"}}',
      210
    )
  `);

  await client.execute(`
    INSERT INTO platformEventDispatch (
      id, eventId, commandId, attemptNumber, correlationId, causationId, dispatchChannel, dispatchStatus, adapterId, failureReason, createdAt, deliveredAt, failedAt
    ) VALUES
    ('dispatch-1', 'event-1', 'command-1', 1, 'corr-1', NULL, 'in-process', 'failed', 'platform-persisted-event-bus', 'SUBSCRIBER_DOWN', 151, NULL, 152),
    ('dispatch-2', 'event-2', 'command-1', 2, 'corr-1', NULL, 'in-process', 'delivered', 'platform-persisted-event-bus', NULL, 202, 203, NULL),
    ('dispatch-3', 'event-3', 'command-1', 2, 'corr-1', NULL, 'in-process', 'delivered', 'platform-persisted-event-bus', NULL, 204, 205, NULL),
    ('dispatch-4', 'event-4', 'command-2', 1, 'corr-2', NULL, 'in-process', 'delivered', 'platform-persisted-event-bus', NULL, 211, 212, NULL)
  `);

  await (client as { close?: () => Promise<void> | void }).close?.();
}

describe("platform command operator read model", () => {
  let databasePath: string;
  let databaseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    databasePath = join("/tmp/opencode", `platform-observability-${randomUUID()}.db`);
    databaseUrl = `file:${databasePath}`;
    process.env.DB_FILE_NAME = databaseUrl;
    await bootstrapPlatformObservabilitySchema(databaseUrl);
  });

  afterEach(() => {
    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
  });

  it("lists command summaries with status, result summary, invalidation intent, and school filtering", async () => {
    const { listOperatorVisiblePlatformCommands } = await import("./operator-read-model");

    const rows = await listOperatorVisiblePlatformCommands({
      schoolIds: ["school-1"],
      limit: 10,
    });

    expect(rows.map((row) => row.commandId)).toEqual([
      "command-1",
      "command-2",
      "command-3",
    ]);
    expect(rows[0]).toMatchObject({
      commandId: "command-1",
      status: "succeeded",
      statusLabel: "已成功",
      resultSummaryLabel: "lifecycleState=enabled / pluginId=plugin-1",
      invalidationIntent: {
        tags: ["plugin:registry", "plugin:plugin-1"],
        label: "plugin:registry / plugin:plugin-1",
      },
    });
  });

  it("returns failure attribution on the summary even when the timeline contains one generic failure event", async () => {
    const { getPlatformCommandWithTimeline } = await import("./operator-read-model");

    const detail = await getPlatformCommandWithTimeline({
      commandId: "command-2",
      schoolIds: ["school-1"],
    });

    expect(detail.command).toMatchObject({
      commandId: "command-2",
      status: "failed",
      failureAttribution: {
        scope: "plugin",
        pluginId: "plugin-2",
        reasonCode: "activation_failed",
        recommendedRecoveryAction: "retry",
      },
      failureSummaryLabel: "plugin:activation_failed -> retry",
    });
    expect(detail.timeline).toHaveLength(1);
    expect(detail.timeline[0]).toMatchObject({
      eventType: "platform.command.failed",
      payloadSummaryLabel:
        "commandType=plugin.resume / failureAttribution=pluginId=plugin-2 / reasonCode=activation_failed / recommendedRecoveryAction=retry / reasonCode=activation_failed",
    });
  });

  it("orders the timeline by attempt and event ordinal while keeping invalidation on the command summary", async () => {
    const { getPlatformCommandWithTimeline } = await import("./operator-read-model");

    const detail = await getPlatformCommandWithTimeline({
      commandId: "command-1",
      schoolIds: ["school-1"],
    });

    expect(detail.command?.invalidationIntent.tags).toEqual([
      "plugin:registry",
      "plugin:plugin-1",
    ]);
    expect(detail.timeline.map((event) => event.eventType)).toEqual([
      "platform.command.failed",
      "platform.command.succeeded",
      "plugin.lifecycle.changed",
    ]);
    expect(detail.timeline.every((event) => !event.eventType.includes("invalidation"))).toBe(true);
  });

  it("supports empty timelines for commands that have not emitted persisted events yet", async () => {
    const { getPlatformCommandWithTimeline } = await import("./operator-read-model");

    const detail = await getPlatformCommandWithTimeline({
      commandId: "command-3",
      schoolIds: ["school-1"],
    });

    expect(detail.command?.commandId).toBe("command-3");
    expect(detail.timeline).toEqual([]);
  });
});
