import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("TeacherEditorPage source contract", () => {
  const source = readFileSync("src/app/(teacher)/teacher/editor/page.tsx", "utf8");

  it("removes the global overview.lessons[0] fallback per D-12", () => {
    expect(source).not.toContain("overview.lessons[0]");
  });

  it("branches on explicit searchParams and courseId per D-12", () => {
    expect(source).toContain("searchParams");
    expect(source).toContain("courseId");
  });
});
