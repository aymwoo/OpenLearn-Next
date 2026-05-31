import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/schedule/import", () => ({
  buildScheduleImportTemplateCsv: vi.fn(
    () =>
      "源记录标识,学期名称,星期(0-6),节次标签,上课开始时间,上课结束时间,班级名称,课程名称,教师姓名,教室标签\n1,2026 春季学期,1,第一节,08:00,08:45,高一（1）班,示例高一数学,张老师,教学楼 302",
  ),
}));

describe("GET /teacher/schedule/import/template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns csv content with Chinese headers including time columns", async () => {
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      "源记录标识,学期名称,星期(0-6),节次标签,上课开始时间,上课结束时间,班级名称,课程名称,教师姓名,教室标签\n1,2026 春季学期,1,第一节,08:00,08:45,高一（1）班,示例高一数学,张老师,教学楼 302",
    );
  });

  it("sets csv content type and attachment filename headers", async () => {
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="teacher-schedule-import-template.csv"',
    );
  });

  it("delegates content generation to the shared template helper", async () => {
    const scheduleImportModule = await import("@/features/schedule/import");
    const { GET } = await import("./route");

    await GET();

    expect(scheduleImportModule.buildScheduleImportTemplateCsv).toHaveBeenCalledTimes(1);
  });
});
