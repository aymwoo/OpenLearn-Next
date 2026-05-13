import Link from "next/link";
import type { ReactNode } from "react";

import { CalendarDays, Download, FileSpreadsheet, PencilLine, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { ScheduleImportModal } from "@/components/surfaces/schedule-import-modal";
import { deleteScheduleImportBatchAction, setPrimaryScheduleImportBatchAction } from "@/features/schedule/import/actions";
import type { ScheduleImportBatchDTO } from "@/features/schedule/shared/dto/import";
import type { TeacherDailyAgendaDTO, TeacherWeeklyScheduleCellDTO, TeacherWeeklyScheduleDTO } from "@/features/schedule/shared/dto/runtime";
import { cn } from "@/lib/utils";

export function TeacherScheduleSurface({
  data,
  latestImportBatch = null,
  importBatches = [],
  currentTeacherName = null,
}: {
  data: TeacherDailyAgendaDTO;
  latestImportBatch?: ScheduleImportBatchDTO | null;
  importBatches?: ScheduleImportBatchDTO[];
  currentTeacherName?: string | null;
}) {
  const filterTeacherName = data.viewMode === "admin_school" ? null : currentTeacherName;
  const isAdminSchoolView = data.viewMode === "admin_school";
  const allBatches = dedupeImportBatches([latestImportBatch, ...importBatches]);
  const currentBatch =
    allBatches.find((batch) => batch.isPrimary && isBatchEligibleForPrimary(batch)) ??
    allBatches.find((batch) => isDisplayableMainScheduleBatch(batch, filterTeacherName));
  const previewWeeklySchedule = buildDisplayOnlyPreviewSchedule(currentBatch, data.weeklySchedule, filterTeacherName);
  const currentWeeklySchedule = previewWeeklySchedule ?? data.weeklySchedule;
  const hasCurrentSchedule = currentWeeklySchedule.rows.some((row) => row.cells.some((cells) => cells.length > 0));
  const historyBatches = allBatches.filter((batch) => batch.id !== currentBatch?.id && batch.status !== "draft");
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
            {currentBatch && isDisplayOnlyPreviewBatch(currentBatch) ? (
              <div className={cn(teacherSurfaceRhythm.card, "bg-primary/10 px-4 py-3 text-sm text-on-surface")}>
                当前主课表正在显示最新导入预览，班级、教师或课程映射可后续补齐；正式入库仍需通过审批链路。
              </div>
            ) : null}
            {currentBatch && getPendingStudentImportClassCount(currentBatch) > 0 ? (
              <div className={cn(teacherSurfaceRhythm.card, "bg-tertiary/12 px-4 py-3 text-sm text-on-surface")}>
                当前批次有 {getPendingStudentImportClassCount(currentBatch)} 个班级为“待导学生”状态，可去班级管理继续导入学生名册。
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">主课表</p>
              <h2 className="text-[1.5rem] font-semibold text-on-surface">{currentTermLabel}课程表</h2>
              <p className="text-sm leading-7 text-on-surface-variant">
                {isAdminSchoolView ? "管理员视角已聚合全校教师课表，按时间轴统一排布并展示授课教师。" : "以当前学期为主视图，保留时间轴与工作日列的统一排版。"}
              </p>
            </div>
            <div className={cn(teacherSurfaceRhythm.card, "flex items-center gap-2 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant")}>
              <span>覆盖范围：{currentWeeklySchedule.rangeLabel}</span>
              {isAdminSchoolView ? <Badge>全校教师</Badge> : null}
            </div>
          </div>

          {hasCurrentSchedule ? (
            <div className={cn(teacherSurfaceRhythm.cardInset, "overflow-hidden p-3 md:p-4")}>
              <div className="grid min-w-[62rem] grid-cols-[7rem_repeat(5,minmax(0,1fr))] gap-2.5">
                <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low px-3 py-3 text-sm font-medium text-on-surface-variant")}>
                  时间 / 星期
                </div>
                {currentWeeklySchedule.weekdays.map((weekday) => (
                  <div
                      key={weekday.key}
                      className={cn(
                        teacherSurfaceRhythm.card,
                        "px-3 py-3 text-sm",
                        weekday.isToday ? "bg-primary/10 text-primary" : "bg-surface-container-low text-on-surface",
                      )}
                  >
                    <p className="font-semibold">{weekday.shortLabel}</p>
                    <p className="mt-1 text-xs opacity-80">{weekday.label.replace(`${weekday.shortLabel} `, "")}</p>
                  </div>
                ))}

                {currentWeeklySchedule.rows.map((row) => (
                  <RowWithCells key={row.slotId} row={row} />
                ))}
              </div>
            </div>
          ) : currentBatch ? (
            <div className={cn(teacherSurfaceRhythm.cardInset, "p-6 sm:p-7")}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-primary">
                    <FileSpreadsheet className="size-5" aria-hidden />
                    <p className="text-sm font-medium">当前主课表已导入</p>
                  </div>
                  <div>
                      <h3 className="text-[1.35rem] font-semibold text-on-surface">当前没有匹配到你的授课安排</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
                        {isAdminSchoolView
                          ? "当前主课表已导入，但这周暂时没有可展示的全校授课单元，可继续导入或切换历史学期查看。"
                          : "已保留当前主课表与历史批次记录，但本学期暂时没有匹配到你名下的课程，可继续导入其他课表或在历史列表切换主课表查看。"}
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
                        {getPendingStudentImportClassCount(batch) > 0 ? <Badge className="bg-tertiary/12 text-on-surface">待导学生 {getPendingStudentImportClassCount(batch)}</Badge> : null}
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
                    <form action={setPrimaryScheduleImportBatchAction.bind(null, batch.id)}>
                      <button
                        type="submit"
                        disabled={!isBatchEligibleForPrimary(batch)}
                        className={cn(
                          "inline-flex h-9 items-center rounded-full px-3 text-xs font-medium transition-colors",
                          isBatchEligibleForPrimary(batch)
                            ? "bg-surface-container-high text-primary hover:bg-surface-container-highest"
                            : "cursor-not-allowed bg-surface-container-low text-on-surface-variant/50",
                        )}
                      >
                        设为主课表
                      </button>
                    </form>
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
      <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low px-3 py-3.5")}>
        <p className="text-sm font-semibold text-on-surface">{row.bellSlotLabel}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{row.timeLabel}</p>
      </div>
      {row.cells.map((cells, index) => (
        <WeeklyCell key={`${row.slotId}-${index}`} cells={cells} />
      ))}
    </>
  );
}

function WeeklyCell({ cells }: { cells: TeacherWeeklyScheduleCellDTO[] }) {
  if (cells.length === 0) {
    return <div className={cn(teacherSurfaceRhythm.card, "min-h-28 bg-surface-container-low/60 px-3 py-3 text-sm text-on-surface-variant")}>本节暂无安排</div>;
  }

  return (
    <div className={cn(teacherSurfaceRhythm.card, "min-h-28 space-y-2.5 bg-surface-container-lowest px-2.5 py-2.5 shadow-[0_10px_28px_rgba(44,47,49,0.04)]")}>
      {cells.map((cell) => {
        const unresolvedActions = getCellUnresolvedActions(cell.overrideSummary);

        return (
          <div key={cell.id} className="rounded-[1.1rem] bg-surface-container-low px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">{cell.courseTitle}</p>
                <p className="mt-1 truncate text-xs text-on-surface-variant">{cell.classLabel}</p>
                {cell.teacherLabel ? <p className="mt-1 truncate text-[11px] font-medium text-primary">{cell.teacherLabel}</p> : null}
              </div>
              <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-1 text-[11px] font-medium text-on-surface-variant">
                {cell.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
              <p>{cell.locationLabel}</p>
              <p>{cell.timeLabel}</p>
              {cell.overrideSummary ? <p className="text-primary">{cell.overrideSummary}</p> : null}
            </div>
            {unresolvedActions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {unresolvedActions.map((action) => (
                  <Link
                    key={`${cell.id}-${action.label}`}
                    href={action.href}
                    className="rounded-full bg-surface-container-high px-2.5 py-1.5 font-medium text-primary transition hover:bg-surface-container-highest"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type SchedulePreviewAction = {
  label: string;
  href: string;
};

function getBatchTermLabel(batch: ScheduleImportBatchDTO) {
  return batch.rows.find((row) => row.mappingSummary?.termName)?.mappingSummary?.termName ?? batch.sourceLabel;
}

function isAppliedImportBatch(batch: ScheduleImportBatchDTO) {
  return batch.status === "applied" || batch.status === "partially_applied";
}

function isBatchEligibleForPrimary(batch: ScheduleImportBatchDTO) {
  return isAppliedImportBatch(batch) || batch.status === "ready_to_apply" || isDisplayOnlyPreviewBatch(batch);
}

function isDisplayableMainScheduleBatch(batch: ScheduleImportBatchDTO, currentTeacherName?: string | null) {
  if (isAppliedImportBatch(batch)) {
    return true;
  }

  if (batch.status !== "in_review") {
    return false;
  }

  const rows = batch.rows.filter((row) => matchesCurrentTeacher(row, currentTeacherName));
  return rows.length > 0 && rows.every((row) => isDisplayableMainScheduleRow(row));
}

function isDisplayOnlyPreviewBatch(batch: ScheduleImportBatchDTO) {
  return batch.status === "in_review" && batch.rows.length > 0 && batch.rows.every((row) => isDisplayableMainScheduleRow(row));
}

function isDisplayableMainScheduleRow(row: ScheduleImportBatchDTO["rows"][number]) {
  if (row.status === "approved" || row.status === "ready_to_apply") {
    return true;
  }

  return row.status === "mapping_review" && row.validationIssues.length > 0 && row.validationIssues.every((issue) => issue.code === "CLASS_NOT_FOUND" || issue.code === "COURSE_NOT_FOUND" || issue.code === "TEACHER_NOT_FOUND" || issue.code === "CLASS_PENDING_STUDENT_IMPORT");
}

function dedupeImportBatches(batches: Array<ScheduleImportBatchDTO | null | undefined>) {
  const seen = new Set<string>();

  return batches.filter((batch): batch is ScheduleImportBatchDTO => {
    if (!batch || seen.has(batch.id)) {
      return false;
    }

    seen.add(batch.id);
    return true;
  });
}

function matchesCurrentTeacher(row: ScheduleImportBatchDTO["rows"][number], currentTeacherName?: string | null) {
  if (!currentTeacherName) {
    return true;
  }

  return row.mappingSummary?.teacherName.trim() === currentTeacherName.trim();
}

function buildDisplayOnlyPreviewSchedule(
  batch: ScheduleImportBatchDTO | undefined,
  fallbackSchedule: TeacherWeeklyScheduleDTO,
  currentTeacherName?: string | null,
) {
  if (!batch || !isDisplayOnlyPreviewBatch(batch)) {
    return null;
  }

  const previewRows = batch.rows.filter(
    (row) => matchesCurrentTeacher(row, currentTeacherName) && isDisplayableMainScheduleRow(row) && row.mappingSummary,
  );

  if (previewRows.length === 0) {
    return null;
  }

  type PreviewSlotMeta = {
    slotId: string;
    bellSlotLabel: string;
    timeLabel: string;
    startTime: string | null;
    fallbackOrder: number;
  };

  const slotMetaByLabel = new Map<string, PreviewSlotMeta>(
    fallbackSchedule.rows.map((row, index) => [
      row.bellSlotLabel,
      {
        slotId: row.slotId,
        bellSlotLabel: row.bellSlotLabel,
        timeLabel: row.timeLabel,
        startTime: row.timeLabel.split(" - ")[0] ?? null,
        fallbackOrder: index,
      },
    ]),
  );

  for (const row of previewRows) {
    const label = row.mappingSummary?.bellSlotLabel;
    if (!label || slotMetaByLabel.has(label)) {
      continue;
    }

    const startTime = row.previewSchedule?.bellSlotStartTime ?? null;
    const endTime = row.previewSchedule?.bellSlotEndTime ?? null;

    slotMetaByLabel.set(label, {
      slotId: `preview-${label}`,
      bellSlotLabel: label,
      timeLabel: startTime && endTime ? `${startTime} - ${endTime}` : "时间待定",
      startTime,
      fallbackOrder: fallbackSchedule.rows.length + slotMetaByLabel.size,
    });
  }

  const sortedSlots = [...slotMetaByLabel.values()].sort((left, right) => {
    const leftKey = left.startTime ?? "99:99";
    const rightKey = right.startTime ?? "99:99";
    return leftKey === rightKey ? left.fallbackOrder - right.fallbackOrder : leftKey.localeCompare(rightKey);
  });

  const previewCells = new Map<string, TeacherWeeklyScheduleCellDTO[]>();
  for (const row of previewRows) {
    const summary = row.mappingSummary;
    if (!summary) {
      continue;
    }

    const slot = slotMetaByLabel.get(summary.bellSlotLabel);
    const weekday = row.previewSchedule?.weekday ?? getWeekdayNumber(summary.weekdayLabel);
    if (!slot || !weekday || weekday < 1 || weekday > 5) {
      continue;
    }

    const previewCell = {
      id: row.id,
      weekday,
      weekdayLabel: fallbackSchedule.weekdays[weekday - 1]?.shortLabel ?? summary.weekdayLabel,
      timeLabel: slot.timeLabel,
      bellSlotLabel: summary.bellSlotLabel,
      classLabel: summary.className,
      teacherLabel: summary.teacherName,
      locationLabel: summary.roomLabel ?? "地点待定",
      courseTitle: summary.courseTitle,
      status: "已变更",
      overrideSummary: getPreviewRowNote(row),
    } satisfies TeacherWeeklyScheduleCellDTO;

    const key = `${slot.slotId}:${weekday}`;
    const existingCells = previewCells.get(key);
    if (existingCells) {
      existingCells.push(previewCell);
    } else {
      previewCells.set(key, [previewCell]);
    }
  }

  return {
    ...fallbackSchedule,
    rows: sortedSlots.map((slot) => ({
      slotId: slot.slotId,
      bellSlotLabel: slot.bellSlotLabel,
      timeLabel: slot.timeLabel,
      cells: [1, 2, 3, 4, 5].map((weekday) => previewCells.get(`${slot.slotId}:${weekday}`) ?? []),
    })),
  } satisfies TeacherWeeklyScheduleDTO;
}

function getWeekdayNumber(label: string) {
  switch (label.trim()) {
    case "周一":
      return 1;
    case "周二":
      return 2;
    case "周三":
      return 3;
    case "周四":
      return 4;
    case "周五":
      return 5;
    default:
      return null;
  }
}

function getPreviewRowNote(row: ScheduleImportBatchDTO["rows"][number]) {
  const codes = new Set(row.validationIssues.map((issue) => issue.code));

  if (codes.has("CLASS_NOT_FOUND") && codes.has("COURSE_NOT_FOUND") && codes.has("TEACHER_NOT_FOUND")) {
    return "班级/课程/教师待补";
  }

  if (codes.has("CLASS_NOT_FOUND") && codes.has("COURSE_NOT_FOUND")) {
    return "班级/课程待补";
  }

  if (codes.has("CLASS_NOT_FOUND") && codes.has("TEACHER_NOT_FOUND")) {
    return "班级/教师映射待补";
  }

  if (codes.has("COURSE_NOT_FOUND") && codes.has("TEACHER_NOT_FOUND")) {
    return "课程/教师待补";
  }

  if (codes.has("CLASS_PENDING_STUDENT_IMPORT")) {
    return "班级待导学生";
  }

  if (codes.has("CLASS_NOT_FOUND")) {
    return "班级映射待补";
  }

  if (codes.has("COURSE_NOT_FOUND")) {
    return "课程映射待补";
  }

  if (codes.has("TEACHER_NOT_FOUND")) {
    return "教师映射待补";
  }

  return "最新导入预览";
}

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

function getPendingStudentImportClassCount(batch: ScheduleImportBatchDTO) {
  return new Set(
    batch.rows
      .filter((row) => row.validationIssues.some((issue) => issue.code === "CLASS_PENDING_STUDENT_IMPORT"))
      .map((row) => row.mappingSummary?.className)
      .filter((name): name is string => Boolean(name)),
  ).size;
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
