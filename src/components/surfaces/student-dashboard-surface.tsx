import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Clock3, Focus, RefreshCw, Sparkles, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ProgressState, StudentDashboardDTO, StudentLessonCardDTO } from '@/lib/dto/learning'

type StudentDashboardSurfaceProps = {
  dashboard: StudentDashboardDTO
}

const progressCopy: Record<ProgressState, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  skipped: '已跳过',
}

function resumeReason(lesson: StudentLessonCardDTO) {
  if (lesson.progressState === 'completed') {
    return '已完成所有步骤，可回顾学习记录'
  }

  return lesson.resumeStepId ? '从第一个未完成步骤继续' : '从课时开头开始学习'
}

function playerHref(lesson: StudentLessonCardDTO) {
  const params = new URLSearchParams({ lessonId: lesson.lessonId })

  if (lesson.resumeStepId) {
    params.set('stepId', lesson.resumeStepId)
  }

  return `/student/player?${params.toString()}`
}

function LessonCard({ lesson, featured = false }: { lesson: StudentLessonCardDTO; featured?: boolean }) {
  return (
    <Card className={featured ? 'flex flex-col justify-between gap-6 bg-surface-container-lowest' : 'space-y-5 bg-surface-container-lowest'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-on-surface-variant">{lesson.courseTitle}{lesson.classLabel ? ` · ${lesson.classLabel}` : ''}</p>
          <h3 className="mt-2 text-2xl font-semibold">{lesson.title}</h3>
        </div>
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
          {lesson.progressState === 'completed' ? <Sparkles className="size-6" aria-hidden /> : <BookOpenCheck className="size-6" aria-hidden />}
        </div>
      </div>
      <div className="rounded-[1.5rem] bg-surface-container-low p-5">
        <p className="text-sm text-on-surface-variant">学习进度</p>
        <p className="mt-2 text-2xl font-semibold text-on-surface">{lesson.completedSteps}/{lesson.totalSteps}</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{resumeReason(lesson)}</p>
      </div>
      <Button asChild variant={featured ? 'primary' : 'secondary'} className="gap-2 text-base">
        <Link href={playerHref(lesson)}>
          {lesson.resumeLabel || '继续学习'}
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      </Button>
    </Card>
  )
}

function EmptyDashboard({ dashboard }: { dashboard: StudentDashboardDTO }) {
  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
      <Badge variant="accent" className="mb-5 bg-surface-container-lowest">学生学习页面</Badge>
      <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">{dashboard.emptyState.title || '还没有可学习的课时'}</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant">{dashboard.emptyState.body || '老师发布课时后，这里会显示你的学习任务。你可以先查看课程列表。'}</p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="gap-2 text-base">
          <Link href="/courses">
            {dashboard.emptyState.actionLabel || '查看课程列表'}
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="secondary" className="gap-2 text-base shadow-none">
          <Link href="/student">
            刷新状态
            <RefreshCw className="size-5" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  )
}

export function StudentDashboardSurface({ dashboard }: StudentDashboardSurfaceProps) {
  const [resumeLesson, ...otherLessons] = dashboard.lessons

  if (!resumeLesson) {
    return <EmptyDashboard dashboard={dashboard} />
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-linear-135 from-primary to-primary-container p-5 text-on-primary shadow-ambient sm:p-6">
              <Badge variant="accent" className="bg-white/15 text-white">学生学习页面</Badge>
              <h1 className="mt-5 text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[3.2rem]">
                {dashboard.studentName}，进入今天的学习中心
              </h1>
              <p className="mt-4 text-base leading-8 text-on-primary/85">
                当前正在学习《{resumeLesson.title}》。页面结构参考 Stitch 的学生学习页，保留现有课时入口和恢复进度逻辑。
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="secondary" className="gap-2 bg-white/92 text-base text-primary shadow-none hover:bg-white">
                  <Link href={playerHref(resumeLesson)}>
                    {resumeLesson.resumeLabel || '继续学习'}
                    <ArrowRight className="size-5" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="gap-2 bg-white/15 text-base text-white shadow-none hover:bg-white/20">
                  <Link href="/courses">查看课程列表</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <ProgressMetric label="学习状态" value={progressCopy[resumeLesson.progressState]} icon={<Clock3 className="size-4" aria-hidden />} />
              <ProgressMetric label="当前焦点" value={resumeLesson.courseTitle} icon={<Focus className="size-4" aria-hidden />} />
              <ProgressMetric label="课堂协同" value="正在同步" icon={<Users className="size-4" aria-hidden />} />
            </div>
          </div>
        </div>

        <LessonCard lesson={resumeLesson} featured />
      </section>

      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-on-surface-variant">我的课程</p>
            <h2 className="mt-2 text-2xl font-semibold">可继续学习的课时</h2>
          </div>
          <Badge variant="success">主任务 · {progressCopy[resumeLesson.progressState]}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[resumeLesson, ...otherLessons].map((lesson) => (
            <div key={lesson.lessonId} className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">{lesson.courseTitle}</p>
                {lesson.progressState === 'completed' ? <Sparkles className="size-5 text-tertiary" aria-hidden /> : <Clock3 className="size-5 text-primary" aria-hidden />}
              </div>
              <h3 className="mt-3 text-2xl font-semibold">{lesson.title}</h3>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">{lesson.completedSteps}/{lesson.totalSteps} · {resumeReason(lesson)}</p>
              <Button asChild variant="tertiary" className="mt-4 min-h-10 justify-start px-0 text-sm">
                <Link href={playerHref(lesson)}>
                  打开课时
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProgressMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient">
      <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <span className="rounded-full bg-surface-container-low p-2 text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  )
}
