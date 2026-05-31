import { BellRing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type NotificationStubWidgetProps = {
  payload: Record<string, unknown>;
};

export function NotificationStubWidget({ payload }: NotificationStubWidgetProps) {
  const title = typeof payload.title === "string" ? payload.title : "通知草稿已准备";
  const audience = typeof payload.audience === "string" ? payload.audience : "目标对象待确认";

  return (
    <Card className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-none">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[#fff2df] p-3 text-[#bc6c25]">
          <BellRing className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <Badge className="bg-surface-container-low text-on-surface-variant">通知草稿</Badge>
          <p className="mt-3 text-lg font-semibold text-on-surface">{title}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">适用对象：{audience}</p>
        </div>
      </div>
    </Card>
  );
}
