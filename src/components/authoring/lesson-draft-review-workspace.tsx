"use client";

import type { LessonDraftReviewDTO, LessonEditorDTO, TeacherAuthoringOverviewDTO } from "@/lib/dto/lesson-authoring";

export type LessonDraftReviewWorkspaceProps = {
  draftReview: LessonDraftReviewDTO;
  lesson: LessonEditorDTO | null;
  overview: TeacherAuthoringOverviewDTO;
};

/**
 * Placeholder — full implementation in Phase 64 Plan 04 Task 2.
 *
 * Renders the draft review workspace when `mode === "review"` and
 * `draftReview.hasPendingDraft` is true.
 */
export function LessonDraftReviewWorkspace(_props: LessonDraftReviewWorkspaceProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-lg font-semibold text-on-surface">审校 AI 课时草稿</p>
      <p className="mt-2 text-sm text-on-surface-variant">正在加载审校界面…</p>
    </div>
  );
}
