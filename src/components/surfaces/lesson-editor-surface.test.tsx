import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/components/surfaces/lesson-editor-surface.tsx",
  "utf8",
);

describe("LessonEditorSurface quick layout trim", () => {
  it("removes the left-side course summary card while keeping the rest of the editor surface", () => {
    expect(source).not.toContain("课程 / 班级");
    expect(source).toContain("课时列表");
    expect(source).toContain("步骤编排");
    expect(source).toContain("当前编排焦点");
    expect(source).toContain("设置面板");
    expect(source).toContain("预览课堂");
  });
});
