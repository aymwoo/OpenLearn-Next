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
});
