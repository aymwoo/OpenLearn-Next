import { publishLessonAction } from "@/actions/lesson-authoring-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LessonEditorDTO } from "@/lib/dto/lesson-authoring";

type AuthoringStatusPanelProps = {
  lesson: LessonEditorDTO | null;
};

export function AuthoringStatusPanel({ lesson }: AuthoringStatusPanelProps) {
  const canPublish = Boolean(
    lesson?.lesson.title &&
    lesson.lesson.objective &&
    lesson.steps.some((step) => !step.archivedAt)
  );

  async function publish() {
    "use server";

    if (!lesson) return;
    await publishLessonAction({ lessonId: lesson.lesson.id, expectedRevision: lesson.lesson.revision });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-3xl bg-surface-container-low p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">保存状态</p>
          <Badge variant="success">已自动保存</Badge>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">正在保存... 时会在这里显示，缓存已刷新后教师端会读取最新课时。</p>
        <p className="mt-3 rounded-3xl bg-surface-container-lowest px-4 py-3 text-sm">缓存已刷新</p>
      </div>

      <div className="rounded-3xl bg-surface-container-low p-5">
        <p className="font-semibold">发布准备</p>
        <p className="mt-2 text-sm text-on-surface-variant">
          {canPublish ? "可发布" : "补全标题、目标和至少一个有效步骤后可发布"}
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">学生将读取已发布版本，草稿仅教师可见。</p>
        <form action={publish} className="mt-4">
          <Button type="submit" disabled={!lesson || !canPublish} className="w-full">发布课时</Button>
        </form>
      </div>

      <div className="rounded-3xl bg-surface-container-low p-5">
        <p className="font-semibold">冲突处理</p>
        <p className="mt-2 text-sm text-on-surface-variant">检测到更新冲突时，请刷新课时并重新应用修改。</p>
        <p className="mt-3 rounded-3xl bg-surface-container-lowest px-4 py-3 text-sm">检测到更新冲突</p>
      </div>
    </div>
  );
}
