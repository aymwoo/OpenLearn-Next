// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CourseDetailForm } from "./course-detail-form";
import type { TeacherCourseDetailDTO } from "@/lib/dto/course-authoring";

const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));

function buildCourse(status: TeacherCourseDetailDTO["status"]): TeacherCourseDetailDTO {
  return {
    id: "course-1",
    schoolId: "school-1",
    ownerId: "teacher-1",
    title: "七年级科学探究",
    subject: "科学",
    grade: "七年级",
    status,
    lessonCount: 2,
    classLabels: ["七年级一班"],
    classLinks: [{ id: "class-1", name: "七年级一班" }],
    availableClasses: [{ id: "class-2", name: "七年级二班" }],
    enrollmentCount: 32,
    deleteEligibility: {
      canDelete: false,
      reasons: [
        {
          code: "COURSE_HAS_LESSONS",
          message: "当前课程下还有 2 个课时，需先清理课时后才能删除课程。",
          count: 2,
        },
      ],
    },
    updatedAt: new Date("2026-05-15T10:00:00.000Z").toISOString(),
    lessons: [],
  };
}

describe("CourseDetailForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("publishes draft courses from the detail page and keeps the new status for later saves", async () => {
    const updateCourseAction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...buildCourse("published"),
        title: "更新后的课程",
      },
    });
    const publishCourseAction = vi.fn().mockResolvedValue({
      ok: true,
      data: buildCourse("published"),
    });
    const addCourseClassAssociationAction = vi.fn();
    const removeCourseClassAssociationAction = vi.fn();
    const unpublishCourseAction = vi.fn();
    const archiveCourseAction = vi.fn();
    const deleteCourseAction = vi.fn();

    render(
      <CourseDetailForm
        course={buildCourse("draft")}
        updateCourseAction={updateCourseAction}
        addCourseClassAssociationAction={addCourseClassAssociationAction}
        removeCourseClassAssociationAction={removeCourseClassAssociationAction}
        publishCourseAction={publishCourseAction}
        unpublishCourseAction={unpublishCourseAction}
        archiveCourseAction={archiveCourseAction}
        deleteCourseAction={deleteCourseAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "发布课程" }));

    await waitFor(() => {
      expect(publishCourseAction).toHaveBeenCalledWith({ courseId: "course-1" });
      expect(refresh).toHaveBeenCalled();
    });

    expect(screen.getByText("课程已发布，并已同步到当前课程视图")).toBeTruthy();
    expect(screen.getByText("当前状态：已发布")).toBeTruthy();
    expect(screen.getByRole("button", { name: "恢复为草稿" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("课程名称"), {
      target: { value: "更新后的课程" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存课程信息" }));

    await waitFor(() => {
      expect(updateCourseAction).toHaveBeenCalledWith({
        courseId: "course-1",
        title: "更新后的课程",
        subject: "科学",
        grade: "七年级",
        status: "published",
      });
    });
  });

  it("archives published courses from the detail page", async () => {
    const updateCourseAction = vi.fn();
    const addCourseClassAssociationAction = vi.fn();
    const removeCourseClassAssociationAction = vi.fn();
    const publishCourseAction = vi.fn();
    const unpublishCourseAction = vi.fn();
    const archiveCourseAction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...buildCourse("archived"),
        availableClasses: [{ id: "class-2", name: "七年级二班" }],
        deleteEligibility: { canDelete: true, reasons: [] },
      },
    });
    const deleteCourseAction = vi.fn();

    render(
      <CourseDetailForm
        course={buildCourse("published")}
        updateCourseAction={updateCourseAction}
        addCourseClassAssociationAction={addCourseClassAssociationAction}
        removeCourseClassAssociationAction={removeCourseClassAssociationAction}
        publishCourseAction={publishCourseAction}
        unpublishCourseAction={unpublishCourseAction}
        archiveCourseAction={archiveCourseAction}
        deleteCourseAction={deleteCourseAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "归档课程" }));

    await waitFor(() => {
      expect(archiveCourseAction).toHaveBeenCalledWith({ courseId: "course-1" });
      expect(refresh).toHaveBeenCalled();
    });

    expect(screen.getByText("课程已归档，默认教师流程将不再显示该课程。")).toBeTruthy();
    expect(screen.getByText("当前状态：已归档")).toBeTruthy();
    expect(screen.getByRole("button", { name: "恢复为草稿" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "归档课程" })).toBeNull();
  });

  it("restores archived courses to draft from the detail page", async () => {
    const updateCourseAction = vi.fn();
    const addCourseClassAssociationAction = vi.fn();
    const removeCourseClassAssociationAction = vi.fn();
    const publishCourseAction = vi.fn();
    const unpublishCourseAction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...buildCourse("draft"),
        deleteEligibility: { canDelete: false, reasons: [] },
      },
    });
    const archiveCourseAction = vi.fn();
    const deleteCourseAction = vi.fn();

    render(
      <CourseDetailForm
        course={buildCourse("archived")}
        updateCourseAction={updateCourseAction}
        addCourseClassAssociationAction={addCourseClassAssociationAction}
        removeCourseClassAssociationAction={removeCourseClassAssociationAction}
        publishCourseAction={publishCourseAction}
        unpublishCourseAction={unpublishCourseAction}
        archiveCourseAction={archiveCourseAction}
        deleteCourseAction={deleteCourseAction}
      />,
    );

    expect(screen.queryByRole("button", { name: "归档课程" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "恢复为草稿" }));

    await waitFor(() => {
      expect(unpublishCourseAction).toHaveBeenCalledWith({ courseId: "course-1" });
      expect(refresh).toHaveBeenCalled();
    });

    expect(screen.getByText("课程已恢复为草稿，可继续进入课时管理。")).toBeTruthy();
    expect(screen.getByText("当前状态：草稿")).toBeTruthy();
    expect(screen.getByRole("button", { name: "发布课程" })).toBeTruthy();
  });

  it("requires exact title confirmation before deleting an eligible course", async () => {
    const updateCourseAction = vi.fn();
    const addCourseClassAssociationAction = vi.fn();
    const removeCourseClassAssociationAction = vi.fn();
    const publishCourseAction = vi.fn();
    const unpublishCourseAction = vi.fn();
    const archiveCourseAction = vi.fn();
    const deleteCourseAction = vi.fn().mockResolvedValue({
      ok: true,
      data: { id: "course-1", title: "七年级科学探究" },
    });

    render(
      <CourseDetailForm
        course={{
          ...buildCourse("draft"),
          lessonCount: 0,
          enrollmentCount: 0,
          classLinks: [],
          classLabels: [],
          deleteEligibility: { canDelete: true, reasons: [] },
        }}
        updateCourseAction={updateCourseAction}
        addCourseClassAssociationAction={addCourseClassAssociationAction}
        removeCourseClassAssociationAction={removeCourseClassAssociationAction}
        publishCourseAction={publishCourseAction}
        unpublishCourseAction={unpublishCourseAction}
        archiveCourseAction={archiveCourseAction}
        deleteCourseAction={deleteCourseAction}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: "删除课程" }) as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("输入当前课程名称以确认删除"), {
      target: { value: "七年级科学探究" },
    });

    expect(deleteButton.disabled).toBe(false);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteCourseAction).toHaveBeenCalledWith({
        courseId: "course-1",
        confirmationText: "七年级科学探究",
      });
      expect(push).toHaveBeenCalledWith("/teacher/courses");
    });
  });

  it("shows blocked delete reasons inside the page instead of redirecting", async () => {
    const updateCourseAction = vi.fn();
    const addCourseClassAssociationAction = vi.fn();
    const removeCourseClassAssociationAction = vi.fn();
    const publishCourseAction = vi.fn();
    const unpublishCourseAction = vi.fn();
    const archiveCourseAction = vi.fn();
    const deleteCourseAction = vi.fn().mockResolvedValue({
      ok: false,
      error: "DELETE_BLOCKED",
      message: "课程暂时不能删除，请先处理以下阻断项。",
      reasons: [
        {
          code: "COURSE_HAS_CLASS_ASSOCIATIONS",
          message: "当前课程仍关联 1 个班级，需先解除班级关联后才能删除课程。",
          count: 1,
        },
      ],
    });

    render(
      <CourseDetailForm
        course={{
          ...buildCourse("archived"),
          lessonCount: 0,
          enrollmentCount: 0,
          classLinks: [],
          classLabels: [],
          deleteEligibility: { canDelete: true, reasons: [] },
        }}
        updateCourseAction={updateCourseAction}
        addCourseClassAssociationAction={addCourseClassAssociationAction}
        removeCourseClassAssociationAction={removeCourseClassAssociationAction}
        publishCourseAction={publishCourseAction}
        unpublishCourseAction={unpublishCourseAction}
        archiveCourseAction={archiveCourseAction}
        deleteCourseAction={deleteCourseAction}
      />,
    );

    fireEvent.change(screen.getByLabelText("输入当前课程名称以确认删除"), {
      target: { value: "七年级科学探究" },
    });
    fireEvent.click(screen.getByRole("button", { name: "删除课程" }));

    await waitFor(() => {
      expect(deleteCourseAction).toHaveBeenCalled();
    });

    expect(screen.getByText("课程暂时不能删除，请先处理以下阻断项。")).toBeTruthy();
    expect(screen.getByText("当前课程仍关联 1 个班级，需先解除班级关联后才能删除课程。")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("adds a class association from the detail page", async () => {
    const updateCourseAction = vi.fn();
    const addCourseClassAssociationAction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...buildCourse("draft"),
        classLabels: ["七年级一班", "七年级三班", "七年级二班"],
        classLinks: [
          { id: "class-1", name: "七年级一班" },
          { id: "class-3", name: "七年级三班" },
          { id: "class-2", name: "七年级二班" },
        ],
        availableClasses: [{ id: "class-2", name: "七年级二班" }],
      },
    });
    const removeCourseClassAssociationAction = vi.fn();
    const publishCourseAction = vi.fn();
    const unpublishCourseAction = vi.fn();
    const archiveCourseAction = vi.fn();
    const deleteCourseAction = vi.fn();

    render(
      <CourseDetailForm
        course={{
          ...buildCourse("draft"),
          availableClasses: [
            { id: "class-2", name: "七年级二班" },
            { id: "class-3", name: "七年级三班" },
          ],
        }}
        updateCourseAction={updateCourseAction}
        addCourseClassAssociationAction={addCourseClassAssociationAction}
        removeCourseClassAssociationAction={removeCourseClassAssociationAction}
        publishCourseAction={publishCourseAction}
        unpublishCourseAction={unpublishCourseAction}
        archiveCourseAction={archiveCourseAction}
        deleteCourseAction={deleteCourseAction}
      />,
    );

    fireEvent.change(screen.getByLabelText("添加班级关联"), {
      target: { value: "class-3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加班级关联" }));

    await waitFor(() => {
      expect(addCourseClassAssociationAction).toHaveBeenCalledWith({
        courseId: "course-1",
        classId: "class-3",
      });
      expect(refresh).toHaveBeenCalled();
    });

    expect(screen.getByText("已将课程关联到 七年级三班。")).toBeTruthy();
    expect(screen.queryByText("当前学校下没有更多可添加的班级，或该课程已关联全部可用班级。")).toBeNull();
  });

  it("removes a class association from the detail page", async () => {
    const updateCourseAction = vi.fn();
    const addCourseClassAssociationAction = vi.fn();
    const removeCourseClassAssociationAction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...buildCourse("draft"),
        classLabels: [],
        classLinks: [],
        availableClasses: [
          { id: "class-1", name: "七年级一班" },
          { id: "class-2", name: "七年级二班" },
        ],
      },
    });
    const publishCourseAction = vi.fn();
    const unpublishCourseAction = vi.fn();
    const archiveCourseAction = vi.fn();
    const deleteCourseAction = vi.fn();

    render(
      <CourseDetailForm
        course={buildCourse("draft")}
        updateCourseAction={updateCourseAction}
        addCourseClassAssociationAction={addCourseClassAssociationAction}
        removeCourseClassAssociationAction={removeCourseClassAssociationAction}
        publishCourseAction={publishCourseAction}
        unpublishCourseAction={unpublishCourseAction}
        archiveCourseAction={archiveCourseAction}
        deleteCourseAction={deleteCourseAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "移除" }));

    await waitFor(() => {
      expect(removeCourseClassAssociationAction).toHaveBeenCalledWith({
        courseId: "course-1",
        classId: "class-1",
      });
      expect(refresh).toHaveBeenCalled();
    });

    expect(screen.getByText("已解除与 七年级一班 的课程关联。")).toBeTruthy();
    expect(screen.getByText("当前还没有关联班级，可直接在下方选择本校班级并添加。")).toBeTruthy();
  });
});
