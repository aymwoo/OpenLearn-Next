import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteClassesForTeacher,
  deleteStudentsForTeacher,
  importClassRosterForTeacher,
  importClassesForTeacher,
  resetStudentPasswordsForTeacher,
  updateClassNameForTeacher,
} from "@/lib/dal/class-management";

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

const mockUpdateClassNameForTeacher = vi.fn();
const mockImportClassesForTeacher = vi.fn();
const mockImportClassRosterForTeacher = vi.fn();
const mockResetStudentPasswordsForTeacher = vi.fn();
const mockDeleteStudentsForTeacher = vi.fn();
const mockDeleteClassesForTeacher = vi.fn();

vi.mock("@/lib/dal/class-management", () => ({
  updateClassNameForTeacher: mockUpdateClassNameForTeacher,
  importClassesForTeacher: mockImportClassesForTeacher,
  importClassRosterForTeacher: mockImportClassRosterForTeacher,
  resetStudentPasswordsForTeacher: mockResetStudentPasswordsForTeacher,
  deleteStudentsForTeacher: mockDeleteStudentsForTeacher,
  deleteClassesForTeacher: mockDeleteClassesForTeacher,
}));

describe("class-management-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateClassNameAction", () => {
    const validInput = {
      classId: "class-1",
      name: "高一（1）班",
    };

    it("returns success with updated name on valid input", async () => {
      const mockResult = { id: "class-1", name: "高一（1）班", schoolId: "school-1" };
      mockUpdateClassNameForTeacher.mockResolvedValue(mockResult);

      const { updateClassNameAction } = await import("./class-management-actions");
      const result = await updateClassNameAction(validInput);

      expect(result).toEqual({ ok: true, data: { name: "高一（1）班" } });
      expect(mockUpdateClassNameForTeacher).toHaveBeenCalledWith(validInput);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/teacher/classes");
    });

    it("returns validation error on missing classId", async () => {
      const { updateClassNameAction } = await import("./class-management-actions");
      const result = await updateClassNameAction({ name: "新班级名称" });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "班级名称不能为空。",
      });
      expect(mockUpdateClassNameForTeacher).not.toHaveBeenCalled();
    });

    it("returns validation error on empty name", async () => {
      const { updateClassNameAction } = await import("./class-management-actions");
      const result = await updateClassNameAction({ classId: "class-1", name: "" });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "班级名称不能为空。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockUpdateClassNameForTeacher.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { updateClassNameAction } = await import("./class-management-actions");
      const result = await updateClassNameAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns not found error for missing class", async () => {
      mockUpdateClassNameForTeacher.mockRejectedValue(new Error("CLASS_NOT_FOUND"));

      const { updateClassNameAction } = await import("./class-management-actions");
      const result = await updateClassNameAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "NOT_FOUND",
        message: "班级不存在或已被移除。",
      });
    });

    it("returns generic error on unexpected exception", async () => {
      mockUpdateClassNameForTeacher.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { updateClassNameAction } = await import("./class-management-actions");
      const result = await updateClassNameAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "ACTION_FAILED",
        message: "班级名称暂时没有保存成功，请稍后重试。",
      });
    });
  });

  describe("importClassesAction", () => {
    const validInput = {
      schoolId: "school-1",
      classNames: ["高一（1）班", "高一（2）班"],
    };

    it("returns success with import counts on valid input", async () => {
      const mockResult = { totalCount: 2, createdCount: 2, skippedCount: 0 };
      mockImportClassesForTeacher.mockResolvedValue(mockResult);

      const { importClassesAction } = await import("./class-management-actions");
      const result = await importClassesAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockImportClassesForTeacher).toHaveBeenCalledWith(validInput);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/teacher/classes");
    });

    it("returns success when some classes already exist", async () => {
      const mockResult = { totalCount: 3, createdCount: 1, skippedCount: 2 };
      mockImportClassesForTeacher.mockResolvedValue(mockResult);

      const { importClassesAction } = await import("./class-management-actions");
      const result = await importClassesAction({
        schoolId: "school-1",
        classNames: ["高一（1）班", "高一（2）班", "高一（3）班"],
      });

      expect(result).toEqual({ ok: true, data: mockResult });
    });

    it("returns validation error on missing schoolId", async () => {
      const { importClassesAction } = await import("./class-management-actions");
      const result = await importClassesAction({ classNames: ["高一（1）班"] });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "未识别到有效的班级数据。",
      });
      expect(mockImportClassesForTeacher).not.toHaveBeenCalled();
    });

    it("returns validation error on empty classNames", async () => {
      const { importClassesAction } = await import("./class-management-actions");
      const result = await importClassesAction({ schoolId: "school-1", classNames: [] });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "未识别到有效的班级数据。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockImportClassesForTeacher.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { importClassesAction } = await import("./class-management-actions");
      const result = await importClassesAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns generic error on unexpected exception", async () => {
      mockImportClassesForTeacher.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { importClassesAction } = await import("./class-management-actions");
      const result = await importClassesAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "ACTION_FAILED",
        message: "班级导入暂时没有成功，请稍后重试。",
      });
    });
  });

  describe("importClassRosterAction", () => {
    const validInput = {
      schoolId: "school-1",
      rows: [
        { className: "高一（1）班", studentName: "张三", studentNumber: "S2026001", gender: "male" as const },
        { className: "高一（1）班", studentName: "李四", studentNumber: "S2026002", gender: "female" as const },
      ],
      createMissingClasses: true,
    };

    it("returns success with import counts on valid input", async () => {
      const mockResult = {
        ok: true,
        createdClassCount: 1,
        createdStudentCount: 2,
        linkedStudentCount: 2,
      };
      mockImportClassRosterForTeacher.mockResolvedValue(mockResult);

      const { importClassRosterAction } = await import("./class-management-actions");
      const result = await importClassRosterAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockImportClassRosterForTeacher).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/teacher/classes");
    });

    it("returns missing classes error when classes don't exist and createMissingClasses is false", async () => {
      const mockResult = {
        ok: false,
        error: "MISSING_CLASSES",
        missingClassNames: ["高一（99）班"],
      };
      mockImportClassRosterForTeacher.mockResolvedValue(mockResult);

      const { importClassRosterAction } = await import("./class-management-actions");
      const result = await importClassRosterAction({
        ...validInput,
        createMissingClasses: false,
      });

      expect(result).toEqual({
        ok: false,
        error: "MISSING_CLASSES",
        message: "发现部分班级尚未创建。",
        missingClassNames: ["高一（99）班"],
      });
    });

    it("returns validation error on missing schoolId", async () => {
      const { importClassRosterAction } = await import("./class-management-actions");
      const result = await importClassRosterAction({
        rows: [{ className: "高一（1）班", studentName: "张三", studentNumber: "S2026001", gender: "male" as const }],
        createMissingClasses: true,
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "未识别到有效的学生名册数据。",
      });
    });

    it("returns validation error on empty rows", async () => {
      const { importClassRosterAction } = await import("./class-management-actions");
      const result = await importClassRosterAction({
        schoolId: "school-1",
        rows: [],
        createMissingClasses: true,
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "未识别到有效的学生名册数据。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockImportClassRosterForTeacher.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { importClassRosterAction } = await import("./class-management-actions");
      const result = await importClassRosterAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });
  });

  describe("resetStudentPasswordsAction", () => {
    const validInput = {
      studentIds: ["student-1", "student-2"],
      password: "NewPassword#2026",
    };

    it("returns success with updated count on valid input", async () => {
      const mockResult = { updatedCount: 2 };
      mockResetStudentPasswordsForTeacher.mockResolvedValue(mockResult);

      const { resetStudentPasswordsAction } = await import("./class-management-actions");
      const result = await resetStudentPasswordsAction(validInput);

      expect(result).toEqual({ ok: true, data: { updatedCount: 2 } });
      expect(mockResetStudentPasswordsForTeacher).toHaveBeenCalledWith(validInput);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/teacher/classes");
    });

    it("returns validation error on empty studentIds", async () => {
      const { resetStudentPasswordsAction } = await import("./class-management-actions");
      const result = await resetStudentPasswordsAction({
        studentIds: [],
        password: "NewPassword#2026",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "请输入有效的新密码和学生范围。",
      });
    });

    it("returns validation error on missing password", async () => {
      const { resetStudentPasswordsAction } = await import("./class-management-actions");
      const result = await resetStudentPasswordsAction({
        studentIds: ["student-1"],
        password: "",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "请输入有效的新密码和学生范围。",
      });
    });

    it("returns not found error for missing students", async () => {
      mockResetStudentPasswordsForTeacher.mockRejectedValue(new Error("STUDENT_NOT_FOUND"));

      const { resetStudentPasswordsAction } = await import("./class-management-actions");
      const result = await resetStudentPasswordsAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "NOT_FOUND",
        message: "学生不存在或已被移除。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockResetStudentPasswordsForTeacher.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { resetStudentPasswordsAction } = await import("./class-management-actions");
      const result = await resetStudentPasswordsAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });
  });

  describe("deleteStudentsAction", () => {
    const validInput = {
      studentIds: ["student-1", "student-2"],
    };

    it("returns success with deleted count on valid input", async () => {
      const mockResult = { deletedCount: 2 };
      mockDeleteStudentsForTeacher.mockResolvedValue(mockResult);

      const { deleteStudentsAction } = await import("./class-management-actions");
      const result = await deleteStudentsAction(validInput);

      expect(result).toEqual({ ok: true, data: { deletedCount: 2 } });
      expect(mockDeleteStudentsForTeacher).toHaveBeenCalledWith(validInput);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/teacher/classes");
    });

    it("returns validation error on empty studentIds", async () => {
      const { deleteStudentsAction } = await import("./class-management-actions");
      const result = await deleteStudentsAction({ studentIds: [] });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "请选择要删除的学生。",
      });
      expect(mockDeleteStudentsForTeacher).not.toHaveBeenCalled();
    });

    it("returns not found error for missing students", async () => {
      mockDeleteStudentsForTeacher.mockRejectedValue(new Error("STUDENT_NOT_FOUND"));

      const { deleteStudentsAction } = await import("./class-management-actions");
      const result = await deleteStudentsAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "NOT_FOUND",
        message: "学生不存在或已被移除。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockDeleteStudentsForTeacher.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { deleteStudentsAction } = await import("./class-management-actions");
      const result = await deleteStudentsAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns generic error on unexpected exception", async () => {
      mockDeleteStudentsForTeacher.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { deleteStudentsAction } = await import("./class-management-actions");
      const result = await deleteStudentsAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "ACTION_FAILED",
        message: "学生删除失败，请稍后重试。",
      });
    });
  });

  describe("deleteClassesAction", () => {
    const validInput = {
      classIds: ["class-1", "class-2"],
    };

    it("returns success with deleted count on valid input", async () => {
      const mockResult = { deletedCount: 2 };
      mockDeleteClassesForTeacher.mockResolvedValue(mockResult);

      const { deleteClassesAction } = await import("./class-management-actions");
      const result = await deleteClassesAction(validInput);

      expect(result).toEqual({ ok: true, data: { deletedCount: 2 } });
      expect(mockDeleteClassesForTeacher).toHaveBeenCalledWith(validInput);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/teacher/classes");
    });

    it("returns validation error on empty classIds", async () => {
      const { deleteClassesAction } = await import("./class-management-actions");
      const result = await deleteClassesAction({ classIds: [] });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "请选择要删除的班级。",
      });
      expect(mockDeleteClassesForTeacher).not.toHaveBeenCalled();
    });

    it("returns not found error for missing classes", async () => {
      mockDeleteClassesForTeacher.mockRejectedValue(new Error("CLASS_NOT_FOUND"));

      const { deleteClassesAction } = await import("./class-management-actions");
      const result = await deleteClassesAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "NOT_FOUND",
        message: "班级不存在或已被移除。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockDeleteClassesForTeacher.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { deleteClassesAction } = await import("./class-management-actions");
      const result = await deleteClassesAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns generic error on unexpected exception", async () => {
      mockDeleteClassesForTeacher.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { deleteClassesAction } = await import("./class-management-actions");
      const result = await deleteClassesAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "ACTION_FAILED",
        message: "班级删除失败，请稍后重试。",
      });
    });
  });
});