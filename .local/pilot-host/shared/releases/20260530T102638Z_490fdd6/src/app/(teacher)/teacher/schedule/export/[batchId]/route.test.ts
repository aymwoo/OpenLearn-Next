import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/schedule/import", () => ({
  exportScheduleImportBatchCsv: vi.fn(),
}));

describe("GET /teacher/schedule/export/[batchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the selected batch csv as an attachment", async () => {
    const scheduleImportModule = await import("@/features/schedule/import");
    vi.mocked(scheduleImportModule.exportScheduleImportBatchCsv).mockResolvedValue({
      csv: "源记录标识,学期名称\n1,2026 春季学期",
      fileName: "2026-spring.csv",
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/teacher/schedule/export/batch-1"), {
      params: Promise.resolve({ batchId: "batch-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("源记录标识,学期名称\n1,2026 春季学期");
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="2026-spring.csv"');
    expect(scheduleImportModule.exportScheduleImportBatchCsv).toHaveBeenCalledWith("batch-1");
  });

  it("returns 404 when batch does not exist", async () => {
    const scheduleImportModule = await import("@/features/schedule/import");
    vi.mocked(scheduleImportModule.exportScheduleImportBatchCsv).mockRejectedValue(new Error("SCHEDULE_IMPORT_BATCH_NOT_FOUND"));

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/teacher/schedule/export/missing"), {
      params: Promise.resolve({ batchId: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});
