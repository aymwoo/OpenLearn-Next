import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/shell/teacher-sidebar-shell.tsx", "utf8");

describe("TeacherSidebarShell theme layout hooks", () => {
  it("keeps current layout as fallback while consuming layout theme variables", () => {
    expect(source).toContain('var(--layout-shell-gap, 0rem)');
    expect(source).toContain('var(--layout-sidebar-width, 16rem)');
    expect(source).toContain('var(--layout-shell-inset, 0.5rem)');
    expect(source).toContain('var(--layout-content-radius, 2rem)');
    expect(source).toContain('[&>aside]:w-full');
  });
});
