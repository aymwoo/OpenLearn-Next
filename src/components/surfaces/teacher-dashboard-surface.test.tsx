import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dashboardSurfaceSource = readFileSync("src/components/surfaces/teacher-dashboard-surface.tsx", "utf8");
const teacherPageSource = readFileSync("src/app/(teacher)/teacher/page.tsx", "utf8");

describe("Teacher dashboard surface layout guards", () => {
  it("keeps the dashboard surface full width without local narrow wrappers", () => {
    expect(dashboardSurfaceSource).toContain("'flex w-full flex-col pb-12 pt-3'");
    expect(dashboardSurfaceSource).not.toContain("mx-auto flex w-full flex-col");
    expect(teacherPageSource).toContain('className="min-h-full w-full p-6 lg:p-8"');
    expect(teacherPageSource).not.toContain("mx-auto");
  });

  it("removes rounded shells from the /teacher hero and plugin section", () => {
    expect(dashboardSurfaceSource).toContain("cn(teacherSurfaceRhythm.hero, 'rounded-none')");
    expect(teacherPageSource).toContain('className="mt-6 flex w-full flex-col gap-3 bg-surface-container-low p-3"');
    expect(teacherPageSource).not.toContain("rounded-[1.75rem]");
  });
});
