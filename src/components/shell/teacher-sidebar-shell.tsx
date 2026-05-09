import type { ReactNode } from "react";

import { Sidebar } from "@/components/shell/sidebar";

const teacherSidebarItems = [
  { label: "工作台", href: "/teacher", icon: "LayoutDashboard" },
  { label: "班级管理", href: "/teacher/classes", icon: "GraduationCap" },
  { label: "课程管理", href: "/teacher/courses", icon: "BookOpen" },
  { label: "学生档案", href: "/teacher/students", icon: "Users" },
  { label: "教学资源", href: "/resources", icon: "FolderKanban" },
  { label: "批改中心", href: "/teacher/review", icon: "CheckSquare" },
  { label: "数据报表", href: "/teacher/reports", icon: "LineChart" },
] as const;

type TeacherSidebarShellProps = {
  children: ReactNode;
};

export function TeacherSidebarShell({ children }: TeacherSidebarShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar items={teacherSidebarItems} />
      <main className="my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-surface-container-low shadow-ambient">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
