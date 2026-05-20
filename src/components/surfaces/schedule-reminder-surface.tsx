"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { saveScheduleReminderRuleAction } from "@/features/schedule/reminders/actions";
import type { ScheduleReminderCenterDTO } from "@/features/schedule/shared/dto/reminders";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  planned: "已计划",
  dispatching: "系统接管中",
  sent: "发送成功",
  failed: "发送失败",
  retry_required: "需 operator 恢复",
};

export function ScheduleReminderSurface({ data }: { data: ScheduleReminderCenterDTO }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitRule(type: "pre_class" | "schedule_change") {
    startTransition(async () => {
      const result = await saveScheduleReminderRuleAction({
        schoolId: data.schoolId,
        type,
        channel: "wecom-notify",
        recipientScope: "teacher",
        offsetMinutes: type === "pre_class" ? 20 : 0,
        enabled: true,
      });
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message });
        return;
      }

      setFeedback({ tone: "success", message: "提醒规则已保存，并已刷新最近执行状态。" });
      router.refresh();
    });
  }

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <Badge variant="accent">提醒中心</Badge>
        <h1 className="mt-3 text-[2.35rem] font-semibold tracking-[-0.03em] text-on-surface">只做开课前提醒与调课变更提醒</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
          首发只保留最关键的两类提醒，并诚实展示计划、成功、失败和需重试状态。
        </p>
      </section>

      {feedback ? (
        <section className={cn(teacherSurfaceRhythm.section, feedback.tone === "success" ? "bg-tertiary-container/60 text-tertiary" : "bg-error-container text-on-error-container")}>{feedback.message}</section>
      ) : null}

      <section className={teacherSurfaceRhythm.section}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ReminderCard
            title="开课前提醒"
            description="在开课前固定时间提醒教师进入课堂准备状态。"
            statusLabel={STATUS_LABEL[data.rules.find((rule) => rule.type === "pre_class")?.latestStatus ?? "planned"]}
            onSave={() => submitRule("pre_class")}
            pending={isPending}
          />
          <ReminderCard
            title="调课变更提醒"
            description="当单次调课、停课或代课生效时，同步更新执行者。"
            statusLabel={STATUS_LABEL[data.rules.find((rule) => rule.type === "schedule_change")?.latestStatus ?? "planned"]}
            onSave={() => submitRule("schedule_change")}
            pending={isPending}
          />
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="space-y-3">
          {data.deliveries.map((delivery) => (
            <div key={delivery.id} className={cn(teacherSurfaceRhythm.cardInset, "flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between")}>
              <div>
                <p className="text-sm font-semibold text-on-surface">{delivery.targetLabel}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{delivery.channel} · {delivery.scheduledFor}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{STATUS_LABEL[delivery.status]}</Badge>
                {delivery.status === "retry_required" ? (
                  <span className="text-xs text-on-surface-variant">失败恢复仅在 operator async tasks 面执行</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReminderCard({
  title,
  description,
  statusLabel,
  onSave,
  pending,
}: {
  title: string;
  description: string;
  statusLabel: string;
  onSave: () => void;
  pending: boolean;
}) {
  return (
    <article className={cn(teacherSurfaceRhythm.cardInset, "space-y-4 p-5")}>
      <div>
        <p className="text-[1.2rem] font-semibold text-on-surface">{title}</p>
        <p className="mt-2 text-sm leading-7 text-on-surface-variant">{description}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Badge>{statusLabel}</Badge>
        <Button disabled={pending} onClick={onSave}>保存规则</Button>
      </div>
    </article>
  );
}
