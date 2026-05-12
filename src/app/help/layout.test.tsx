// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HelpLayoutContent } from "./layout";

const headers = vi.fn();
const redirect = vi.fn((location: string) => {
  throw new Error(`REDIRECT:${location}`);
});
const getCurrentUserDTO = vi.fn();
const getUserMembershipsDTO = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: (location: string) => redirect(location),
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: () => getCurrentUserDTO(),
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO: (...args: unknown[]) => getUserMembershipsDTO(...args),
}));

vi.mock("@/components/shell/teacher-sidebar-shell", () => ({
  TeacherSidebarShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("HelpLayout auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headers.mockResolvedValue(new Headers([["x-pathname", "/help"]]));
    getCurrentUserDTO.mockResolvedValue({ id: "teacher-1", name: "教师一" });
    getUserMembershipsDTO.mockResolvedValue([{ role: "teacher", status: "active", schoolId: "school-1" }]);
  });

  it("redirects to home when user is missing", async () => {
    getCurrentUserDTO.mockResolvedValue(null);

    await expect(HelpLayoutContent({ children: <div>help content</div> })).rejects.toThrow("REDIRECT:/");
    expect(getUserMembershipsDTO).not.toHaveBeenCalled();
  });

  it("redirects to unauthorized when active teacher membership is missing", async () => {
    getUserMembershipsDTO.mockResolvedValue([{ role: "student", status: "active", schoolId: "school-1" }]);

    await expect(HelpLayoutContent({ children: <div>help content</div> })).rejects.toThrow("REDIRECT:/unauthorized");
  });

  it("renders children for active teacher users", async () => {
    render(await HelpLayoutContent({ children: <div>help content</div> }));

    expect(screen.getByText("help content")).toBeTruthy();
    expect(getUserMembershipsDTO).toHaveBeenCalledWith("teacher-1");
  });
});
