import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Clock3, RefreshCw, Sparkles } from 'lucide-react'

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
  const completedLabel = `已完成 ${lesson.completedSteps}/${lesson.totalSteps} 个步骤`

  return (
    <Card className={featured ? 'flex flex-col justify-between gap-6' : 'space-y-5'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-on-surface-variant">{lesson.courseTitle}{lesson.classLabel ? ` · ${lesson.classLabel}` : ''}</p>
          <h3 className="mt-2 text-2xl font-semibold">{lesson.title}</h3>
        </div>
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-linear-135 from-primary to-primary-container text-on-primary shadow-ambient">
          {lesson.progressState === 'completed' ? <Sparkles className="size-6" aria-hidden /> : <BookOpenCheck className="size-6" aria-hidden />}
        </div>
      </div>
      <div className="rounded-3xl bg-tertiary-container/50 p-5 text-tertiary">
        <p className="text-sm">{completedLabel}</p>
        <p className="mt-2 text-2xl font-semibold">{progressCopy[lesson.progressState]}</p>
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
      <Badge variant="accent" className="mb-5 bg-surface-container-lowest">学生学习空间</Badge>
      <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">
        {dashboard.emptyState.title || '还没有可学习的课时'}
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant">
        {dashboard.emptyState.body || '老师发布课时后，这里会显示你的学习任务。你可以先查看课程列表。'}
      </p>
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
      <p className="mt-5 text-sm leading-6 text-on-surface-variant">
        学习状态暂时没有同步成功，请刷新页面或稍后重试。你的已提交记录不会丢失。
      </p>
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
          <Badge variant="accent" className="bg-surface-container-lowest">
            学生学习空间 · {resumeLesson.courseTitle}
          </Badge>
          <h1 className="mt-5 max-w-3xl text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[3.2rem]">
            {dashboard.studentName}，继续保持今天的学习节奏
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-on-surface-variant">
            当前任务是《{resumeLesson.title}》。{resumeReason(resumeLesson)}，课堂进度会和老师的运行节奏保持同步。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2 text-base">
              <Link href={playerHref(resumeLesson)}>
                继续学习
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2 text-base shadow-none">
              <Link href="/courses">查看课程列表</Link>
            </Button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <ProgressMetric label="已完成步骤" value={`${resumeLesson.completedSteps}/${resumeLesson.totalSteps}`} icon={<BookOpenCheck className="size-4" aria-hidden />} />
            <ProgressMetric label="当前状态" value={progressCopy[resumeLesson.progressState]} icon={<Clock3 className="size-4" aria-hidden />} />
            <ProgressMetric label="推荐动作" value={resumeLesson.resumeLabel || '继续学习'} icon={<Sparkles className="size-4" aria-hidden />} />
          </div>
        </div>

        <LessonCard lesson={resumeLesson} featured />
      </section>

      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-on-surface-variant">学习进度</p>
            <h2 className="mt-2 text-2xl font-semibold">可继续学习的课时</h2>
          </div>
          <Badge variant="success">主任务 · {progressCopy[resumeLesson.progressState]}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[resumeLesson, ...otherLessons].map((lesson) => (
            <div key={lesson.lessonId} className="rounded-3xl bg-surface-container-lowest p-5 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">{lesson.courseTitle}</p>
                {lesson.progressState === 'completed' ? <Sparkles className="size-5 text-tertiary" aria-hidden /> : <Clock3 className="size-5 text-primary" aria-hidden />}
              </div>
              <h3 className="mt-3 text-2xl font-semibold">{lesson.title}</h3>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {lesson.completedSteps}/{lesson.totalSteps} · {resumeReason(lesson)}
              </p>
              <Link href={playerHref(lesson)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                打开课时
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProgressMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface-container-lowest p-4 shadow-ambient">
      <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <span className="rounded-full bg-surface-container-low p-2 text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  )
}
