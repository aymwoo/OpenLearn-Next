"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  applyDraftLessonVersionAction,
  discardDraftLessonVersionAction,
} from "@/actions/lesson-authoring-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  LessonDraftDiffRow,
  LessonDraftReviewDTO,
  LessonEditorDTO,
  LessonStepDTO,
  TeacherAuthoringOverviewDTO,
} from "@/lib/dto/lesson-authoring";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

export type LessonDraftReviewWorkspaceProps = {
  draftReview: LessonDraftReviewDTO;
  lesson: LessonEditorDTO | null;
  overview: TeacherAuthoringOverviewDTO;
};

type LocalEditEntry = {
  title?: string;
  description?: string;
  content?: string;
};

type FeedbackToast = {
  type: "success" | "error";
  message: string;
} | null;

// ─── Constants ───────────────────────────────────────────

const STATE_BADGE_MAP: Record<
  LessonDraftDiffRow["state"],
  { label: string; className: string }
> = {
  new: { label: "新增", className: "bg-tertiary-container/70 text-tertiary" },
  modified: {
    label: "修改",
    className: "bg-primary-container/30 text-primary",
  },
  deleted: {
    label: "删除",
    className: "bg-error-container text-on-error-container",
  },
  unchanged: { label: "", className: "" },
};

const STEP_TYPE_LABELS: Record<string, string> = {
  content: "内容",
  task: "任务",
  quiz: "测验",
};

// ─── Helpers ─────────────────────────────────────────────

function getStepDescription(step: LessonStepDTO): string {
  const p = step.payload;
  if (p.type === "content") return p.body;
  if (p.type === "task") return p.prompt;
  return p.question;
}

function getStepTitle(step: LessonStepDTO): string {
  return step.title;
}

// ─── Component ───────────────────────────────────────────

export function LessonDraftReviewWorkspace({
  draftReview,
  lesson,
}: LessonDraftReviewWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Local state (D-12: preserved across edit↔review toggle) ──
  const [acceptedStepIndices, setAcceptedStepIndices] = useState<Set<number>>(
    new Set(),
  );
  const [discardedStepIndices, setDiscardedStepIndices] = useState<Set<number>>(
    new Set(),
  );
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    null,
  );
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<FeedbackToast>(null);
  const [localEdits, setLocalEdits] = useState<Record<number, LocalEditEntry>>(
    {},
  );

  // ── Computed values ──
  const changedCount = useMemo(
    () => draftReview.diffRows.filter((r) => r.state !== "unchanged").length,
    [draftReview.diffRows],
  );
  const activeSteps = useMemo(
    () => lesson?.steps.filter((s) => !s.archivedAt) ?? [],
    [lesson?.steps],
  );
  const hasActiveSteps = activeSteps.length > 0;
  const hasLocalChanges =
    acceptedStepIndices.size > 0 || discardedStepIndices.size > 0;

  const baseUrl = lesson
    ? `/teacher/editor?courseId=${lesson.course.id}&lessonId=${lesson.lesson.id}`
    : "/teacher/editor";

  // ── Edit helpers ──

  const updateLocalEdit = useCallback(
    (index: number, patch: Partial<LocalEditEntry>) => {
      setLocalEdits((prev) => ({
        ...prev,
        [index]: { ...prev[index], ...patch },
      }));
    },
    [],
  );

  const buildEditedStepsFromLocalState = useCallback(() => {
    const result: {
      index: number;
      title: string;
      description?: string;
      content?: string;
    }[] = [];
    for (const row of draftReview.diffRows) {
      if (
        discardedStepIndices.has(row.index) ||
        row.state === "deleted" ||
        row.state === "unchanged"
      )
        continue;
      const sourceStep = row.draftStep ?? row.liveStep!;
      const localEdit = localEdits[row.index];
      result.push({
        index: row.index,
        title: localEdit?.title ?? getStepTitle(sourceStep),
        description: localEdit?.description ?? getStepDescription(sourceStep),
        content: localEdit?.content,
      });
    }
    return result;
  }, [
    draftReview.diffRows,
    discardedStepIndices,
    localEdits,
  ]);

  const navigateToEdit = useCallback(() => {
    router.push(baseUrl);
  }, [baseUrl, router]);

  // ── Action handlers ──

  const handleAcceptAll = () => {
    if (hasActiveSteps) {
      setShowOverwriteConfirm(true);
      return;
    }
    executeAccept();
  };

  const executeAccept = () => {
    if (!lesson) return;
    startTransition(async () => {
      try {
        const result = await applyDraftLessonVersionAction({
          lessonId: lesson.lesson.id,
          draftVersionId: draftReview.draftMeta.draftVersionId,
          editedSteps: buildEditedStepsFromLocalState(),
        });
        if (result.ok) {
          setFeedbackToast({
            type: "success",
            message: "AI 草稿已应用到课时，你可以继续调整后发布。",
          });
          setTimeout(() => navigateToEdit(), 1500);
        } else {
          setFeedbackToast({
            type: "error",
            message: (result.message as string) ?? "应用草稿失败，请重试。",
          });
        }
      } catch {
        setFeedbackToast({ type: "error", message: "应用草稿时发生错误，请重试。" });
      }
    });
  };

  const handleDiscardDraft = () => {
    if (!lesson) return;
    startTransition(async () => {
      try {
        const result = await discardDraftLessonVersionAction({
          lessonId: lesson.lesson.id,
          draftVersionId: draftReview.draftMeta.draftVersionId,
        });
        if (result.ok) {
          setFeedbackToast({
            type: "success",
            message: "AI 草稿已丢弃，当前课时没有被修改。",
          });
          setTimeout(() => navigateToEdit(), 1500);
        } else {
          setFeedbackToast({
            type: "error",
            message: (result.message as string) ?? "丢弃草稿失败，请重试。",
          });
        }
      } catch {
        setFeedbackToast({
          type: "error",
          message: "丢弃草稿时发生错误，请重试。",
        });
      }
      setShowDiscardConfirm(false);
    });
  };

  const handleReturnToEdit = () => {
    if (hasLocalChanges) {
      setShowReturnConfirm(true);
      return;
    }
    navigateToEdit();
  };

  const handleAcceptStep = (index: number) => {
    setAcceptedStepIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setDiscardedStepIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleDiscardStep = (index: number) => {
    setDiscardedStepIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setAcceptedStepIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleUndoDiscardStep = (index: number) => {
    setDiscardedStepIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  // ── Selected diff row for edit panel ──
  const selectedDiffRow =
    selectedStepIndex !== null
      ? draftReview.diffRows.find((r) => r.index === selectedStepIndex) ?? null
      : null;

  const sourceStepForPanel = selectedDiffRow
    ? (selectedDiffRow.draftStep ?? selectedDiffRow.liveStep)
    : null;

  // ── Toast auto-dismiss ──
  const dismissToast = useCallback(() => setFeedbackToast(null), []);

  // ── Error state ──
  if (!draftReview.hasPendingDraft) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="rounded-[var(--radius-card)] bg-surface-container-lowest shadow-ambient p-10 max-w-md">
          <Sparkles className="size-10 text-primary mx-auto mb-4" aria-hidden />
          <h3 className="text-xl font-semibold text-on-surface">
            当前没有待审校的 AI 草稿
          </h3>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            先让 LessonAgent 生成草稿，新的审校任务会出现在编辑器顶部。
          </p>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="flex flex-col h-full">
      {/* ─── Fixed Top Action Bar ─── */}
      <div
        className={cn(
          "sticky top-0 z-10 mx-auto w-full max-w-[1360px]",
          "bg-surface/85 backdrop-blur-xl rounded-[var(--radius-shell)] shadow-ambient",
          "px-6 py-4",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-on-surface">
              审校 AI 课时草稿
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              逐步核对 AI 起草与当前课时的差异，确认后再应用到编辑器。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={handleAcceptAll} disabled={isPending}>
              接受全部草稿
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowDiscardConfirm(true)}
              disabled={isPending}
            >
              丢弃草稿
            </Button>
            <Button variant="tertiary" onClick={handleReturnToEdit}>
              <ArrowLeft className="size-4 mr-1.5" aria-hidden />
              返回编辑
            </Button>
          </div>
        </div>
        {/* Draft metadata row */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" aria-hidden />
            AI 起草
          </span>
          <span>版本 {draftReview.draftMeta.version}</span>
          <span>{changedCount} 处变更</span>
        </div>
      </div>

      {/* ─── Diff Step List ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-[1360px] flex flex-col gap-4">
          {draftReview.diffRows.map((row) => (
            <DiffStepCard
              key={row.index}
              row={row}
              isAccepted={acceptedStepIndices.has(row.index)}
              isDiscarded={discardedStepIndices.has(row.index)}
              isSelected={selectedStepIndex === row.index}
              onSelect={() => setSelectedStepIndex(row.index)}
              onAccept={() => handleAcceptStep(row.index)}
              onDiscard={() => handleDiscardStep(row.index)}
              onUndoDiscard={() => handleUndoDiscardStep(row.index)}
            />
          ))}
        </div>
      </div>

      {/* ─── Right-side Edit Panel ─── */}
      {selectedStepIndex !== null && selectedDiffRow && sourceStepForPanel && (
        <StepEditPanel
          stepIndex={selectedStepIndex}
          diffRow={selectedDiffRow}
          sourceStep={sourceStepForPanel}
          localEdits={localEdits[selectedStepIndex] ?? {}}
          onLocalEdit={(patch) => updateLocalEdit(selectedStepIndex, patch)}
          onClose={() => setSelectedStepIndex(null)}
        />
      )}

      {/* ─── Confirmation Dialogs ─── */}

      {/* Overwrite confirmation (D-06) */}
      {showOverwriteConfirm ? (
        <ConfirmDialog
          title="接受全部草稿？"
          message="接受 AI 草稿将覆盖当前课时步骤，此操作不可撤销。确认应用草稿吗？"
          confirmLabel="确认应用"
          confirmVariant="primary"
          onConfirm={() => {
            setShowOverwriteConfirm(false);
            executeAccept();
          }}
          onCancel={() => setShowOverwriteConfirm(false)}
        />
      ) : null}

      {/* Discard confirmation */}
      {showDiscardConfirm ? (
        <ConfirmDialog
          title="丢弃草稿？"
          message="丢弃草稿只会关闭这次 AI 起草，不会修改当前课时。确认丢弃吗？"
          confirmLabel="确认丢弃"
          confirmVariant="secondary"
          onConfirm={handleDiscardDraft}
          onCancel={() => setShowDiscardConfirm(false)}
          disabled={isPending}
        />
      ) : null}

      {/* Return-to-edit confirmation */}
      {showReturnConfirm ? (
        <ConfirmDialog
          title="返回编辑？"
          message="离开审校会清除本次未应用的草稿编辑。要返回编辑吗？"
          confirmLabel="返回编辑"
          confirmVariant="secondary"
          onConfirm={() => {
            setShowReturnConfirm(false);
            navigateToEdit();
          }}
          onCancel={() => setShowReturnConfirm(false)}
        />
      ) : null}

      {/* ─── Toast Feedback ─── */}
      {feedbackToast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 rounded-[var(--radius-card)] px-5 py-3 shadow-ambient text-sm font-medium animate-slide-in-right",
            feedbackToast.type === "success"
              ? "bg-tertiary-container/90 text-tertiary"
              : "bg-error-container/90 text-on-error-container",
          )}
        >
          <div className="flex items-center gap-2">
            {feedbackToast.type === "success" ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <X className="size-4" aria-hidden />
            )}
            <span>{feedbackToast.message}</span>
            <button
              type="button"
              onClick={dismissToast}
              className="ml-2 p-0.5 hover:opacity-70"
              aria-label="关闭提示"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DiffStepCard — per-step diff row rendering
// ═══════════════════════════════════════════════════════════

function DiffStepCard({
  row,
  isAccepted,
  isDiscarded,
  isSelected,
  onSelect,
  onAccept,
  onDiscard,
  onUndoDiscard,
}: {
  row: LessonDraftDiffRow;
  isAccepted: boolean;
  isDiscarded: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onDiscard: () => void;
  onUndoDiscard: () => void;
}) {
  const sourceStep = row.draftStep ?? row.liveStep;
  const isDeleted = row.state === "deleted";

  // Determine effective state badge
  let badgeLabel = "";
  let badgeClassName = "";
  let cardOpacity = "";

  if (isAccepted) {
    badgeLabel = "已选用";
    badgeClassName = "bg-tertiary-container/70 text-tertiary";
  } else if (isDiscarded) {
    badgeLabel = "已舍弃";
    badgeClassName = "bg-surface-container-high text-on-surface-variant";
    cardOpacity = "opacity-50";
  } else if (row.state !== "unchanged") {
    const spec = STATE_BADGE_MAP[row.state];
    badgeLabel = spec.label;
    badgeClassName = spec.className;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        // Don't trigger select when clicking action buttons
        const target = e.target as HTMLElement;
        if (target.closest("[data-action]")) return;
        onSelect();
      }}
      className={cn(
        "w-full text-left rounded-[var(--radius-card)] bg-surface-container-lowest shadow-ambient p-4 transition",
        "flex items-start gap-4",
        isSelected && "ring-2 ring-primary/20",
        cardOpacity,
      )}
    >
      {/* Step number circle */}
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold",
          isSelected
            ? "bg-primary text-white"
            : "bg-surface-container-high text-on-surface-variant",
        )}
      >
        {row.index + 1}
      </span>

      {/* Center content */}
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-2">
          {sourceStep ? (
            <span
              className={cn(
                "text-base font-semibold text-on-surface",
                isDeleted && "line-through",
              )}
            >
              {getStepTitle(sourceStep)}
            </span>
          ) : (
            <span className="text-base font-semibold text-on-surface-variant italic">
              无内容
            </span>
          )}
          {badgeLabel ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                badgeClassName,
              )}
            >
              {badgeLabel}
            </span>
          ) : null}
          {sourceStep?.type ? (
            <span className="inline-flex rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
              {STEP_TYPE_LABELS[sourceStep.type] ?? sourceStep.type}
            </span>
          ) : null}
        </div>

        {/* Description excerpt */}
        {sourceStep ? (
          <p
            className={cn(
              "mt-2 text-sm text-on-surface-variant line-clamp-2",
              isDeleted && "line-through",
            )}
          >
            {getStepDescription(sourceStep)}
          </p>
        ) : null}
      </div>

      {/* Right-side action buttons */}
      <div className="flex shrink-0 items-center gap-2">
        {isAccepted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-container/30 px-3 py-1.5 text-xs font-semibold text-tertiary">
            <Check className="size-3.5" aria-hidden />
            已选用
          </span>
        ) : isDiscarded ? (
          <button
            type="button"
            data-action
            onClick={onUndoDiscard}
            className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-highest transition"
          >
            撤销
          </button>
        ) : row.state !== "unchanged" ? (
          <>
            <button
              type="button"
              data-action
              onClick={onAccept}
              className="inline-flex items-center gap-1 rounded-full bg-linear-135 from-primary to-primary-container text-on-primary px-3 py-1.5 text-xs font-semibold shadow-ambient transition hover:-translate-y-0.5"
            >
              <Check className="size-3.5" aria-hidden />
              接受此步
            </button>
            <button
              type="button"
              data-action
              onClick={onDiscard}
              className="inline-flex items-center gap-1 rounded-full bg-transparent text-on-surface-variant px-3 py-1.5 text-xs font-medium transition hover:bg-surface-container-low"
            >
              丢弃此步
            </button>
          </>
        ) : null}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// StepEditPanel — right-side slide-in panel (D-03, D-13)
// ═══════════════════════════════════════════════════════════

function StepEditPanel({
  stepIndex,
  diffRow,
  sourceStep,
  localEdits,
  onLocalEdit,
  onClose,
}: {
  stepIndex: number;
  diffRow: LessonDraftDiffRow;
  sourceStep: LessonStepDTO;
  localEdits: LocalEditEntry;
  onLocalEdit: (patch: Partial<LocalEditEntry>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-surface-container-lowest shadow-ambient rounded-l-[var(--radius-shell)] overflow-y-auto z-20 animate-slide-in-right flex flex-col">
      {/* Panel header */}
      <div className="sticky top-0 bg-surface-container-lowest px-6 pt-6 pb-4 flex items-center justify-between z-10">
        <h3 className="text-[20px] font-semibold text-on-surface">
          编辑第 {stepIndex + 1} 步
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-low transition"
          aria-label="关闭编辑面板"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Read-only: step type badge (D-13) */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant">步骤类型（不可修改）</span>
          <span className="inline-flex rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface-variant">
            {STEP_TYPE_LABELS[sourceStep.type] ?? sourceStep.type}
          </span>
        </div>
      </div>

      {/* Editable fields: title, description, content (D-13) */}
      <div className="px-6 pb-6 flex flex-col gap-4 flex-1">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="step-edit-title"
            className="text-sm font-medium text-on-surface"
          >
            标题
          </label>
          <input
            id="step-edit-title"
            className="w-full rounded-[var(--radius-card)] bg-surface-container-low px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-2 focus:outline-primary"
            value={
              localEdits.title ?? getStepTitle(sourceStep)
            }
            onChange={(e) => onLocalEdit({ title: e.target.value })}
            placeholder="输入步骤标题"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="step-edit-description"
            className="text-sm font-medium text-on-surface"
          >
            描述
          </label>
          <textarea
            id="step-edit-description"
            className="w-full rounded-[var(--radius-card)] bg-surface-container-low px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-2 focus:outline-primary resize-none"
            rows={3}
            value={localEdits.description ?? getStepDescription(sourceStep)}
            onChange={(e) => onLocalEdit({ description: e.target.value })}
            placeholder="输入步骤描述"
          />
        </div>

        {/* Content (Markdown) */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label
            htmlFor="step-edit-content"
            className="text-sm font-medium text-on-surface"
          >
            内容 (Markdown)
          </label>
          <textarea
            id="step-edit-content"
            className="w-full flex-1 min-h-[200px] rounded-[var(--radius-card)] bg-surface-container-low px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-2 focus:outline-primary resize-none font-mono"
            value={localEdits.content ?? ""}
            onChange={(e) => onLocalEdit({ content: e.target.value })}
            placeholder="输入 Markdown 内容"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ConfirmDialog — reusable confirmation modal
// ═══════════════════════════════════════════════════════════

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
  disabled,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: "primary" | "secondary";
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[rgba(12,15,16,0.32)] backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="rounded-[var(--radius-shell)] bg-surface-container-lowest shadow-ambient p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          {message}
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="tertiary" onClick={onCancel} disabled={disabled}>
            取消
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={disabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
