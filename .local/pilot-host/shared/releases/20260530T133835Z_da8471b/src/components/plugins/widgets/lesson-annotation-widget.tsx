import { NotebookPen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type LessonAnnotationWidgetProps = {
  payload: Record<string, unknown>;
};

export function LessonAnnotationWidget({ payload }: LessonAnnotationWidgetProps) {
  const note = typeof payload.note === "string" ? payload.note : "插件生成了一条可供教师参考的备课注记。";
  const context = typeof payload.context === "string" ? payload.context : "lesson.sidebar";

  return (
    <Card className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-none">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-tertiary-container/70 p-3 text-tertiary">
          <NotebookPen className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <Badge className="bg-surface-container-low text-on-surface-variant">课时注记</Badge>
          <p className="mt-3 text-lg font-semibold text-on-surface">{context}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{note}</p>
        </div>
      </div>
    </Card>
  );
}
