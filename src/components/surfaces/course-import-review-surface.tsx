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

      setFeedback({ tone: "success", message: "课程导入已应用，正在刷新审核结果。" });
      router.refresh();
    });
  }

  const showResultMode = batch.status === "applied" || batch.status === "partially_applied";

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <Badge variant="accent">课程批量导入</Badge>
            <div className="space-y-2">
              <h1 className="text-[2.4rem] font-semibold tracking-[-0.03em] text-on-surface">
                {showResultMode ? "导入结果已生成" : "先审核，再批量应用课程导入"}
              </h1>
              <p className="max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
                {showResultMode
                  ? "结果会明确区分 created、updated、skipped、failed，并保留逐行原因，方便你继续回到课程中心处理后续工作。"
                  : "命中已有课程的行只能逐行选择“更新”或“跳过”，但所有真正写入都在一次批量 apply 中完成。"}
              </p>
            </div>
          </div>

          <div className={cn(teacherSurfaceRhythm.cardInset, "w-full max-w-sm p-5")}>
            <p className="text-sm text-on-surface-variant">主动作</p>
            <div className="mt-4 flex flex-col gap-3">
              <Button asChild variant="secondary" className="w-full text-sm shadow-none">
                <Link href="/teacher/courses/import/template">下载 CSV 模板</Link>
              </Button>
              {showResultMode ? (
                <Button asChild className="w-full">
                  <Link href="/teacher/courses">返回课程中心</Link>
                </Button>
              ) : (
                <Button className="w-full" disabled={isPending} onClick={handleApply}>
                  应用本批导入
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

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
          <SummaryCard label="总行数" value={String(batch.rowCount)} />
          <SummaryCard label="命中已有课程" value={String(batch.summary.matchedExisting)} />
          <SummaryCard
            label={showResultMode ? "failed" : "阻断行"}
            value={showResultMode ? String(batch.applySummary.failed) : String(batch.summary.sameFileConflict + batch.summary.invalid + batch.summary.blocked)}
          />
        </div>
      </section>

      {showResultMode ? (
        <section className={teacherSurfaceRhythm.section}>
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">结果概览</p>
              <h2 className="mt-2 text-[1.4rem] font-semibold text-on-surface">created / updated / skipped / failed</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <SummaryCard label="created" value={String(batch.applySummary.created)} />
              <SummaryCard label="updated" value={String(batch.applySummary.updated)} />
              <SummaryCard label="skipped" value={String(batch.applySummary.skipped)} />
              <SummaryCard label="failed" value={String(batch.applySummary.failed)} />
            </div>

            <div className="space-y-3">
              {batch.rows.map((row) => (
                <article key={row.id} className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">{row.row.title}</span>
                    <Badge>{row.result ?? statusLabelMap[row.status] ?? row.status}</Badge>
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
                            onClick={() => setDecisions((current) => ({ ...current, [row.id]: "update" }))}
                          >
                            更新
                          </Button>
                          <Button
                            type="button"
                            variant={decisions[row.id] === "skip" ? "primary" : "secondary"}
                            className="min-h-10 px-4"
                            onClick={() => setDecisions((current) => ({ ...current, [row.id]: "skip" }))}
                          >
                            跳过
                          </Button>
                        </div>
                      </div>
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
