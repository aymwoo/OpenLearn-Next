"use client";

import Link from "next/link";
import { Settings2, X } from "lucide-react";
import { useRef, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { AuthoringStatusPanel } from "@/components/authoring/authoring-status-panel";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { LessonEditorDTO } from "@/lib/dto/lesson-authoring";
import { cn } from "@/lib/utils";

type EditorSettingsModalProps = {
  lesson: LessonEditorDTO | null;
  activeCourse: { subject?: string; classLabels: string[] } | undefined;
  activeStepCount: number;
  builtInStepCount: number;
  previewHref: string | null;
  pluginSlot?: React.ReactNode;
};

export function EditorSettingsModal({
  lesson,
  activeCourse,
  activeStepCount,
  builtInStepCount,
  previewHref,
  pluginSlot,
}: EditorSettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openModal = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const closeModal = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  return (
    <>
      {/* Trigger button — blends into the pills row */}
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        aria-label="打开课时设置"
      >
        <Settings2 className="size-3.5" />
        设置
      </button>

      {/* Native <dialog> modal with backdrop */}
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-lg rounded-[var(--radius-shell)] bg-surface-container-lowest p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm open:animate-in open:fade-in-0 open:zoom-in-95"
        onClick={(e) => {
          // Close when clicking the backdrop (the <dialog> element itself)
          if (e.target === dialogRef.current) closeModal();
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Settings2 className="size-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-on-surface">课时设置</h2>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="grid size-8 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high"
              aria-label="关闭设置"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Settings content */}
          <div className="mt-5 space-y-3">
            <MetaRow
              label="班级"
              value={activeCourse?.classLabels.join("、") || "未绑定"}
            />
            <MetaRow
              label="摘要"
              value={`${activeStepCount} 个步骤，${builtInStepCount} 个内置环节`}
            />
            <MetaRow
              label="资源"
              value={`${lesson?.materials.length ?? 0} 个引用材料`}
            />
            <MetaRow
              label="发布状态"
              value={
                lesson?.publishState.latestVersion
                  ? `第 ${lesson.publishState.latestVersion} 版 · 学生读取已发布版`
                  : "草稿仅教师可见"
              }
            />
          </div>

          {/* Publish readiness */}
          <div className={cn(teacherSurfaceRhythm.card, "mt-4 bg-surface-container-low p-4")}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              发布前检查
            </p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              发布课时前请先查看阻断项与保存反馈。
            </p>
          </div>

          {/* Preview */}
          <div className={cn(teacherSurfaceRhythm.card, "mt-4 bg-surface-container-low p-4")}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              课堂预览
            </p>
            <div className="mt-3 grid gap-2 grid-cols-3">
              <MetaRow label="有效步骤" value={`${activeStepCount}`} />
              <MetaRow label="内置环节" value={`${builtInStepCount}`} />
              <MetaRow label="引用资料" value={`${lesson?.materials.length ?? 0}`} />
            </div>
            <div className="mt-3">
              {previewHref ? (
                <Button asChild variant="secondary" className="h-9 w-full px-3 text-sm">
                  <Link href={previewHref}>打开课堂预览</Link>
                </Button>
              ) : (
                <Button variant="secondary" className="h-9 w-full px-3 text-sm" disabled>
                  打开课堂预览
                </Button>
              )}
            </div>
          </div>

          {/* Plugin slot */}
          {pluginSlot ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                插件建议
              </p>
              <div className="mt-3">{pluginSlot}</div>
            </div>
          ) : null}

          {/* Authoring status panel */}
          <AuthoringStatusPanel lesson={lesson} />
        </div>
      </dialog>
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-3")}>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
