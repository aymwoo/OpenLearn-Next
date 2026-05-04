import Link from 'next/link'
import { ArrowRight, CalendarClock, Clock3, FolderKanban, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoCourse, demoLesson, lessonSteps, teacherCards } from '@/lib/demo-data'

export function TeacherDashboardSurface() {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
          <Badge variant="accent" className="mb-4 bg-surface-container-lowest">
            {demoCourse.subject} · {demoCourse.classLabel}
          </Badge>
          <h1 className="max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.85rem]">
            今天把“{demoLesson.title}”编排成可运行课堂
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
            按步骤检查导入、讲授、练习和总结，确认资源与课堂模式后即可进入课堂运行。
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2 text-base">
              <Link href="/teacher/editor">
                开始备课
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2 text-base shadow-none">
              <Link href="/classroom">
                <PlayCircle className="size-5" aria-hidden />
                进入课堂
              </Link>
            </Button>
          </div>
        </div>

        <Card className="flex flex-col justify-between gap-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-on-surface-variant">待进入课堂</p>
              <h2 className="mt-2 text-2xl font-semibold">14:20 · 七年级 3 班</h2>
            </div>
            <div className="grid size-12 place-items-center rounded-full bg-linear-135 from-primary to-primary-container text-on-primary shadow-ambient">
              <CalendarClock className="size-6" aria-hidden />
            </div>
          </div>
          <div className="rounded-3xl bg-surface-container-low p-5">
            <p className="text-sm text-on-surface-variant">正在编排</p>
            <p className="mt-2 text-2xl font-semibold">{demoLesson.flowLabel}</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {teacherCards.map((card) => (
          <Card key={card.title} className="min-h-40 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">{card.title}</p>
              {card.title === '资源准备' ? <FolderKanban className="size-5 text-primary" aria-hidden /> : <Clock3 className="size-5 text-primary" aria-hidden />}
            </div>
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{card.detail}</p>
          </Card>
        ))}
      </section>

      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-on-surface-variant">今日备课</p>
            <h2 className="mt-2 text-2xl font-semibold">课堂步骤检查</h2>
          </div>
          <Badge variant="success">流程清晰</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {lessonSteps.map((step) => (
            <div key={step.id} className="rounded-3xl bg-surface-container-lowest p-5 shadow-ambient">
              <p className="text-sm text-on-surface-variant">{step.duration}</p>
              <h3 className="mt-3 text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
