import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/dal/learning.ts", "utf8");

describe("learning DAL student read boundary", () => {
  it("is server-only and requires an active student", () => {
    expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("assertActiveStudent");
    expect(source).toContain("getCurrentUserDTO");
    expect(source).toContain("getUserMembershipsDTO");
    expect(source).toContain('membership.role === "student"');
    expect(source).toContain('membership.status === "active"');
  });

  it("reads only published snapshots without draft leakage", () => {
    expect(source).toContain("publishedLessonVersions");
    expect(source).toContain("snapshotJson");
    expect(source).toContain("lessonStepPayloadSchema.parse");
    expect(source).toContain("StudentPlayerDTOSchema.parse");
    expect(source).toContain("课时暂不可学习");
  });

  it("computes first incomplete resume and teacher-forced placeholder", () => {
    expect(source).toContain("first incomplete");
    expect(source).toContain("teacher-forced");
    expect(source).toContain("forcedStepId");
    expect(source).toContain("getStudentDashboardDTO");
    expect(source).toContain("getStudentPlayerDTO");
  });
});
