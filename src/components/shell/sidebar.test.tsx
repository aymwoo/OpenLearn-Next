// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("uses OpenLearn Next as the default site title", () => {
    render(
      <Sidebar
        items={[
          { label: "工作台", href: "/teacher" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "OpenLearn Next" })).toBeTruthy();
    expect(screen.getByText("primary-nav")).toBeTruthy();
  });
});
