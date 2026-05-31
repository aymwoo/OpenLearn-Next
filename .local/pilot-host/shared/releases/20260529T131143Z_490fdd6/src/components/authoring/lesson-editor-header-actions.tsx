"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";

import { publishLessonAction } from "@/actions/lesson-authoring-actions";
import {
  dispatchLessonStepEditorCommand,
  lessonStepEditorResetRequestEvent,
  lessonStepEditorSaveRequestEvent,
} from "@/components/authoring/editor-command-events";
import { EditorSettingsModal } from "@/components/authoring/editor-settings-modal";
import { Button } from "@/components/ui/button";
import type { LessonEditorDTO } from "@/lib/dto/lesson-authoring";
import type { ThemeRegistryDTO } from "@/lib/dto/resource-ai";

type LessonEditorHeaderActionsProps = {
  lesson: LessonEditorDTO | null;
  activeCourse: { subject?: string; classLabels: string[] } | undefined;
  activeStepCount: number;
  builtInStepCount: number;
  previewHref: string | null;
  themes: ThemeRegistryDTO[];
  activeThemeId: string | null;
  pluginSlot?: React.ReactNode;
};

export function LessonEditorHeaderActions({
  lesson,
  activeCourse,
  activeStepCount,
  builtInStepCount,
  previewHref,
  themes,
  activeThemeId,
  pluginSlot,
}: LessonEditorHeaderActionsProps) {
  const router = useRouter();
  const [isPublishing, startPublishTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const launchHref = lesson?.preparationSummary.launchHref ?? null;

  function handleUndo() {
    const resetHandled = dispatchLessonStepEditorCommand(lessonStepEditorResetRequestEvent);

    if (resetHandled) {
      setFeedback("已恢复当前环节到最近一次保存内容。");
      return;
    }

    router.refresh();
    setFeedback("当前没有打开的环节，已刷新课时草稿。");
  }

  function handleSaveDraft() {
    const saveHandled = dispatchLessonStepEditorCommand(lessonStepEditorSaveRequestEvent);

    if (saveHandled) {
      setFeedback("正在保存当前打开的教学环节。");
      return;
    }

    router.refresh();
    setFeedback("当前没有打开的环节，已刷新草稿。");
  }

  function handlePublish() {
    if (!lesson) return;

    setFeedback("正在执行发布前检查...");
    startPublishTransition(async () => {
      const result = await publishLessonAction({
        lessonId: lesson.lesson.id,
        expectedRevision: lesson.lesson.revision,
      });

      if (result.ok) {
        setFeedback("发布成功，学生端将读取最新已发布版本。");
        router.refresh();
        return;
      }

      if (result.error === "PUBLISH_BLOCKED") {
        setFeedback("发布前检查未通过，请先在设置面板处理阻断项。");
        return;
      }

      setFeedback(result.message || "发布失败，请稍后重试。");
    });
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <EditorSettingsModal
          lesson={lesson}
          activeCourse={activeCourse}
          activeStepCount={activeStepCount}
          builtInStepCount={builtInStepCount}
          previewHref={previewHref}
          themes={themes}
          activeThemeId={activeThemeId}
          pluginSlot={pluginSlot}
        />

        <Button variant="secondary" className="h-9 gap-1.5 px-3 text-sm" type="button" onClick={handleUndo}>
          <Undo2 className="size-3.5" />
          撤销
        </Button>
        <Button variant="secondary" className="h-9 gap-1.5 px-3 text-sm" type="button" onClick={handleSaveDraft}>
          <Save className="size-3.5" />
          保存草稿
        </Button>
        {previewHref ? (
          <Button asChild variant="secondary" className="h-9 px-3 text-sm">
            <Link href={previewHref}>预览课堂</Link>
          </Button>
        ) : (
          <Button variant="secondary" className="h-9 px-3 text-sm" disabled>
            预览课堂
          </Button>
        )}
        {launchHref ? (
          <Button asChild variant="secondary" className="h-9 px-3 text-sm">
            <Link href={launchHref}>开课准备</Link>
          </Button>
        ) : null}
        <Button className="h-9 px-4 text-sm" type="button" disabled={!lesson || isPublishing} onClick={handlePublish}>
          {isPublishing ? "正在发布..." : "发布课时"}
        </Button>
      </div>
      {feedback ? <p className="text-xs text-on-surface-variant">{feedback}</p> : null}
      {!feedback && launchHref ? <p className="text-xs text-on-surface-variant">开课前可进入 `/teacher/launch` 检查整班启动摘要与课堂节奏。</p> : null}
    </div>
  );
}
