'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Radio, Sparkles, TimerReset, Users } from 'lucide-react'

import { changeClassroomModeAction, changeClassroomSlideAction, changeClassroomStepAction, endClassroomSessionAction, recordClassroomVotingRoundControlAction, recordRuntimeTeacherControlAction, runCurrentVotingRecoveryAction } from '@/actions/classroom-actions'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'
import { RuntimeDescriptorSchema } from '@/features/runtime-platform/contracts/descriptors'
import { createRuntimeBridgeMessageId } from '@/features/runtime-platform/host/runtime-host-bridge'
import { RuntimeHostClient } from '@/features/runtime-platform/host'
import { RuntimeTeacherControlRequestSchema } from '@/features/runtime-platform/contracts/bridge'
import { ClassroomConflictPanel } from './classroom-conflict-panel'
import { ClassroomRosterPanel } from './classroom-roster-panel'
import { ClassroomSessionHistoryPanel } from './classroom-session-history-panel'
import { ClassroomStudentDetailPanel } from './classroom-student-detail-panel'
import { ClassroomTimelinePanel } from './classroom-timeline-panel'
import { subscribeClassroomSocket } from './classroom-ws-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ClassroomConsoleSessionEntryDTO, ClassroomSlideStateDTO, ClassroomSnapshotDTO, ClassroomStepDTO, ClassroomStudentDetailDTO, ClassroomStudentDetailTab } from '@/lib/dto/classroom'
import type { LessonStepDTO } from '@/lib/dto/lesson-authoring'

type ConflictState = { latest?: ClassroomSnapshotDTO } | null

type MarkdownClassroomStep = ClassroomStepDTO & {
  type: 'content'
  payload: Extract<LessonStepDTO['payload'], { type: 'content' }>
}

function hasLatestSnapshot(value: unknown): value is { latest: ClassroomSnapshotDTO } {
  return typeof value === 'object' && value !== null && 'latest' in value
}

function getMarkdownClassroomStep(
  step: ClassroomStepDTO | undefined,
  slideState: ClassroomSlideStateDTO | null | undefined,
): MarkdownClassroomStep | null {
  if (!step || step.type !== 'content' || typeof step.payload !== 'object' || step.payload === null) {
    return null
  }

  const payload = step.payload as Partial<Extract<LessonStepDTO['payload'], { type: 'content' }>>
  if (payload.type !== 'content' || typeof payload.body !== 'string' || !payload.markdown) {
    return null
  }

  if (slideState && slideState.stepId !== step.id) {
    return null
  }

  return {
    ...step,
    type: 'content',
    payload: payload as Extract<LessonStepDTO['payload'], { type: 'content' }>,
  }
}

export function ClassroomControlPanel({
  initialSnapshot,
  studentDetail = null,
  activeDetailTab = 'evidence',
  sessionEntries = [],
}: {
  initialSnapshot: ClassroomSnapshotDTO
  studentDetail?: ClassroomStudentDetailDTO | null
  activeDetailTab?: ClassroomStudentDetailTab
  sessionEntries?: ClassroomConsoleSessionEntryDTO[]
}) {
  const [conflict, setConflict] = useState<ConflictState>(null)
  const [liveSnapshot, setLiveSnapshot] = useState<ClassroomSnapshotDTO | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const socketRef = useRef<ReturnType<typeof subscribeClassroomSocket> | null>(null)

  const currentSnapshot = conflict?.latest || liveSnapshot || initialSnapshot
  const currentStep = currentSnapshot.steps.find((step: ClassroomStepDTO) => step.id === currentSnapshot.activeStepId)
  const currentRuntimeDescriptor = (() => {
    if (!currentStep?.payload || typeof currentStep.payload !== 'object' || !('runtime' in currentStep.payload)) {
      return null
    }

    const parsedDescriptor = RuntimeDescriptorSchema.safeParse(currentStep.payload.runtime)
    return parsedDescriptor.success ? parsedDescriptor.data : null
  })()
  const connectedCount = currentSnapshot.monitoringSummary.connectedCount
  const totalParticipants = currentSnapshot.participants.length
  const attentionCount = currentSnapshot.monitoringSummary.needsAttentionCount
  const submittedRuntimeParticipants = currentSnapshot.participants.filter(
    (participant) => participant.runtimeProof?.status === 'submitted',
  )
  const runtimeAttentionParticipants = currentSnapshot.participants.filter(
    (participant) =>
      participant.runtimeProof?.status === 'failed'
      || (!participant.runtimeProof
        && participant.attentionReasons.some((reason) => reason.includes('当前环节未提交'))),
  )
  const primaryRuntimeProof = submittedRuntimeParticipants[0]?.runtimeProof
    ?? currentSnapshot.participants.find((participant) => participant.runtimeProof)?.runtimeProof
    ?? null
  const showRuntimeProofFeedback = Boolean(primaryRuntimeProof) || runtimeAttentionParticipants.length > 0
  const runtimeInspectorHref = primaryRuntimeProof?.inspectorHref
    ?? (primaryRuntimeProof?.runtimeSessionId
      ? `/settings/labs/runtime-inspector?runtimeSessionId=${primaryRuntimeProof.runtimeSessionId}`
      : null)
  const runtimeInstanceId = useMemo(() => `teacher-runtime-${currentSnapshot.sessionId}-${currentStep?.id ?? 'stage'}`, [currentSnapshot.sessionId, currentStep?.id])
  const [namedResultsExpanded, setNamedResultsExpanded] = useState(false)
  const incidentHref = `/settings/labs/incidents/${currentSnapshot.sessionId}`
  const showEscalatedIncidentCta = currentSnapshot.transportStatus.degraded
    || (currentSnapshot.currentVotingRound?.failureCount ?? 0) > 0
  const markdownStep = getMarkdownClassroomStep(currentStep, currentSnapshot.slideState)

  useEffect(() => {
    const subscription = subscribeClassroomSocket({
      sessionId: currentSnapshot.sessionId,
      actorScope: 'teacher',
      onSnapshot(snapshot) {
        setLiveSnapshot(snapshot)
        if (snapshot.status !== 'live') {
          router.refresh()
        }
      },
      onTransportError() {
        socketRef.current = null
      },
      onClose() {
        socketRef.current = null
      },
    })

    socketRef.current = subscription

    return () => {
      subscription.close()
      if (socketRef.current === subscription) {
        socketRef.current = null
      }
    }
  }, [currentSnapshot.sessionId, router])

  const sendTeacherControl = (payload: { command: 'focus-step' | 'lock' | 'unlock' | 'set-slide'; expectedVersion: number; targetStepId?: string; slideIndex?: number }) => {
    return socketRef.current?.send({
      kind: 'teacher.control',
      payload,
    }) ?? { ok: false as const, reason: 'socket_unavailable' as const }
  }

  const sendRuntimeCommand = (command: 'focus-step' | 'start-voting-round' | 'end-voting-round' = 'focus-step') => {
    if (!currentStep) {
      return { ok: false as const, reason: 'socket_unavailable' as const }
    }

    const bridge = RuntimeTeacherControlRequestSchema.parse({
      classroomSessionId: currentSnapshot.sessionId,
      lessonId: currentSnapshot.lessonId,
      publishedVersionId: currentSnapshot.publishedVersionId,
      stepId: currentStep.id,
      command,
      payload: {
        source: 'classroom-control-panel',
      },
    })

    return socketRef.current?.send({
      kind: 'runtime.command',
      payload: {
        requestKind: 'runtime-teacher-control',
        runtimeInstanceId,
        bridge,
      },
    }) ?? { ok: false as const, reason: 'socket_unavailable' as const }
  }

  const fallbackRuntimeCommand = async (command: 'focus-step' | 'start-voting-round' | 'end-voting-round' = 'focus-step') => {
    if (!currentStep) return

    const requestId = createRuntimeBridgeMessageId()
    await recordRuntimeTeacherControlAction({
      messageId: requestId,
      correlationId: createRuntimeBridgeMessageId(),
      runtimeInstanceId,
      payload: {
        classroomSessionId: currentSnapshot.sessionId,
        lessonId: currentSnapshot.lessonId,
        publishedVersionId: currentSnapshot.publishedVersionId,
        stepId: currentStep.id,
        command,
        payload: {
          source: 'classroom-control-panel-fallback',
        },
      },
    })
  }

  const handleChangeStep = (stepId: string) => {
    if (conflict || isPending) return
    startTransition(async () => {
      const wsResult = sendTeacherControl({
        command: 'focus-step',
        expectedVersion: currentSnapshot.version,
        targetStepId: stepId,
      })

      if (wsResult.ok) {
        return
      }

      const formData = new FormData()
      formData.append('sessionId', currentSnapshot.sessionId)
      formData.append('targetStepId', stepId)
      formData.append('expectedVersion', String(currentSnapshot.version))
      const result = await changeClassroomStepAction(formData)
      if (!result.ok && result.error === 'VERSION_CONFLICT') {
        setConflict(hasLatestSnapshot(result) ? result : null)
      } else if (result.ok) {
        router.refresh()
      }
    })
  }

  const handleChangeMode = (locked: boolean) => {
    if (conflict || isPending) return
    startTransition(async () => {
      const wsResult = sendTeacherControl({
        command: locked ? 'lock' : 'unlock',
        expectedVersion: currentSnapshot.version,
      })

      if (wsResult.ok) {
        return
      }

      const formData = new FormData()
      formData.append('sessionId', currentSnapshot.sessionId)
      formData.append('locked', String(locked))
      formData.append('expectedVersion', String(currentSnapshot.version))
      const result = await changeClassroomModeAction(formData)
      if (!result.ok && result.error === 'VERSION_CONFLICT') {
        setConflict(hasLatestSnapshot(result) ? result : null)
      } else if (result.ok) {
        router.refresh()
      }
    })
  }

  const handleChangeSlide = (slideIndex: number) => {
    if (!currentStep || isPending || !!conflict) return
    startTransition(async () => {
      const wsResult = sendTeacherControl({
        command: 'set-slide',
        expectedVersion: currentSnapshot.version,
        targetStepId: currentStep.id,
        slideIndex,
      })

      if (wsResult.ok) {
        return
      }

      const formData = new FormData()
      formData.append('sessionId', currentSnapshot.sessionId)
      formData.append('stepId', currentStep.id)
      formData.append('slideIndex', String(slideIndex))
      formData.append('expectedVersion', String(currentSnapshot.version))
      const result = await changeClassroomSlideAction(formData)
      if (!result.ok && result.error === 'VERSION_CONFLICT') {
        setConflict(hasLatestSnapshot(result) ? result : null)
      } else if (result.ok) {
        router.refresh()
      }
    })
  }

  const handleEndClassroom = () => {
    if (conflict || isPending) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('sessionId', currentSnapshot.sessionId)
      const result = await endClassroomSessionAction(formData)
      if (result.ok) {
        router.refresh()
      }
    })
  }

  const handleRuntimeCommand = () => {
    if (!currentStep || conflict || isPending) return

    startTransition(async () => {
      const wsResult = sendRuntimeCommand()
      if (wsResult.ok) {
        return
      }

      await fallbackRuntimeCommand()
      router.refresh()
    })
  }

  const handleVotingRoundControl = (command: 'start-voting-round' | 'end-voting-round') => {
    if (!currentStep || conflict || isPending) return

    startTransition(async () => {
      const wsResult = currentRuntimeDescriptor ? sendRuntimeCommand(command) : { ok: false as const, reason: 'socket_unavailable' as const }
      if (!wsResult.ok) {
        if (currentRuntimeDescriptor) {
          await fallbackRuntimeCommand(command)
        } else {
          await recordClassroomVotingRoundControlAction({
            sessionId: currentSnapshot.sessionId,
            stepId: currentStep.id,
            command,
          })
        }
      }

      router.refresh()
    })
  }

  const handleVotingRecoveryAction = (recoveryAction: 'retry' | 'reconcile' | 'suspend' | 'fallback') => {
    if (!currentSnapshot.currentVotingRound?.stepId || conflict || isPending) return

    startTransition(async () => {
      await runCurrentVotingRecoveryAction({
        sessionId: currentSnapshot.sessionId,
        stepId: currentSnapshot.currentVotingRound!.stepId!,
        recoveryAction,
      })
      router.refresh()
    })
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        {conflict ? <ClassroomConflictPanel sessionId={currentSnapshot.sessionId} onRefresh={() => setConflict(null)} /> : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_320px]">
          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="accent">{currentSnapshot.className}</Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">第 {currentSnapshot.version} 次同步</Badge>
                  </div>
                  <h2 className="mt-4 text-[2rem] font-semibold leading-[1.08] tracking-[-0.02em] text-on-surface sm:text-[2.5rem]">
                    {currentStep?.title ?? '未开始环节'}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base sm:leading-8">
                    课堂正在运行《{currentSnapshot.lessonTitle}》。当前以更紧凑的运行面板承接环节切换、模式控制和学生在线状态。
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:w-[22rem] lg:grid-cols-1">
                  <MetricOrb icon={<Users className="size-4" aria-hidden />} label="在线学生" value={`${connectedCount}/${totalParticipants}`} detail="课堂名册实时同步" />
                  <MetricOrb icon={<Radio className="size-4" aria-hidden />} label="当前模式" value={currentSnapshot.locked ? '锁定跟随' : '自由浏览'} detail={currentSnapshot.locked ? '学生锁定在当前步骤' : '学生可回看已开放步骤'} />
                  <MetricOrb icon={<Clock3 className="size-4" aria-hidden />} label="名册监控" value={`优先关注 ${attentionCount} 名`} detail={`已提交 ${currentSnapshot.monitoringSummary.submittedCount} 人 · 更新于 ${new Date(currentSnapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <StageMeta label="课程名称" value={currentSnapshot.lessonTitle} />
                <StageMeta label="当前步骤" value={currentStep?.title ?? '待开始'} />
                <StageMeta label="课堂状态" value={currentSnapshot.status === 'live' ? '进行中' : '已结束'} />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  variant={showEscalatedIncidentCta ? 'primary' : 'secondary'}
                  className={showEscalatedIncidentCta ? 'min-h-[56px] rounded-[1.35rem] px-5' : 'min-h-[44px] px-5'}
                >
                  <Link href={incidentHref}>查看课堂事件</Link>
                </Button>
                <Button asChild variant="secondary" className="min-h-[44px] px-5">
                  <Link href={runtimeInspectorHref ?? '/settings/labs/runtime-inspector'}>查看 Runtime Inspector</Link>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-surface-container-low p-5 sm:p-6">
            <p className="text-sm text-on-surface-variant">实时课堂控制</p>
            <div className="mt-4 grid gap-3">
              <Button
                variant={currentSnapshot.locked ? 'primary' : 'secondary'}
                disabled={isPending || !!conflict}
                className="min-h-[56px] justify-between rounded-[1.35rem] px-5"
                onClick={() => handleChangeMode(true)}
              >
                <span className="text-base font-semibold">锁定跟随</span>
                <span className="text-xs opacity-80">同步当前步骤</span>
              </Button>
              <Button
                variant={!currentSnapshot.locked ? 'primary' : 'secondary'}
                disabled={isPending || !!conflict}
                className="min-h-[56px] justify-between rounded-[1.35rem] px-5"
                onClick={() => handleChangeMode(false)}
              >
                <span className="text-base font-semibold">自由浏览</span>
                <span className="text-xs opacity-80">保留课堂上下文</span>
              </Button>
              <Button
                variant="secondary"
                className="min-h-[52px] rounded-[1.35rem] bg-[#fef2f2] text-red-600 shadow-none hover:bg-[#fee2e2]"
                disabled={isPending || !!conflict}
                onClick={handleEndClassroom}
              >
                结束课堂
              </Button>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient">
              <p className="text-sm text-on-surface-variant">互动工具</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <UtilityOrb icon={<TimerReset className="size-5" aria-hidden />} label="随机点名" />
                <UtilityOrb icon={<Clock3 className="size-5" aria-hidden />} label="快速提问" />
                <UtilityOrb icon={<Users className="size-5" aria-hidden />} label="随堂小测" />
                <UtilityOrb icon={<Sparkles className="size-5" aria-hidden />} label="白板共享" />
              </div>
            </div>
          </Card>
        </section>

        <Card className="bg-surface-container-low p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-on-surface-variant">教学环节流程</p>
              <h3 className="mt-2 text-2xl font-semibold text-on-surface">课堂教学流程运行管理</h3>
            </div>
            <Badge className="bg-surface-container-lowest text-on-surface-variant">保持现有 step 切换动作</Badge>
          </div>

          <div className="mt-5 grid gap-3">
            {currentSnapshot.steps.map((step, index) => {
              const isActive = currentSnapshot.activeStepId === step.id
              return (
                <article
                  key={step.id}
                  className={isActive ? 'rounded-[1.6rem] bg-primary/8 p-4 sm:p-5' : 'rounded-[1.6rem] bg-surface-container-lowest p-4 shadow-ambient sm:p-5'}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className={isActive ? 'grid size-11 place-items-center rounded-full bg-primary text-sm font-semibold text-white' : 'grid size-11 place-items-center rounded-full bg-surface-container-low text-sm font-semibold text-primary'}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-semibold text-on-surface">{step.title}</h4>
                          {isActive ? <Badge variant="accent">进行中</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {isActive ? '当前教学流程已同步到学生端。' : '保留现有 action，点击后切换到该环节。'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={isActive ? 'primary' : 'secondary'}
                      disabled={isActive || isPending || !!conflict}
                      className="min-h-[44px] px-5"
                      onClick={() => handleChangeStep(step.id)}
                    >
                      {isActive ? '当前环节' : '切换到此环节'}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>

          {currentStep && (currentRuntimeDescriptor || currentSnapshot.currentVotingRound || (currentStep.type === 'quiz' && currentStep.pluginContract?.publicMetadata?.builtInKey === 'classroomVoting')) ? (
            <div className="mt-5 rounded-[1.6rem] bg-surface-container-lowest p-4 shadow-ambient">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-on-surface-variant">本轮投票控制</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    在当前 runtime 教学环节内开始或结束本轮投票，学生会沿既有课堂链路聚焦到当前环节。
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" className="min-h-[44px] px-5" disabled={isPending || !!conflict} onClick={() => handleVotingRoundControl('start-voting-round')}>
                    开始本轮投票
                  </Button>
                  <Button type="button" variant="secondary" className="min-h-[44px] px-5" disabled={isPending || !!conflict} onClick={() => handleVotingRoundControl('end-voting-round')}>
                    结束本轮投票
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {currentSnapshot.currentVotingRound ? (
            <div className="mt-5 space-y-4 rounded-[1.6rem] bg-surface-container-lowest p-4 shadow-ambient">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-on-surface">实时汇总</h3>
                  <Badge variant={currentSnapshot.currentVotingRound.isFrozen ? 'success' : 'accent'}>
                    {currentSnapshot.currentVotingRound.roundStatusCopy}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  已提交 {currentSnapshot.currentVotingRound.submittedCount} 人，未完成 {currentSnapshot.currentVotingRound.remainingCount} 人
                </p>
                {currentSnapshot.currentVotingRound.failureCopy ? (
                  <p className="mt-2 text-sm text-[#9a3412]">{currentSnapshot.currentVotingRound.failureCopy}</p>
                ) : null}
                {currentSnapshot.currentVotingRound.liveResultsVisible || currentSnapshot.currentVotingRound.isFrozen ? (
                  <div className="mt-4 grid gap-3">
                    {currentSnapshot.currentVotingRound.optionResults.map((result) => (
                      <div key={result.optionId} className="rounded-[1.1rem] bg-surface-container-low p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-on-surface">{result.optionLabel}</span>
                          <span className="text-sm text-on-surface-variant">{result.count} 人 · {Math.round(result.percentage)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-on-surface-variant">当前设置为结束前不展示实时结果，老师仍可根据未完成名单推进课堂。</p>
                )}
              </section>

              <section>
                <h3 className="text-xl font-semibold text-on-surface">未完成名单</h3>
                {currentSnapshot.currentVotingRound.incompleteStudents.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {currentSnapshot.currentVotingRound.incompleteStudents.map((student) => (
                      <div key={student.studentId} className="flex items-center justify-between rounded-[1rem] bg-surface-container-low px-3 py-2 text-sm text-on-surface">
                        <span>{student.studentName}</span>
                        <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs text-on-surface-variant">{student.statusToken}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-on-surface-variant">全班已提交，可由老师决定何时结束本轮投票。</p>
                )}
              </section>

              {!currentSnapshot.currentVotingRound.anonymousResults ? (
              <section>
                <Button type="button" variant="secondary" className="min-h-[40px] px-4" onClick={() => setNamedResultsExpanded((value) => !value)}>
                  {namedResultsExpanded ? '收起实名结果' : '展开实名结果'}
                </Button>
                {namedResultsExpanded ? (
                  <div className="mt-3 grid gap-2">
                    {currentSnapshot.currentVotingRound.namedResults.map((result) => (
                      <div key={result.studentId} className="rounded-[1rem] bg-surface-container-low px-3 py-3 text-sm text-on-surface">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{result.studentName}</span>
                          <span className="text-xs text-on-surface-variant">{result.submittedAt ? new Date(result.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="mt-2 text-on-surface-variant">{result.selectedOptionLabels.join('、') || '未提交'}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
              ) : null}

              <section>
                <h3 className="text-xl font-semibold text-on-surface">恢复动作</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  当前 classroom shell 只保留轻确认恢复动作。resume、suspend、fallback 需前往课堂事件或 detail surface 进行强确认。
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {currentSnapshot.currentVotingRound.recoveryActions
                    .filter((action) => action.action === 'retry' || action.action === 'reconcile')
                    .map((action) => (
                    <Button key={action.action} type="button" variant="secondary" className="min-h-[44px] px-5" disabled={isPending || !!conflict} onClick={() => handleVotingRecoveryAction(action.action)}>
                      {action.label}
                    </Button>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </Card>

        {showRuntimeProofFeedback ? (
          <Card className="bg-surface-container-low p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm text-on-surface-variant">proof first-feedback</p>
                <h3 className="mt-2 text-2xl font-semibold text-on-surface">
                  {submittedRuntimeParticipants.length > 0
                    ? '已有学生完成当前互动提交'
                    : runtimeAttentionParticipants.length > 0
                      ? '当前互动结果待重试，可进入运行排查'
                      : '当前 proof 会话仍在等待学生提交'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  {submittedRuntimeParticipants.length > 0
                    ? `已有 ${submittedRuntimeParticipants.length} 名学生完成本次 runtime 互动提交，教师可先在课堂面板确认完成，再进入运行排查。`
                    : runtimeAttentionParticipants.length > 0
                      ? `当前有 ${runtimeAttentionParticipants.length} 名学生仍显示未提交或异常，先在课堂面板确认，再按需继续 drill-down。`
                      : '学生一旦完成当前互动提交，这里会先给教师成功或异常提示，不需要先切去 inspector。'}
                </p>
              </div>

              {runtimeInspectorHref ? (
                <Button asChild variant="secondary" className="min-h-[44px] px-5">
                  <Link href={runtimeInspectorHref}>查看运行轨迹</Link>
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}

        {currentSnapshot.transportStatus.degraded ? (
          <Card className="bg-[#fff7ed] p-5 text-[#9a3412] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.18em]">transport degraded</p>
                <h3 className="mt-2 text-2xl font-semibold">
                  当前仅保证本实例课堂同步
                </h3>
                <p className="mt-3 text-sm leading-7">
                  仍可信什么：SQLite canonical truth 与当前课堂 session 仍可作为教师控课锚点。
                  已不可信什么：跨实例 fanout 与“所有实例已同步”的假设当前不可直接信任。
                </p>
                <p className="mt-3 text-sm leading-7">
                  影响范围：当前课堂优先，多课堂可能受同类 transport posture 影响。
                </p>
                <p className="mt-3 text-sm leading-7">
                  推荐下一步：查看课堂事件或继续进入 runtime inspector。
                  {currentSnapshot.transportStatus.degradedReason
                    ? ` 当前 degraded reason：${currentSnapshot.transportStatus.degradedReason}`
                    : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="min-h-[56px] rounded-[1.35rem] px-5">
                  <Link href={incidentHref}>查看课堂事件</Link>
                </Button>
                <Button asChild variant="secondary" className="min-h-[44px] px-5">
                  <Link href="/settings">查看全局 transport 设置</Link>
                </Button>
                <Button asChild variant="secondary" className="min-h-[44px] px-5">
                  <Link href={runtimeInspectorHref ?? "/settings/labs/runtime-inspector"}>进入 runtime inspector</Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {currentStep && currentRuntimeDescriptor ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[1.4rem] bg-surface-container-low p-4">
              <div>
                <p className="text-sm text-on-surface-variant">runtime command</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">可重新下发当前 Runtime 指令，优先走 websocket，失败时回退到 canonical action。</p>
              </div>
              <Button type="button" variant="secondary" className="min-h-[44px] px-5" disabled={isPending || !!conflict} onClick={handleRuntimeCommand}>
                重新下发当前 Runtime 指令
              </Button>
            </div>
            <RuntimeHostClient
              descriptor={currentRuntimeDescriptor}
              surface="classroom-stage"
              actorScope="teacher"
              lessonId={currentSnapshot.lessonId}
              stepId={currentStep.id}
              stepTitle={currentStep.title}
              publishedVersionId={currentSnapshot.publishedVersionId}
              classroomSessionId={currentSnapshot.sessionId}
              snapshotPayload={currentStep.payload as Record<string, unknown>}
              note="课堂主舞台复用共享 runtime host，继续保留现有教师控课动作与 WebSocket 快照同步。"
            />
          </div>
        ) : null}

        {markdownStep && !currentRuntimeDescriptor ? (
          <Card className="bg-surface-container-low p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-on-surface-variant">Markdown 广播</p>
                <h3 className="mt-2 text-2xl font-semibold text-on-surface">当前放映内容</h3>
              </div>
              <Badge className="bg-surface-container-lowest text-on-surface-variant">
                {currentSnapshot.slideState ? `第 ${currentSnapshot.slideState.slideIndex + 1} 页` : '文档模式'}
              </Badge>
            </div>
            <div className="mt-5">
              <MarkdownRenderer
                step={markdownStep}
                isTeacher
                locked={currentSnapshot.locked}
                slideState={currentSnapshot.slideState}
                onSlideChange={handleChangeSlide}
              />
            </div>
          </Card>
        ) : null}
      </div>

      <div className="space-y-5">
        {studentDetail ? (
          <ClassroomStudentDetailPanel
            sessionId={currentSnapshot.sessionId}
            detail={studentDetail}
            activeTab={activeDetailTab}
          />
        ) : null}
        <ClassroomSessionHistoryPanel sessions={sessionEntries} selectedSessionId={currentSnapshot.sessionId} />
        <ClassroomTimelinePanel entries={currentSnapshot.teacherTimeline} />
        <ClassroomRosterPanel
          sessionId={currentSnapshot.sessionId}
          participants={currentSnapshot.participants}
          monitoringSummary={currentSnapshot.monitoringSummary}
          currentVotingRound={currentSnapshot.currentVotingRound}
        />
      </div>
    </section>
  )
}

function MetricOrb({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container-low p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <span className="rounded-full bg-surface-container-lowest p-2 text-primary shadow-ambient">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-[1.6rem] font-semibold tracking-tight text-on-surface">{value}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{detail}</p>
    </div>
  )
}

function StageMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] bg-surface-container-lowest p-4 shadow-ambient">
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  )
}

function UtilityOrb({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex min-h-[88px] flex-col items-center justify-center gap-3 rounded-[1.3rem] bg-surface-container-low text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high">
      <span className="rounded-full bg-surface-container-lowest p-3 text-primary shadow-ambient">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
