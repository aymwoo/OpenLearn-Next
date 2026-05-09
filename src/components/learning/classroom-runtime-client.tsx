'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, CheckCircle2, Focus, MonitorPlay, Users, Waves } from 'lucide-react'

import { ClassroomSnapshotDTOSchema } from '@/lib/dto/classroom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QuizStepCard } from '@/components/learning/quiz-step-card'
import { TaskStepCard } from '@/components/learning/task-step-card'
import { touchClassroomPresenceAction } from '@/actions/classroom-actions'
import { markStepProgressAction } from '@/actions/learning-actions'
import type {
  LearningStepDTO,
  ProgressState,
  StudentPlayerDTO,
  StudentPlayerPersonalDTO,
  StudentPlayerShellDTO,
} from '@/lib/dto/learning'
import type { ClassroomSnapshotDTO } from '@/lib/dto/classroom'

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
      <form action={async (formData) => { await markStepProgressAction(formData) }} className="mt-6">
        <input type="hidden" name="publishedVersionId" value={player.shell.publishedVersionId} />
        <input type="hidden" name="lessonId" value={player.shell.lessonId} />
        <input type="hidden" name="stepId" value={step.id} />
        <input type="hidden" name="state" value="completed" />
        <Button type="submit" className="gap-2 min-h-[44px]">已完成阅读</Button>
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
      <Button asChild className="mt-7 min-h-[44px]">
        <Link href="/student">回到学生空间</Link>
      </Button>
    </section>
  )
}

export function ClassroomRuntimeClient({
  shell,
  personal,
}: {
  shell: StudentPlayerShellDTO
  personal: StudentPlayerPersonalDTO
}) {
  const initialRuntime = personal.runtime
  const sessionId = initialRuntime.classroomSessionId

  const [runtime, setRuntime] = useState(initialRuntime)
  const [snapshotStatusCopy, setSnapshotStatusCopy] = useState<string | null>(initialRuntime.snapshotStatusCopy)
  const currentRuntimeStepId = runtime.forcedStepId ?? personal.progress.resumeStepId ?? shell.steps[0]?.id ?? null

  const touchPresence = useCallback(async (
    connectionState: 'connected' | 'reconnecting' | 'offline',
    currentStepId?: string | null,
  ) => {
    if (!sessionId) return

    try {
      await touchClassroomPresenceAction({ sessionId, connectionState, currentStepId })
    } catch {
      // ignore presence update failures in the player shell
    }
  }, [sessionId])

  const fetchDurableSnapshot = async (sid: string) => {
    try {
      const res = await fetch(`/api/classroom/${sid}/snapshot`, { cache: 'no-store' })
      if (!res.ok) return null
      const data = await res.json()
      const parsed = ClassroomSnapshotDTOSchema.safeParse(data)
      if (parsed.success) {
        return parsed.data
      }
    } catch {
      // ignore
    }
    return null
  }

  const handleManualRefresh = async () => {
    if (!sessionId) return
    await touchPresence('reconnecting', runtime.forcedStepId ?? null)
    setRuntime((prev) => ({ ...prev, connectionState: 'reconnecting' }))
    setSnapshotStatusCopy('正在重新连接课堂，会先显示最近一次课堂状态。')
    const snapshot = await fetchDurableSnapshot(sessionId)
    if (snapshot) {
      applySnapshot(snapshot, 'connected')
      await touchPresence('connected', snapshot.activeStepId)
      setSnapshotStatusCopy('已恢复课堂状态，你现在看到的是最新步骤。')
    } else {
      setRuntime((prev) => ({ ...prev, connectionState: 'snapshot_fallback' }))
    }
  }

  const applySnapshot = (snapshot: ClassroomSnapshotDTO, state: 'connected' | 'reconnecting' | 'snapshot_fallback') => {
    let forcedStepId = null
    let teacherRecommendedStepId = null
    const locked = Boolean(snapshot.locked)

    if (locked) {
      forcedStepId = snapshot.activeStepId
    } else {
      teacherRecommendedStepId = snapshot.activeStepId
    }

    setRuntime((prev) => ({
      ...prev,
      forcedStepId,
      forcedLabel: "老师指定",
      locked,
      classroomSessionId: snapshot.sessionId,
      classroomVersion: snapshot.version,
      connectionState: state,
      teacherRecommendedStepId,
      disabledReason: locked ? "老师已开启锁定跟随，你将停留在当前步骤。" : null,
    }))
  }

  useEffect(() => {
    if (!sessionId) {
      return
    }

    let source: EventSource | null = null

    const connect = () => {
      source = new EventSource(`/api/classroom/${sessionId}/events`)

      source.onopen = () => {
        void touchPresence('connected', currentRuntimeStepId)
        setRuntime((prev) => ({ ...prev, connectionState: 'connected' }))
        setSnapshotStatusCopy((prev) => prev === '正在重新连接课堂，会先显示最近一次课堂状态。' ? null : prev)
      }

      source.addEventListener('snapshot', async (e) => {
        try {
          const data = JSON.parse(e.data)
          const parsed = ClassroomSnapshotDTOSchema.safeParse(data)
          if (parsed.success) {
            const durable = await fetchDurableSnapshot(sessionId)
            if (durable && durable.version >= parsed.data.version) {
              applySnapshot(durable, 'connected')
              await touchPresence('connected', durable.activeStepId)
            }
          }
        } catch {
          // ignore parsing error
        }
      })

      source.onerror = () => {
        source?.close()
        void touchPresence('reconnecting', currentRuntimeStepId)
        setRuntime((prev) => ({ ...prev, connectionState: 'reconnecting' }))
        setSnapshotStatusCopy('正在重新连接课堂，会先显示最近一次课堂状态。')
      }
    }

    connect()

    return () => {
      source?.close()
    }
  }, [currentRuntimeStepId, sessionId, touchPresence])

  useEffect(() => {
    if (!sessionId || !currentRuntimeStepId || runtime.connectionState === 'offline') {
      return
    }

    void touchPresence(runtime.connectionState === 'snapshot_fallback' ? 'reconnecting' : runtime.connectionState, currentRuntimeStepId)
  }, [currentRuntimeStepId, runtime.connectionState, sessionId, touchPresence])

  const player = { shell, ...personal, runtime } satisfies StudentPlayerDTO
  const currentStep = player.shell.steps.find((step) => step.id === player.runtime.forcedStepId)
    ?? player.shell.steps.find((step) => step.id === player.progress.resumeStepId)
    ?? player.shell.steps[0]
  const completedSteps = player.progress.steps.filter((step) => step.state === 'completed' || step.state === 'skipped').length

  if (!currentStep) {
    return <InaccessibleState />
  }

  return (
      <div className="relative">
      <div aria-live="polite" className="sr-only">
        {snapshotStatusCopy}
      </div>
      
      {sessionId && (snapshotStatusCopy || runtime.connectionState === 'snapshot_fallback') && (
        <div className="mb-5 rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient transition-colors duration-150">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={runtime.connectionState === 'connected' ? 'accent' : 'accent'}>
                {runtime.connectionState === 'connected' ? '课堂已连接' : '正在重新连接'}
              </Badge>
              <span className="text-sm font-semibold">{snapshotStatusCopy}</span>
            </div>
            {runtime.connectionState === 'snapshot_fallback' && (
              <Button onClick={handleManualRefresh} className="min-h-[44px]">重新连接课堂</Button>
            )}
          </div>
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[var(--radius-shell)] bg-[#111926] p-4 text-white shadow-ambient">
          <div className="rounded-[1.4rem] bg-white/6 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">课堂助手</p>
            <p className="mt-2 text-lg font-semibold">专注学习模式</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{completedSteps}/{player.shell.steps.length} 已完成，当前页面会优先聚焦老师指定或推荐的步骤。</p>
          </div>

          <div className="mt-4 grid gap-3">
            {player.shell.steps.map((step, index) => {
              const state = getStepState(player, step.id)
              const isCurrent = step.id === currentStep.id
              const isForced = player.runtime.forcedStepId === step.id
              const isRecommended = player.runtime.teacherRecommendedStepId === step.id
              const isDisabled = player.runtime.locked && !isCurrent

              return (
                <div key={step.id} className="min-w-56 xl:min-w-0">
                  {isDisabled ? (
                    <div
                      aria-disabled="true"
                      className={`block rounded-[1.4rem] p-4 transition-colors duration-150 ${isCurrent ? 'bg-white/12 shadow-ambient' : 'bg-white/6 opacity-60'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`grid size-10 place-items-center rounded-full text-sm font-semibold ${state === 'completed' ? 'bg-[#d8ffaf] text-[#335e00]' : 'bg-white/10 text-white'}`}>{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <h2 className="font-semibold text-white">{step.title}</h2>
                          <p className="text-sm text-white/60">老师已开启锁定跟随，你将停留在当前步骤。</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={stepHref(player, step)}
                      className={`block rounded-[1.4rem] p-4 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary ${isCurrent ? 'bg-white text-[#111926] shadow-ambient' : 'bg-white/6 text-white'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`grid size-10 place-items-center rounded-full text-sm font-semibold ${isCurrent ? 'bg-primary/10 text-primary' : state === 'completed' ? 'bg-[#d8ffaf] text-[#335e00]' : 'bg-white/10 text-white'}`}>{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="font-semibold">{step.title}</h2>
                            {isRecommended && !isCurrent && (
                              <Badge variant="accent" className="px-1.5 py-0 text-[10px]">老师推荐</Badge>
                            )}
                          </div>
                          <p className={isCurrent ? 'text-sm text-on-surface-variant' : 'text-sm text-white/60'}>{isForced ? '老师指定' : stateCopy[state]}</p>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickTool icon={<BookOpen className="size-4" aria-hidden />} label="课堂笔记" />
            <QuickTool icon={<Users className="size-4" aria-hidden />} label="同伴列表" />
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {player.runtime.teacherRecommendedStepId && !player.runtime.locked && currentStep.id !== player.runtime.teacherRecommendedStepId && (
            <div className="rounded-[var(--radius-shell)] bg-primary-container/20 p-4 shadow-ambient">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="accent">老师开放</Badge>
                  <span className="text-sm font-semibold text-primary">老师已开放自由浏览，你可以回看已开放步骤。</span>
                </div>
                <Button asChild variant="secondary" className="min-h-[44px]">
                  <Link href={`/student/player?lessonId=${encodeURIComponent(player.shell.lessonId)}&stepId=${encodeURIComponent(player.runtime.teacherRecommendedStepId)}`}>
                    前往老师推荐步骤
                  </Link>
                </Button>
              </div>
            </div>
          )}

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
              <Waves className="size-6 text-primary" aria-hidden />
              <h2 className="text-2xl font-semibold">沉浸学习</h2>
            </div>
            <p className="mt-4 leading-8 text-on-surface-variant">完成当前步骤后不会自动跳转，请按自己的节奏选择下一步。</p>
            <div className="mt-4 flex items-center gap-3 text-sm text-on-surface-variant">
              <Focus className="size-4 text-primary" aria-hidden />
              保持低干扰视图，优先展示当前步骤、老师状态和最近提交。
            </div>
          </section>
        </main>
      </section>
    </div>
  )
}

function QuickTool({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-[1.3rem] bg-white/6 p-4 text-sm font-medium text-white/78 backdrop-blur-sm">
      <div className="mb-3 inline-flex rounded-full bg-white/8 p-2 text-white">{icon}</div>
      <p>{label}</p>
    </div>
  )
}
