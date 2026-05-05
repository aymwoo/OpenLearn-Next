import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Clock3, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoCourse, demoLesson, lessonSteps, studentProgress } from '@/lib/demo-data'
import type { StudentDashboardDTO } from '@/lib/dto/learning'

type StudentDashboardSurfaceProps = {
  dashboard?: StudentDashboardDTO
}

export function StudentDashboardSurface({ dashboard }: StudentDashboardSurfaceProps = {}) {
  void dashboard

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
          <Badge variant="accent" className="mb-5 bg-surface-container-lowest">
            {demoCourse.classLabel} · {demoCourse.subject}
          </Badge>
          <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">
            今天继续完成信息科技课堂
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant">
            {studentProgress.name}，你已经完成导入，现在可以继续学习角色坐标与顺序执行。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2 text-base">
              <Link href="/student/player">
                继续学习
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2 text-base shadow-none">
              <Link href="/courses">
                查看课程
              </Link>
            </Button>
          </div>
        </div>

        <Card className="flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-on-surface-variant">正在学习</p>
              <h2 className="mt-2 text-2xl font-semibold">{demoLesson.title}</h2>
            </div>
            <div className="grid size-12 place-items-center rounded-full bg-linear-135 from-primary to-primary-container text-on-primary shadow-ambient">
              <BookOpenCheck className="size-6" aria-hidden />
            </div>
          </div>
          <div className="rounded-3xl bg-tertiary-container/50 p-5 text-tertiary">
            <p className="text-sm">已完成 {studentProgress.completedSteps}/{studentProgress.totalSteps} 个步骤</p>
            <p className="mt-2 text-2xl font-semibold">{studentProgress.status}</p>
          </div>
        </Card>
      </section>

      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-on-surface-variant">学习进度</p>
            <h2 className="mt-2 text-2xl font-semibold">编程基础：让角色动起来</h2>
          </div>
          <Badge variant="success">导入已完成</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {lessonSteps.map((step) => (
            <div key={step.id} className="rounded-3xl bg-surface-container-lowest p-5 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">{step.duration}</p>
                {step.status === 'done' ? <Sparkles className="size-5 text-tertiary" aria-hidden /> : <Clock3 className="size-5 text-primary" aria-hidden />}
              </div>
              <h3 className="mt-3 text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">{step.focus}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
