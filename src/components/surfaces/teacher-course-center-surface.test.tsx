// @vitest-environment jsdom

import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeacherCourseCenterSurface } from "./teacher-course-center-surface";

const createCourseAction = vi.fn();
const refresh = vi.fn();

const drawerSource = readFileSync("src/components/courses/course-create-drawer.tsx", "utf8");

vi.mock("@/actions/course-authoring-actions", () => ({
  createCourseAction: (...args: unknown[]) => createCourseAction(...args),
}));

vi.mock("@/components/courses/course-import-modal", () => ({
  CourseImportModal: () => <button type="button">批量导入课程</button>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}));

describe("TeacherCourseCenterSurface create flow", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    createCourseAction.mockResolvedValue({
      ok: true,
      data: { id: "course-new" },
    });
  });

  it("submits the real default school for single-school teachers instead of falling back to school-1", async () => {
    render(
      <TeacherCourseCenterSurface
        data={{
          defaultSchoolId: "school-9",
          availableSchools: [{ id: "school-9", name: "九号校区" }],
          recentImportTask: null,
          courses: [],
          includeArchived: false,
        }}
      />,
    );

    openDrawerAndFillBaseFields();
    fireEvent.click(screen.getByRole("button", { name: "创建课程" }));

    await waitFor(() => {
      expect(createCourseAction).toHaveBeenCalledWith({
        schoolId: "school-9",
        title: "七年级科学探究",
        subject: "科学",
        grade: "七年级",
      });
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it("lets multi-school teachers switch schools before submitting", async () => {
    render(
      <TeacherCourseCenterSurface
        data={{
          defaultSchoolId: "school-1",
          availableSchools: [
            { id: "school-1", name: "晨曦学校" },
            { id: "school-2", name: "北校区" },
          ],
          recentImportTask: null,
          courses: [],
          includeArchived: false,
        }}
      />,
    );

    openDrawerAndFillBaseFields();
    fireEvent.change(screen.getByLabelText("授课学校"), { target: { value: "school-2" } });
    fireEvent.click(screen.getByRole("button", { name: "创建课程" }));

    await waitFor(() => {
      expect(createCourseAction).toHaveBeenCalledWith({
        schoolId: "school-2",
        title: "七年级科学探究",
        subject: "科学",
        grade: "七年级",
      });
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it("removes the hardcoded schoolId = \"school-1\" default from the drawer source", () => {
    expect(drawerSource).not.toContain('schoolId = "school-1"');
  });

  it("shows course import entry and csv template download in the hero", () => {
    render(
      <TeacherCourseCenterSurface
        data={{
          defaultSchoolId: "school-9",
          availableSchools: [{ id: "school-9", name: "九号校区" }],
          recentImportTask: null,
          courses: [],
          includeArchived: false,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "批量导入课程" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "下载 CSV 模板" }).getAttribute("href")).toBe("/teacher/courses/import/template");
  }, 20_000);

  it("renders recent import task card near hero with link back to batch detail", () => {
    render(
      <TeacherCourseCenterSurface
        data={{
          defaultSchoolId: "school-9",
          availableSchools: [{ id: "school-9", name: "九号校区" }],
          recentImportTask: {
            taskId: "task-1",
            batchId: "batch-1",
            batchLabel: "courses.csv",
            status: "partially_completed",
            statusLabel: "已完成，但有失败项",
            isActive: false,
            progressLabel: null,
            progressPercent: null,
            summaryLabel: "created 1 · updated 0 · skipped 1 · failed 1",
            latestError: null,
            counts: { created: 1, updated: 0, skipped: 1, failed: 1 },
            href: "/teacher/courses/import/batch-1",
            updatedAt: "2026-05-15T00:00:00.000Z",
          },
          courses: [],
          includeArchived: false,
        }}
      />,
    );

    expect(screen.getByText("最近导入任务")).toBeTruthy();
    expect(screen.getByText("已完成，但有失败项")).toBeTruthy();
    expect(screen.getByRole("link", { name: /返回批次详情/ }).getAttribute("href")).toBe("/teacher/courses/import/batch-1");
  });
});

function openDrawerAndFillBaseFields() {
  fireEvent.click(screen.getAllByRole("button", { name: "新建课程" })[0]!);
  fireEvent.change(screen.getByLabelText("课程名称"), { target: { value: "七年级科学探究" } });
  fireEvent.change(screen.getByLabelText("学科"), { target: { value: "科学" } });
  fireEvent.change(screen.getByLabelText("年级"), { target: { value: "七年级" } });
}
