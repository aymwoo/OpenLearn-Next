"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { approveScheduleImportAction } from "@/features/schedule/import/actions";
import type { ScheduleImportBatchDTO } from "@/features/schedule/shared/dto/import";
import { cn } from "@/lib/utils";

const statusLabelMap: Record<string, string> = {
  pending_review: "待审核",
  validation_failed: "校验失败",
  mapping_review: "映射待确认",
  conflict_review: "冲突待处理",
  ready_to_apply: "可入库",
  approved: "已批准",
  rejected: "已拒绝",
};

export function ScheduleImportReviewSurface({ batch }: { batch: ScheduleImportBatchDTO | null }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const unresolvedRows = useMemo(
    () => batch?.rows.filter((row) => ["pending_review", "validation_failed", "mapping_review", "conflict_review"].includes(row.status)) ?? [],
    [batch],
  );

  const readyRows = batch?.rows.filter((row) => row.status === "ready_to_apply") ?? [];
  const rejectedRows = batch?.rows.filter((row) => row.status === "rejected") ?? [];
  const canApprove = readyRows.length > 0 && unresolvedRows.length === 0;

  function handleApprove() {
    if (!batch) {
      return;
    }

    startTransition(async () => {
      const result = await approveScheduleImportAction({
        batchId: batch.id,
        approvedRowIds: readyRows.map((row) => row.id),
        rejectedRowIds: rejectedRows.map((row) => row.id),
      });

      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message });
        return;
      }

      setFeedback({ tone: "success", message: "审核结果已写入标准课表，并已刷新今日课表缓存。" });
      router.refresh();
    });
  }

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <Badge variant="accent">导入审核台</Badge>
            <div className="space-y-2">
              <h1 className="text-[2.4rem] font-semibold tracking-[-0.03em] text-on-surface">先审核，再写入课表运行层</h1>
              <p className="max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
                每条课表记录都必须先经过校验、映射与冲突审核，确认后才进入标准课表模型。
              </p>
            </div>
          </div>

          <div className={cn(teacherSurfaceRhythm.cardInset, "w-full max-w-sm p-5")}>
            <p className="text-sm text-on-surface-variant">主动作</p>
            <Button asChild variant="secondary" className="mt-4 w-full text-sm shadow-none">
              <Link href="/teacher/schedule/import/template">下载导入模板</Link>
            </Button>
            <Button className="mt-4 w-full" disabled={!canApprove || isPending} onClick={handleApprove}>
              审核通过并写入课表
            </Button>
            <p className="mt-3 text-sm text-on-surface-variant">
              {unresolvedRows.length > 0
                ? `还有 ${unresolvedRows.length} 条阻断行未处理，需先解决校验、映射或冲突问题。`
                : "所有阻断项已清理完成，可以进入写入阶段。"}
            </p>
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
          <SummaryCard label="来源" value={batch?.sourceLabel ?? "还没有导入批次"} />
          <SummaryCard label="总行数" value={String(batch?.rowCount ?? 0)} />
          <SummaryCard label="通过 / 已批准" value={`${batch?.rows.filter((row) => row.status === "ready_to_apply").length ?? 0} / ${batch?.approvedRowCount ?? 0}`} />
          <SummaryCard label="冲突 / 待处理" value={String(unresolvedRows.length)} />
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">行级审核</p>
            <h2 className="mt-2 text-[1.4rem] font-semibold text-on-surface">按行确认校验、映射与冲突结果</h2>
          </div>

          {batch?.rows.length ? (
            <div className="space-y-4">
              {batch.rows.map((row) => (
                <article key={row.id} className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-on-surface">源记录 {row.sourceRowKey}</span>
                        <Badge>{statusLabelMap[row.status] ?? row.status}</Badge>
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        {row.mappingSummary
                          ? `${row.mappingSummary.termName} · ${row.mappingSummary.weekdayLabel} · ${row.mappingSummary.bellSlotLabel} · ${row.mappingSummary.className}`
                          : "还没有可展示的映射摘要。"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
                      <p className="text-sm font-semibold text-on-surface">校验结果</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                        {row.validationIssues.length > 0 ? row.validationIssues.map((issue) => issue.message).join("；") : "未发现阻断性校验问题。"}
                      </p>
                    </div>
                    <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
                      <p className="text-sm font-semibold text-on-surface">映射摘要</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                        {row.mappingSummary
                          ? `${row.mappingSummary.courseTitle} · ${row.mappingSummary.teacherName} · ${row.mappingSummary.roomLabel ?? "地点待定"}`
                          : "当前还没有可确认的映射结果。"}
                      </p>
                    </div>
                    <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
                      <p className="text-sm font-semibold text-on-surface">冲突说明</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                        {row.conflictSummary.length > 0
                          ? row.conflictSummary.map((issue) => issue.description).join("；")
                          : "当前没有检测到现有课表冲突。"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={cn(teacherSurfaceRhythm.cardInset, "p-6 text-sm leading-7 text-on-surface-variant")}>
              还没有可审核的导入批次。下一步可以先发起导入，再回到这里逐行确认课表映射结果。
            </div>
          )}
        </div>
      </section>
    </div>
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
