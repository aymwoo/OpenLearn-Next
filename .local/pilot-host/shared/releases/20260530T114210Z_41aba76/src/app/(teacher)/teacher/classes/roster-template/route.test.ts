import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/class-management/template", () => ({
  buildRosterImportTemplateCsv: vi.fn(
    () => "className,studentName,studentNumber,gender\n高一（1）班,张三,S2026001,男\n高一（1）班,李四,S2026002,女",
  ),
}));

describe("GET /teacher/classes/roster-template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns roster csv template content", async () => {
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      "className,studentName,studentNumber,gender\n高一（1）班,张三,S2026001,男\n高一（1）班,李四,S2026002,女",
    );
  });

  it("sets roster csv download headers", async () => {
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="teacher-class-roster-import-template.csv"',
    );
  });

  it("delegates content generation to the shared helper", async () => {
    const templateModule = await import("@/features/class-management/template");
    const { GET } = await import("./route");

    await GET();

    expect(templateModule.buildRosterImportTemplateCsv).toHaveBeenCalledTimes(1);
  });
});
