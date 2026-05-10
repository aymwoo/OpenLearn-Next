"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { publishLessonAction } from "@/actions/lesson-authoring-actions";
import { dispatchLessonStepEditorCommand, lessonStepEditorSaveRequestEvent } from "@/components/authoring/editor-command-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LessonEditorDTO, LessonPublishIssueDTO } from "@/lib/dto/lesson-authoring";

type AuthoringStatusPanelProps = {
  lesson: LessonEditorDTO | null;
};

const issueLabels: Record<LessonPublishIssueDTO["code"], string> = {
  LESSON_TITLE_REQUIRED: "缺少课时标题",
  LESSON_OBJECTIVE_REQUIRED: "缺少教学目标",
  NO_ACTIVE_STEPS: "没有有效步骤",
  STEP_PAYLOAD_INVALID: "步骤内容结构无效",
  BUILT_IN_PLUGIN_UNAVAILABLE: "内置教学环节当前不可用",
};

export function AuthoringStatusPanel({ lesson }: AuthoringStatusPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishIssues, setPublishIssues] = useState<LessonPublishIssueDTO[]>(lesson?.publishState.blockingIssues ?? []);
  const blockingIssues = publishIssues;
  const warnings = lesson?.publishState.warnings ?? [];
  const canPublish = Boolean(lesson && blockingIssues.length === 0 && lesson.publishState.canPublish);

  function saveDraft() {
    const saveHandled = dispatchLessonStepEditorCommand(lessonStepEditorSaveRequestEvent);

    if (saveHandled) {
      setPublishMessage("正在保存当前打开的教学环节。");
      return;
    }

    router.refresh();
    setPublishMessage("当前没有打开的环节，已刷新草稿。");
  }

  function publish() {
    if (!lesson) return;

    setPublishMessage("正在执行发布前检查...");
    startTransition(async () => {
      const result = await publishLessonAction({ lessonId: lesson.lesson.id, expectedRevision: lesson.lesson.revision });

      if (result.ok) {
        setPublishIssues([]);
        setPublishMessage("发布成功，学生端将读取最新已发布版本。");
        return;
      }

      if (result.error === "PUBLISH_BLOCKED") {
        const nextIssues = Array.isArray(result.issues) ? (result.issues as LessonPublishIssueDTO[]) : [];
        setPublishIssues(nextIssues);
        setPublishMessage("发布前检查未通过，请先处理以下阻断项。");
        return;
      }

      setPublishMessage(result.message || "发布失败，请稍后重试。");
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-3xl bg-surface-container-low p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">保存状态</p>
          <Badge variant="success">已自动保存</Badge>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">保存、预览和发布反馈都会留在当前 editor shell 中，避免离开当前编排上下文。</p>
        <p className="mt-3 rounded-3xl bg-surface-container-lowest px-4 py-3 text-sm">{isPending ? "正在执行发布前检查..." : "缓存已刷新"}</p>
      </div>

      <div className="rounded-3xl bg-surface-container-low p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">发布准备</p>
            <p className="mt-2 text-sm text-on-surface-variant">当前发布按钮和服务端 `PUBLISH_BLOCKED` 守卫使用同一套 readiness contract。</p>
          </div>
          <Badge variant={canPublish ? "success" : "accent"}>{canPublish ? "可发布" : "需先处理阻断项"}</Badge>
        </div>

        <div className="mt-4 space-y-3">
          <IssueGroup title="阻断项" description={blockingIssues.length > 0 ? "以下问题会直接阻止发布。" : "当前没有阻断项，可以继续发布。"} issues={blockingIssues} emptyLabel="当前没有阻断项" tone="blocking" />
          <IssueGroup title="提醒项" description={warnings.length > 0 ? "以下提醒不会阻止发布，但建议先确认。" : "当前没有额外提醒。"} issues={warnings} emptyLabel="当前没有提醒项" tone="warning" />
        </div>

        <p className="mt-4 text-sm text-on-surface-variant">学生将读取已发布版本，草稿仅教师可见。</p>
        {publishMessage ? <p className="mt-3 rounded-3xl bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">{publishMessage}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={publish} disabled={!lesson || isPending} className="min-h-10 px-4 text-sm">{isPending ? "正在发布..." : "发布课时"}</Button>
          <Button type="button" variant="secondary" onClick={saveDraft} className="min-h-10 px-4 text-sm">保存草稿</Button>
        </div>
      </div>

      <div className="rounded-3xl bg-surface-container-low p-5">
        <p className="font-semibold">冲突处理</p>
        <p className="mt-2 text-sm text-on-surface-variant">检测到更新冲突时，请刷新课时并重新应用修改。发布阻断和冲突提示都会保留在当前页内。</p>
        <p className="mt-3 rounded-3xl bg-surface-container-lowest px-4 py-3 text-sm">检测到更新冲突</p>
      </div>
    </div>
  );
}

function IssueGroup({ title, description, issues, emptyLabel, tone }: { title: string; description: string; issues: LessonPublishIssueDTO[]; emptyLabel: string; tone: "blocking" | "warning" }) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container-lowest p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-on-surface">{title}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone === "blocking" ? "bg-[#fff1f2] text-[#b31b25]" : "bg-primary/10 text-primary"}`}>{issues.length} 项</span>
      </div>
      <p className="mt-2 text-sm text-on-surface-variant">{description}</p>

      {issues.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-label={title}>
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.stepId ?? issue.pluginId ?? index}`} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm">
              <p className="font-semibold text-on-surface">{issueLabels[issue.code]}</p>
              <p className="mt-1 text-on-surface-variant">{issue.message}</p>
              {(issue.pluginName || issue.builtInKey || issue.stepId) ? (
                <p className="mt-2 text-xs text-on-surface-variant">
                  {[issue.pluginName, issue.builtInKey, issue.stepId ? `step:${issue.stepId}` : null].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">{emptyLabel}</p>
      )}
    </div>
  );
}
