// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const source = readFileSync(
  "src/components/surfaces/help-center-overview-surface.tsx",
  "utf8",
);

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { HelpCenterOverviewSurface } from "@/components/surfaces/help-center-overview-surface";

afterEach(() => {
  cleanup();
});

describe("HelpCenterOverviewSurface", () => {
  it("renders teacher and developer split with developer guide entries", () => {
    render(<HelpCenterOverviewSurface />);

    expect(screen.getByRole("heading", { level: 3, name: "我是教师" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "我是开发者" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: "插件开发" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: "主题开发" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: "Actions / Interfaces" })).toBeTruthy();
  });

  it("keeps teacher help focused on product entry points without code examples", () => {
    const { container } = render(<HelpCenterOverviewSurface />);
    const text = container.textContent ?? "";

    expect(screen.getByRole("link", { name: "前往插件市场" }).getAttribute("href")).toBe(
      "/settings/plugins",
    );
    expect(screen.getByRole("link", { name: "查看主题设置" }).getAttribute("href")).toBe(
      "/settings",
    );
    expect(screen.getByRole("link", { name: "查看课表页面" }).getAttribute("href")).toBe(
      "/teacher/schedule",
    );
    expect(text).toContain("不放代码块，不展开 schema 和 hook 术语");
    expect(text).not.toContain("const proposalAction = {");
    expect(container.querySelector("pre")).toBeNull();
    expect(container.textContent?.includes("```") ?? false).toBe(false);
  });

  it("reuses the shared teacher product skeleton without horizontal scroll wrappers", () => {
    expect(source).toContain("surfaceWidths.workspace");
    expect(source).toContain("surfaceWidths.heroTitle");
    expect(source).toContain("surfaceWidths.heroBody");
    expect(source).toContain("teacherSurfaceRhythm.stack");
    expect(source).toContain("teacherSurfaceRhythm.hero");
    expect(source).not.toContain("overflow-x-auto");
  });
});
