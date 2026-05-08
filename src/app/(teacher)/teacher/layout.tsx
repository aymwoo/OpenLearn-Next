import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { Sidebar } from "@/components/shell/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search, CalendarDays } from "lucide-react";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
        <Sidebar 
          items={[
            { label: '工作台', href: '/teacher', icon: 'LayoutDashboard' },
            { label: '班级管理', href: '/teacher/classes', icon: 'GraduationCap' },
            { label: '课程管理', href: '/teacher/courses', icon: 'BookOpen' },
            { label: '学生档案', href: '/teacher/students', icon: 'Users' },
            { label: '教学资源', href: '/resources', icon: 'FolderKanban' },
          { label: '批改中心', href: '/teacher/review', icon: 'CheckSquare' },
          { label: '数据报表', href: '/teacher/reports', icon: 'LineChart' },
        ]} 
      />

      <Suspense fallback={<TeacherShellFallback />}> 
        <TeacherLayoutContent>{children}</TeacherLayoutContent>
      </Suspense>
    </div>
  );
}

async function TeacherLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserDTO();

  if (!user) {
    redirect("/login");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const isTeacher = memberships.some((m) => m.role === "teacher" && m.status === "active");

  if (!isTeacher) {
    redirect("/unauthorized");
  }

  const avatarName = user.name?.trim() || "用户";
  const avatarInitial = avatarName.charAt(0).toUpperCase();

  return (
    <main className="my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-surface-container-low shadow-ambient">
      <header className="shrink-0 rounded-t-[2rem] bg-surface-container-low px-6 py-5 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="whitespace-nowrap text-lg font-semibold text-on-surface lg:text-xl">教师工作台</h2>
              <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-medium text-primary shadow-ambient">
                今日 3 节课
              </span>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="教师工作区分区导航">
              <a href="#" className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-medium text-primary shadow-ambient">今日概览</a>
              <a href="#" className="rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-lowest hover:text-on-surface">教学日历</a>
              <a href="#" className="rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-lowest hover:text-on-surface">消息通知</a>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <Button asChild className="px-5 text-sm">
              <Link href="/teacher/launch">开启新课堂</Link>
            </Button>
            <button className="relative rounded-full bg-surface-container-lowest p-2.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40">
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <button className="rounded-full bg-surface-container-lowest p-2.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40">
              <Search className="size-5" />
            </button>
            <button className="rounded-full bg-surface-container-lowest p-2.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40">
              <CalendarDays className="size-5" />
            </button>
            <div className="flex cursor-pointer items-center gap-3 rounded-full bg-surface-container-lowest px-2 py-2 shadow-ambient">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {avatarInitial}
              </div>
              <div className="hidden pr-2 sm:block">
                <p className="text-sm font-medium text-on-surface">{avatarName}</p>
                <p className="text-xs text-on-surface-variant">教师空间</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </main>
  );
}

function TeacherShellFallback() {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface-container-low rounded-[2rem] my-2 mr-2">
      <div className="h-[72px] shrink-0 bg-surface-container-low rounded-t-[2rem]" />
      <div className="flex-1 overflow-y-auto" />
    </main>
  );
}
