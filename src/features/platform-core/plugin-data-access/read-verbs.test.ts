import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * 读动词测试（Phase 68, ACCESS-01/ACCESS-03）。
 *
 * 策略（仿 commands/handlers/plugin-data.test.ts）：
 * - **真实** `@/db`：经 `DB_FILE_NAME` 指向临时 libsql 文件库 + `vi.resetModules()`，
 *   让 read-verbs / audit 共享同一物理库，真正跑受治理 select / count / groupBy。
 * - **保留真实**白名单 `resolvePluginTable` / `assertIndexAllowed` / `assertGroupByAllowed`：
 *   使 unindexed/unknown/cross_school 等拒因为真实判定，denied audit 路径可信。
 * - read-verbs **不**调治理门（门由 facade 调用），故此处不 mock gate；schoolId 为派生入参。
 * - bootstrap 仅建 `plugin_owned_quiz_responses` + `governanceAudit`，**不开 FK**，
 *   跨校种子行用于验证本校隔离。
 */

type AuditContext = {
  pluginId: string | null;
  actorId: string;
  actorScope: "plugin";
  lifecycleState: "ready";
  killSwitchEnabled: boolean;
  correlationId: string;
};

const audit: AuditContext = {
  pluginId: "plugin-1",
  actorId: "teacher-1",
  actorScope: "plugin",
  lifecycleState: "ready",
  killSwitchEnabled: false,
  correlationId: "corr-read-1",
};

const TABLE = "plugin_owned_quiz_responses";

async function bootstrapReadSchema(databaseUrl: string) {
  const client = createClient({ url: databaseUrl });

  await client.execute(`
    CREATE TABLE plugin_owned_quiz_responses (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      pluginId TEXT NOT NULL,
      classroomSession TEXT NOT NULL,
      student TEXT NOT NULL,
      question TEXT NOT NULL,
      selectedOption TEXT NOT NULL,
      attemptNo INTEGER NOT NULL,
      isLatest INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER,
      updatedAt INTEGER
    )
  `);
  await client.execute(`
    CREATE TABLE governanceAudit (
      id TEXT PRIMARY KEY NOT NULL,
      targetType TEXT NOT NULL,
      targetId TEXT NOT NULL,
      commandId TEXT,
      runtimeSessionId TEXT,
      classroomSessionId TEXT,
      pluginId TEXT,
      schoolId TEXT,
      action TEXT NOT NULL,
      decision TEXT NOT NULL,
      reasonCode TEXT,
      actorId TEXT,
      actorScope TEXT,
      lifecycleState TEXT,
      killSwitchEnabled INTEGER NOT NULL DEFAULT 0,
      requestedCapabilitiesJson TEXT NOT NULL,
      grantedCapabilitiesJson TEXT NOT NULL,
      requiredPermission TEXT,
      correlationId TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      createdAt INTEGER
    )
  `);

  // 跨校种子：school-1 三行（session-1 两行 A/B + session-2 一行），school-2 一行。
  const seeds: Array<[string, string, string, string, string]> = [
    ["school-1", "session-1", "s1", "q1", "A"],
    ["school-1", "session-1", "s2", "q1", "B"],
    ["school-1", "session-2", "s1", "q1", "A"],
    ["school-2", "session-1", "s3", "q1", "A"],
  ];
  for (const [schoolId, classroomSession, student, question, selectedOption] of seeds) {
    await client.execute({
      sql: `INSERT INTO plugin_owned_quiz_responses
        (id, schoolId, pluginId, classroomSession, student, question, selectedOption, attemptNo, isLatest)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      args: [randomUUID(), schoolId, "plugin-1", classroomSession, student, question, selectedOption],
    });
  }

  await (client as { close?: () => Promise<void> | void }).close?.();
}

describe("plugin data read verbs", () => {
  let databasePath: string;
  let databaseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    databasePath = join("/tmp/opencode", `plugin-data-read-${randomUUID()}.db`);
    databaseUrl = `file:${databasePath}`;
    process.env.DB_FILE_NAME = databaseUrl;
    await bootstrapReadSchema(databaseUrl);
  });

  afterEach(() => {
    for (const suffix of ["", "-shm", "-wal"]) {
      const path = `${databasePath}${suffix}`;
      if (existsSync(path)) {
        rmSync(path, { force: true });
      }
    }
  });

  async function loadReadVerbs() {
    return import("./read-verbs");
  }

  async function loadAudits() {
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    return { db, audits: schema.governanceAudits };
  }

  it("getByIndex 命中声明索引前缀 → 仅返回本校行（跨校不可见）", async () => {
    const { getByIndex } = await loadReadVerbs();

    const rows = await getByIndex({
      schoolId: "school-1",
      pluginKey: "quiz",
      table: TABLE,
      index: ["schoolId", "classroomSession"],
      eq: { classroomSession: "session-1" },
      audit,
    });

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => (row as { schoolId: string }).schoolId === "school-1")).toBe(true);
    // 读成功不写审计。
    const { db, audits } = await loadAudits();
    expect(await db.select().from(audits)).toHaveLength(0);
  });

  it("getByIndex 非索引列 → unindexed_column_rejected + denied 审计", async () => {
    const { getByIndex } = await loadReadVerbs();
    const { PluginDataAccessError } = await import("./allowlist");

    await expect(
      getByIndex({
        schoolId: "school-1",
        pluginKey: "quiz",
        table: TABLE,
        index: ["schoolId", "selectedOption"],
        eq: { selectedOption: "A" },
        audit,
      }),
    ).rejects.toBeInstanceOf(PluginDataAccessError);

    const { db, audits } = await loadAudits();
    const rows = await db.select().from(audits);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.decision).toBe("denied");
    expect(rows[0]?.reasonCode).toBe("unindexed_column_rejected");
    expect(rows[0]?.action).toBe("plugin.data.getByIndex");
  });

  it("getByIndex 未知列 → unknown_column_rejected + denied 审计", async () => {
    const { getByIndex } = await loadReadVerbs();
    const { PluginDataAccessError } = await import("./allowlist");

    await expect(
      getByIndex({
        schoolId: "school-1",
        pluginKey: "quiz",
        table: TABLE,
        index: ["schoolId", "bogusColumn"],
        eq: { bogusColumn: "x" },
        audit,
      }),
    ).rejects.toBeInstanceOf(PluginDataAccessError);

    const { db, audits } = await loadAudits();
    const rows = await db.select().from(audits);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reasonCode).toBe("unknown_column_rejected");
  });

  it("getByIndex eq 携带 schoolId → cross_school_rejected + denied 审计", async () => {
    const { getByIndex } = await loadReadVerbs();
    const { PluginDataAccessError } = await import("./allowlist");

    await expect(
      getByIndex({
        schoolId: "school-1",
        pluginKey: "quiz",
        table: TABLE,
        index: ["schoolId", "classroomSession"],
        eq: { schoolId: "school-2", classroomSession: "session-1" },
        audit,
      }),
    ).rejects.toBeInstanceOf(PluginDataAccessError);

    const { db, audits } = await loadAudits();
    const rows = await db.select().from(audits);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reasonCode).toBe("cross_school_rejected");
  });

  it("count 受 eq(schoolId) 约束，仅计本校", async () => {
    const { count } = await loadReadVerbs();

    const all = await count({ schoolId: "school-1", pluginKey: "quiz", table: TABLE, audit });
    expect(all).toBe(3);

    const scoped = await count({
      schoolId: "school-1",
      pluginKey: "quiz",
      table: TABLE,
      index: ["schoolId", "classroomSession"],
      eq: { classroomSession: "session-1" },
      audit,
    });
    expect(scoped).toBe(2);

    // 读成功不写审计。
    const { db, audits } = await loadAudits();
    expect(await db.select().from(audits)).toHaveLength(0);
  });

  it("aggregate count+groupBy(白名单列) → 仅 {key,count}（本校）", async () => {
    const { aggregate } = await loadReadVerbs();

    const result = await aggregate({
      schoolId: "school-1",
      pluginKey: "quiz",
      table: TABLE,
      groupBy: "selectedOption",
      audit,
    });

    // school-1：A=2、B=1（school-2 的 A 不计）。
    const byKey = Object.fromEntries(result.map((row) => [row.key, row.count]));
    expect(byKey).toEqual({ A: 2, B: 1 });

    // 投影恰为 {key,count}，不泄露任意列。
    for (const row of result) {
      expect(Object.keys(row).sort()).toEqual(["count", "key"]);
    }

    const { db, audits } = await loadAudits();
    expect(await db.select().from(audits)).toHaveLength(0);
  });

  it("aggregate groupBy 非白名单/reserved 列 → unknown_column_rejected + denied 审计", async () => {
    const { aggregate } = await loadReadVerbs();
    const { PluginDataAccessError } = await import("./allowlist");

    await expect(
      aggregate({ schoolId: "school-1", pluginKey: "quiz", table: TABLE, groupBy: "schoolId", audit }),
    ).rejects.toBeInstanceOf(PluginDataAccessError);

    const { db, audits } = await loadAudits();
    const rows = await db.select().from(audits);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reasonCode).toBe("unknown_column_rejected");
    expect(rows[0]?.action).toBe("plugin.data.aggregate");
  });
});
