"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Palette, Settings2, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import { setActiveThemeAction } from "@/actions/theme-actions";
import { Button } from "@/components/ui/button";
import { getNativeDialogClassName, useNativeDialogBackdropClose } from "@/components/ui/native-dialog";
import { AuthoringStatusPanel } from "@/components/authoring/authoring-status-panel";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { LessonEditorDTO } from "@/lib/dto/lesson-authoring";
import type { ThemeRegistryDTO } from "@/lib/dto/resource-ai";
import { cn } from "@/lib/utils";

const DEFAULT_THEME_OPTION = "__default_theme__";

type EditorSettingsModalProps = {
  lesson: LessonEditorDTO | null;
  activeCourse: { subject?: string; classLabels: string[] } | undefined;
  activeStepCount: number;
  builtInStepCount: number;
  previewHref: string | null;
  themes: ThemeRegistryDTO[];
  activeThemeId: string | null;
  pluginSlot?: React.ReactNode;
};

type ThemeOption = {
  id: string;
  name: string;
  description: string;
  fallback: string | null;
  tone: string;
};

function getThemeSummary(theme?: ThemeRegistryDTO): Pick<ThemeOption, "description" | "fallback"> {
  const summary = theme?.layoutSummary;

  if (!summary) {
    return {
      description:
        "左侧导航 / 主内容 60:40 / 未启用左侧辅栏 / 未启用上下文侧栏 / 未启用页面底栏",
      fallback: null,
    };
  }

  return {
    description: summary.description,
    fallback: summary.fallbackLabel,
  };
}

function buildThemeOptions(themes: ThemeRegistryDTO[]): ThemeOption[] {
  return [
    {
      id: DEFAULT_THEME_OPTION,
      name: "默认主题",
      tone: "系统默认",
      ...getThemeSummary(),
    },
    ...themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      tone: "学校有效主题",
      ...getThemeSummary(theme),
    })),
  ];
}

export function EditorSettingsModal({
  lesson,
  activeCourse,
  activeStepCount,
  builtInStepCount,
  previewHref,
  themes,
  activeThemeId,
  pluginSlot,
}: EditorSettingsModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isApplying, startApplyTransition] = useTransition();
  const themeOptions = useMemo(() => buildThemeOptions(themes), [themes]);
  const initialThemeId = activeThemeId ?? DEFAULT_THEME_OPTION;
  const [draftThemeId, setDraftThemeId] = useState(initialThemeId);
  const [previewThemeId, setPreviewThemeId] = useState(initialThemeId);
  const [stagedThemeId, setStagedThemeId] = useState(initialThemeId);

  const selectedPreviewTheme =
    themeOptions.find((theme) => theme.id === previewThemeId) ?? themeOptions[0];
  const selectedStagedTheme =
    themeOptions.find((theme) => theme.id === stagedThemeId) ?? themeOptions[0];
  const hasUnsavedThemeSelection = draftThemeId !== stagedThemeId;

  const resetThemeSelectionState = useCallback(() => {
    const nextThemeId = activeThemeId ?? DEFAULT_THEME_OPTION;

    setDraftThemeId(nextThemeId);
    setPreviewThemeId(nextThemeId);
    setStagedThemeId(nextThemeId);
    setFeedback(null);
  }, [activeThemeId]);

  const openModal = useCallback(() => {
    resetThemeSelectionState();
    dialogRef.current?.showModal();
  }, [resetThemeSelectionState]);

  const closeModal = useCallback(() => {
    dialogRef.current?.close();
  }, []);
  const handleDialogBackdropClose = useNativeDialogBackdropClose(dialogRef, closeModal);

  const handlePreviewTheme = useCallback(() => {
    setPreviewThemeId(draftThemeId);
    const previewTheme = themeOptions.find((theme) => theme.id === draftThemeId) ?? themeOptions[0];
    setFeedback(`已更新主题预览：${previewTheme.name}`);
  }, [draftThemeId, themeOptions]);

  const handleSaveTheme = useCallback(() => {
    setStagedThemeId(draftThemeId);
    const stagedTheme = themeOptions.find((theme) => theme.id === draftThemeId) ?? themeOptions[0];
    setFeedback(`已保存待生效主题：${stagedTheme.name}`);
  }, [draftThemeId, themeOptions]);

  const handleApplyTheme = useCallback(() => {
    startApplyTransition(async () => {
      const nextThemeId = stagedThemeId === DEFAULT_THEME_OPTION ? undefined : stagedThemeId;
      const result = await setActiveThemeAction({ themeId: nextThemeId });

      if (!result.success) {
        setFeedback(result.error || "主题生效失败，请稍后重试。");
        return;
      }

      setFeedback(`主题已生效：${selectedStagedTheme.name}`);
      closeModal();
      router.refresh();
    });
  }, [closeModal, router, selectedStagedTheme.name, stagedThemeId]);

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
        className={getNativeDialogClassName("md", "open:animate-in open:fade-in-0 open:zoom-in-95")}
        onClick={handleDialogBackdropClose}
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

          <div className={cn(teacherSurfaceRhythm.card, "mt-4 bg-surface-container-low p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  主题设置
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  选择课时编排工作台的主题方案，并在生效前先查看结构预览。
                </p>
              </div>
              <Palette className="size-5 text-primary" aria-hidden />
            </div>

            <div className="mt-4 grid gap-3">
              {themeOptions.map((theme) => {
                const isCurrent = (activeThemeId ?? DEFAULT_THEME_OPTION) === theme.id;
                const isDraft = draftThemeId === theme.id;
                const isStaged = stagedThemeId === theme.id;
                const isPreview = previewThemeId === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setDraftThemeId(theme.id)}
                    className={cn(
                      teacherSurfaceRhythm.cardInset,
                      "w-full p-4 text-left transition",
                      isDraft ? "ring-2 ring-primary/70" : "hover:bg-surface-container-low/80",
                    )}
                    aria-pressed={isDraft}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-on-surface">{theme.name}</p>
                          <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] text-on-surface-variant">
                            {theme.tone}
                          </span>
                          {isCurrent ? (
                            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] text-white">
                              当前生效
                            </span>
                          ) : null}
                          {isStaged ? (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                              待生效
                            </span>
                          ) : null}
                          {isPreview ? (
                            <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] text-on-surface">
                              预览中
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{theme.description}</p>
                        {theme.fallback ? (
                          <p className="mt-2 text-sm text-[#bc6c25]">局部回退：{theme.fallback}</p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={cn(teacherSurfaceRhythm.cardInset, "mt-4 p-4") }>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                当前预览
              </p>
              <p className="mt-2 text-sm font-semibold text-on-surface">{selectedPreviewTheme.name}</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {selectedPreviewTheme.description}
              </p>
              {selectedPreviewTheme.fallback ? (
                <p className="mt-2 text-sm text-[#bc6c25]">局部回退：{selectedPreviewTheme.fallback}</p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-4 text-sm"
                onClick={handlePreviewTheme}
              >
                预览
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-4 text-sm"
                onClick={handleSaveTheme}
              >
                保存
              </Button>
              <Button
                type="button"
                className="h-9 px-4 text-sm"
                disabled={isApplying || hasUnsavedThemeSelection}
                onClick={handleApplyTheme}
              >
                {isApplying ? "生效中..." : "生效"}
              </Button>
            </div>

            {feedback ? <p className="mt-3 text-xs text-on-surface-variant">{feedback}</p> : null}
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
