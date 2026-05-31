import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/db/schema.ts", "utf8");

const draftSection = schema.slice(
  schema.indexOf("export const draftLessonVersions = sqliteTable")
);

describe("Phase 63 draft lesson version schema", () => {
  it("exports the draftLessonVersions table mapped to draftLessonVersion", () => {
    expect(schema).toContain("export const draftLessonVersions = sqliteTable");
    expect(draftSection).toContain('"draftLessonVersion"');
  });

  it("declares all draft snapshot columns", () => {
    expect(draftSection).toContain('text("id")');
    expect(draftSection).toContain('text("lessonId")');
    expect(draftSection).toContain('integer("version").notNull()');
    expect(draftSection).toContain('text("snapshotJson", { mode: "json" }).notNull()');
    expect(draftSection).toContain('text("sourceCommandId").notNull()');
    expect(draftSection).toContain('text("createdById")');
    expect(draftSection).toContain('integer("createdAt"');
  });

  it("constrains source to ai, human, and ai_edited with ai default", () => {
    expect(draftSection).toContain('enum: ["ai", "human", "ai_edited"]');
    expect(draftSection).toContain('.default("ai")');
  });

  it("owns drafts via cascade relations to lessons and users", () => {
    expect(draftSection).toContain("references(() => lessons.id, { onDelete: \"cascade\" })");
    expect(draftSection).toContain("references(() => users.id, { onDelete: \"cascade\" })");
    expect(draftSection.match(/onDelete: "cascade"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("enforces idempotent replay with a unique (lessonId, sourceCommandId) index", () => {
    expect(draftSection).toContain(
      'uniqueIndex("draftLessonVersions_idempotency_unique").on(table.lessonId, table.sourceCommandId)'
    );
  });

  it("indexes version lookups by lesson", () => {
    expect(draftSection).toContain(
      'index("draftLessonVersions_lessonId_version_idx").on(table.lessonId, table.version)'
    );
  });
});
