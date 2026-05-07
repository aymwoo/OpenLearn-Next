"use client";

import { useState } from "react";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  EllipsisVertical,
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
    avatar: "陈",
    enrollmentDate: "2023年9月1日",
    gender: "男",
    idNumber: "202309001",
    name: "陈宇",
    status: "在读",
    statusTone: "success" as const,
  },
  {
    avatar: "林",
    enrollmentDate: "2023年9月1日",
    gender: "女",
    idNumber: "202309002",
    name: "林玫",
    status: "在读",
    statusTone: "success" as const,
  },
  {
    avatar: "王",
    enrollmentDate: "2023年9月1日",
    gender: "男",
    idNumber: "202309003",
    name: "王强",
    status: "请假",
    statusTone: "default" as const,
  },
] as const;

const tableColumns = [
  "学生",
  "学号",
  "性别",
  "入学日期",
  "状态",
] as const;

export function ClassManagementSurface() {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeGender, setActiveGender] = useState<string | null>(null);

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
              label="在读"
              active={activeStatus === "在读"}
              onClick={() =>
                setActiveStatus((prev) => (prev === "在读" ? null : "在读"))
              }
            />
            <FilterPill
              label="请假"
              active={activeStatus === "请假"}
              onClick={() =>
                setActiveStatus((prev) => (prev === "请假" ? null : "请假"))
              }
            />
            <FilterPill
              label="男"
              active={activeGender === "男"}
              onClick={() =>
                setActiveGender((prev) => (prev === "男" ? null : "男"))
              }
            />
            <FilterPill
              label="女"
              active={activeGender === "女"}
              onClick={() =>
                setActiveGender((prev) => (prev === "女" ? null : "女"))
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
          <div className="hidden grid-cols-[40px_minmax(0,1.4fr)_minmax(120px,0.9fr)_minmax(100px,0.8fr)_minmax(150px,1fr)_minmax(120px,0.8fr)] gap-3 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant md:grid">
            <div>
              <input
                type="checkbox"
                className="size-3 rounded border border-outline-variant bg-surface-container-high"
              />
            </div>
            {tableColumns.map((column) => (
              <div key={column}>{column}</div>
            ))}
          </div>

          {students.map((student) => (
            <article
              key={student.idNumber}
              className="group grid gap-3 rounded-[var(--radius-card)] bg-surface-container-lowest px-3 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-colors hover:bg-white md:grid-cols-[40px_minmax(0,1.4fr)_minmax(120px,0.9fr)_minmax(100px,0.8fr)_minmax(150px,1fr)_minmax(120px,0.8fr)] md:items-center md:px-4"
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
                <div className="grid size-7 place-items-center rounded-full bg-surface-container-highest text-xs font-semibold text-on-surface-variant">
                  {student.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">
                    {student.name}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant md:hidden">
                    学号：{student.idNumber}
                  </p>
                </div>
              </div>

              <MetaText value={student.idNumber} />
              <MetaText value={student.gender} />
              <MetaText value={student.enrollmentDate} />

              <div className="flex items-center justify-between gap-3">
                <Badge
                  variant={student.statusTone}
                  className={
                    student.statusTone === "success"
                      ? "bg-tertiary-container/70 text-tertiary"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }
                >
                  {student.status}
                </Badge>
                <button
                  type="button"
                  aria-label={`${student.name} 更多操作`}
                  className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary md:opacity-0 md:group-hover:opacity-100"
                >
                  <EllipsisVertical className="size-4" aria-hidden />
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 text-xs text-on-surface-variant">
          <span>显示第 1 - 3 位学生，共 45 位</span>

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

function MetaText({ value }: { value: string }) {
  return (
    <p className="hidden text-xs text-on-surface-variant md:block">{value}</p>
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
