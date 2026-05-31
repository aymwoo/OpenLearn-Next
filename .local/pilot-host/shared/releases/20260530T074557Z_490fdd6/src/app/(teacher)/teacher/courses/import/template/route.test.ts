import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/course-import-template", () => ({
  buildCourseImportTemplateCsv: vi.fn(() => "标题,学科,年级,课程状态\n示例七年级科学探究,科学,七年级,draft"),
}));

describe("GET /teacher/courses/import/template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns csv content with fixed Chinese headers", async () => {
    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("标题,学科,年级,课程状态");
  });

  it("sets csv download headers", async () => {
    const { GET } = await import("./route");
    const response = await GET();

    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="teacher-course-import-template.csv"');
  });
});
