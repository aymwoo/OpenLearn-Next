import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("LegacyLoginPage", () => {
  it("redirects the legacy /login route to home", async () => {
    const pageModule = await import("./page");

    await expect(pageModule.default()).rejects.toThrow("REDIRECT:/");
  });
});
