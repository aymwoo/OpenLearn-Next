import type { BuiltInTeachingStepSuggestionPayload } from "@/lib/dto/resource-ai";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type BuiltInTeachingStepSuggestionWidgetProps = {
  payload: BuiltInTeachingStepSuggestionPayload;
};

export function BuiltInTeachingStepSuggestionWidget({ payload }: BuiltInTeachingStepSuggestionWidgetProps) {
  return (
    <Card className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-none">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/12 px-3 py-2 text-sm font-semibold text-primary">内置</div>
        <div className="min-w-0 flex-1">
          <Badge variant="accent" className="bg-surface-container-low">教学环节建议</Badge>
          <p className="mt-3 text-lg font-semibold text-on-surface">{payload.title}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{payload.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">
              {payload.pluginName}
            </span>
            <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">
              {payload.stepType === "content" ? "内容步骤" : payload.stepType === "task" ? "任务步骤" : "测验步骤"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
