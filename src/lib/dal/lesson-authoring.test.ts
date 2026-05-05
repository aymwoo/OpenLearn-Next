import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/dal/lesson-authoring.ts", "utf8");

describe("lesson authoring DAL boundary", () => {
  it("is server-only and enforces teacher authorization", () => {
    expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("assertActiveTeacher");
    expect(source).toContain("getUserMembershipsDTO");
    expect(source).toContain("TEACHER_AUTH_REQUIRED");
  });

  it("validates payloads and DTOs", () => {
    expect(source).toContain("lessonStepPayloadSchema.parse");
    expect(source).toContain("LessonEditorDTOSchema.parse");
  });

  it("uses rank reorder and stable published snapshots", () => {
    expect(source).toContain("createRankBetween");
    expect(source).toContain("publishedLessonVersions");
    expect(source).toContain("snapshotJson");
  });
});
