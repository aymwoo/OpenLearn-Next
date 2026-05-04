import Link from 'next/link'
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react'
import { GlassNav } from '@/components/shell/glass-nav'
import { RolePreview } from '@/components/shell/role-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { demoCourse, demoLesson, lessonSteps } from '@/lib/demo-data'

export function HomeSurface() {
  return (
    <main className="min-h-screen overflow-hidden bg-surface pb-12 pt-4 text-on-surface">
      <GlassNav />

      <section className="mx-auto grid w-[min(1180px,calc(100%-24px))] gap-6 pt-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:pt-14">
        <div className="relative rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-10 lg:p-12">
          <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full bg-linear-135 from-primary/20 to-primary-container/30 blur-2xl sm:block" />
          <Badge variant="accent" className="mb-6 gap-2 bg-surface-container-lowest">
            <Sparkles className="size-4" aria-hidden />
            {demoCourse.subject} · {demoCourse.classLabel}
          </Badge>

          <div className="max-w-3xl space-y-6">
            <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[3.5rem]">
              把一节课编排成可追踪的学习流程
            </h1>
            <p className="max-w-2xl text-base leading-8 text-on-surface-variant">
              从备课、课堂步骤到学生完成状态，OpenLearn Next 让教师用清晰的流程设计一节真实可运行的课。
              当前示例围绕 {demoLesson.title} 展开。
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="min-h-12 gap-2 px-7 text-base">
              <Link href="/teacher/editor">
                开始备课
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="min-h-12 px-7 text-base shadow-none">
              <Link href="/student">浏览学生空间</Link>
            </Button>
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm text-on-surface-variant/70 transition hover:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary/40"
            >
              管理后台
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-surface-container-lowest p-5">
              <p className="text-sm text-on-surface-variant">课程场景</p>
              <p className="mt-2 text-2xl font-semibold">初中信息科技</p>
            </div>
            <div className="rounded-3xl bg-surface-container-lowest p-5 sm:col-span-2">
              <p className="text-sm text-on-surface-variant">本节课</p>
              <p className="mt-2 text-2xl font-semibold">编程基础：让角色动起来</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient sm:p-5">
            <div className="rounded-[calc(var(--radius-shell)-0.5rem)] bg-surface-container-lowest p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-on-surface-variant">今日课堂</p>
                  <h2 className="mt-2 text-2xl font-semibold">{demoCourse.classLabel}</h2>
                </div>
                <div className="grid size-12 place-items-center rounded-full bg-linear-135 from-primary to-primary-container text-on-primary shadow-ambient">
                  <BookOpen className="size-6" aria-hidden />
                </div>
              </div>

              <div className="mt-6 rounded-3xl bg-surface-container-low p-4">
                <p className="text-sm text-on-surface-variant">课时流程</p>
                <p className="mt-2 text-2xl font-semibold">导入 / 讲授 / 练习 / 总结</p>
              </div>

              <div className="mt-5 space-y-3">
                {lessonSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3 rounded-3xl bg-surface-container-low p-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-container-lowest text-sm font-semibold text-primary">
                      {step.title.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{step.title}</p>
                      <p className="truncate text-sm text-on-surface-variant">{step.focus} · {step.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <RolePreview />
        </div>
      </section>
    </main>
  )
}
