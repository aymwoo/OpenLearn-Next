import { Card } from "@/components/ui/card";
import type { LessonStepDTO } from "@/lib/dto/lesson-authoring";

type LessonStepEditorProps = {
  step: LessonStepDTO | null;
};

export function LessonStepEditor({ step }: LessonStepEditorProps) {
  if (!step) {
    return (
      <Card className="bg-surface-container-low p-5 shadow-none">
        <h3 className="text-2xl font-semibold">新增内容 / 新增任务 / 新增测验</h3>
        <p className="mt-3 text-on-surface-variant">选择左侧步骤，或先新增一个学习活动。</p>
      </Card>
    );
  }

  return (
    <Card className="bg-surface-container-low p-5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-on-surface-variant">步骤编辑器</p>
          <h3 className="mt-2 text-2xl font-semibold">{step.title}</h3>
        </div>
        <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-sm text-primary">
          {step.type === "content" ? "内容" : step.type === "task" ? "任务" : "测验"}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm text-on-surface-variant">标题</span>
          <input className="rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" defaultValue={step.title} />
        </label>

        {step.type === "content" && (
          <>
            <label className="grid gap-2">
              <span className="text-sm text-on-surface-variant">正文</span>
              <textarea className="min-h-32 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" defaultValue={step.payload.type === "content" ? step.payload.body : ""} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-on-surface-variant">教师提示</span>
              <textarea className="min-h-24 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" defaultValue={step.payload.type === "content" ? step.payload.teacherNotes : ""} />
            </label>
          </>
        )}

        {step.type === "task" && step.payload.type === "task" && (
          <>
            <label className="grid gap-2">
              <span className="text-sm text-on-surface-variant">任务说明</span>
              <textarea className="min-h-32 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" defaultValue={step.payload.prompt} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-on-surface-variant">提交要求</span>
              <input className="rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" defaultValue={step.payload.submissionType} />
            </label>
          </>
        )}

        {step.type === "quiz" && step.payload.type === "quiz" && (
          <>
            <label className="grid gap-2">
              <span className="text-sm text-on-surface-variant">题目</span>
              <textarea className="min-h-28 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" defaultValue={step.payload.question} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-on-surface-variant">选项</span>
              <textarea className="min-h-24 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" defaultValue={step.payload.options.join("\n")} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-on-surface-variant">答案说明</span>
              <textarea className="min-h-24 rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" defaultValue={step.payload.explanation} />
            </label>
          </>
        )}

        <label className="grid gap-2">
          <span className="text-sm text-on-surface-variant">引用材料</span>
          <input className="rounded-3xl bg-surface-container-lowest px-4 py-3 outline-none focus-visible:outline-2" placeholder="输入材料标题或链接" />
        </label>
      </div>
    </Card>
  );
}
