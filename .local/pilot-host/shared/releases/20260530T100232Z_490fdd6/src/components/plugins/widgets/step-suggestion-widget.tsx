import { Lightbulb } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type StepSuggestionWidgetProps = {
  payload: Record<string, unknown>;
};

export function StepSuggestionWidget({ payload }: StepSuggestionWidgetProps) {
  const title = typeof payload.title === "string" ? payload.title : "建议补充一个新步骤";
  const summary = typeof payload.summary === "string" ? payload.summary : "插件建议你补齐课堂节奏中的空白环节。";

  return (
    <Card className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-none">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/12 p-3 text-primary">
          <Lightbulb className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <Badge variant="accent" className="bg-surface-container-low">步骤建议</Badge>
          <p className="mt-3 text-lg font-semibold text-on-surface">{title}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{summary}</p>
        </div>
      </div>
    </Card>
  );
}
