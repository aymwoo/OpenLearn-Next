import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/class-management/template", () => ({
  buildClassImportTemplateCsv: vi.fn(() => "className\n高一（1）班\n高一（2）班"),
}));

describe("GET /teacher/classes/template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns class csv template content", async () => {
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("className\n高一（1）班\n高一（2）班");
  });

  it("sets csv download headers", async () => {
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="teacher-class-import-template.csv"',
    );
  });

  it("delegates content generation to the shared helper", async () => {
    const templateModule = await import("@/features/class-management/template");
    const { GET } = await import("./route");

    await GET();

    expect(templateModule.buildClassImportTemplateCsv).toHaveBeenCalledTimes(1);
  });
});
