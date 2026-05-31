"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { applyCourseImportAction } from "@/actions/course-import-actions";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CourseImportBatchDTO, CourseImportRowDecision } from "@/lib/dto/course-import";
import { cn } from "@/lib/utils";

type Props = {
  batch: CourseImportBatchDTO;
};

const statusLabelMap: Record<string, string> = {
  ready_to_create: "待创建",
  matched_existing: "命中已有课程",
  same_file_conflict: "同批重复",
  invalid: "无效",
  blocked: "阻断",
};

export function CourseImportReviewSurface({ batch }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const asyncSummary = batch.asyncTaskSummary;
  const asyncProgressHeading = asyncSummary
    ? (asyncSummary.progressLabel ?? asyncSummary.terminalHeadline ?? asyncSummary.statusLabel)
    : null;
  const reviewIsReadOnly = asyncSummary?.shouldFreezeReviewDecisions ?? false;
  const [decisions, setDecisions] = useState<Record<string, CourseImportRowDecision>>(() =>
    Object.fromEntries(
      batch.rows.filter((row) => row.status === "matched_existing").map((row) => [row.id, row.decision ?? "skip"]),
    ),
  );
  const [isPending, startTransition] = useTransition();

  const groupedRows = useMemo(
    () => ({
      readyRows: batch.rows.filter((row) => row.status === "ready_to_create"),
      matchedRows: batch.rows.filter((row) => row.status === "matched_existing"),
      conflictRows: batch.rows.filter((row) => row.status === "same_file_conflict"),
      problemRows: batch.rows.filter((row) => row.status === "invalid" || row.status === "blocked"),
      resultRows: batch.rows.filter((row) => row.result),
    }),
    [batch.rows],
  );

  function handleApply() {
    startTransition(async () => {
      const result = await applyCourseImportAction({
        batchId: batch.id,
        matchedRowDecisions: Object.entries(decisions).map(([rowId, decision]) => ({ rowId, decision })),
      });

      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message });
        return;
      }

      const triggerResult = result.data as { message?: string };
      setFeedback({ tone: "success", message: triggerResult.message ?? "导入任务已创建，正在刷新当前批次状态。" });
      router.refresh();
    });
  }

  const showAsyncStatus = Boolean(asyncSummary);
  const showResultMode = asyncSummary?.isTerminal ?? (batch.status === "applied" || batch.status === "partially_applied");
  const partialSuccess = asyncSummary?.status === "partially_completed";
  const dispatchFailed = asyncSummary?.status === "dispatch_failed";
  const runningLike = asyncSummary?.status === "queued" || asyncSummary?.status === "running" || asyncSummary?.status === "retrying";

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <Badge variant="accent">课程批量导入</Badge>
            <div className="space-y-2">
              <h1 className="text-[2.4rem] font-semibold tracking-[-0.03em] text-on-surface">
                {dispatchFailed
                  ? "导入任务还没有成功进入队列"
                  : partialSuccess
                    ? "已完成，但有失败项"
                    : showResultMode
                      ? "导入结果已生成"
                      : runningLike
                        ? `${asyncSummary?.statusLabel ?? "导入中"}`
                        : "先审核，再批量应用课程导入"}
              </h1>
              <p className="max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
                {dispatchFailed
                  ? "导入任务创建后未能进入队列。当前页会保留真实失败状态，你可以检查当前批次是否仍可应用后重新触发。"
                  : showResultMode
                    ? "顶部先看状态与汇总，再看逐行明细。若有失败项，请修正 CSV 或处理冲突后重新创建新任务。"
                    : reviewIsReadOnly
                      ? "当前批次已经进入处理中，逐行“更新 / 跳过”决定已冻结为只读，请在本页查看真实进度与最终结果。"
                      : "命中已有课程的行只能逐行选择“更新”或“跳过”，但所有真正写入都在一次批量 apply 中完成。"}
              </p>
            </div>
          </div>

          <div className={cn(teacherSurfaceRhythm.cardInset, "w-full max-w-sm p-5")}>
            <p className="text-sm text-on-surface-variant">{showAsyncStatus ? "当前状态" : "主动作"}</p>
            <div className="mt-4 flex flex-col gap-3">
              <Button asChild variant="secondary" className="w-full text-sm shadow-none">
                <Link href="/teacher/courses/import/template">下载 CSV 模板</Link>
              </Button>
              {dispatchFailed ? (
                <Button className="w-full" disabled={isPending} onClick={handleApply}>
                  应用本批导入
                </Button>
              ) : showResultMode ? (
                <Button asChild className="w-full">
                  <Link href="/teacher/courses">返回课程中心</Link>
                </Button>
              ) : reviewIsReadOnly ? (
                <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                  {asyncSummary?.statusLabel ?? "处理中"}
                  {asyncSummary?.progressPercent !== null && asyncSummary?.progressPercent !== undefined
                    ? ` · ${asyncSummary.progressPercent}%`
                    : ""}
                </div>
              ) : (
                <Button className="w-full" disabled={isPending} onClick={handleApply}>
                  应用本批导入
                </Button>
              )}
              {showAsyncStatus ? (
                <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                  {asyncProgressHeading}
                  {asyncSummary && asyncSummary.processedRows !== null && asyncSummary.totalRows !== null
                    ? ` · 已处理 ${asyncSummary.processedRows}/${asyncSummary.totalRows} 行`
                    : ""}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {asyncSummary ? (
        <section
          className={cn(
            teacherSurfaceRhythm.section,
            dispatchFailed || asyncSummary.status === "failed"
              ? "bg-error-container text-on-error-container"
              : partialSuccess
                ? "bg-primary-container/12 text-on-surface"
                : "bg-surface-container-lowest text-on-surface",
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm opacity-80">任务状态</p>
              <h2 className="mt-2 text-xl font-semibold">{asyncSummary.terminalHeadline ?? asyncSummary.statusLabel}</h2>
              <p className="mt-2 text-sm leading-7 opacity-85">
                {asyncSummary.progressNote ?? asyncSummary.latestError ?? asyncSummary.terminalGuidance ?? "返回当前页即可继续看到最新 durable 状态。"}
              </p>
            </div>
            <Badge variant={dispatchFailed || asyncSummary.status === "failed" ? "default" : partialSuccess ? "accent" : "success"}>
              {asyncSummary.statusLabel}
            </Badge>
          </div>
        </section>
      ) : null}

      {feedback ? (
        <section
          className={cn(
            teacherSurfaceRhythm.section,
            feedback.tone === "success" ? "bg-tertiary-container/60 text-tertiary" : "bg-error-container text-on-error-container",
          )}
        >
          {feedback.message}
        </section>
      ) : null}

      <section className={teacherSurfaceRhythm.section}>
        <div className="grid gap-4 lg:grid-cols-4">
          <SummaryCard label="批次来源" value={batch.sourceLabel} />
          <SummaryCard label={showAsyncStatus ? "任务状态" : "总行数"} value={showAsyncStatus ? asyncSummary?.statusLabel ?? "—" : String(batch.rowCount)} />
            <SummaryCard
              label={showAsyncStatus ? "进度" : "命中已有课程"}
              value={showAsyncStatus
                ? asyncSummary && asyncSummary.processedRows !== null && asyncSummary.totalRows !== null
                  ? `${asyncSummary.processedRows}/${asyncSummary.totalRows}`
                  : asyncSummary?.progressPercent !== null && asyncSummary?.progressPercent !== undefined
                    ? `${asyncSummary.progressPercent}%`
                    : "—"
                : String(batch.summary.matchedExisting)}
          />
          <SummaryCard
            label={showResultMode ? "failed" : showAsyncStatus ? "最近更新" : "阻断行"}
            value={showResultMode
              ? String(asyncSummary?.counts?.failed ?? batch.applySummary.failed)
              : showAsyncStatus
                ? asyncSummary?.lastUpdatedAt ? new Date(asyncSummary.lastUpdatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"
                : String(batch.summary.sameFileConflict + batch.summary.invalid + batch.summary.blocked)}
          />
        </div>
      </section>

      {showResultMode ? (
        <section className={teacherSurfaceRhythm.section}>
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">结果概览</p>
              <h2 className="mt-2 text-[1.4rem] font-semibold text-on-surface">
                {partialSuccess ? "已完成，但有失败项" : "created / updated / skipped / failed"}
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <SummaryCard label="created" value={String(asyncSummary?.counts?.created ?? batch.applySummary.created)} />
              <SummaryCard label="updated" value={String(asyncSummary?.counts?.updated ?? batch.applySummary.updated)} />
              <SummaryCard label="skipped" value={String(asyncSummary?.counts?.skipped ?? batch.applySummary.skipped)} />
              <SummaryCard label="failed" value={String(asyncSummary?.counts?.failed ?? batch.applySummary.failed)} />
            </div>

            <div className="space-y-3">
              {batch.rows.map((row) => (
                <article key={row.id} className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">{row.row.title}</span>
                        <Badge variant={row.result === "failed" ? "default" : row.result ? "success" : "default"}>{row.result ?? statusLabelMap[row.status] ?? row.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {row.resultReason ?? (row.validationIssues.map((issue) => issue.message).join("；") || "已完成该行处理。")}
                      </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          <RowGroup title="待创建课程" rows={groupedRows.readyRows} />

          <section className={teacherSurfaceRhythm.section}>
            <div className="space-y-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">命中已有课程</p>
                <h2 className="mt-2 text-[1.4rem] font-semibold text-on-surface">逐行选择“更新”或“跳过”</h2>
              </div>

              {groupedRows.matchedRows.length > 0 ? (
                <div className="space-y-3">
                  {groupedRows.matchedRows.map((row) => (
                    <article key={row.id} className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-on-surface">{row.row.title}</span>
                            <Badge>{statusLabelMap[row.status]}</Badge>
                          </div>
                          <p className="text-sm text-on-surface-variant">
                            当前状态：{row.matchedCourse?.status ?? "未知"} · 导入状态：{row.row.status}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={decisions[row.id] === "update" ? "primary" : "secondary"}
                            className="min-h-10 px-4"
                            disabled={reviewIsReadOnly}
                            onClick={() => setDecisions((current) => ({ ...current, [row.id]: "update" }))}
                          >
                            更新
                          </Button>
                          <Button
                            type="button"
                            variant={decisions[row.id] === "skip" ? "primary" : "secondary"}
                            className="min-h-10 px-4"
                            disabled={reviewIsReadOnly}
                            onClick={() => setDecisions((current) => ({ ...current, [row.id]: "skip" }))}
                          >
                            跳过
                          </Button>
                        </div>
                      </div>
                      {reviewIsReadOnly ? (
                        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                          当前批次已经进入处理中，逐行“更新 / 跳过”决定已切换为只读。
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyGroupCopy copy="当前批次没有命中已有课程的行。" />
              )}
            </div>
          </section>

          <RowGroup title="同批重复" rows={groupedRows.conflictRows} />
          <RowGroup title="无效或阻断" rows={groupedRows.problemRows} />
        </>
      )}
    </div>
  );
}

function RowGroup({ title, rows }: { title: string; rows: CourseImportBatchDTO["rows"] }) {
  return (
    <section className={teacherSurfaceRhythm.section}>
      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">{title}</p>
          <h2 className="mt-2 text-[1.4rem] font-semibold text-on-surface">{title}</h2>
        </div>

        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <article key={row.id} className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-on-surface">{row.row.title}</span>
                  <Badge>{statusLabelMap[row.status] ?? row.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {row.validationIssues.map((issue) => issue.message).join("；") || `${row.row.subject} · ${row.row.grade} · ${row.row.status}`}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyGroupCopy copy={`当前没有“${title}”行。`} />
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function EmptyGroupCopy({ copy }: { copy: string }) {
  return <div className={cn(teacherSurfaceRhythm.cardInset, "p-6 text-sm leading-7 text-on-surface-variant")}>{copy}</div>;
}
