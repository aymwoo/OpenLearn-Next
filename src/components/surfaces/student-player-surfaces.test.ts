import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const dashboardSource = readFileSync("src/components/surfaces/student-dashboard-surface.tsx", "utf8");
const playerSource = readFileSync("src/components/surfaces/player-surface.tsx", "utf8");

describe("Phase 04 student DTO surfaces", () => {
  it("renders dashboard states from learning DTOs instead of demo data", () => {
    expect(dashboardSource).not.toContain("demo-data");
    expect(dashboardSource).toContain("StudentDashboardDTO");
    expect(dashboardSource).toContain("还没有可学习的课时");
    expect(dashboardSource).toContain("查看课程列表");
    expect(dashboardSource).toContain("继续学习");
  });

  it("renders player shell, progress labels, and content completion from learning DTOs", () => {
    expect(playerSource).not.toContain("demo-data");
    expect(playerSource).toContain("StudentPlayerDTO");
    expect(playerSource).toContain("老师指定");
    expect(playerSource).toContain("已完成阅读");
    expect(playerSource).toContain("overflow-x-auto");
  });
});
