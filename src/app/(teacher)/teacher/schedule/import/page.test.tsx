import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("TeacherScheduleImportPage", () => {
  it("redirects the legacy import route back to the main schedule page", async () => {
    const pageModule = await import("./page");

    await expect(pageModule.default()).rejects.toThrow("REDIRECT:/teacher/schedule");
  });
});
