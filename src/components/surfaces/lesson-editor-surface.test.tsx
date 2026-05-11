import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/components/surfaces/lesson-editor-surface.tsx",
  "utf8",
);

describe("LessonEditorSurface quick layout trim", () => {
  it("removes the left-side course summary card while keeping the rest of the editor surface", () => {
    expect(source).not.toContain("课程 / 班级");
    expect(source).toContain("LessonAuthoringWorkspace");
    expect(source).toContain("LessonEditorHeaderActions");
    expect(source).toContain("课堂教学活动编排");
    expect(source).toContain("建议使用桌面端编辑");
    expect(source).toContain("const previewHref = lesson ?");
    expect(source).toContain("themes={themes}");
  });
});
