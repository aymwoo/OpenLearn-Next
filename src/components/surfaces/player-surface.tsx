import Link from 'next/link'
import { BookOpen, CheckCircle2, Focus, MonitorPlay } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QuizStepCard } from '@/components/learning/quiz-step-card'
import { TaskStepCard } from '@/components/learning/task-step-card'
import { markStepProgressAction } from '@/actions/learning-actions'
import type {
  LearningStepDTO,
  ProgressState,
  StudentPlayerDTO,
  StudentPlayerPersonalDTO,
  StudentPlayerShellDTO,
} from '@/lib/dto/learning'

type PlayerSurfaceProps = {
  shell: StudentPlayerShellDTO | null
  personalSlot: React.ReactNode
}

const stateCopy: Record<ProgressState, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  skipped: '已跳过',
}

function getStepState(player: StudentPlayerDTO, stepId: string): ProgressState {
  return player.progress.steps.find((step) => step.stepId === stepId)?.state ?? 'not_started'
}

function stepHref(player: StudentPlayerDTO, step: LearningStepDTO) {
  return `/student/player?lessonId=${encodeURIComponent(player.shell.lessonId)}&stepId=${encodeURIComponent(step.id)}`
}

async function completeContentStep(formData: FormData) {
  'use server'

  await markStepProgressAction(formData)
}

function ContentStepCard({ player, step, state }: { player: StudentPlayerDTO; step: LearningStepDTO; state: ProgressState }) {
  const payload = step.payload as { body?: string; content?: string; summary?: string }
  const body = payload.body || payload.content || payload.summary || '这个步骤暂时没有正文内容，请继续下一个步骤。'

  return (
    <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-5 sm:p-8">
      <div className="flex items-center gap-3">
        <MonitorPlay className="size-6 text-primary" aria-hidden />
        <h3 className="text-2xl font-semibold">{step.title}</h3>
      </div>
      <p className="mt-5 leading-8 text-on-surface-variant">{body}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-surface-container-lowest p-5">
          <BookOpen className="mb-3 size-6 text-primary" aria-hidden />
          <p className="font-semibold">学习提示</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">完成阅读后先确认状态，再手动进入下一个步骤。</p>
        </div>
        <div className="rounded-3xl bg-surface-container-lowest p-5">
          <CheckCircle2 className="mb-3 size-6 text-tertiary" aria-hidden />
          <p className="font-semibold">完成状态</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{state === 'completed' ? '已完成阅读' : '阅读后点击按钮记录进度。'}</p>
        </div>
      </div>
      <form action={completeContentStep} className="mt-6">
        <input type="hidden" name="publishedVersionId" value={player.shell.publishedVersionId} />
        <input type="hidden" name="lessonId" value={player.shell.lessonId} />
        <input type="hidden" name="stepId" value={step.id} />
        <input type="hidden" name="state" value="completed" />
        <Button type="submit" className="gap-2">已完成阅读</Button>
      </form>
    </div>
  )
}

function CurrentStepRenderer({ player, step }: { player: StudentPlayerDTO; step: LearningStepDTO }) {
  const state = getStepState(player, step.id)

  if (step.type === 'content') {
    return <ContentStepCard player={player} step={step} state={state} />
  }

  if (step.type === 'task') {
    return (
      <TaskStepCard
        lessonId={player.shell.lessonId}
        publishedVersionId={player.shell.publishedVersionId}
        step={step}
        latestAttempt={player.latestSubmissions.tasks.find((attempt) => attempt.stepId === step.id) ?? null}
        attempts={player.history.tasks.filter((attempt) => attempt.stepId === step.id)}
      />
    )
  }

  if (step.type === 'quiz') {
    const latestAttempt = player.latestSubmissions.quizzes.find((attempt) => attempt.stepId === step.id) ?? null
    return (
      <QuizStepCard
        lessonId={player.shell.lessonId}
        publishedVersionId={player.shell.publishedVersionId}
        step={step}
        latestAttempt={latestAttempt}
        attempts={player.history.quizzes.filter((attempt) => attempt.stepId === step.id)}
        canRetryQuiz={latestAttempt?.canRetryQuiz ?? player.canRetryQuiz}
        showCorrectAnswer={latestAttempt?.showCorrectAnswer ?? player.showCorrectAnswer}
      />
    )
  }

  return (
    <div className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-5 sm:p-8">
      <div className="flex items-center gap-3">
        <MonitorPlay className="size-6 text-primary" aria-hidden />
        <h3 className="text-2xl font-semibold">{step.title}</h3>
      </div>
      <p className="mt-5 leading-8 text-on-surface-variant">
        当前步骤会在本计划接入提交卡片。正在加载你的学习进度... 正在读取最近一次提交...
      </p>
    </div>
  )
}

function InaccessibleState() {
  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
      <Badge variant="accent" className="mb-4 bg-surface-container-lowest">学生学习页面</Badge>
      <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">课时暂不可学习</h1>
      <p className="mt-4 max-w-2xl leading-8 text-on-surface-variant">请回到学生空间选择老师已经发布的课时，或稍后刷新状态。</p>
      <Button asChild className="mt-7">
        <Link href="/student">回到学生空间</Link>
      </Button>
    </section>
  )
}

export function PlayerPersonalFallback({ shell }: { shell: StudentPlayerShellDTO }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
        <div className="flex gap-3 overflow-x-auto pb-2 xl:grid xl:grid-cols-1 xl:overflow-visible xl:pb-0">
          {shell.steps.map((step, index) => (
            <div key={step.id} className="min-w-56 rounded-full bg-surface-container-lowest/70 p-4 xl:min-w-0 xl:rounded-3xl">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary-container/25 text-sm font-semibold text-primary">{index + 1}</span>
                <div>
                  <h2 className="font-semibold">{step.title}</h2>
                  <p className="text-sm text-on-surface-variant">正在加载你的学习进度</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="min-w-0 space-y-5">
        <Card className="min-h-[360px] bg-surface-container-lowest p-5 sm:p-8">
          <p className="text-sm text-on-surface-variant">正在加载你的学习进度</p>
          <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">正在准备学习状态</h2>
          <div className="mt-6 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-5 sm:p-8">
            <p className="leading-8 text-on-surface-variant">正在读取最近一次提交</p>
          </div>
        </Card>
      </main>
    </section>
  )
}

export function PlayerPersonalRegion({ shell, personal }: { shell: StudentPlayerShellDTO; personal: StudentPlayerPersonalDTO }) {
  const player = { shell, ...personal } satisfies StudentPlayerDTO
  const currentStep = player.shell.steps.find((step) => step.id === player.runtime.forcedStepId)
    ?? player.shell.steps.find((step) => step.id === player.progress.resumeStepId)
    ?? player.shell.steps[0]
  const completedSteps = player.progress.steps.filter((step) => step.state === 'completed' || step.state === 'skipped').length

  if (!currentStep) {
    return <InaccessibleState />
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
        <div className="mb-4 rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-primary shadow-ambient">
          {completedSteps}/{player.shell.steps.length} 已完成
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 xl:grid xl:grid-cols-1 xl:overflow-visible xl:pb-0">
          {player.shell.steps.map((step, index) => {
            const state = getStepState(player, step.id)
            const isCurrent = step.id === currentStep.id
            const isForced = player.runtime.forcedStepId === step.id

            return (
              <Link
                key={step.id}
                href={stepHref(player, step)}
                className={`min-w-56 rounded-full p-4 transition focus-visible:outline-2 focus-visible:outline-primary xl:min-w-0 xl:rounded-3xl ${isCurrent ? 'bg-surface-container-lowest shadow-ambient' : 'bg-surface-container-lowest/70'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-full text-sm font-semibold ${state === 'completed' ? 'bg-tertiary-container text-tertiary' : 'bg-primary-container/25 text-primary'}`}>{index + 1}</span>
                  <div>
                    <h2 className="font-semibold">{step.title}</h2>
                    <p className="text-sm text-on-surface-variant">{isForced ? '老师指定' : stateCopy[state]}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </aside>

      <main className="min-w-0 space-y-5">
        <Card className="min-h-[360px] bg-surface-container-lowest p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm text-on-surface-variant">当前步骤 · {currentStep.type}</p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">{currentStep.title}</h2>
            </div>
            <Badge variant="accent">{player.runtime.forcedStepId === currentStep.id ? '老师指定' : stateCopy[getStepState(player, currentStep.id)]}</Badge>
          </div>
          <div className="mt-6">
            <CurrentStepRenderer player={player} step={currentStep} />
          </div>
        </Card>

        <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
          <div className="flex items-center gap-3">
            <Focus className="size-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold">沉浸学习</h2>
          </div>
          <p className="mt-4 leading-8 text-on-surface-variant">完成当前步骤后不会自动跳转，请按自己的节奏选择下一步。</p>
        </section>
      </main>
    </section>
  )
}

export function PlayerSurface({ shell, personalSlot }: PlayerSurfaceProps) {
  if (!shell) {
    return <InaccessibleState />
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="accent" className="mb-4 bg-surface-container-lowest">学生学习页面</Badge>
            <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">{shell.title}</h1>
            <p className="mt-4 max-w-3xl leading-8 text-on-surface-variant">{shell.objective}</p>
          </div>
          <div className="rounded-full bg-surface-container-lowest px-5 py-3 text-sm text-primary shadow-ambient">{shell.steps.length} 个步骤</div>
        </div>
      </section>
      {personalSlot}
    </div>
  )
}
