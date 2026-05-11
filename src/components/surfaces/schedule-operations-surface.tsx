"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { createScheduleOverrideAction, saveHolidayCalendarDateAction } from "@/features/schedule/operations/actions";
import type { ScheduleOperationsCenterDTO } from "@/features/schedule/shared/dto/operations";
import { cn } from "@/lib/utils";

export function ScheduleOperationsSurface({ data }: { data: ScheduleOperationsCenterDTO }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const firstRecurring = data.recurringEntries[0];

  function submitOverride(formData: FormData) {
    startTransition(async () => {
      const result = await createScheduleOverrideAction({
        recurringEntryId: String(formData.get("recurringEntryId") ?? ""),
        effectiveDate: String(formData.get("effectiveDate") ?? ""),
        action: String(formData.get("action") ?? ""),
        reason: String(formData.get("reason") ?? ""),
        substituteTeacherId: String(formData.get("substituteTeacherId") ?? "") || null,
        replacementBellSlotId: String(formData.get("replacementBellSlotId") ?? "") || null,
        replacementRoomLabel: String(formData.get("replacementRoomLabel") ?? "") || null,
      });
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message });
        return;
      }

      setFeedback({ tone: "success", message: "调课记录已保存，并已刷新当前日程摘要。" });
      router.refresh();
    });
  }

  function submitHoliday(formData: FormData) {
    startTransition(async () => {
      const result = await saveHolidayCalendarDateAction({
        schoolId: data.schoolId,
        calendarId: data.calendarId,
        date: String(formData.get("holidayDate") ?? ""),
        dayType: String(formData.get("dayType") ?? ""),
        label: String(formData.get("label") ?? ""),
        note: String(formData.get("note") ?? "") || null,
      });
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message });
        return;
      }

      setFeedback({ tone: "success", message: "校历变更已保存，并会立即参与议程生成。" });
      router.refresh();
    });
  }

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <Badge variant="accent">单次调课与校历管理</Badge>
        <h1 className="mt-3 text-[2.35rem] font-semibold tracking-[-0.03em] text-on-surface">先说明原始排课，再做单次覆盖</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
          首发只支持代课、停课、换时间/教室三种单次覆盖，并保留原始排课、调课理由与审计记录。
        </p>
      </section>

      {feedback ? (
        <section
          className={cn(
            teacherSurfaceRhythm.section,
            feedback.tone === "success" ? "bg-tertiary-container/60 text-tertiary" : "bg-error-container text-on-error-container",
          )}
        >
          {feedback.message}
        </section>
      ) : null}

      <section className={teacherSurfaceRhythm.section}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <form action={submitOverride} className={cn(teacherSurfaceRhythm.cardInset, "space-y-4 p-5")}>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">单次调课</p>
              <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">原始排课摘要</h2>
              <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                {firstRecurring
                  ? `${firstRecurring.classLabel} · ${firstRecurring.courseTitle} · ${firstRecurring.teacherLabel} · ${firstRecurring.timeLabel}`
                  : "当前还没有可调课的已入库排课。"}
              </p>
            </div>

            <input name="recurringEntryId" type="hidden" value={firstRecurring?.recurringEntryId ?? ""} />

            <label className="block space-y-2 text-sm text-on-surface">
              <span>生效日期</span>
              <input className="w-full rounded-[var(--radius-card)] bg-surface-container-low px-4 py-3" defaultValue={new Date().toISOString().slice(0, 10)} name="effectiveDate" />
            </label>

            <label className="block space-y-2 text-sm text-on-surface">
              <span>动作类型</span>
              <select className="w-full rounded-[var(--radius-card)] bg-surface-container-low px-4 py-3" defaultValue="substitute" name="action">
                <option value="substitute">代课</option>
                <option value="cancel">停课</option>
                <option value="move">换时间/教室</option>
              </select>
            </label>

            <label className="block space-y-2 text-sm text-on-surface">
              <span>调课说明</span>
              <textarea className="min-h-28 w-full rounded-[var(--radius-card)] bg-surface-container-low px-4 py-3" defaultValue="教师请假，改为单次覆盖处理。" name="reason" />
            </label>

            <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
              <p className="text-sm font-semibold text-on-surface">审计说明</p>
              <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                系统会保留原始教师、原节次、原教室和本次生效日期，不会直接改写基础 recurring schedule。
              </p>
            </div>

            <Button disabled={!firstRecurring || isPending} type="submit">保存单次调课</Button>
          </form>

          <form action={submitHoliday} className={cn(teacherSurfaceRhythm.cardInset, "space-y-4 p-5")}>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">校历与非教学日</p>
              <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">把节假日直接写进运行时输入</h2>
            </div>

            <label className="block space-y-2 text-sm text-on-surface">
              <span>日期</span>
              <input className="w-full rounded-[var(--radius-card)] bg-surface-container-low px-4 py-3" defaultValue={new Date().toISOString().slice(0, 10)} name="holidayDate" />
            </label>
            <label className="block space-y-2 text-sm text-on-surface">
              <span>日历类型</span>
              <select className="w-full rounded-[var(--radius-card)] bg-surface-container-low px-4 py-3" defaultValue="holiday" name="dayType">
                <option value="holiday">节假日</option>
                <option value="non_teaching">非教学日</option>
                <option value="make_up">调休补课</option>
                <option value="teaching">正常教学日</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm text-on-surface">
              <span>说明</span>
              <input className="w-full rounded-[var(--radius-card)] bg-surface-container-low px-4 py-3" defaultValue="校园活动日" name="label" />
            </label>
            <Button disabled={isPending} type="submit">保存校历设置</Button>

            <div className="space-y-3">
              {data.holidayDates.map((item) => (
                <div key={item.id} className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">{item.date}</p>
                    </div>
                    <Badge>{item.dayType}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
