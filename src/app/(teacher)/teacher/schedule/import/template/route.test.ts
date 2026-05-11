import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/schedule/import", () => ({
  buildScheduleImportTemplateCsv: vi.fn(() => "sourceRowKey,termName\n1,2026 春季学期"),
}));

describe("GET /teacher/schedule/import/template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns csv content from the template helper", async () => {
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("sourceRowKey,termName\n1,2026 春季学期");
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
