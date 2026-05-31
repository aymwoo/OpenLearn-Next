import type { BuiltInTeachingStepTemplatePayload } from "@/lib/dto/resource-ai";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type BuiltInTeachingStepTemplateWidgetProps = {
  payload: BuiltInTeachingStepTemplatePayload;
};

export function BuiltInTeachingStepTemplateWidget({ payload }: BuiltInTeachingStepTemplateWidgetProps) {
  return (
    <Card className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Badge className="bg-surface-container-low text-on-surface-variant">内置教学环节模板</Badge>
          <p className="mt-3 text-lg font-semibold text-on-surface">{payload.title}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{payload.summary}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{payload.pluginName}</span>
      </div>
    </Card>
  );
}
