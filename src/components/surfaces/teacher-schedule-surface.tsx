import Link from "next/link";
import type { ReactNode } from "react";

import { CalendarDays, Download, FileSpreadsheet, PencilLine, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { ScheduleImportModal } from "@/components/surfaces/schedule-import-modal";
import { deleteScheduleImportBatchAction } from "@/features/schedule/import/actions";
import type { ScheduleImportBatchDTO } from "@/features/schedule/shared/dto/import";
import type { TeacherDailyAgendaDTO, TeacherWeeklyScheduleCellDTO } from "@/features/schedule/shared/dto/runtime";
import { cn } from "@/lib/utils";

export function TeacherScheduleSurface({
  data,
  latestImportBatch = null,
  importBatches = [],
}: {
  data: TeacherDailyAgendaDTO;
  latestImportBatch?: ScheduleImportBatchDTO | null;
  importBatches?: ScheduleImportBatchDTO[];
}) {
  const hasCurrentSchedule = data.weeklySchedule.rows.some((row) => row.cells.some((cell) => cell !== null));
  const currentBatch = latestImportBatch ?? importBatches[0] ?? null;
  const historyBatches = importBatches.filter((batch) => batch.id !== currentBatch?.id);
  const currentTermLabel = currentBatch ? getBatchTermLabel(currentBatch) : "当前学期";

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,24rem)] xl:items-end">
          <div className="space-y-4">
            <Badge variant="accent">课表管理</Badge>
            <div className="space-y-2">
              <h1 className="text-[2.5rem] font-semibold tracking-[-0.03em] text-on-surface">当前学期课表</h1>
              <p className="max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
                版式按 Stitch 的课表管理页收敛为单主视图，优先展示当前学期课表；如果还没有导入，则在这里直接提醒，并把历史学期放到下方统一管理。
              </p>
            </div>
          </div>

          <div className={cn(teacherSurfaceRhythm.heroInset, "space-y-4")}> 
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-on-surface-variant">当前学期</p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">{currentTermLabel}</p>
              </div>
              <ScheduleImportModal schoolId={data.schoolId} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="更新日期" value={data.dateLabel} helper={data.weekLabel} />
              <MetricCard label="导入状态" value={currentBatch ? batchStatusLabel(currentBatch.status) : "未导入"} helper={currentBatch ? `${currentBatch.approvedRowCount}/${currentBatch.rowCount} 已生效` : "请先导入当前学期课表"} />
              <MetricCard label="下节课程" value={data.nextClassCountdownLabel ?? "暂无安排"} helper={currentBatch ? `来源：${currentBatch.sourceLabel}` : "支持 CSV / XLSX 模板导入"} />
            </div>
          </div>
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">主课表</p>
              <h2 className="text-[1.5rem] font-semibold text-on-surface">{currentTermLabel}课程表</h2>
              <p className="text-sm leading-7 text-on-surface-variant">以当前学期为主视图，保留时间轴与工作日列的统一排版。</p>
            </div>
            <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant")}>
              覆盖范围：{data.weeklySchedule.rangeLabel}
            </div>
          </div>

          {hasCurrentSchedule ? (
            <div className={cn(teacherSurfaceRhythm.cardInset, "overflow-hidden p-4 md:p-5")}>
              <div className="grid min-w-[54rem] grid-cols-[8rem_repeat(5,minmax(0,1fr))] gap-3">
                <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low px-4 py-4 text-sm font-medium text-on-surface-variant")}>
                  时间 / 星期
                </div>
                {data.weeklySchedule.weekdays.map((weekday) => (
                  <div
                    key={weekday.key}
                    className={cn(
                      teacherSurfaceRhythm.card,
                      "px-4 py-4 text-sm",
                      weekday.isToday ? "bg-primary/10 text-primary" : "bg-surface-container-low text-on-surface",
                    )}
                  >
                    <p className="font-semibold">{weekday.shortLabel}</p>
                    <p className="mt-1 text-xs opacity-80">{weekday.label.replace(`${weekday.shortLabel} `, "")}</p>
                  </div>
                ))}

                {data.weeklySchedule.rows.map((row) => (
                  <RowWithCells key={row.slotId} row={row} />
                ))}
              </div>
            </div>
          ) : (
            <div className={cn(teacherSurfaceRhythm.cardInset, "p-6 sm:p-7")}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-primary">
                    <FileSpreadsheet className="size-5" aria-hidden />
                    <p className="text-sm font-medium">当前学期尚未导入课表</p>
                  </div>
                  <div>
                    <h3 className="text-[1.35rem] font-semibold text-on-surface">先导入当前学期课表，再开始日常维护</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
                      这里不再展示行政审核流程。导入后会直接以当前学期课表作为主视图，下方保留历史学期记录供下载、删除和变更管理。
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ScheduleImportModal schoolId={data.schoolId} />
                  <Link
                    href="/teacher/schedule/import/template"
                    className="inline-flex items-center rounded-full bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container-highest"
                  >
                    下载导入模板
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">历史学期</p>
              <h2 className="text-[1.5rem] font-semibold text-on-surface">历史课表列表</h2>
              <p className="text-sm leading-7 text-on-surface-variant">每个学期一行，右侧保留下载、删除、变更管理按钮。</p>
            </div>
            <CalendarDays className="size-5 text-on-surface-variant" aria-hidden />
          </div>

          {historyBatches.length > 0 ? (
            <div className="space-y-3">
              {historyBatches.map((batch) => (
                <article
                  key={batch.id}
                  className={cn(
                    teacherSurfaceRhythm.cardInset,
                    "grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.3fr)_auto] lg:items-center",
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_auto_auto] md:items-center">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-on-surface">{getBatchTermLabel(batch)}</h3>
                        <Badge>{batchStatusLabel(batch.status)}</Badge>
                      </div>
                      <p className="text-sm text-on-surface-variant">{batch.sourceLabel}</p>
                    </div>

                    <div className="text-sm text-on-surface-variant">
                      <p>导入时间</p>
                      <p className="mt-1 font-medium text-on-surface">{formatBatchDate(batch.updatedAt)}</p>
                    </div>

                    <div className="text-sm text-on-surface-variant">
                      <p>生效情况</p>
                      <p className="mt-1 font-medium text-on-surface">
                        {batch.approvedRowCount}/{batch.rowCount}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <ManageIconButton as="a" href={`/teacher/schedule/export/${batch.id}`} label={`下载 ${getBatchTermLabel(batch)} 导入批次`}>
                      <Download className="size-4" aria-hidden />
                    </ManageIconButton>
                    <form action={deleteScheduleImportBatchAction.bind(null, batch.id)}>
                      <ManageIconButton label={`删除 ${getBatchTermLabel(batch)} 课表`} submit>
                        <Trash2 className="size-4" aria-hidden />
                      </ManageIconButton>
                    </form>
                    <ManageIconButton as="link" href="/teacher/schedule/changes" label={`更改 ${getBatchTermLabel(batch)} 课表`}>
                      <PencilLine className="size-4" aria-hidden />
                    </ManageIconButton>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={cn(teacherSurfaceRhythm.cardInset, "p-5 text-sm text-on-surface-variant")}>
              暂无历史学期课表记录。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-on-surface">{value}</p>
      <p className="mt-2 text-xs text-on-surface-variant">{helper}</p>
    </div>
  );
}

function RowWithCells({
  row,
}: {
  row: TeacherDailyAgendaDTO["weeklySchedule"]["rows"][number];
}) {
  return (
    <>
      <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low px-4 py-4")}>
        <p className="text-sm font-semibold text-on-surface">{row.bellSlotLabel}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{row.timeLabel}</p>
      </div>
      {row.cells.map((cell, index) => (
        <WeeklyCell key={`${row.slotId}-${index}`} cell={cell} />
      ))}
    </>
  );
}

function WeeklyCell({ cell }: { cell: TeacherWeeklyScheduleCellDTO | null }) {
  if (!cell) {
    return <div className={cn(teacherSurfaceRhythm.card, "min-h-32 bg-surface-container-low/60 px-4 py-4 text-sm text-on-surface-variant")}>本节暂无安排</div>;
  }

  return (
    <div className={cn(teacherSurfaceRhythm.card, "min-h-32 bg-surface-container-lowest px-4 py-4 shadow-[0_10px_28px_rgba(44,47,49,0.04)]")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-on-surface">{cell.courseTitle}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{cell.classLabel}</p>
        </div>
        <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">
          {cell.status}
        </span>
      </div>
      <div className="mt-4 space-y-1 text-xs text-on-surface-variant">
        <p>{cell.locationLabel}</p>
        <p>{cell.timeLabel}</p>
        {cell.overrideSummary ? <p className="text-primary">{cell.overrideSummary}</p> : null}
      </div>
    </div>
  );
}

function getBatchTermLabel(batch: ScheduleImportBatchDTO) {
  return batch.rows.find((row) => row.mappingSummary?.termName)?.mappingSummary?.termName ?? batch.sourceLabel;
}

function batchStatusLabel(status: ScheduleImportBatchDTO["status"]) {
  switch (status) {
    case "draft":
      return "草稿";
    case "in_review":
      return "导入中";
    case "ready_to_apply":
      return "待生效";
    case "partially_applied":
      return "部分生效";
    case "applied":
      return "已生效";
    case "archived":
      return "已归档";
    default:
      return status;
  }
}

function formatBatchDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function ManageIconButton({
  as = "button",
  href,
  children,
  label,
  disabled = false,
  submit = false,
}: {
  as?: "button" | "a" | "link";
  href?: string;
  children: ReactNode;
  label: string;
  disabled?: boolean;
  submit?: boolean;
}) {
  const className = cn(
    "grid size-9 place-items-center rounded-full text-on-surface-variant transition-colors",
    disabled ? "cursor-not-allowed bg-surface-container-low text-on-surface-variant/50" : "hover:bg-surface-container-low hover:text-primary",
  );

  if (as === "link" && href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }

  if (as === "a" && href) {
    return (
      <a href={href} aria-label={label} className={className} download>
        {children}
      </a>
    );
  }

  return (
    <button type={submit ? "submit" : "button"} aria-label={label} className={className} disabled={disabled}>
      {children}
    </button>
  );
}
