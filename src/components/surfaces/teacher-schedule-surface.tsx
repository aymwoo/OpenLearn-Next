import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowRight, BellRing, CalendarDays, RefreshCw, Sparkles, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { ScheduleImportModal } from "@/components/surfaces/schedule-import-modal";
import type { TeacherDailyAgendaDTO } from "@/features/schedule/shared/dto/runtime";
import { cn } from "@/lib/utils";

const quickActions = [
  {
    href: "/teacher/schedule/import",
    title: "导入课程表",
    description: "上传并审核标准课表数据，快速生成教师日程基线。",
    icon: <Upload className="size-5" aria-hidden />,
  },
  {
    href: "/teacher/schedule/changes",
    title: "单次变更与节假日",
    description: "处理调课、停课与节假日设置，保持当日课表准确。",
    icon: <RefreshCw className="size-5" aria-hidden />,
  },
  {
    href: "/teacher/schedule/assistant",
    title: "AI 助手",
    description: "让 AI 帮你识别排课风险，并给出可执行调整建议。",
    icon: <Sparkles className="size-5" aria-hidden />,
  },
  {
    href: "/teacher/schedule/reminders",
    title: "提醒配置",
    description: "设置上课前提醒节奏，避免遗漏临近课程安排。",
    icon: <BellRing className="size-5" aria-hidden />,
  },
] as const;

export function TeacherScheduleSurface({ data }: { data: TeacherDailyAgendaDTO }) {
  const empty = data.cards.length === 0;

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,22rem)]">
          <div className="space-y-3">
            <Badge variant="accent">教师个人日程</Badge>
            <div className="space-y-2">
              <h1 className="text-[2.5rem] font-semibold tracking-[-0.03em] text-on-surface">今天先看什么时候、给谁上、在哪里上</h1>
              <p className="max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
                今日课表先呈现运行时调度信息，再补充教案与提醒。所有议程都来自标准课表模型、单次调课与校历规则。
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:items-end">
            <ScheduleImportModal schoolId={data.schoolId} />

            <div className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
              <p className="text-sm text-on-surface-variant">日期与节奏</p>
              <p className="mt-3 text-2xl font-semibold text-on-surface">{data.dateLabel}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{data.weekLabel}</p>
              <p className="mt-3 text-sm text-on-surface-variant">{data.nextClassCountdownLabel ?? "今天暂时没有下一节待执行课程。"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-[1.35rem] font-semibold text-on-surface">快捷操作</h2>
              <p className="text-sm leading-7 text-on-surface-variant">从日程总览快速进入课表维护、提醒配置与 AI 辅助处理。</p>
            </div>
            <CalendarDays className="size-5 text-on-surface-variant" aria-hidden />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <QuickActionCard key={action.href} {...action} />
            ))}
          </div>
        </div>
      </section>

      {empty ? (
        <section className={teacherSurfaceRhythm.section}>
          <div className={cn(teacherSurfaceRhythm.cardInset, "p-6")}>
            <h2 className="text-[1.35rem] font-semibold text-on-surface">今天还没有生成可执行课表</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-on-surface-variant">
              先导入并审核课表数据，或检查今天是否被设置为节假日/非教学日。
            </p>
          </div>
        </section>
      ) : (
        <section className={teacherSurfaceRhythm.section}>
          <div className="space-y-4">
            {data.cards.map((card) => (
              <article key={card.id} className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="时间" value={card.timeLabel} />
                    <Field label="班级" value={card.classLabel} heading />
                    <Field label="地点" value={card.locationLabel} />
                    <Field label="状态" value={card.status} heading={card.status === "进行中"} />
                  </div>
                  <div className="flex items-center gap-2">
                    {card.overrideSummary ? <Badge>{card.overrideSummary}</Badge> : null}
                    {card.lessonLink ? (
                      <Link className="text-sm font-medium text-primary" href={`/teacher/editor/preview?lessonId=${card.lessonLink.lessonId}&courseId=${card.lessonLink.courseId}`}>
                        查看教案
                      </Link>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-on-surface-variant">{card.courseTitle}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        teacherSurfaceRhythm.cardInset,
        "group flex min-h-40 flex-col justify-between p-5 transition-shadow hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-full bg-surface-container-low p-3 text-on-surface-variant transition-colors group-hover:text-primary">
          {icon}
        </div>
        <ArrowRight className="mt-1 size-4 text-on-surface-variant transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-on-surface">{title}</h3>
        <p className="text-sm leading-7 text-on-surface-variant">{description}</p>
      </div>
    </Link>
  );
}

function Field({ label, value, heading = false }: { label: string; value: string; heading?: boolean }) {
  return (
    <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className={cn("mt-2 text-sm text-on-surface", heading ? "text-base font-semibold" : "font-medium")}>{value}</p>
    </div>
  );
}
