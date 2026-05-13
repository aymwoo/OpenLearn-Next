"use client";

import type { FocusEvent, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, GraduationCap, MapPin, Sparkles, UserRound } from "lucide-react";

import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { TeacherDailyAgendaDTO, TeacherWeeklyScheduleCellDTO, TeacherWeeklyScheduleDTO } from "@/features/schedule/shared/dto/runtime";
import { cn } from "@/lib/utils";

type TeacherScheduleWeekGridProps = {
  schedule: TeacherWeeklyScheduleDTO;
  viewMode: TeacherDailyAgendaDTO["viewMode"];
};

type QuickAction = {
  href: string;
  label: string;
  icon: typeof CalendarClock;
};

const quickActions: QuickAction[] = [
  { href: "/teacher/schedule/changes", label: "调课管理", icon: CalendarClock },
  { href: "/teacher/schedule/reminders", label: "提醒配置", icon: Bell },
  { href: "/teacher/classes", label: "查看班级", icon: GraduationCap },
];

export function TeacherScheduleWeekGrid({ schedule, viewMode }: TeacherScheduleWeekGridProps) {
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  return (
    <div className="grid min-w-[62rem] grid-cols-[6.25rem_repeat(5,minmax(0,1fr))] gap-2">
      <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low px-3 py-2.5 text-xs font-medium text-on-surface-variant")}>
        时间 / 星期
      </div>
      {schedule.weekdays.map((weekday) => (
        <div
          key={weekday.key}
          className={cn(
            teacherSurfaceRhythm.card,
            "px-3 py-2.5 text-xs",
            weekday.isToday ? "bg-primary/10 text-primary" : "bg-surface-container-low text-on-surface",
          )}
        >
          <p className="font-semibold">{weekday.shortLabel}</p>
          <p className="mt-0.5 opacity-75">{weekday.label.replace(`${weekday.shortLabel} `, "")}</p>
        </div>
      ))}

      {schedule.rows.map((row) => (
        <WeekGridRow
          key={row.slotId}
          row={row}
          selectedCellId={selectedCellId}
          setSelectedCellId={setSelectedCellId}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}

function WeekGridRow({
  row,
  selectedCellId,
  setSelectedCellId,
  viewMode,
}: {
  row: TeacherWeeklyScheduleDTO["rows"][number];
  selectedCellId: string | null;
  setSelectedCellId: (value: string | null) => void;
  viewMode: TeacherDailyAgendaDTO["viewMode"];
}) {
  return (
    <>
      <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low px-3 py-3")}> 
        <p className="text-sm font-semibold text-on-surface">{row.bellSlotLabel}</p>
        <p className="mt-0.5 text-[11px] text-on-surface-variant">{row.timeLabel}</p>
      </div>
      {row.cells.map((cells, index) => (
        <WeekGridCell
          key={`${row.slotId}-${index}`}
          cells={cells}
          selectedCellId={selectedCellId}
          onSelect={setSelectedCellId}
          viewMode={viewMode}
        />
      ))}
    </>
  );
}

function WeekGridCell({
  cells,
  selectedCellId,
  onSelect,
  viewMode,
}: {
  cells: TeacherWeeklyScheduleCellDTO[];
  selectedCellId: string | null;
  onSelect: (value: string | null) => void;
  viewMode: TeacherDailyAgendaDTO["viewMode"];
}) {
  if (cells.length === 0) {
    return <div className={cn(teacherSurfaceRhythm.card, "min-h-24 bg-surface-container-low/60 px-3 py-3 text-xs text-on-surface-variant")}>本节暂无安排</div>;
  }

  return (
    <div className={cn(teacherSurfaceRhythm.card, "min-h-24 space-y-2 bg-surface-container-lowest px-2 py-2 shadow-[0_10px_28px_rgba(44,47,49,0.04)]")}>
      {cells.map((cell) => (
        <ScheduleEntryCard
          key={cell.id}
          cell={cell}
          isSelected={selectedCellId === cell.id}
          onSelect={onSelect}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}

function ScheduleEntryCard({
  cell,
  isSelected,
  onSelect,
  viewMode,
}: {
  cell: TeacherWeeklyScheduleCellDTO;
  isSelected: boolean;
  onSelect: (value: string | null) => void;
  viewMode: TeacherDailyAgendaDTO["viewMode"];
}) {
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const detailId = `${cell.id}-details`;
  const unresolvedActions = getCellUnresolvedActions(cell.overrideSummary);

  function showDetails() {
    setIsDetailVisible(true);
  }

  function hideDetails() {
    setIsDetailVisible(false);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    hideDetails();
  }

  return (
    <article
      tabIndex={0}
      aria-describedby={isDetailVisible ? detailId : undefined}
      onMouseEnter={showDetails}
      onMouseLeave={hideDetails}
      onFocus={showDetails}
      onBlur={handleBlur}
      className={cn(
        "group relative rounded-[1.2rem] bg-surface-container-low px-3 py-2.5 shadow-[0_8px_18px_rgba(44,47,49,0.05)] outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20",
        isSelected ? "bg-primary/10" : "hover:bg-surface-container-high",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-on-surface">{cell.classLabel}</p>
        <button
          type="button"
          aria-label={`${cell.classLabel} ${cell.courseTitle} 快捷操作`}
          onClick={() => onSelect(isSelected ? null : cell.id)}
          className="mt-2 inline-flex max-w-full items-center rounded-full bg-surface-container-lowest px-2.5 py-1 text-[11px] font-medium text-primary shadow-[0_6px_16px_rgba(44,47,49,0.04)] transition hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <span className="truncate">{cell.courseTitle}</span>
        </button>
      </div>

      {isDetailVisible ? (
        <div
          id={detailId}
          role="tooltip"
          className="absolute left-2 right-2 top-[calc(100%-0.25rem)] z-10 rounded-[1.15rem] bg-surface-container-high px-3 py-3 text-[11px] text-on-surface shadow-[0_18px_38px_rgba(44,47,49,0.12)]"
        >
          <div className="space-y-2">
            <DetailLine icon={<CalendarClock className="size-3.5" aria-hidden />} label={cell.timeLabel} />
            <DetailLine icon={<MapPin className="size-3.5" aria-hidden />} label={cell.locationLabel} />
            <DetailLine icon={<Sparkles className="size-3.5" aria-hidden />} label={cell.status} />
            {cell.teacherLabel ? <DetailLine icon={<UserRound className="size-3.5" aria-hidden />} label={cell.teacherLabel} /> : null}
            {cell.overrideSummary ? <p className="leading-5 text-primary">{cell.overrideSummary}</p> : null}
            {unresolvedActions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {unresolvedActions.map((action) => (
                  <Link
                    key={`${cell.id}-${action.label}`}
                    href={action.href}
                    className="rounded-full bg-surface-container-lowest px-2.5 py-1 font-medium text-primary shadow-[0_6px_16px_rgba(44,47,49,0.04)] transition hover:bg-primary/12"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
            {viewMode === "admin_school" ? <p className="text-on-surface-variant/80">管理员视角明细已折叠到 hover / focus。</p> : null}
          </div>
        </div>
      ) : null}

      {isSelected ? (
        <div
          role="toolbar"
          aria-label={`${cell.classLabel} 快捷操作`}
          className="mt-3 flex items-center justify-between gap-3 rounded-[1.15rem] bg-surface-container-high px-3 py-2.5 shadow-[0_16px_30px_rgba(44,47,49,0.08)]"
        >
          <p className="min-w-0 truncate text-[11px] font-medium text-on-surface-variant">已选中 · {cell.classLabel}</p>
          <div className="flex items-center gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={`${cell.id}-${action.href}`}
                  href={action.href}
                  aria-label={action.label}
                  className="grid size-9 place-items-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-[0_8px_18px_rgba(44,47,49,0.05)] transition hover:bg-primary/12 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  <Icon className="size-4" aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DetailLine({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <p className="flex items-center gap-2 leading-5 text-on-surface-variant">
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </p>
  );
}

type SchedulePreviewAction = {
  label: string;
  href: string;
};

function getCellUnresolvedActions(overrideSummary: string | null): SchedulePreviewAction[] {
  if (!overrideSummary) {
    return [];
  }

  const actions: SchedulePreviewAction[] = [];

  if (overrideSummary.includes("班级")) {
    actions.push({ label: "查看班级", href: "/teacher/classes" });
  }

  if (overrideSummary.includes("课程")) {
    actions.push({ label: "新建课程", href: "/teacher/courses" });
  }

  if (overrideSummary.includes("教师")) {
    actions.push({ label: "核对教师关系", href: "/teacher/schedule#import-review" });
  }

  return actions;
}
