import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { cn } from "@/lib/utils";
import type { TeacherDailyAgendaDTO } from "@/lib/dto/schedule";

export function TeacherScheduleSurface({ data }: { data: TeacherDailyAgendaDTO }) {
  const empty = data.cards.length === 0;

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,22rem)]">
          <div className="space-y-3">
            <Badge variant="accent">教师个人日程</Badge>
            <div className="space-y-2">
              <h1 className="text-[2.5rem] font-semibold tracking-[-0.03em] text-on-surface">今天先看什么时候、给谁上、在哪里上</h1>
              <p className="max-w-4xl text-sm leading-7 text-on-surface-variant sm:text-base">
                今日课表先呈现运行时调度信息，再补充教案与提醒。所有议程都来自标准课表模型、单次调课与校历规则。
              </p>
            </div>
          </div>

          <div className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
            <p className="text-sm text-on-surface-variant">日期与节奏</p>
            <p className="mt-3 text-2xl font-semibold text-on-surface">{data.dateLabel}</p>
            <p className="mt-2 text-sm text-on-surface-variant">{data.weekLabel}</p>
            <p className="mt-3 text-sm text-on-surface-variant">{data.nextClassCountdownLabel ?? "今天暂时没有下一节待执行课程。"}</p>
          </div>
        </div>
      </section>

      {empty ? (
        <section className={teacherSurfaceRhythm.section}>
          <div className={cn(teacherSurfaceRhythm.cardInset, "p-6")}>
            <h2 className="text-[1.35rem] font-semibold text-on-surface">今天还没有生成可执行课表</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-on-surface-variant">
              先导入并审核课表数据，或检查今天是否被设置为节假日/非教学日。
            </p>
          </div>
        </section>
      ) : (
        <section className={teacherSurfaceRhythm.section}>
          <div className="space-y-4">
            {data.cards.map((card) => (
              <article key={card.id} className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="时间" value={card.timeLabel} />
                    <Field label="班级" value={card.classLabel} heading />
                    <Field label="地点" value={card.locationLabel} />
                    <Field label="状态" value={card.status} heading={card.status === "进行中"} />
                  </div>
                  <div className="flex items-center gap-2">
                    {card.overrideSummary ? <Badge>{card.overrideSummary}</Badge> : null}
                    {card.lessonLink ? (
                      <Link className="text-sm font-medium text-primary" href={`/teacher/editor/preview?lessonId=${card.lessonLink.lessonId}&courseId=${card.assignmentId}`}>
                        查看教案
                      </Link>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-on-surface-variant">{card.courseTitle}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, value, heading = false }: { label: string; value: string; heading?: boolean }) {
  return (
    <div className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className={cn("mt-2 text-sm text-on-surface", heading ? "text-base font-semibold" : "font-medium")}>{value}</p>
    </div>
  );
}
