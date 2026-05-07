"use client";

import { useState } from "react";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Import,
  Plus,
  School,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const classSummary = {
  averageGrade: "88.5",
  homeroomTeacher: "李薇",
  nextSession: "数学（10:00）",
  room: "科学楼 402",
  totalStudents: "45",
} as const;

const students = [
  {
    avatar:
      "https://lh3.googleusercontent.com/aida/ADBb0uj_SR2YDoQ3rEHcGvUgonEaf9K1o2FJpezH2ayUdPvvv-ssOj298IbbYbzGMrJV0kMQwUQb7Cc6F-qO4igjL25ONMJobB6NtwV0E7fm9amRcTSct2jDhAqBq7p6XBPHWHI2psFBaD7MCdvRQcs7R-Gt2U_BLhg85iIV4pXsIpoyV5g6WdW62vWFAKgvY8VAakxvdQ1psnYEyxNeNMg-Zehuz956DU0gKJbrBf7ILcki9W6Yb9Xdg9KW9g",
    name: "陈宇",
    idNumber: "202309001",
    progress: 90,
  },
  {
    avatar:
      "https://lh3.googleusercontent.com/aida/ADBb0uhnnotePweaFDceiuqlcUrPlU_a2i4x9oRr3iXfUc9loytRVSU19pqfDR_4LCCliesxX_SaV0aVYjgGWK39-ZGCfhYgNpqMLxyd7sFoDjaPFCBxMErqWerxsnfZEZCdE8M9nkOjA28mUNMmhBdb2a-bSTomdPUBTbWpWY8dlIZoNWlz_Mu8vGYDD20lH2q8Eeqrr0HPBXJijMAadAlyreVclBx48MfNG642diuj7svm51ob3zbUEr9xHZA",
    name: "林梅",
    idNumber: "202309002",
    progress: 85,
  },
  {
    avatar: "王",
    name: "王强",
    idNumber: "202309003",
    progress: 60,
  },
  {
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJ_ieUMLYFbwdEVazHJdN-x2yh6bi797hewbhMBNUZcnf7Zi4TZloZJEsDPUxQV2OmA-yLIU60uBYgxZnOBh-hgg_kqdfA45Odq4hxr29NjNeDrrR7P6x_rQxOVo741QvF0BccYGWafj0SbNXmT1GRQ7HGoHegwgom3JWjZA8_AwdsA3C-g8goZbf-2lmqJRN0f4Maj06n-mf3yLCB0T8Oshi408QzdTmm5G5DfDdTXE7GyfC2QUaytPr6dC1M410wxtVzs7sP8rTM",
    name: "张华",
    idNumber: "202309004",
    progress: 75,
  },
  {
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDhT2it-PnR7-mFii2g_qkm63Cpx8KE7BO3uQJvx3D8gT_dg_x59ZsGNPYd-EpGOGxEOCRHLU4yQ8lS5SkCYASISco06vuYCk3X-nXjjRH1XRIoE85hefil6DcYl-NSGnbnq_u0yEfkseay9FYdvTb4hX3WC9LNh6lXWFxsgQCOlT2F_ya-cK5bFOzQvUE1_dGjGNpFe-rSDNwvUDG-1PMQ5gMdEbIgzpoI_O9qJledfQoJwDDvDbqTXuauD_WDm3TPflxuwjRH2GA",
    name: "李静",
    idNumber: "202309005",
    progress: 95,
  },
];

export function ClassManagementSurface() {
  const [activeStatus, setActiveStatus] = useState<string>("所有状态");
  const [activeGender, setActiveGender] = useState<string>("所有性别");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Filter by status and gender — 当前数据无 status/gender 字段，
  // 非"所有"选项返回空结果（UI pill 切换仍正常工作）
  const filteredStudents = students.filter(() => {
    if (activeStatus !== "所有状态") return false;
    if (activeGender !== "所有性别") return false;
    return true;
  });

  return (
    <div className="mx-auto flex w-full flex-col gap-4 pb-10 pt-2">
      <section className="relative overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-low px-5 py-5 sm:px-6 sm:py-6">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary">当前班级</Badge>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-tertiary">
                <CheckCircle2 className="size-4" aria-hidden />
                出勤表现优秀
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.4rem]">
                九年级 3 班
              </h1>
              <p className="text-sm text-on-surface-variant sm:text-base">
                班主任：{classSummary.homeroomTeacher} | 教室：{" "}
                {classSummary.room}
              </p>
            </div>

            <div className="flex flex-wrap gap-5 pt-1">
              <Metric label="班级人数" value={classSummary.totalStudents} />
              <Metric label="平均成绩" value={classSummary.averageGrade} />
              <Metric label="下一节课" value={classSummary.nextSession} />
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <Button className="min-h-10 gap-2 px-5 text-sm">
              编辑班级信息
            </Button>
            <Button
              variant="secondary"
              className="min-h-10 gap-2 bg-primary/10 px-5 text-sm text-primary shadow-none hover:bg-primary/15"
            >
              查看课表
            </Button>
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-6 right-0 text-primary/10">
          <School className="size-36 sm:size-40" aria-hidden />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-on-surface">
            学生名册
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              className="min-h-9 gap-1.5 px-3 text-xs shadow-none"
            >
              <Import className="size-4" aria-hidden />
              导入名单
            </Button>
            <Button className="min-h-9 gap-1.5 px-4 text-xs">
              <Plus className="size-4" aria-hidden />
              添加学生
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-container-lowest p-3 shadow-[0_4px_24px_rgba(0,0,0,0.02)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-[17rem]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
                aria-hidden
              />
              <input
                type="text"
                placeholder="按姓名或学号搜索..."
                className="min-h-9 w-full rounded-[0.75rem] bg-surface-container-high pl-9 pr-3 text-xs text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/20"
              />
            </div>

            <FilterPill
              label="所有状态"
              active={activeStatus === "所有状态"}
              onClick={() => setActiveStatus("所有状态")}
            />
            <FilterPill
              label="在读"
              active={activeStatus === "在读"}
              onClick={() =>
                setActiveStatus((prev) => (prev === "在读" ? "所有状态" : "在读"))
              }
            />
            <FilterPill
              label="请假"
              active={activeStatus === "请假"}
              onClick={() =>
                setActiveStatus((prev) => (prev === "请假" ? "所有状态" : "请假"))
              }
            />
            <FilterPill
              label="所有性别"
              active={activeGender === "所有性别"}
              onClick={() => setActiveGender("所有性别")}
            />
            <FilterPill
              label="男"
              active={activeGender === "男"}
              onClick={() =>
                setActiveGender((prev) => (prev === "男" ? "所有性别" : "男"))
              }
            />
            <FilterPill
              label="女"
              active={activeGender === "女"}
              onClick={() =>
                setActiveGender((prev) => (prev === "女" ? "所有性别" : "女"))
              }
            />
          </div>

          <div className="flex items-center justify-end gap-1.5 text-xs text-on-surface-variant">
            <span>批量操作：</span>
            <IconButton label="下载">
              <Download className="size-4" aria-hidden />
            </IconButton>
            <IconButton label="删除">
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          </div>
        </div>

        <div className="space-y-2">
          <div className="hidden grid-cols-[40px_minmax(0,2fr)_minmax(0,1fr)] gap-3 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant md:grid">
            <div>
              <input
                type="checkbox"
                className="size-3 rounded border border-outline-variant bg-surface-container-high"
              />
            </div>
            <div>学生</div>
            <div>学号</div>
          </div>

          {filteredStudents.map((student) => (
            <article
              key={student.idNumber}
              className="group grid gap-3 rounded-[var(--radius-card)] bg-surface-container-lowest px-3 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-colors hover:bg-white md:grid-cols-[40px_minmax(0,2fr)_minmax(0,1fr)] md:items-center md:px-4"
            >
              <div className="hidden md:flex">
                <input
                  type="checkbox"
                  className="size-3 rounded border border-outline-variant bg-surface-container-high"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex md:hidden">
                  <input
                    type="checkbox"
                    className="mt-1 size-3 rounded border border-outline-variant bg-surface-container-high"
                  />
                </div>
                {student.avatar.startsWith("http") ? (
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {student.avatar}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">
                    {student.name}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant md:hidden">
                    学号：{student.idNumber}
                  </p>
                </div>
              </div>

              <p className="hidden text-xs text-on-surface-variant md:block">
                {student.idNumber}
              </p>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 text-xs text-on-surface-variant">
          <span>显示第 1 - 5 位学生，共 45 位</span>

          <div className="flex items-center gap-1.5">
            <PaginationButton label="上一页">
              <ChevronLeft className="size-4" aria-hidden />
            </PaginationButton>
            <PaginationButton label="下一页">
              <ChevronRight className="size-4" aria-hidden />
            </PaginationButton>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[96px] flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </span>
      <span className="text-xl font-semibold text-primary">{value}</span>
    </div>
  );
}

function FilterPill({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "min-h-9 rounded-[0.75rem] bg-primary/10 px-3 text-xs font-medium text-primary ring-1 ring-primary/20 transition-colors"
          : "min-h-9 rounded-[0.75rem] bg-surface-container-high px-3 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-highest"
      }
    >
      {label}
    </button>
  );
}

function IconButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
    >
      {children}
    </button>
  );
}

function PaginationButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-8 place-items-center rounded-full bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container-high"
    >
      {children}
    </button>
  );
}

function StudentCard({
  avatar,
  name,
  idNumber,
  progress,
}: {
  avatar: string;
  name: string;
  idNumber: string;
  progress: number;
}) {
  const ringColor = progress >= 75 ? "text-primary" : "text-tertiary";
  return (
    <article className="flex flex-col items-center justify-center gap-1 rounded-[1.5rem] bg-surface-container-lowest p-2 shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-colors hover:bg-white">
      {/* Avatar + ring container */}
      <div className="relative flex size-12 items-center justify-center">
        <svg
          className="absolute inset-0 size-full -rotate-90"
          viewBox="0 0 36 36"
          aria-hidden
        >
          {/* Track */}
          <path
            className="text-surface-container-highest"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          {/* Progress arc */}
          <path
            className={ringColor}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${progress}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        {avatar.startsWith("http") ? (
          <img
            src={avatar}
            alt={name}
            className="relative z-10 size-9 rounded-full object-cover"
          />
        ) : (
          <div className="relative z-10 grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {avatar}
          </div>
        )}
      </div>
      {/* Text */}
      <div className="flex flex-col items-center">
        <span className="text-xs font-bold leading-tight text-on-surface">
          {name}
        </span>
        <span className="text-[9px] text-on-surface-variant">{idNumber}</span>
      </div>
    </article>
  );
}
