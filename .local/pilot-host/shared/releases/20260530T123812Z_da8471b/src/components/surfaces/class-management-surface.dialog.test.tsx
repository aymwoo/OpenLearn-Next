// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TeacherClassManagementDTO } from "@/lib/dto/class-management";

import { ClassManagementSurface } from "./class-management-surface";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  updateClassNameAction: vi.fn(),
  importClassesAction: vi.fn(),
  importClassRosterAction: vi.fn(),
  resetStudentPasswordsAction: vi.fn(),
  deleteStudentsAction: vi.fn(),
  deleteClassesAction: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <span data-alt={alt ?? ""} {...props} />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: mocks.success,
    error: mocks.error,
  }),
}));

vi.mock("@/actions/class-management-actions", () => ({
  updateClassNameAction: mocks.updateClassNameAction,
  importClassesAction: mocks.importClassesAction,
  importClassRosterAction: mocks.importClassRosterAction,
  resetStudentPasswordsAction: mocks.resetStudentPasswordsAction,
  deleteStudentsAction: mocks.deleteStudentsAction,
  deleteClassesAction: mocks.deleteClassesAction,
}));

function buildData(): TeacherClassManagementDTO {
  return {
    schoolId: "school-1",
    classes: [
      {
        id: "class-1",
        schoolId: "school-1",
        name: "高一（1）班",
        studentCount: 1,
        students: [
          {
            userId: "student-1",
            name: "张小明",
            studentNumber: "2026001",
            gender: "male",
          },
        ],
      },
    ],
  };
}

describe("ClassManagementSurface dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("opens the native student dialog after clicking the class card button", async () => {
    render(<ClassManagementSurface data={buildData()} />);

    const studentDialog = screen.getByText("学生列表").closest("dialog");

    expect(studentDialog?.hasAttribute("open")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "查看班级 高一（1）班 的学生" }));

    await waitFor(() => {
      expect(studentDialog?.hasAttribute("open")).toBe(true);
    });
    expect(screen.getByText("当前班级：高一（1）班")).toBeTruthy();
  });

  it("requires inline confirmation before deleting a class", async () => {
    mocks.deleteClassesAction.mockResolvedValue({ ok: true, data: { deletedCount: 1 } });

    render(<ClassManagementSurface data={buildData()} />);

    fireEvent.click(screen.getByRole("button", { name: "删除班级 高一（1）班" }));

    expect(mocks.deleteClassesAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "确认删除班级 高一（1）班" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "取消删除班级 高一（1）班" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "确认删除班级 高一（1）班" }));

    await waitFor(() => {
      expect(mocks.deleteClassesAction).toHaveBeenCalledWith({ classIds: ["class-1"] });
    });
  });

  it("can cancel inline delete confirmation", () => {
    render(<ClassManagementSurface data={buildData()} />);

    fireEvent.click(screen.getByRole("button", { name: "删除班级 高一（1）班" }));
    fireEvent.click(screen.getByRole("button", { name: "取消删除班级 高一（1）班" }));

    expect(screen.queryByRole("button", { name: "确认删除班级 高一（1）班" })).toBeNull();
    expect(screen.getByRole("button", { name: "删除班级 高一（1）班" })).toBeTruthy();
    expect(mocks.deleteClassesAction).not.toHaveBeenCalled();
  });
});
