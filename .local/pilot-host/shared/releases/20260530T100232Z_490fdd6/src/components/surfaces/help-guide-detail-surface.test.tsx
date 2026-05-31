// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { HelpGuideDetailSurface } from "@/components/surfaces/help-guide-detail-surface";
import { helpGuidePages } from "@/lib/help/help-center-content";

afterEach(() => {
  cleanup();
});

describe("HelpGuideDetailSurface", () => {
  it("renders theme guide with separate state-labelled sections and real runtime chain", () => {
    const { container } = render(<HelpGuideDetailSurface guide={helpGuidePages["/help/themes"]} />);

    expect(screen.getByRole("heading", { level: 2, name: "主题开发指南" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "当前可用" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "使用边界" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "后续扩展" })).toBeTruthy();
    const text = container.textContent ?? "";
    expect(text).toContain("registerThemeTokensAction()");
    expect(text).toContain("setActiveThemeAction()");
    expect(text).toContain("getCurrentActorThemeRuntimeState()");
    expect(text).toContain("ThemeInjector");
    expect(text).toContain("TeacherSidebarShell");
    expect(text).toContain('"colors": { "primary": "#0050d4" }');
    expect(text).toContain('{ "region": "primary-nav" }');
    expect(text).toContain('{ "region": "page-header" }');
    expect(text).toContain('{ "region": "main-content", "split": "60/40" }');
    expect(text).toContain('"pages": {');
    expect(text).not.toContain('"tokens": {');
    expect(text).not.toContain('"routes": {');
  });

  it("renders developer detail chrome, coverage aside, and code examples", () => {
    const { container } = render(<HelpGuideDetailSurface guide={helpGuidePages["/help/plugins"]} />);

    expect(screen.getAllByRole("link", { name: "返回帮助中心" })[0]?.getAttribute("href")).toBe("/help");
    expect(screen.getByText("本页覆盖")).toBeTruthy();
    expect(screen.getByText("最小插件 manifest 片段")).toBeTruthy();
    expect(screen.getByText(/"anchors": \["schedule.assistant"\]/)).toBeTruthy();
    expect(container.textContent ?? "").toContain("school-scoped activation path");
  });

  it("keeps teacher help copy out of the developer detail template scope", () => {
    const { container } = render(<HelpGuideDetailSurface guide={helpGuidePages["/help/themes"]} />);

    const main = container.querySelector("main");
    expect(main).toBeTruthy();
    const scope = within(main as HTMLElement);
    expect(scope.queryByText("插件现在体现在哪里")).toBeNull();
    expect(scope.queryByText("什么时候读开发者指南")).toBeNull();
  });
});
