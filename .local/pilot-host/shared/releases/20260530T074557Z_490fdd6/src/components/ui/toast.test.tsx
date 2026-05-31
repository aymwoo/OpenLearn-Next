// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "./toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function ToastProbe() {
  const { success } = useToast();

  return (
    <button
      type="button"
      onClick={() =>
        success("课表已导入成功", {
          description: "当前学期课表已回到主视图展示。",
        })
      }
    >
      触发提示
    </button>
  );
}

describe("ToastProvider", () => {
  it("renders and auto dismisses success toast", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "触发提示" }));

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("课表已导入成功")).toBeTruthy();
    expect(screen.getByText("当前学期课表已回到主视图展示。")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3200);
    });

    expect(screen.queryByText("课表已导入成功")).toBeNull();
  });
});
