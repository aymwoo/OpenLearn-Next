// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeLoginCard } from "./home-login-card";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href?: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/actions/auth-actions", () => ({
  signInAction: vi.fn(async () => ({})),
}));

const homeLoginCardSource = readFileSync("src/components/home/home-login-card.tsx", "utf8");

describe("HomeLoginCard", () => {
  it("uses studentNumber copy for student login", () => {
    expect(homeLoginCardSource).toContain("{roleIntent === 'student' ? '学号' : '邮箱地址'}");
    expect(homeLoginCardSource).toContain("placeholder={roleIntent === 'student' ? '请输入学号' : 'teacher@openlearn.dev'}");
  });

  it("switches visible fields and hidden roleIntent when teacher login is selected", () => {
    const { container } = render(<HomeLoginCard />);
    const roleIntentInput = () => container.querySelector('input[name="roleIntent"]');

    expect(screen.getByLabelText("学号")).toBeTruthy();
    expect(screen.getByPlaceholderText("请输入学号")).toBeTruthy();
    expect(roleIntentInput()?.getAttribute("value")).toBe("student");

    fireEvent.click(screen.getByRole("button", { name: "教师登录" }));

    expect(screen.getByLabelText("邮箱地址")).toBeTruthy();
    expect(screen.getByPlaceholderText("teacher@openlearn.dev")).toBeTruthy();
    expect(roleIntentInput()?.getAttribute("value")).toBe("teacher");
  });
});
