import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const classManagementSurfaceSource = readFileSync("src/components/surfaces/class-management-surface.tsx", "utf8");
const editorSettingsModalSource = readFileSync("src/components/authoring/editor-settings-modal.tsx", "utf8");
const scheduleImportModalSource = readFileSync("src/components/surfaces/schedule-import-modal.tsx", "utf8");
const nativeDialogSource = readFileSync("src/components/ui/native-dialog.ts", "utf8");

describe("Native dialog width guards", () => {
  it("centralizes viewport-clamped widths in the shared native dialog helper", () => {
    expect(nativeDialogSource).toContain('sm: "w-[min(28rem,calc(100vw-2rem))]"');
    expect(nativeDialogSource).toContain('md: "w-[min(32rem,calc(100vw-2rem))]"');
    expect(nativeDialogSource).toContain('lg: "w-[min(36rem,calc(100vw-2rem))]"');
    expect(nativeDialogSource).toContain('xl: "w-[min(48rem,calc(100vw-2rem))]"');
    expect(nativeDialogSource).toContain('"2xl": "w-[min(72rem,calc(100vw-2rem))]"');
  });

  it("reuses the shared helper across native dialogs", () => {
    expect(classManagementSurfaceSource).toContain('getNativeDialogClassName(studentViewMode === "list" ? "2xl" : "xl")');
    expect(classManagementSurfaceSource).toContain('getNativeDialogClassName("sm")');
    expect(classManagementSurfaceSource).toContain("useNativeDialogBackdropClose(studentDialogRef, closeStudentModal)");
    expect(classManagementSurfaceSource).toContain("useNativeDialogBackdropClose(");
    expect(editorSettingsModalSource).toContain('getNativeDialogClassName("md"');
    expect(editorSettingsModalSource).toContain("useNativeDialogBackdropClose(dialogRef, closeModal)");
    expect(scheduleImportModalSource).toContain('getNativeDialogClassName(');
    expect(scheduleImportModalSource).toContain('"lg"');
    expect(scheduleImportModalSource).toContain("useNativeDialogBackdropClose(dialogRef, closeModal)");
    expect(classManagementSurfaceSource).not.toContain("w-full max-w-3xl");
    expect(classManagementSurfaceSource).not.toContain("w-full max-w-md");
    expect(editorSettingsModalSource).not.toContain("w-full max-w-lg");
  });

  it("exposes template download links for class and roster imports", () => {
    expect(classManagementSurfaceSource).toContain('href="/teacher/classes/template"');
    expect(classManagementSurfaceSource).toContain('href="/teacher/classes/roster-template"');
    expect(classManagementSurfaceSource).toContain("下载班级导入模板");
    expect(classManagementSurfaceSource).toContain("下载学生名册模板");
  });

  it("keeps template download links in the title area before import actions", () => {
    expect(classManagementSurfaceSource.indexOf("下载班级导入模板")).toBeLessThan(
      classManagementSurfaceSource.indexOf("导入班级"),
    );
    expect(classManagementSurfaceSource.indexOf("下载学生名册模板")).toBeLessThan(
      classManagementSurfaceSource.indexOf("导入学生名册"),
    );
  });

  it("supports card and list roster views with filters and batch actions", () => {
    expect(classManagementSurfaceSource).toContain('const [studentViewMode, setStudentViewMode] = useState<StudentViewMode>("cards")');
    expect(classManagementSurfaceSource).toContain("按姓名或学号搜索...");
    expect(classManagementSurfaceSource).toContain("所有状态");
    expect(classManagementSurfaceSource).toContain("批量操作");
    expect(classManagementSurfaceSource).toContain("导出选中");
    expect(classManagementSurfaceSource).toContain("全选当前结果");
    expect(classManagementSurfaceSource).toContain("StudentProgressAvatar");
  });

  it("uses gender-aware roster imports and default avatars", () => {
    expect(classManagementSurfaceSource).toContain("className,studentName,studentNumber,gender");
    expect(classManagementSurfaceSource).toContain("parseRosterImportCsv");
    expect(classManagementSurfaceSource).toContain('/avatars/student-boy.svg');
    expect(classManagementSurfaceSource).toContain('/avatars/student-girl.svg');
    expect(classManagementSurfaceSource).not.toContain("student.name.slice(0, 1)");
  });
});
