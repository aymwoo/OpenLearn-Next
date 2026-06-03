import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * 写动词 handler 测试（Phase 68, ACCESS-02/ACCESS-03）。
 *
 * 策略（仿 ledger.test.ts）：
 * - **真实** `@/db`：经 `DB_FILE_NAME` 指向临时 libsql 文件库 + `vi.resetModules()`，
 *   让 handler / audit 共享同一物理库，真正跑 transaction / insert / upsert / append-only。
 * - **mock 治理门** `assertActionExecutable`：隔离 session/投影机制，仅注入 `{schoolId, scope,
 *   projectionRow}`（schoolId 取自门，验证“绝不取自 payload”）。
 * - **保留真实**白名单 `validateInsertPayload` / `resolvePluginTable`：使 cross_school /
 *   invalid_payload 等拒因为真实判定（denied audit 路径可信）。
 * - bootstrap 仅建 `plugin_owned_quiz_responses` + `governanceAudit`，**不开 FK**，
 *   避免 schools/pluginRegistrations 外键拦截。
 */

const gate = vi.hoisted(() => ({
  assertActionExecutable: vi.fn(),
}));

vi.mock("../../plugin-data-access/governance-gate", () => ({
  assertActionExecutable: gate.assertActionExecutable,
}));

function gateSuccess() {
  return {
    schoolId: "school-1",
    scope: { userId: "teacher-1", schoolIds: ["school-1"] },
    projectionRow: {
      pluginId: "plugin-1",
      lifecycle: { internalSubstate: "ready", killSwitchEnabled: false },
    },
  };
}

async function bootstrapWriteSchema(databaseUrl: string) {
  const client = createClient({ url: databaseUrl });

  // FK 关闭：仅建写动词触达的两张表，规避 schools/pluginRegistrations 外键。
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
  // 真实 unique(...,attemptNo)：若 attemptNo 未正确自增，第二次写入会冲突 → 暴露回归。
  await client.execute(
    "CREATE UNIQUE INDEX poqr_logicalkey_attempt_unique ON plugin_owned_quiz_responses (classroomSession, student, question, attemptNo)",
  );
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

  await (client as { close?: () => Promise<void> | void }).close?.();
}

type WriteValues = Record<string, unknown>;

function createWriteCommand(
  type: "plugin.data.insert" | "plugin.data.upsert",
  values: WriteValues,
) {
  return {
    id: `command-${randomUUID()}`,
    type,
    actor: { actorId: "teacher-1", actorScope: "teacher" as const },
    scope: { schoolId: "school-1", pluginId: "plugin-1" },
    payload: { pluginKey: "quiz", table: "plugin_owned_quiz_responses", values },
    correlation: { correlationId: "corr-1", causationId: null, producer: "test-suite" },
    audit: { delegatedActor: null, approval: null },
  };
}

const validValues = {
  classroomSession: "session-1",
  student: "student-1",
  question: "q-1",
  selectedOption: "A",
};

describe("plugin data write verb handlers", () => {
  let databasePath: string;
  let databaseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    gate.assertActionExecutable.mockResolvedValue(gateSuccess());

    databasePath = join("/tmp/opencode", `plugin-data-write-${randomUUID()}.db`);
    databaseUrl = `file:${databasePath}`;
    process.env.DB_FILE_NAME = databaseUrl;
    await bootstrapWriteSchema(databaseUrl);
  });

  afterEach(() => {
    for (const suffix of ["", "-shm", "-wal"]) {
      const path = `${databasePath}${suffix}`;
      if (existsSync(path)) {
        rmSync(path, { force: true });
      }
    }
  });

  async function loadHandlers() {
    return import("./plugin-data");
  }

  async function loadDb() {
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    const generated = await import("@/db/schema/generated/plugin-owned/quiz");
    return { db, schema, responses: generated.pluginOwnedQuizResponses };
  }

  it("insert 纯追加：同逻辑键二次写入 attemptNo 自增且两行皆 isLatest（不撤销）", async () => {
    const { pluginDataInsertHandler } = await loadHandlers();
    const { db, responses } = await loadDb();

    const first = await pluginDataInsertHandler.execute({
      command: createWriteCommand("plugin.data.insert", { ...validValues }) as never,
      attemptNumber: 1,
    });
    const second = await pluginDataInsertHandler.execute({
      command: createWriteCommand("plugin.data.insert", { ...validValues }) as never,
      attemptNumber: 1,
    });

    expect((first.resultSummary as { attemptNo: number }).attemptNo).toBe(1);
    expect((second.resultSummary as { attemptNo: number }).attemptNo).toBe(2);

    const rows = await db.select().from(responses);
    expect(rows).toHaveLength(2);
    // insert 不撤销既有 isLatest：两行皆 true。
    expect(rows.every((row) => row.isLatest === true)).toBe(true);
    expect(rows.map((row) => row.attemptNo).sort()).toEqual([1, 2]);
  });

  it("upsert 撤销旧 isLatest 后追加：保留历史行，恰一行 isLatest=true", async () => {
    const { pluginDataUpsertHandler } = await loadHandlers();
    const { db, responses } = await loadDb();

    await pluginDataUpsertHandler.execute({
      command: createWriteCommand("plugin.data.upsert", { ...validValues }) as never,
      attemptNumber: 1,
    });
    const second = await pluginDataUpsertHandler.execute({
      command: createWriteCommand("plugin.data.upsert", { ...validValues, selectedOption: "B" }) as never,
      attemptNumber: 1,
    });

    expect((second.resultSummary as { attemptNo: number }).attemptNo).toBe(2);

    const rows = await db.select().from(responses);
    expect(rows).toHaveLength(2); // 历史保留（append-only）。
    const latest = rows.filter((row) => row.isLatest === true);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.attemptNo).toBe(2);
    expect(latest[0]?.selectedOption).toBe("B");
  });

  it("schoolId 取自鉴权闭包而非 payload：写入行 schoolId/pluginId 来自 gate", async () => {
    const { pluginDataInsertHandler } = await loadHandlers();
    const { db, responses } = await loadDb();

    await pluginDataInsertHandler.execute({
      command: createWriteCommand("plugin.data.insert", { ...validValues }) as never,
      attemptNumber: 1,
    });

    const rows = await db.select().from(responses);
    expect(rows[0]?.schoolId).toBe("school-1");
    expect(rows[0]?.pluginId).toBe("plugin-1");
  });

  it("成功写入与 allowed 审计同事务提交（D-04）", async () => {
    const { pluginDataInsertHandler } = await loadHandlers();
    const { db, schema } = await loadDb();

    await pluginDataInsertHandler.execute({
      command: createWriteCommand("plugin.data.insert", { ...validValues }) as never,
      attemptNumber: 1,
    });

    const audits = await db.select().from(schema.governanceAudits);
    expect(audits).toHaveLength(1);
    expect(audits[0]?.decision).toBe("allowed");
    expect(audits[0]?.action).toBe("plugin.data.insert");
    expect(audits[0]?.pluginId).toBe("plugin-1");
    expect(audits[0]?.schoolId).toBe("school-1");
  });

  it("白名单拒因（payload 携带 schoolId → cross_school）：抛错 + 写一条 denied 审计（D-04）", async () => {
    const { pluginDataInsertHandler } = await loadHandlers();
    const { PluginDataAccessError } = await import("../../plugin-data-access/allowlist");
    const { db, schema, responses } = await loadDb();

    await expect(
      pluginDataInsertHandler.execute({
        command: createWriteCommand("plugin.data.insert", {
          ...validValues,
          schoolId: "school-evil",
        }) as never,
        attemptNumber: 1,
      }),
    ).rejects.toBeInstanceOf(PluginDataAccessError);

    // 无业务行写入。
    const rows = await db.select().from(responses);
    expect(rows).toHaveLength(0);

    // 恰一条 denied 审计，reasonCode 为真实白名单拒因。
    const audits = await db.select().from(schema.governanceAudits);
    expect(audits).toHaveLength(1);
    expect(audits[0]?.decision).toBe("denied");
    expect(audits[0]?.reasonCode).toBe("cross_school_rejected");
    expect(audits[0]?.action).toBe("plugin.data.insert");
  });
});
