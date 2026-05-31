import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupSqliteArtifacts, materializeDrizzleMigrations } from "../../../scripts/lib/sqlite-migration-proof";
import type { PluginManifest } from "@/lib/dto/resource-ai";

vi.mock("server-only", () => ({}));

const assertActiveTeacher = vi.fn();
const getUserMembershipsDTO = vi.fn();
const registerThemeTokens = vi.fn();
const dispatchPluginAction = vi.fn();

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO,
}));

vi.mock("@/lib/dal/themes", () => ({
  registerThemeTokens,
}));

vi.mock("@/server/plugins/registry", () => ({
  dispatchPluginAction,
  PLUGIN_ACTION_PERMISSION_REQUIREMENTS: {
    addStepSuggestion: "lesson:write:suggestion",
  },
}));

const pluginsSource = readFileSync("src/lib/dal/plugins.ts", "utf8");

function createManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "vendor/plugin-name",
    version: "1.0.0",
    manifestVersion: 1,
    permissions: [],
    anchors: ["dashboard.widget"],
    actions: ["addStepSuggestion"],
    builtIn: false,
    defaultEnabled: false,
    nonDeletable: false,
    ...overrides,
  };
}

type MigrationModule = typeof import("./plugin-migration");
type DbModule = typeof import("@/db");

async function seedBaseFixtures(client: ReturnType<typeof createClient>) {
  const statements = [
    `INSERT INTO user (id, name, email, studentNumber, gender, emailVerified, password, image) VALUES ('teacher-1', 'Teacher One', 'teacher-1@example.com', NULL, NULL, NULL, NULL, NULL), ('teacher-2', 'Teacher Two', 'teacher-2@example.com', NULL, NULL, NULL, NULL, NULL)`,
    `INSERT INTO school (id, name, createdAt) VALUES ('school-1', 'School One', 0), ('school-2', 'School Two', 0)`,
    `INSERT INTO course (id, schoolId, ownerId, title, subject, grade, status, createdAt, updatedAt) VALUES ('course-1', 'school-1', 'teacher-1', 'Course One', 'math', 'grade-1', 'draft', 0, 0), ('course-2', 'school-2', 'teacher-2', 'Course Two', 'science', 'grade-1', 'draft', 0, 0)`,
    `INSERT INTO pluginRegistration (id, schoolId, name, manifestJson, pluginKey, dbNamespace, sourceType, installSource, enabled, killSwitchEnabled, lifecycleState, uninstalledAt, uninstallRetentionMode, createdAt, updatedAt) VALUES ('plugin-1', 'school-1', 'Plugin One', '{"permissions":["plugin:write"]}', 'vendor/plugin-1', 'plugin_vendor_plugin_1_school_1', 'default', 'manual', 1, 0, 'enabled', NULL, NULL, 0, 0), ('plugin-2', 'school-2', 'Plugin Two', '{"permissions":["plugin:write"]}', 'vendor/plugin-1', 'plugin_vendor_plugin_1_school_2', 'default', 'manual', 1, 0, 'enabled', NULL, NULL, 0, 0)`,
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function seedLesson(
  client: ReturnType<typeof createClient>,
  input: {
    lessonId: string;
    publishedVersionId: string;
    courseId: string;
    createdById: string;
    pluginKeyPayload?: unknown;
    extraPayload?: Record<string, unknown>;
  },
) {
  const payloadJson = {
    ...(input.extraPayload ?? {}),
    ...(input.pluginKeyPayload === undefined ? {} : { "vendor/plugin-1": input.pluginKeyPayload }),
  };

  await client.execute(
    `INSERT INTO lesson (id, courseId, createdById, title, objective, status, revision, publishedVersionId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'draft', 1, ?, 0, 0)`,
    [input.lessonId, input.courseId, input.createdById, `${input.lessonId} title`, `${input.lessonId} objective`, input.publishedVersionId],
  );
  await client.execute(
    `INSERT INTO publishedLessonVersion (id, lessonId, version, snapshotJson, publishedById, publishedAt) VALUES (?, ?, 1, ?, ?, 0)`,
    [input.publishedVersionId, input.lessonId, JSON.stringify({ lesson: { payloadJson } }), input.createdById],
  );
}

async function seedLessonStep(
  client: ReturnType<typeof createClient>,
  input: {
    stepId: string;
    lessonId: string;
    pluginKeyPayload?: unknown;
    extraPayload?: Record<string, unknown>;
  },
) {
  const payloadJson = {
    ...(input.extraPayload ?? {}),
    ...(input.pluginKeyPayload === undefined ? {} : { "vendor/plugin-1": input.pluginKeyPayload }),
  };

  await client.execute(
    `INSERT INTO lessonStep (id, lessonId, type, title, rank, payloadJson, archivedAt, createdAt, updatedAt) VALUES (?, ?, 'task', ?, ?, ?, NULL, 0, 0)`,
    [input.stepId, input.lessonId, `${input.stepId} title`, input.stepId, JSON.stringify(payloadJson)],
  );
}

async function seedResource(
  client: ReturnType<typeof createClient>,
  input: {
    resourceId: string;
    schoolId: string;
    ownerId: string;
    courseId: string;
    content: string | null;
  },
) {
  await client.execute(
    `INSERT INTO resource (id, schoolId, ownerId, courseId, title, visibility, classification, ragEligible, url, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'private', 'document', 0, NULL, ?, 0, 0)`,
    [input.resourceId, input.schoolId, input.ownerId, input.courseId, `${input.resourceId} title`, input.content],
  );
}

async function insertLessonExtension(
  client: ReturnType<typeof createClient>,
  lessonId: string,
  payloadJson: unknown,
  pluginId = "plugin-1",
  schoolId = "school-1",
) {
  await client.execute(
    `INSERT INTO plugin_ext_lesson (id, schoolId, pluginId, lessonId, payloadJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, 0)`,
    [randomUUID(), schoolId, pluginId, lessonId, JSON.stringify(payloadJson)],
  );
}

async function insertStepExtension(
  client: ReturnType<typeof createClient>,
  lessonStepId: string,
  payloadJson: unknown,
  pluginId = "plugin-1",
  schoolId = "school-1",
) {
  await client.execute(
    `INSERT INTO plugin_ext_lesson_step (id, schoolId, pluginId, lessonStepId, payloadJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, 0)`,
    [randomUUID(), schoolId, pluginId, lessonStepId, JSON.stringify(payloadJson)],
  );
}

async function insertResourceExtension(
  client: ReturnType<typeof createClient>,
  resourceId: string,
  payloadJson: unknown,
  pluginId = "plugin-1",
  schoolId = "school-1",
) {
  await client.execute(
    `INSERT INTO plugin_ext_resource (id, schoolId, pluginId, resourceId, payloadJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, 0)`,
    [randomUUID(), schoolId, pluginId, resourceId, JSON.stringify(payloadJson)],
  );
}

async function getCount(client: ReturnType<typeof createClient>, tableName: string) {
  const result = await client.execute(`SELECT COUNT(*) AS count FROM ${tableName}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function getSchemaObjects(client: ReturnType<typeof createClient>) {
  const result = await client.execute(
    `SELECT type, name, tbl_name AS tableName, sql FROM sqlite_master WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' ORDER BY type, name`,
  );

  return result.rows.map((row) => ({
    type: String(row.type),
    name: String(row.name),
    tableName: String(row.tableName),
    sql: row.sql == null ? null : String(row.sql),
  }));
}

async function getLessonExtensionRows(client: ReturnType<typeof createClient>) {
  const result = await client.execute(
    `SELECT schoolId, pluginId, lessonId, payloadJson FROM plugin_ext_lesson ORDER BY lessonId ASC`,
  );

  return result.rows.map((row) => ({
    schoolId: String(row.schoolId),
    pluginId: String(row.pluginId),
    lessonId: String(row.lessonId),
    payloadJson: JSON.parse(String(row.payloadJson)),
  }));
}

async function getStepExtensionRows(client: ReturnType<typeof createClient>) {
  const result = await client.execute(
    `SELECT schoolId, pluginId, lessonStepId, payloadJson FROM plugin_ext_lesson_step ORDER BY lessonStepId ASC`,
  );

  return result.rows.map((row) => ({
    schoolId: String(row.schoolId),
    pluginId: String(row.pluginId),
    lessonStepId: String(row.lessonStepId),
    payloadJson: JSON.parse(String(row.payloadJson)),
  }));
}

async function getResourceExtensionRows(client: ReturnType<typeof createClient>) {
  const result = await client.execute(
    `SELECT schoolId, pluginId, resourceId, payloadJson FROM plugin_ext_resource ORDER BY resourceId ASC`,
  );

  return result.rows.map((row) => ({
    schoolId: String(row.schoolId),
    pluginId: String(row.pluginId),
    resourceId: String(row.resourceId),
    payloadJson: JSON.parse(String(row.payloadJson)),
  }));
}

async function getPublishedLessonPayload(client: ReturnType<typeof createClient>, publishedVersionId: string) {
  const result = await client.execute(
    `SELECT snapshotJson FROM publishedLessonVersion WHERE id = ?`,
    [publishedVersionId],
  );
  const snapshotJson = JSON.parse(String(result.rows[0]?.snapshotJson ?? "null"));
  return snapshotJson.lesson.payloadJson as Record<string, unknown>;
}

async function loadSubject() {
  const [{ db }, migrationModule] = await Promise.all([import("@/db"), import("./plugin-migration")]);
  return { db, migrationModule } as { db: DbModule["db"]; migrationModule: MigrationModule };
}

describe("Phase 46 DAL Migration & Backfill Service", () => {
  let databasePath: string;
  let databaseUrl: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    databasePath = join("/tmp/opencode", `plugin-migration-${randomUUID()}.db`);
    databaseUrl = `file:${databasePath}`;
    process.env.DB_FILE_NAME = databaseUrl;

    client = await materializeDrizzleMigrations(databaseUrl);
    await seedBaseFixtures(client);

    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
    getUserMembershipsDTO.mockResolvedValue([{ schoolId: "school-1", status: "active" }]);
    registerThemeTokens.mockResolvedValue({ id: "theme-1" });
    dispatchPluginAction.mockResolvedValue({ proposalType: "unknown", payload: {}, denied: true });
  });

  afterEach(async () => {
    await (client as { close?: () => Promise<void> | void }).close?.();
    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
    cleanupSqliteArtifacts(databasePath);
  });

  describe("A. Authentication & Tenancy Scopes", () => {
    it("should reject anonymous actor ID immediately", async () => {
      const { migrationModule } = await loadSubject();

      await expect(
        migrationModule.backfillPluginJsonToSchema("  ", "school-1", "plugin-1", "lesson"),
      ).rejects.toThrow("PLUGIN_ACTOR_REQUIRED");
    });

    it("should reject non-active or cross-school teachers", async () => {
      const { migrationModule } = await loadSubject();

      assertActiveTeacher.mockResolvedValueOnce({
        userId: "teacher-different",
        schoolIds: ["school-different"],
      });

      await expect(
        migrationModule.backfillPluginJsonToSchema("teacher-different", "school-1", "plugin-1", "lesson"),
      ).rejects.toThrow("TEACHER_AUTH_REQUIRED");
    });

    it("should reject cross-school plugin metadata access", async () => {
      const { migrationModule } = await loadSubject();

      await expect(
        migrationModule.backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-2", "lesson"),
      ).rejects.toThrow("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
    });
  });

  describe("B. Phase 46-01: Backfill Operations", () => {
    it("should write lesson plugin payloads with real tenant filtering semantics", async () => {
      const { migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { reminderRule: "daily", alertTime: "08:00" },
        extraPayload: { coreConfig: true },
      });
      await seedLesson(client, {
        lessonId: "lesson-2",
        publishedVersionId: "pub-2",
        courseId: "course-2",
        createdById: "teacher-2",
        pluginKeyPayload: { reminderRule: "weekly" },
      });

      const result = await migrationModule.backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson");

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      await expect(getLessonExtensionRows(client)).resolves.toEqual([
        {
          schoolId: "school-1",
          pluginId: "plugin-1",
          lessonId: "lesson-1",
          payloadJson: { reminderRule: "daily", alertTime: "08:00" },
        },
      ]);
    });

    it("should keep lesson backfill idempotent and concurrency-safe via atomic upsert", async () => {
      const { migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { reminderRule: "daily" },
      });

      const [first, second] = await Promise.all([
        migrationModule.backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson"),
        migrationModule.backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson"),
      ]);

      expect(first.failed).toBe(0);
      expect(second.failed).toBe(0);
      await expect(getCount(client, "plugin_ext_lesson")).resolves.toBe(1);
      await expect(getLessonExtensionRows(client)).resolves.toEqual([
        {
          schoolId: "school-1",
          pluginId: "plugin-1",
          lessonId: "lesson-1",
          payloadJson: { reminderRule: "daily" },
        },
      ]);
    });

    it("should only backfill lessons owned by the acting teacher inside the same school", async () => {
      const { migrationModule } = await loadSubject();

      await client.execute(
        `INSERT INTO course (id, schoolId, ownerId, title, subject, grade, status, createdAt, updatedAt) VALUES ('course-3', 'school-1', 'teacher-2', 'Course Three', 'math', 'grade-1', 'draft', 0, 0)`,
      );
      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { reminderRule: "daily" },
      });
      await seedLesson(client, {
        lessonId: "lesson-3",
        publishedVersionId: "pub-3",
        courseId: "course-3",
        createdById: "teacher-2",
        pluginKeyPayload: { reminderRule: "manager-only" },
      });

      const result = await migrationModule.backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson");

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      await expect(getLessonExtensionRows(client)).resolves.toEqual([
        {
          schoolId: "school-1",
          pluginId: "plugin-1",
          lessonId: "lesson-1",
          payloadJson: { reminderRule: "daily" },
        },
      ]);
    });

    it("should backfill step payloads through real where filtering", async () => {
      const { migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
      });
      await seedLesson(client, {
        lessonId: "lesson-2",
        publishedVersionId: "pub-2",
        courseId: "course-2",
        createdById: "teacher-2",
      });
      await seedLessonStep(client, {
        stepId: "step-1",
        lessonId: "lesson-1",
        pluginKeyPayload: { stepConfig: "interactive" },
      });
      await seedLessonStep(client, {
        stepId: "step-2",
        lessonId: "lesson-2",
        pluginKeyPayload: { stepConfig: "other-school" },
      });

      const result = await migrationModule.backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "step");

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      await expect(getStepExtensionRows(client)).resolves.toEqual([
        {
          schoolId: "school-1",
          pluginId: "plugin-1",
          lessonStepId: "step-1",
          payloadJson: { stepConfig: "interactive" },
        },
      ]);
    });

    it("should only backfill steps whose parent lesson belongs to the acting teacher", async () => {
      const { migrationModule } = await loadSubject();

      await client.execute(
        `INSERT INTO course (id, schoolId, ownerId, title, subject, grade, status, createdAt, updatedAt) VALUES ('course-3', 'school-1', 'teacher-2', 'Course Three', 'math', 'grade-1', 'draft', 0, 0)`,
      );
      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
      });
      await seedLesson(client, {
        lessonId: "lesson-3",
        publishedVersionId: "pub-3",
        courseId: "course-3",
        createdById: "teacher-2",
      });
      await seedLessonStep(client, {
        stepId: "step-1",
        lessonId: "lesson-1",
        pluginKeyPayload: { stepConfig: "interactive" },
      });
      await seedLessonStep(client, {
        stepId: "step-3",
        lessonId: "lesson-3",
        pluginKeyPayload: { stepConfig: "manager-only" },
      });

      const result = await migrationModule.backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "step");

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      await expect(getStepExtensionRows(client)).resolves.toEqual([
        {
          schoolId: "school-1",
          pluginId: "plugin-1",
          lessonStepId: "step-1",
          payloadJson: { stepConfig: "interactive" },
        },
      ]);
    });

    it("should backfill structured resource content and ignore plain text content", async () => {
      const { migrationModule } = await loadSubject();

      await seedResource(client, {
        resourceId: "resource-1",
        schoolId: "school-1",
        ownerId: "teacher-1",
        courseId: "course-1",
        content: JSON.stringify({ "vendor/plugin-1": { downloadLimit: 5 }, core: true }),
      });
      await seedResource(client, {
        resourceId: "resource-2",
        schoolId: "school-1",
        ownerId: "teacher-1",
        courseId: "course-1",
        content: "plain text resource body",
      });

      const result = await migrationModule.backfillPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "resource");

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      await expect(getResourceExtensionRows(client)).resolves.toEqual([
        {
          schoolId: "school-1",
          pluginId: "plugin-1",
          resourceId: "resource-1",
          payloadJson: { downloadLimit: 5 },
        },
      ]);
    });
  });

  describe("C. Phase 46-01: Deep Verification (verifyBackfillData)", () => {
    it("should return matches: true if legacy and physical config match exactly", async () => {
      const { migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { nested: { a: 1, b: [1, 2] } },
      });
      await insertLessonExtension(client, "lesson-1", { nested: { a: 1, b: [1, 2] } });

      await expect(
        migrationModule.verifyBackfillData("teacher-1", "school-1", "plugin-1", "lesson"),
      ).resolves.toEqual({
        matches: true,
        mismatches: [],
      });
    });

    it("should return matches: false if physical data diverges", async () => {
      const { migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { nested: { a: 1, b: [1, 2] } },
      });
      await insertLessonExtension(client, "lesson-1", { nested: { a: 1, b: [1, 999] } });

      await expect(
        migrationModule.verifyBackfillData("teacher-1", "school-1", "plugin-1", "lesson"),
      ).resolves.toEqual({
        matches: false,
        mismatches: ["lesson-1"],
      });
    });
  });

  describe("D. Phase 46-01: Transactional Cutover (cutoverPluginJsonToSchema)", () => {
    it("should abort immediately and not touch core JSON if verification fails", async () => {
      const { migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { reminderRule: "daily" },
      });
      await insertLessonExtension(client, "lesson-1", { reminderRule: "weekly" });

      await expect(
        migrationModule.cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson"),
      ).rejects.toThrow("CUTOVER_ABORTED");

      await expect(getPublishedLessonPayload(client, "pub-1")).resolves.toEqual({
        "vendor/plugin-1": { reminderRule: "daily" },
      });
    });

    it("should erase designated plugin key in a transaction and preserve other fields", async () => {
      const { migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { reminderRule: "daily" },
        extraPayload: { coreConfig: "keep-me" },
      });
      await insertLessonExtension(client, "lesson-1", { reminderRule: "daily" });

      const result = await migrationModule.cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson");

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      await expect(getPublishedLessonPayload(client, "pub-1")).resolves.toEqual({
        coreConfig: "keep-me",
      });
    });

    it("should roll back the whole transaction if in-transaction verification detects drift", async () => {
      const { db, migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { reminderRule: "daily" },
        extraPayload: { coreConfig: "keep-me" },
      });
      await seedLesson(client, {
        lessonId: "lesson-3",
        publishedVersionId: "pub-3",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { reminderRule: "weekly" },
        extraPayload: { coreConfig: "also-keep" },
      });
      await insertLessonExtension(client, "lesson-1", { reminderRule: "daily" });
      await insertLessonExtension(client, "lesson-3", { reminderRule: "weekly" });

      const originalTransaction = db.transaction.bind(db);
      const transactionSpy = vi.spyOn(db, "transaction").mockImplementation(async (callback) => {
        await client.execute(
          `UPDATE plugin_ext_lesson SET payloadJson = '{"reminderRule":"tampered"}' WHERE lessonId = 'lesson-3'`,
        );
        return originalTransaction(callback);
      });

      await expect(
        migrationModule.cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson"),
      ).rejects.toThrow("CUTOVER_FAILED_TRANSACTION_ROLLBACK: CUTOVER_VERIFY_MISMATCH:lesson-3:vendor/plugin-1");

      await expect(getPublishedLessonPayload(client, "pub-1")).resolves.toEqual({
        coreConfig: "keep-me",
        "vendor/plugin-1": { reminderRule: "daily" },
      });
      await expect(getPublishedLessonPayload(client, "pub-3")).resolves.toEqual({
        coreConfig: "also-keep",
        "vendor/plugin-1": { reminderRule: "weekly" },
      });

      transactionSpy.mockRestore();
    });

    it("should cut over step and resource payloads with real transaction semantics", async () => {
      const { migrationModule } = await loadSubject();

      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
      });
      await seedLessonStep(client, {
        stepId: "step-1",
        lessonId: "lesson-1",
        pluginKeyPayload: { stepConfig: "interactive" },
        extraPayload: { titleColor: "blue" },
      });
      await seedResource(client, {
        resourceId: "resource-1",
        schoolId: "school-1",
        ownerId: "teacher-1",
        courseId: "course-1",
        content: JSON.stringify({ "vendor/plugin-1": { downloadLimit: 5 }, core: true }),
      });
      await insertStepExtension(client, "step-1", { stepConfig: "interactive" });
      await insertResourceExtension(client, "resource-1", { downloadLimit: 5 });

      await expect(
        migrationModule.cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "step"),
      ).resolves.toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      await expect(
        migrationModule.cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "resource"),
      ).resolves.toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });

      const stepRows = await client.execute(`SELECT payloadJson FROM lessonStep WHERE id = 'step-1'`);
      const resourceRows = await client.execute(`SELECT content FROM resource WHERE id = 'resource-1'`);

      expect(JSON.parse(String(stepRows.rows[0]?.payloadJson))).toEqual({
        titleColor: "blue",
      });
      expect(JSON.parse(String(resourceRows.rows[0]?.content))).toEqual({
        core: true,
      });
    });

    it("should not cut over lessons owned by another teacher in the same school", async () => {
      const { migrationModule } = await loadSubject();

      await client.execute(
        `INSERT INTO course (id, schoolId, ownerId, title, subject, grade, status, createdAt, updatedAt) VALUES ('course-3', 'school-1', 'teacher-2', 'Course Three', 'math', 'grade-1', 'draft', 0, 0)`,
      );
      await seedLesson(client, {
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        courseId: "course-1",
        createdById: "teacher-1",
        pluginKeyPayload: { reminderRule: "daily" },
      });
      await seedLesson(client, {
        lessonId: "lesson-3",
        publishedVersionId: "pub-3",
        courseId: "course-3",
        createdById: "teacher-2",
        pluginKeyPayload: { reminderRule: "manager-only" },
      });
      await insertLessonExtension(client, "lesson-1", { reminderRule: "daily" });
      await insertLessonExtension(client, "lesson-3", { reminderRule: "manager-only" });

      const result = await migrationModule.cutoverPluginJsonToSchema("teacher-1", "school-1", "plugin-1", "lesson");

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      await expect(getPublishedLessonPayload(client, "pub-1")).resolves.toEqual({});
      await expect(getPublishedLessonPayload(client, "pub-3")).resolves.toEqual({
        "vendor/plugin-1": { reminderRule: "manager-only" },
      });
    });
  });

  describe("E. Runtime DDL Prevention Audit", () => {
    it("proves install/reconcile writes plugin metadata and lifecycle audit rows without creating governed plugin data rows", async () => {
      const { installOrReconcilePlugin } = await import("./plugins");

      const schemaBefore = await getSchemaObjects(client);
      const baselineCounts = {
        registrations: await getCount(client, "pluginRegistration"),
        lifecycleTransitions: await getCount(client, "pluginLifecycleTransition"),
        lessonExt: await getCount(client, "plugin_ext_lesson"),
        stepExt: await getCount(client, "plugin_ext_lesson_step"),
        resourceExt: await getCount(client, "plugin_ext_resource"),
        ownedBusiness: await getCount(client, "plugin_owned_business_data"),
      };

      const created = await installOrReconcilePlugin({
        actorId: "teacher-1",
        schoolId: "school-1",
        name: "Plugin Three",
        manifestJson: createManifest({ id: "vendor/plugin-three" }),
        installSource: "manual",
      });

      expect(created.pluginKey).toBe("vendor/plugin-three");
      await expect(getSchemaObjects(client)).resolves.toEqual(schemaBefore);
      await expect(getCount(client, "pluginRegistration")).resolves.toBe(baselineCounts.registrations + 1);
      await expect(getCount(client, "pluginLifecycleTransition")).resolves.toBe(baselineCounts.lifecycleTransitions + 1);
      await expect(getCount(client, "plugin_ext_lesson")).resolves.toBe(baselineCounts.lessonExt);
      await expect(getCount(client, "plugin_ext_lesson_step")).resolves.toBe(baselineCounts.stepExt);
      await expect(getCount(client, "plugin_ext_resource")).resolves.toBe(baselineCounts.resourceExt);
      await expect(getCount(client, "plugin_owned_business_data")).resolves.toBe(baselineCounts.ownedBusiness);
    });

    it("keeps plugin lifecycle DAL free of raw DDL execution calls", () => {
      expect(pluginsSource).not.toContain("db.execute(");
      expect(pluginsSource).not.toContain("db.run(");
      expect(pluginsSource).not.toContain("CREATE TABLE");
      expect(pluginsSource).not.toContain("ALTER TABLE");
      expect(pluginsSource).not.toContain("DROP TABLE");
    });
  });
});
