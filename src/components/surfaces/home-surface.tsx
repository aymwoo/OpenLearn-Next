import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import { GlassNav } from '@/components/shell/glass-nav'
import { HomeLoginCard } from '@/components/home/home-login-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { demoCourse, demoLesson, lessonSteps, recommendedCourses } from '@/lib/demo-data'

const homeMetrics = [
  { value: '10W+', label: '活跃学生' },
  { value: '500+', label: '精品课程' },
  { value: '98%', label: '好评率' },
] as const

export function HomeSurface() {
  return (
    <main className="min-h-screen overflow-hidden bg-surface pb-8 pt-4 text-on-surface">
      <GlassNav />

      <section className="mx-auto grid w-[min(1120px,calc(100%-24px))] gap-4 pt-6 lg:items-stretch lg:pt-8">
        <section className="relative overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient sm:p-5">
          <div className="absolute -left-10 top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-primary-container/20 blur-3xl" />

          <div className="relative grid gap-4 rounded-[calc(var(--radius-shell)-0.75rem)] bg-linear-135 from-primary to-primary-container p-5 text-on-primary shadow-ambient lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)] lg:items-center sm:p-6">
            <div>
            <Badge variant="accent" className="mb-4 gap-2 bg-white/15 text-white">
              <Sparkles className="size-4" aria-hidden />
              OpenLear-Next · {demoCourse.subject}
            </Badge>

            <p className="text-sm text-on-primary/80">开启智慧学习新篇章</p>
            <h1 className="mt-3 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[3rem]">
              把一节课编排成可追踪的学习流程
            </h1>
              <p className="mt-4 text-base leading-7 text-on-primary/85">
                从备课、课堂步骤到学生完成状态，教师用可编程流程组织真实课堂，学生按节奏完成每个学习动作。
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {homeMetrics.map((metric) => (
                  <div key={metric.value} className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-white/14 p-4 text-center backdrop-blur-sm">
                    <p className="text-2xl font-semibold text-white">{metric.value}</p>
                    <p className="mt-1 text-sm text-on-primary/78">{metric.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="secondary" className="min-h-11 bg-white/92 px-5 text-primary shadow-none hover:bg-white">
                  <Link href="/teacher/editor">开始备课</Link>
                </Button>
                <Button asChild variant="tertiary" className="min-h-11 px-5 text-white hover:bg-white/12">
                  <Link href="/courses">查看课程目录</Link>
                </Button>
              </div>
            </div>

            <HomeLoginCard />
          </div>
        </section>

        <div className="grid gap-4">
          <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient sm:p-5">
            <div className="grid gap-4 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5 lg:grid-cols-[1fr_0.78fr]">
              <div>
                <Badge variant="accent" className="mb-4 bg-surface-container-low">
                  {demoCourse.classLabel} · {demoLesson.duration}
                </Badge>
                <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em]">{demoLesson.title}</h2>
                <p className="mt-3 leading-7 text-on-surface-variant">{demoLesson.objective}</p>
                <div className="mt-5 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-4">
                  <p className="text-sm text-on-surface-variant">课时流程</p>
                  <p className="mt-2 text-2xl font-semibold">{demoLesson.flowLabel}</p>
                </div>
              </div>

              <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-5">
                <div className="grid size-12 place-items-center rounded-full bg-primary/12 text-primary">
                  <BookOpen className="size-6" aria-hidden />
                </div>
                <p className="mt-5 text-sm text-on-surface-variant">教师优先路径</p>
                <p className="mt-2 text-2xl font-semibold">先编排，再运行课堂</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  用清晰的步骤骨架先搭起课堂节奏，再把互动、练习和总结收进同一条教学流程。
                </p>
                <Button asChild className="mt-5 min-h-11 px-5">
                  <Link href="/teacher/editor">开始备课</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 sm:p-5">
              <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5">
                <p className="text-sm text-on-surface-variant">课堂步骤</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {lessonSteps.map((step) => (
                    <div key={step.id} className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-4">
                      <p className="text-sm text-on-surface-variant">{step.duration}</p>
                      <p className="mt-2 text-xl font-semibold">{step.title}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">{step.focus}</p>
                    </div>
                ))}
                </div>
              </div>
            </div>

            <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 sm:p-5">
              <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5">
                <p className="text-sm text-on-surface-variant">推荐课程</p>
                <div className="mt-4 grid gap-3">
                  {recommendedCourses.map((course) => (
                    <div key={course.title} className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-4">
                      <Badge variant="accent" className="mb-3 bg-surface-container-lowest">{course.tag}</Badge>
                      <p className="text-xl font-semibold">{course.title}</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{course.detail}</p>
                    </div>
                ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
