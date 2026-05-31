import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/dal/course-import.ts", "utf8");
const schemaSource = readFileSync("src/db/schema.ts", "utf8");

describe("course import DAL", () => {
  it("stages rows into batch and row tables instead of direct upload writes", () => {
    expect(schemaSource).toContain("courseImportBatch");
    expect(schemaSource).toContain("courseImportRow");
    expect(source).toContain("draftCourseImport");
    expect(source).toContain(".insert(courseImportBatch)");
    expect(source).toContain(".insert(courseImportRow)");
  });

  it("detects same-file duplicate keys and same-school matches using title + subject + grade", () => {
    expect(source).toContain('join("::")');
    expect(source).toContain("same_file_conflict");
    expect(source).toContain("matched_existing");
    expect(source).toContain("FOREIGN_OWNED_MATCH");
  });

  it("applies with forced draft creation and status-only matched updates", () => {
    expect(source).toContain('status: "draft"');
    expect(source).toContain("updateMatchedCourseStatusForTeacherScoped");
    expect(source).toContain("result: \"updated\"");
    expect(source).toContain("result: \"failed\"");
  });

  it("splits prepare and execute helpers for async batch import application", () => {
    expect(source).toContain("export async function prepareCourseImportApplyTask");
    expect(source).toContain("export async function executeCourseImportApplyTask");
    expect(source).toContain("enqueueAsyncTask({");
    expect(source).toContain("findActiveCourseImportTask");
    expect(source).not.toContain("export async function applyCourseImport(");
  });

  it("reuses only active tasks while terminal reruns create a new task attempt", () => {
    expect(source).toContain("COURSE_IMPORT_ACTIVE_TASK_STATUSES");
    expect(source).toContain("if (existingActiveTask)");
    expect(source).toContain("reusedExistingTask: true");
    expect(source).toContain("const priorTasks = await db.query.asyncTasks.findMany({");
    expect(source).toContain("resetResults: priorTasks.length > 0");
    expect(source).toContain("reusedExistingTask: false");
  });

  it("re-reads durable row truth and produces partial-success rich summaries", () => {
    expect(source).toContain("const stagedRows = await readStoredBatchRows(batch.id)");
    expect(source).toContain("if (\n      row.result &&");
    expect(source).toContain('const nextStatus = summary.failed > 0 ? "partially_applied" : "applied"');
    expect(source).toContain('outcome: summary.failed > 0 ? "partially_completed" : "completed"');
    expect(source).toContain("applySummary: summary");
    expect(source).toContain("failedRowCount: summary.failed");
  });
});
