import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/schedule/import/server.ts", "utf8");
const actionsSource = readFileSync("src/features/schedule/import/actions.ts", "utf8");

describe("schedule import DAL", () => {
  it("stages rows before approval and keeps row-level review statuses", () => {
    expect(source).toContain("scheduleImportBatch");
    expect(source).toContain("isPrimary");
    expect(source).toContain("scheduleImportRow");
    expect(source).toContain("await tx.insert(scheduleRecurringEntry)");
    expect(source).toContain("validation_failed");
    expect(source).toContain("mapping_review");
    expect(source).toContain("conflict_review");
    expect(source).toContain("ready_to_apply");
    expect(source).toContain("approved");
  });

  it("preserves sourceBatchId and sourceRowId lineage on apply", () => {
    expect(source).toContain("sourceBatchId");
    expect(source).toContain("sourceRowId");
    expect(source).toContain("await tx.insert(scheduleRecurringEntry)");
  });

  it("records import draft and approval mutations through schedule audit helper", () => {
    expect(source).toContain("appendScheduleAudit");
    expect(source).toContain('entityType: "scheduleImportBatch"');
    expect(source).toContain('actionType: "approve_import"');
  });

  it("returns APPPROVE_IMPORT_BLOCKED style structured action failures and invalidates tags", () => {
    expect(actionsSource).toContain('error: "APPROVE_IMPORT_BLOCKED"');
    expect(actionsSource).toContain('error: "SET_PRIMARY_IMPORT_BLOCKED"');
    expect(actionsSource).toContain("invalidateScheduleImportTags(updateTag");
    expect(actionsSource).toContain("assertScheduleTeacherScope");
  });

  it("supports persisting and switching a primary schedule import batch", () => {
    expect(source).toContain("setPrimaryScheduleImportBatch");
    expect(source).toContain("assignPrimaryScheduleBatch");
    expect(source).toContain('actionType: "set_primary_import"');
    expect(actionsSource).toContain("setPrimaryScheduleImportBatchAction");
  });
});
