import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const dashboardSurfaceSource = readFileSync("src/components/surfaces/teacher-dashboard-surface.tsx", "utf8");
const teacherPageSource = readFileSync("src/app/(teacher)/teacher/page.tsx", "utf8");
const stageHeroSource = readFileSync("src/components/surfaces/stage-hero.tsx", "utf8");

describe("Teacher dashboard surface layout guards", () => {
  it("keeps the dashboard surface full width without local narrow wrappers", () => {
    expect(dashboardSurfaceSource).toContain("'flex w-full flex-col pb-12 pt-3'");
    expect(dashboardSurfaceSource).toContain("surfaceWidths.workspace");
    expect(dashboardSurfaceSource).toContain("teacherSurfaceRhythm.stack");
    expect(teacherPageSource).toContain('className="min-h-full w-full p-6 lg:p-8"');
    expect(teacherPageSource).not.toContain("mx-auto");
    expect(stageHeroSource).toContain("'relative w-full overflow-hidden rounded-[var(--radius-shell)] bg-[#09192f] text-white shadow-[0_28px_80px_rgba(2,6,23,0.24)]'");
    expect(stageHeroSource).toContain("contentColumnClassName");
  });

  it("removes rounded shells from the /teacher hero and plugin section", () => {
    expect(dashboardSurfaceSource).toContain("cn(teacherSurfaceRhythm.hero, 'rounded-none')");
    expect(teacherPageSource).toContain('className="mt-6 flex w-full flex-col gap-3 bg-surface-container-low p-3"');
    expect(teacherPageSource).not.toContain("rounded-[1.75rem]");
  });

  it("links the teacher schedule card to the schedule page", () => {
    expect(dashboardSurfaceSource).toContain('href="/teacher/schedule"');
    expect(dashboardSurfaceSource).toContain("查看课表");
    expect(dashboardSurfaceSource).not.toContain("查看完整日历");
  });

  it("exposes /teacher/trends as the visible analytics next action", () => {
    expect(dashboardSurfaceSource).toContain('href="/teacher/trends"')
    expect(dashboardSurfaceSource).toContain('查看班级趋势')
  })
});
